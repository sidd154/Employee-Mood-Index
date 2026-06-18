import express from 'express';
// Reload trigger comment to refresh environment variables

import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { query } from './config/db';
import { logAudit } from './utils/audit';

import { initOrRescheduleReminders } from './services/scheduler';

import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import employeesRoutes from './routes/employees';
import checkinRoutes from './routes/checkins';
import reportsRoutes from './routes/reports';
import analyticsRoutes from './routes/analytics';
import settingsRoutes from './routes/settings';
import cronRoutes from './routes/cron';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
const rawFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const sanitizedFrontendUrl = rawFrontendUrl.replace(/\/$/, '');

const allowedOrigins = [
  sanitizedFrontendUrl,
  'http://localhost:5173',
  'http://localhost:5174'
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/employees', employeesRoutes);
app.use('/checkins', checkinRoutes);
app.use('/reports', reportsRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/settings', settingsRoutes);
app.use('/cron', cronRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

async function initializeDatabase() {
  try {
    console.log('Running database initialization hooks...');

    const rolesCheck = await query('SELECT count(*) as count FROM roles');
    if (parseInt(rolesCheck.rows[0].count) === 0) {
      console.log('Seeding default roles...');
      await query(`
        INSERT INTO roles (id, name) VALUES
          ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'super_admin'),
          ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'admin'),
          ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'employee')
      `);
    }

    const deptCheck = await query('SELECT count(*) as count FROM departments');
    if (parseInt(deptCheck.rows[0].count) === 0) {
      console.log('Seeding default departments...');
      await query(`
        INSERT INTO departments (id, name) VALUES
          ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'Engineering'),
          ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'Sales'),
          ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13', 'Marketing'),
          ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14', 'HR'),
          ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b15', 'Finance'),
          ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b16', 'Operations'),
          ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b17', 'Other')
      `);
    }

    const domainCheck = await query('SELECT count(*) as count FROM allowed_domains');
    if (parseInt(domainCheck.rows[0].count) === 0) {
      await query("INSERT INTO allowed_domains (domain) VALUES ('company.com'), ('localhost'), ('gmail.com')");
    }

    const feelingsCheck = await query('SELECT count(*) as count FROM feelings');
    if (parseInt(feelingsCheck.rows[0].count) === 0) {
      await query(`
        INSERT INTO feelings (name, mood_score_relation) VALUES
          ('Happy', 5), ('Excited', 5), ('Grateful', 5), ('Inspired', 5), ('Confident', 5), ('Energetic', 5), ('Proud', 5), ('Optimistic', 5),
          ('Content', 4), ('Calm', 4), ('Productive', 4), ('Focused', 4), ('Relaxed', 4), ('Hopeful', 4), ('Satisfied', 4), ('Positive', 4),
          ('Neutral', 3), ('Tired', 3), ('Busy', 3), ('Thoughtful', 3), ('Uncertain', 3), ('Distracted', 3),
          ('Stressed', 2), ('Anxious', 2), ('Frustrated', 2), ('Overwhelmed', 2), ('Drained', 2), ('Irritated', 2), ('Pressured', 2),
          ('Burned Out', 1), ('Exhausted', 1), ('Disconnected', 1), ('Demotivated', 1), ('Defeated', 1), ('Angry', 1)
      `);
    }

    const contribCheck = await query('SELECT count(*) as count FROM contributors');
    if (parseInt(contribCheck.rows[0].count) === 0) {
      await query(`
        INSERT INTO contributors (name) VALUES
          ('Work'), ('Team'), ('Manager'), ('Health'), ('Sleep'), ('Exercise'),
          ('Family'), ('Finances'), ('Relationships'), ('Personal Life'), ('Learning'), ('Other')
      `);
    }

    const settingsCheck = await query('SELECT count(*) as count FROM settings');
    if (parseInt(settingsCheck.rows[0].count) === 0) {
      await query(`
        INSERT INTO settings (key, value) VALUES
          ('company_name', 'Acme Corp'),
          ('reminder_time', '09:00'),
          ('afternoon_reminder_time', '16:00'),
          ('company_logo_url', ''),
          ('email_configuration', '{"from": "onboarding@resend.dev"}')
      `);
    } else {
      // Check if afternoon_reminder_time key exists, if not, insert it
      const afternoonCheck = await query("SELECT 1 FROM settings WHERE key = 'afternoon_reminder_time'");
      if (afternoonCheck.rows.length === 0) {
        await query("INSERT INTO settings (key, value) VALUES ('afternoon_reminder_time', '16:00')");
      }
    }

    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'siddhanthsrinivasan@gmail.com').toLowerCase().trim();
    const superAdminName = process.env.SUPER_ADMIN_NAME || 'Super Admin';

    const superAdminRoleRes = await query("SELECT id FROM roles WHERE name = 'super_admin'");
    const superAdminRoleId = superAdminRoleRes.rows[0].id;

    const userCheck = await query('SELECT id FROM users WHERE LOWER(email) = $1', [superAdminEmail]);
    if (userCheck.rows.length === 0) {
      console.log(`Creating default Super Admin account for ${superAdminEmail}...`);
      await query(
        `INSERT INTO users (email, role_id, full_name) 
         VALUES ($1, $2, $3)`,
        [superAdminEmail, superAdminRoleId, superAdminName]
      );
      console.log('Super Admin account created successfully.');
    } else {
      await query('UPDATE users SET role_id = $1 WHERE LOWER(email) = $2', [superAdminRoleId, superAdminEmail]);
    }
  } catch (err) {
    console.error('Error during database initialization hooks:', err);
  }
}

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await initializeDatabase();
  await initOrRescheduleReminders();
  console.log('Reminder schedulers loaded.');
});

export default app;
