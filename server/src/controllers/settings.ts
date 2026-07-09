import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { query } from '../config/db';
import { logAudit } from '../utils/audit';
import { initOrRescheduleReminders } from '../services/scheduler';

export const getSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settingsRes = await query('SELECT * FROM settings');
    const domainsRes = await query('SELECT * FROM allowed_domains ORDER BY domain ASC');

    const config: { [key: string]: string } = {};
    settingsRes.rows.forEach((row) => {
      config[row.key] = row.value;
    });

    res.json({
      settings: {
        companyName: config['company_name'] || 'Acme Corp',
        reminderTime: config['reminder_time'] || '09:00',
        afternoonReminderTime: config['afternoon_reminder_time'] || '16:00',
        companyLogoUrl: config['company_logo_url'] || '',
        emailConfiguration: config['email_configuration'] ? JSON.parse(config['email_configuration']) : { from: 'onboarding@resend.dev' },
        extendDataEntry: config['extend_data_entry'] === 'true',
      },
      allowedDomains: domainsRes.rows,
    });
  } catch (error: any) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSettings = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { companyName, reminderTime, afternoonReminderTime, companyLogoUrl, emailConfiguration, extendDataEntry } = req.body;

  try {
    await query('BEGIN');

    if (companyName !== undefined) {
      await query(
        `INSERT INTO settings (key, value, updated_at) 
         VALUES ('company_name', $1, NOW()) 
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [companyName]
      );
    }

    if (reminderTime !== undefined) {
      await query(
        `INSERT INTO settings (key, value, updated_at) 
         VALUES ('reminder_time', $1, NOW()) 
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [reminderTime]
      );
    }

    if (afternoonReminderTime !== undefined) {
      await query(
        `INSERT INTO settings (key, value, updated_at) 
         VALUES ('afternoon_reminder_time', $1, NOW()) 
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [afternoonReminderTime]
      );
    }

    if (reminderTime !== undefined || afternoonReminderTime !== undefined) {
      await initOrRescheduleReminders();
    }

    if (companyLogoUrl !== undefined) {
      await query(
        `INSERT INTO settings (key, value, updated_at) 
         VALUES ('company_logo_url', $1, NOW()) 
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [companyLogoUrl]
      );
    }

    if (emailConfiguration !== undefined) {
      await query(
        `INSERT INTO settings (key, value, updated_at) 
         VALUES ('email_configuration', $1, NOW()) 
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [JSON.stringify(emailConfiguration)]
      );
    }

    if (extendDataEntry !== undefined) {
      await query(
        `INSERT INTO settings (key, value, updated_at) 
         VALUES ('extend_data_entry', $1, NOW()) 
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [extendDataEntry ? 'true' : 'false']
      );
    }

    await query('COMMIT');

    await logAudit(req.user.id, 'settings_updated', {
      companyName,
      reminderTime,
      afternoonReminderTime,
      companyLogoUrl,
      emailConfiguration,
    });

    res.json({ message: 'Settings updated successfully' });
  } catch (error: any) {
    await query('ROLLBACK');
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addDomain = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { domain } = req.body;

  if (!domain || !domain.trim()) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  try {
    const domainLower = domain.trim().toLowerCase();

    const checkRes = await query('SELECT 1 FROM allowed_domains WHERE domain = $1', [domainLower]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ error: 'Domain already exists' });
    }

    const insertRes = await query(
      'INSERT INTO allowed_domains (domain) VALUES ($1) RETURNING *',
      [domainLower]
    );

    await logAudit(req.user.id, 'domain_added', { domain: domainLower });

    res.status(201).json(insertRes.rows[0]);
  } catch (error: any) {
    console.error('Add domain error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteDomain = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;

  try {
    const getDomRes = await query('SELECT domain FROM allowed_domains WHERE id = $1', [id]);
    if (getDomRes.rows.length === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const domainName = getDomRes.rows[0].domain;

    await query('DELETE FROM allowed_domains WHERE id = $1', [id]);
    await logAudit(req.user.id, 'domain_deleted', { domain: domainName });

    res.json({ message: 'Domain deleted successfully', domain: domainName });
  } catch (error: any) {
    console.error('Delete domain error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addDepartment = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  try {
    const nameTrimmed = name.trim();

    const checkRes = await query('SELECT 1 FROM departments WHERE LOWER(name) = $1', [nameTrimmed.toLowerCase()]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ error: 'Department already exists' });
    }

    const insertRes = await query(
      'INSERT INTO departments (name) VALUES ($1) RETURNING *',
      [nameTrimmed]
    );

    await logAudit(req.user.id, 'department_added', { department: nameTrimmed });

    res.status(201).json({
      id: insertRes.rows[0].id,
      name: insertRes.rows[0].name,
      employeeCount: 0,
      moodIndex: 0,
      participationRate: 0,
    });
  } catch (error: any) {
    console.error('Add department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteDepartment = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;

  try {
    const getDeptRes = await query('SELECT name FROM departments WHERE id = $1', [id]);
    if (getDeptRes.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const deptName = getDeptRes.rows[0].name;

    await query('DELETE FROM departments WHERE id = $1', [id]);
    await logAudit(req.user.id, 'department_deleted', { department: deptName });

    res.json({ message: 'Department deleted successfully', id, department: deptName });
  } catch (error: any) {
    console.error('Delete department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDepartments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deptsRes = await query('SELECT id, name FROM departments ORDER BY name ASC');
    res.json(deptsRes.rows);
  } catch (error: any) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
