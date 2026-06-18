import { generateEmployeeReportPDF, generateAdminReportPDF } from '../src/services/pdf';
import { sendEmail } from '../src/services/email';
import { pool } from '../src/config/db';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  console.log('Starting dummy report generation and email dispatch...');

  // Mock data for Employee Report
  const employeeData = {
    moodIndex: 7.8,
    thisMonthAvg: 7.9,
    lastMonthAvg: 7.5,
    overallAvg: 7.7,
    distribution: [
      { name: 'Great', count: 8 },
      { name: 'Good', count: 12 },
      { name: 'Okay', count: 6 },
      { name: 'Bad', count: 3 },
      { name: 'Awful', count: 1 },
    ],
    trends: [
      { date: '2026-06-01', score: 6.0 },
      { date: '2026-06-02', score: 8.0 },
      { date: '2026-06-03', score: 7.0 },
      { date: '2026-06-04', score: 9.0 },
      { date: '2026-06-05', score: 10.0 },
      { date: '2026-06-06', score: 8.0 },
      { date: '2026-06-07', score: 6.0 },
      { date: '2026-06-08', score: 7.0 },
      { date: '2026-06-09', score: 8.0 },
      { date: '2026-06-10', score: 8.5 },
      { date: '2026-06-11', score: 7.8 },
    ],
    feelings: [
      { name: 'Focused', count: 8 },
      { name: 'Neutral', count: 6 },
      { name: 'Productive', count: 5 },
      { name: 'Stressed', count: 3 },
    ],
    contributors: [
      { name: 'Work', count: 12 },
      { name: 'Sleep', count: 8 },
      { name: 'Team', count: 7 },
    ],
    departmentName: 'Engineering',
    departmentMoodIndex: 7.4,
    departmentThisMonthAvg: 7.4,
    departmentLastMonthAvg: 7.0,
    departmentOverallAvg: 7.3,
    departmentHeadcount: 12,
  };

  // Mock data for Admin Report
  const adminData = {
    moodIndex: 7.2,
    thisMonthAvg: 7.3,
    lastMonthAvg: 6.9,
    overallAvg: 7.2,
    participationRate: 84,
    totalEmployees: 48,
    checkinsCount: 192,
    distribution: [
      { name: 'Great', count: 42 },
      { name: 'Good', count: 88 },
      { name: 'Okay', count: 38 },
      { name: 'Bad', count: 18 },
      { name: 'Awful', count: 6 },
    ],
    trends: [
      { date: '2026-06-01', score: 6.5 },
      { date: '2026-06-02', score: 7.2 },
      { date: '2026-06-03', score: 6.8 },
      { date: '2026-06-04', score: 7.4 },
      { date: '2026-06-05', score: 7.8 },
      { date: '2026-06-06', score: 7.0 },
      { date: '2026-06-07', score: 6.7 },
      { date: '2026-06-08', score: 7.2 },
      { date: '2026-06-09', score: 7.5 },
      { date: '2026-06-10', score: 7.3 },
      { date: '2026-06-11', score: 7.2 },
    ],
    departments: [
      { name: 'Engineering', headcount: 15, overallAvg: 7.6, thisMonthAvg: 7.8, lastMonthAvg: 7.2 },
      { name: 'Sales', headcount: 12, overallAvg: 6.8, thisMonthAvg: 7.0, lastMonthAvg: 6.5 },
      { name: 'HR', headcount: 8, overallAvg: 8.2, thisMonthAvg: 8.4, lastMonthAvg: 8.0 },
      { name: 'Marketing', headcount: 13, overallAvg: 7.1, thisMonthAvg: 7.2, lastMonthAvg: 6.9 },
    ],
    feelings: [
      { name: 'Focused', count: 48, moodCorrelation: 7.8 },
      { name: 'Productive', count: 42, moodCorrelation: 7.2 },
      { name: 'Stressed', count: 28, moodCorrelation: 4.0 },
      { name: 'Anxious', count: 18, moodCorrelation: 3.2 },
    ],
    contributors: [
      { name: 'Work', count: 96, moodCorrelation: 6.4 },
      { name: 'Team', count: 72, moodCorrelation: 7.6 },
      { name: 'Sleep', count: 54, moodCorrelation: 7.0 },
    ],
  };

  console.log('Rendering Employee Report PDF...');
  const employeePdf = await generateEmployeeReportPDF('Siddhanth Srinivasan', 'Last 30 Days', employeeData);

  console.log('Rendering Admin Report PDF...');
  const adminPdf = await generateAdminReportPDF('Last 30 Days', adminData);

  // Target emails (both the typo version and correct version)
  const targets = ['siddhanthsrinivaan@gmail.com', 'siddhanthsrinivasan@gmail.com'];

  for (const email of targets) {
    console.log(`Sending Employee Report PDF to: ${email}...`);
    const empMailResult = await sendEmail({
      to: email,
      subject: `[TEST] Personal Wellbeing Insights Report - Last 30 Days`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb;">Your Personal Wellbeing Report</h2>
          <p>Hi Siddhanth,</p>
          <p>Here is your freshly generated and formatted **Employee Mood Index Report** with enhanced comparative analytics. We've included a breakdown of how you compare to your department average!</p>
          <p>Please find the PDF attached.</p>
          <br/>
          <p style="color: #64748b; font-size: 12px;">Employee Mood Index System</p>
        </div>
      `,
      emailType: 'Report',
      attachments: [
        {
          content: employeePdf,
          filename: 'Employee_Mood_Report_Dummy.pdf',
        },
      ],
    });
    console.log(`Employee report email dispatch to ${email} result:`, empMailResult);

    console.log(`Sending Admin Report PDF to: ${email}...`);
    const adminMailResult = await sendEmail({
      to: email,
      subject: `[TEST] Organizational Wellbeing Report - Last 30 Days`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a;">Company Wellbeing Analytics Report</h2>
          <p>Hi Admin,</p>
          <p>Here is your freshly generated and formatted **Company Wellbeing Report** with deep organizational driver & detractor analytics.</p>
          <p>Please find the PDF attached.</p>
          <br/>
          <p style="color: #64748b; font-size: 12px;">Employee Mood Index System</p>
        </div>
      `,
      emailType: 'Report',
      attachments: [
        {
          content: adminPdf,
          filename: 'Admin_Mood_Report_Dummy.pdf',
        },
      ],
    });
    console.log(`Admin report email dispatch to ${email} result:`, adminMailResult);
  }

  console.log('Finished dummy reports process. Closing pool.');
  await pool.end();
}

run().catch((err) => {
  console.error('Error running dummy report script:', err);
  pool.end();
});
