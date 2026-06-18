import { query } from '../config/db';

export const logAudit = async (
  userId: string | null,
  action: string,
  details: any,
  ipAddress?: string
) => {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, details, ip_address) 
       VALUES ($1, $2, $3, $4)`,
      [userId, action, JSON.stringify(details), ipAddress || null]
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};
