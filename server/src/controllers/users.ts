import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { query } from '../config/db';
import { logAudit } from '../utils/audit';

export const getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const usersRes = await query(
      `SELECT u.id, u.email, u.full_name as name, r.name as role, d.name as department, u.created_at
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       ORDER BY u.full_name ASC`
    );

    res.json(usersRes.rows);
  } catch (error: any) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUserRole = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { userId, roleName } = req.body;

  if (!userId || !roleName) {
    return res.status(400).json({ error: 'User ID and role name are required' });
  }

  if (roleName !== 'admin' && roleName !== 'employee') {
    return res.status(400).json({ error: 'Invalid role. Must be admin or employee.' });
  }

  try {
    const targetUser = await query(
      `SELECT u.email, r.name as role FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1`,
      [userId]
    );

    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.rows[0].email.toLowerCase().trim() === 'siddhanthsrinivasan@gmail.com') {
      return res.status(403).json({ error: 'The hardcoded primary admin account cannot be modified.' });
    }

    const roleRes = await query('SELECT id FROM roles WHERE name = $1', [roleName]);
    const roleId = roleRes.rows[0].id;

    await query('UPDATE users SET role_id = $1 WHERE id = $2', [roleId, userId]);

    await logAudit(req.user.id, 'user_role_updated', {
      targetUserId: userId,
      targetUserEmail: targetUser.rows[0].email,
      newRole: roleName,
    });

    res.json({ message: `User role updated to ${roleName} successfully` });
  } catch (error: any) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;

  try {
    const targetUser = await query(
      `SELECT u.email, r.name as role FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1`,
      [id]
    );

    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.rows[0].email.toLowerCase().trim() === 'siddhanthsrinivasan@gmail.com') {
      return res.status(403).json({ error: 'The hardcoded primary admin account cannot be deleted.' });
    }

    await query('DELETE FROM users WHERE id = $1', [id]);

    await logAudit(req.user.id, 'user_deleted', {
      targetUserId: id,
      targetUserEmail: targetUser.rows[0].email,
    });

    res.json({ message: 'User account deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const registerUser = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { email, fullName, roleName, departmentId } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
    const emailLower = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1', [emailLower]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Get role ID
    const targetRole = roleName || 'employee';
    const roleRes = await query('SELECT id FROM roles WHERE name = $1', [targetRole]);
    if (roleRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid role name' });
    }
    const roleId = roleRes.rows[0].id;

    // Validate department if provided
    let deptId = null;
    if (departmentId) {
      const deptRes = await query('SELECT id FROM departments WHERE id = $1', [departmentId]);
      if (deptRes.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid department ID' });
      }
      deptId = deptRes.rows[0].id;
    }

    // Insert user
    const insertRes = await query(
      `INSERT INTO users (email, role_id, full_name, department_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [emailLower, roleId, fullName ? fullName.trim() : null, deptId]
    );

    await logAudit(req.user.id, 'user_registered', {
      registeredUserId: insertRes.rows[0].id,
      registeredUserEmail: emailLower,
      role: targetRole,
    });

    res.status(201).json({
      message: 'User registered successfully',
      userId: insertRes.rows[0].id,
    });
  } catch (error: any) {
    console.error('Register user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

