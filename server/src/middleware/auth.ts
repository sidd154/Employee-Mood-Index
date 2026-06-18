import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    department_id?: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'jwt_secret_key_12345';
    const decoded = jwt.verify(token, secret) as { id: string; email: string };

    const userRes = await query(
      `SELECT u.id, u.email, r.name as role, u.department_id 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(403).json({ error: 'User no longer exists' });
    }

    req.user = {
      id: userRes.rows[0].id,
      email: userRes.rows[0].email,
      role: userRes.rows[0].role,
      department_id: userRes.rows[0].department_id,
    };

    next();
  } catch (err: any) {
    console.error('JWT verification error:', err.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};
