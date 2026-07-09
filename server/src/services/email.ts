import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { query } from '../config/db';

dotenv.config();

// Create nodemailer transporter
// Gmail SMTP is smtp.gmail.com (SSL port 465, STARTTLS port 587)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_PORT !== '587', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'admin@pixelavatar.com',
    pass: process.env.SMTP_PASS || 'drxfpxvsnzsnadjg',
  },
});

export const sendEmail = async (options: {
  to: string;
  subject: string;
  html: string;
  attachments?: any[];
  emailType: 'OTP' | 'Reminder_9AM' | 'Reminder_4PM' | 'Report';
}) => {
  let fromEmail = process.env.EMAIL_FROM || 'admin@pixelavatar.com';

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

    const mailOptions = {
      from: `Employee Wellness Index <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments ? options.attachments.map(att => ({
        filename: att.filename,
        content: att.content, // Buffer or string
      })) : undefined,
    };

    const info = await transporter.sendMail(mailOptions);

    await query(
      `INSERT INTO email_logs (recipient, email_type, status, sent_at)
       VALUES ($1, $2, $3, NOW())`,
      [options.to, options.emailType, 'sent']
    );

    return { success: true, id: info.messageId };
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
