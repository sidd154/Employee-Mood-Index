import { Resend } from 'resend';
import dotenv from 'dotenv';
import { query } from '../config/db';

dotenv.config();

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

if (!resend) {
  console.warn(
    'Warning: RESEND_API_KEY is not set. All emails will be printed to the server console instead of being sent.'
  );
}

export const sendEmail = async (options: {
  to: string;
  subject: string;
  html: string;
  attachments?: any[];
  emailType: 'OTP' | 'Reminder_9AM' | 'Reminder_4PM' | 'Report';
}) => {
  let fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  try {
    // Fetch custom from sender email from database settings
    const settingsRes = await query("SELECT value FROM settings WHERE key = 'email_configuration'");
    if (settingsRes.rows.length > 0) {
      try {
        const config = JSON.parse(settingsRes.rows[0].value);
        if (config && config.from) {
          fromEmail = config.from;
        }
      } catch (parseErr) {
        console.error('Failed to parse email_configuration setting:', parseErr);
      }
    }
    if (resend) {
      const response = await resend.emails.send({
        from: `Employee Mood Index <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
      });

      if (response.error) {
        throw new Error(JSON.stringify(response.error));
      }

      await query(
        `INSERT INTO email_logs (recipient, email_type, status, sent_at)
         VALUES ($1, $2, $3, NOW())`,
        [options.to, options.emailType, 'sent']
      );

      return { success: true, id: response.data?.id };
    } else {
      console.log('=============== MOCK EMAIL SENT ===============');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Type: ${options.emailType}`);
      console.log(`Content:\n${options.html.replace(/<[^>]*>/g, '')}`);
      if (options.attachments && options.attachments.length > 0) {
        console.log(`Attachments: ${options.attachments.map(a => a.filename).join(', ')}`);
      }
      console.log('================================================');

      await query(
        `INSERT INTO email_logs (recipient, email_type, status, sent_at)
         VALUES ($1, $2, $3, NOW())`,
        [options.to, options.emailType, 'sent']
      );

      return { success: true, mock: true };
    }
  } catch (error: any) {
    console.error('Failed to send email:', error);
    try {
      await query(
        `INSERT INTO email_logs (recipient, email_type, status, error, sent_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [options.to, options.emailType, 'failed', error.message]
      );
    } catch (dbErr) {
      console.error('Failed to log email error in DB:', dbErr);
    }
    return { success: false, error };
  }
};
