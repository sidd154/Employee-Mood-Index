import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { sendEmail } from '../services/email';
import { logAudit } from '../utils/audit';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

async function isDomainAllowed(email: string): Promise<boolean> {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;

  const res = await query('SELECT 1 FROM allowed_domains WHERE LOWER(domain) = $1', [domain]);
  return res.rows.length > 0;
}

export const sendOTP = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
    const emailLower = email.toLowerCase().trim();

    const userRes = await query('SELECT 1 FROM users WHERE LOWER(email) = $1', [emailLower]);
    const userExists = userRes.rows.length > 0;

    if (!userExists) {
      const allowed = await isDomainAllowed(emailLower);
      if (!allowed) {
        return res.status(400).json({ error: 'This domain is not allowed to register' });
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV MODE] Generated OTP Code for ${emailLower}: ${code}`);
    }
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await query(
      `INSERT INTO otp_codes (email, code, expires_at) 
       VALUES ($1, $2, $3)`,
      [emailLower, code, expiresAt]
    );

    const emailSent = await sendEmail({
      to: emailLower,
      subject: 'Your Employee Wellness Index Login Code',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-bottom: 16px;">Employee Wellness Index</h2>
          <p style="color: #475569; font-size: 16px; line-height: 24px;">Your 6-digit one-time code to access your account is:</p>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1e293b; border-radius: 6px; margin: 24px 0;">
            ${code}
          </div>
          <p style="color: #94a3b8; font-size: 14px;">This code will expire in 10 minutes. If you did not request this code, you can safely ignore this email.</p>
        </div>
      `,
      emailType: 'OTP',
    });

    if (!emailSent.success) {
      return res.status(500).json({ error: 'Failed to send OTP code. Please try again.' });
    }

    await logAudit(null, 'otp_sent', { email: emailLower, mock: !process.env.RESEND_API_KEY });

    res.json({
      message: 'OTP sent successfully',
    });
  } catch (error: any) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and OTP code are required' });
  }

  try {
    const emailLower = email.toLowerCase().trim();

    const otpRes = await query(
      `SELECT * FROM otp_codes 
       WHERE LOWER(email) = $1 AND code = $2 AND expires_at > NOW() AND verified = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [emailLower, code]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP code' });
    }

    const otpRecord = otpRes.rows[0];

    await query('UPDATE otp_codes SET verified = TRUE WHERE id = $1', [otpRecord.id]);

    let userRes = await query(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE LOWER(u.email) = $1`,
      [emailLower]
    );

    let user = userRes.rows[0];
    let onboardingRequired = false;

    if (!user) {
      const roleRes = await query("SELECT id FROM roles WHERE name = 'employee'");
      const employeeRoleId = roleRes.rows[0].id;

      const newUserRes = await query(
        `INSERT INTO users (email, role_id, full_name, department_id) 
         VALUES ($1, $2, NULL, NULL) RETURNING *`,
        [emailLower, employeeRoleId]
      );

      user = newUserRes.rows[0];
      user.role_name = 'employee';
      onboardingRequired = true;
    } else if (!user.full_name || !user.department_id) {
      onboardingRequired = true;
    }

    const secret = process.env.JWT_SECRET || 'jwt_secret_key_12345';
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'jwt_refresh_secret_key_54321';

    const accessToken = jwt.sign({ id: user.id, email: user.email }, secret, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign({ id: user.id }, refreshSecret, {
      expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
    });

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.id, refreshToken, expiryDate]
    );

    await logAudit(user.id, 'login_success', { onboardingRequired });

    res.json({
      accessToken,
      refreshToken,
      onboardingRequired,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role_name,
        departmentId: user.department_id,
      },
    });
  } catch (error: any) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const onboard = async (req: Request, res: Response) => {
  const { userId, fullName, departmentId } = req.body;

  if (!userId || !fullName || !departmentId) {
    return res.status(400).json({ error: 'User ID, full name, and department are required' });
  }

  try {
    const userRes = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const deptRes = await query('SELECT name FROM departments WHERE id = $1', [departmentId]);
    if (deptRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid department' });
    }

    const updatedUserRes = await query(
      `UPDATE users 
       SET full_name = $1, department_id = $2, updated_at = NOW() 
       WHERE id = $3 
       RETURNING *`,
      [fullName.trim(), departmentId, userId]
    );

    const updatedUser = updatedUserRes.rows[0];

    const roleRes = await query('SELECT name FROM roles WHERE id = $1', [updatedUser.role_id]);
    const roleName = roleRes.rows[0].name;

    await logAudit(userId, 'onboarding_complete', { department: deptRes.rows[0].name });

    res.json({
      message: 'Onboarding completed successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.full_name,
        role: roleName,
        departmentId: updatedUser.department_id,
      },
    });
  } catch (error: any) {
    console.error('Onboard Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'jwt_refresh_secret_key_54321';
    const decoded = jwt.verify(refreshToken, refreshSecret) as { id: string };

    const tokenRes = await query(
      `SELECT * FROM refresh_tokens 
       WHERE token = $1 AND user_id = $2 AND revoked = FALSE AND expires_at > NOW()`,
      [refreshToken, decoded.id]
    );

    if (tokenRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid, revoked or expired refresh token' });
    }

    const userRes = await query(
      `SELECT u.id, u.email, r.name as role_name, u.department_id, u.full_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];

    const secret = process.env.JWT_SECRET || 'jwt_secret_key_12345';
    const newAccessToken = jwt.sign({ id: user.id, email: user.email }, secret, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    res.json({
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role_name,
        departmentId: user.department_id,
      },
    });
  } catch (error: any) {
    console.error('Refresh Token Error:', error.message);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required to logout' });
  }

  try {
    await query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1`,
      [refreshToken]
    );

    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
