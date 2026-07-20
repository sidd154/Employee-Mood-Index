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

export const buildEmailTemplate = (title: string, content: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        <!-- Header -->
        <div style="background-color: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">Employee Wellness Index</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px 24px;">
          <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 20px; font-size: 22px;">${title}</h2>
          <div style="color: #334155; font-size: 16px; line-height: 1.6;">
            ${content}
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; margin: 0; font-size: 13px;">This is an automated message from the Employee Wellness Index.</p>
          <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 12px;">&copy; ${new Date().getFullYear()} Pixel Studios. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

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
