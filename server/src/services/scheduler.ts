import cron from 'node-cron';
import { query } from '../config/db';
import { sendEmail, buildEmailTemplate } from './email';
import { buildAndEmailAdminReport } from '../controllers/reports';
import { getCurrentCheckinWindowStart } from '../controllers/checkins';

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

let morningTask: cron.ScheduledTask | null = null;
let afternoonTask: cron.ScheduledTask | null = null;
let monthlyReportTask: cron.ScheduledTask | null = null;

export const sendMorningReminders = async () => {
  console.log('Running morning reminder cron job...');
  try {
    const employeesRes = await query(
      `SELECT u.email, u.full_name FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'employee' AND u.full_name IS NOT NULL`
    );

    for (const emp of employeesRes.rows) {
      const firstName = emp.full_name.split(' ')[0] || emp.full_name;
      
      await sendEmail({
        to: emp.email,
        subject: 'How was your week?',
        html: buildEmailTemplate('Weekly Check-In', `
          <h2 style="color: #0f172a; margin-bottom: 16px;">Good morning, ${firstName}!</h2>
          <p style="color: #475569; font-size: 16px; line-height: 24px;">How was your week overall? Check in and let us know in under 15 seconds.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; font-weight: bold; text-decoration: none; display: inline-block;">Complete Weekly Check-In</a>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">You are receiving this because you are registered on the Employee Wellness Index.</p>
        `),
        emailType: 'Reminder_9AM',
      });
    }
    console.log(`Morning reminders processed for ${employeesRes.rows.length} employees.`);
  } catch (error) {
    console.error('Error running morning reminder cron:', error);
    throw error;
  }
};

export const sendAfternoonReminders = async () => {
  console.log('Running 4:00 PM Weekday Incomplete Check-in Reminder Cron Job...');
  try {
    const windowStart = getCurrentCheckinWindowStart();
    const incompleteEmployees = await query(
      `SELECT u.email, u.full_name FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'employee' AND u.full_name IS NOT NULL
       AND u.id NOT IN (
         SELECT user_id FROM mood_entries WHERE created_at >= $1
       )`,
      [windowStart]
    );

    for (const emp of incompleteEmployees.rows) {
      const firstName = emp.full_name.split(' ')[0] || emp.full_name;

      await sendEmail({
        to: emp.email,
        subject: 'Reminder: Complete your weekly check-in',
        html: buildEmailTemplate('Missing Check-In', `
          <h2 style="color: #0f172a; margin-bottom: 16px;">Hi ${firstName},</h2>
          <p style="color: #475569; font-size: 16px; line-height: 24px;">Don't forget to submit your weekly wellbeing check-in. It takes less than 15 seconds!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}" style="background-color: #f97316; color: #ffffff; padding: 12px 24px; border-radius: 6px; font-weight: bold; text-decoration: none; display: inline-block;">Check In Now</a>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">This is a friendly reminder sent only if your weekly check-in is incomplete.</p>
        `),
        emailType: 'Reminder_4PM',
      });
    }
    console.log(`4:00 PM reminders processed for ${incompleteEmployees.rows.length} employees.`);
  } catch (error) {
    console.error('Error running 4:00 PM reminder cron:', error);
    throw error;
  }
};

export const sendMonthlyAdminReports = async () => {
  console.log('Running monthly admin report scheduler...');
  try {
    const adminsRes = await query(
      `SELECT u.id, u.email FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'admin'`
    );

    for (const admin of adminsRes.rows) {
      console.log(`Sending monthly 30-day report to admin: ${admin.email}`);
      await buildAndEmailAdminReport(admin.id, admin.email, '30d', undefined, undefined, 'pdf');
    }
    console.log(`Monthly admin reports processed for ${adminsRes.rows.length} admins.`);
  } catch (error) {
    console.error('Error running monthly admin reports schedule:', error);
    throw error;
  }
};

export const initOrRescheduleReminders = async () => {
  // 1. Fetch morning and afternoon reminder times from DB
  let reminderTime = '09:00';
  let afternoonReminderTime = '16:00';
  try {
    const res = await query("SELECT key, value FROM settings WHERE key IN ('reminder_time', 'afternoon_reminder_time')");
    res.rows.forEach(row => {
      if (row.key === 'reminder_time') reminderTime = row.value || '09:00';
      if (row.key === 'afternoon_reminder_time') afternoonReminderTime = row.value || '16:00';
    });
  } catch (err) {
    console.error('Failed to fetch reminder settings from DB:', err);
  }

  // Morning reminder scheduling
  let morningHour = 9;
  let morningMinute = 0;
  const morningMatch = reminderTime.match(/^(\d{2}):(\d{2})$/);
  if (morningMatch) {
    morningHour = parseInt(morningMatch[1]);
    morningMinute = parseInt(morningMatch[2]);
  }

  console.log(`Scheduling morning check-in reminder for ${reminderTime} (${morningHour}:${morningMinute}) on Fridays...`);

  // Stop existing morning task if running
  if (morningTask) {
    morningTask.stop();
  }

  // Schedule new morning task
  morningTask = cron.schedule(`${morningMinute} ${morningHour} * * 5`, async () => {
    try {
      await sendMorningReminders();
    } catch (err) {
      console.error('Cron Morning Reminders failed:', err);
    }
  });

  // Afternoon reminder scheduling
  let afternoonHour = 16;
  let afternoonMinute = 0;
  const afternoonMatch = afternoonReminderTime.match(/^(\d{2}):(\d{2})$/);
  if (afternoonMatch) {
    afternoonHour = parseInt(afternoonMatch[1]);
    afternoonMinute = parseInt(afternoonMatch[2]);
  }

  console.log(`Scheduling afternoon incomplete check-in reminder for ${afternoonReminderTime} (${afternoonHour}:${afternoonMinute}) on Fridays...`);

  // Stop existing afternoon task if running
  if (afternoonTask) {
    afternoonTask.stop();
  }

  // Schedule new afternoon task
  afternoonTask = cron.schedule(`${afternoonMinute} ${afternoonHour} * * 5`, async () => {
    try {
      await sendAfternoonReminders();
    } catch (err) {
      console.error('Cron Afternoon Reminders failed:', err);
    }
  });

  // Schedule monthly report task (1st of every month at midnight)
  if (!monthlyReportTask) {
    console.log('Scheduling monthly wellbeing report for admins on the 1st of every month at midnight...');
    monthlyReportTask = cron.schedule('0 0 1 * *', async () => {
      try {
        await sendMonthlyAdminReports();
      } catch (err) {
        console.error('Cron Monthly Admin Reports failed:', err);
      }
    });
  }
};

