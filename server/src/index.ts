import express from 'express';
import path from 'path';
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

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
    hsts: false,
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      // Dynamically allow the requesting origin to prevent CORS blocks in serverless deployments
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
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

// Serve static assets in production
const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));

// For SPA routing, redirect non-API requests to index.html
app.get('*', (req, res, next) => {
  const apiPrefixes = ['/auth', '/users', '/employees', '/checkins', '/reports', '/analytics', '/settings', '/cron', '/health'];
  const isApi = apiPrefixes.some(prefix => req.path.startsWith(prefix));
  if (isApi) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Not found');
    }
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

async function initializeDatabase() {
  try {
    console.log('Running database initialization hooks...');

    // Option B: Alter check constraint on mood_score to support 1-10
    console.log('Updating mood_entries mood_score check constraint to 1-10...');
    await query('ALTER TABLE mood_entries DROP CONSTRAINT IF EXISTS mood_entries_mood_score_check');
    await query('ALTER TABLE mood_entries ADD CONSTRAINT mood_entries_mood_score_check CHECK (mood_score BETWEEN 1 AND 10)');

    // Ensure 'Clients' contributor option exists in database

    const clientsCheck = await query("SELECT 1 FROM contributors WHERE name = 'Clients'");
    if (clientsCheck.rows.length === 0) {
      console.log("Seeding 'Clients' contributor...");
      await query("INSERT INTO contributors (name) VALUES ('Clients')");
    }

    const rolesCheck = await query('SELECT count(*) as count FROM roles');
    if (parseInt(rolesCheck.rows[0].count) === 0) {
      console.log('Seeding default roles...');
      await query(`
        INSERT INTO roles (id, name) VALUES
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

    // Ensure standard domains are allowed
    for (const d of ['company.com', 'localhost', 'gmail.com', 'pixel-studios.com', 'pixelavatar.com', 'pixelsoft.in']) {
      const check = await query('SELECT 1 FROM allowed_domains WHERE LOWER(domain) = $1', [d.toLowerCase()]);
      if (check.rows.length === 0) {
        await query('INSERT INTO allowed_domains (domain) VALUES ($1)', [d]);
      }
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
          ('email_configuration', '{"from": "admin@pixelavatar.com"}')
      `);
    } else {
      // Check if afternoon_reminder_time key exists, if not, insert it
      const afternoonCheck = await query("SELECT 1 FROM settings WHERE key = 'afternoon_reminder_time'");
      if (afternoonCheck.rows.length === 0) {
        await query("INSERT INTO settings (key, value) VALUES ('afternoon_reminder_time', '16:00')");
      }
      // Force update email_configuration to use admin@pixelavatar.com
      await query("UPDATE settings SET value = '{\"from\": \"admin@pixelavatar.com\"}' WHERE key = 'email_configuration'");
    }

    // Merge roles table: merge super_admin into admin
    const superAdminRoleCheck = await query("SELECT id FROM roles WHERE name = 'super_admin'");
    if (superAdminRoleCheck.rows.length > 0) {
      const superAdminRoleId = superAdminRoleCheck.rows[0].id;
      // Ensure admin role exists
      let adminRoleId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
      const adminRoleCheck = await query("SELECT id FROM roles WHERE name = 'admin'");
      if (adminRoleCheck.rows.length > 0) {
        adminRoleId = adminRoleCheck.rows[0].id;
      }
      
      console.log('Migrating users from super_admin role to admin role...');
      // Update all users who currently have super_admin role to admin role
      await query("UPDATE users SET role_id = $1 WHERE role_id = $2", [adminRoleId, superAdminRoleId]);
      // Delete super_admin role
      await query("DELETE FROM roles WHERE id = $1", [superAdminRoleId]);
      console.log('Role migration completed.');
    }

    const adminEmail = 'siddhanthsrinivasan@gmail.com';
    const adminName = 'Siddhanth Srinivasan';

    const adminRoleRes = await query("SELECT id FROM roles WHERE name = 'admin'");
    const adminRoleId = adminRoleRes.rows[0].id;

    const userCheck = await query('SELECT id FROM users WHERE LOWER(email) = $1', [adminEmail]);
    if (userCheck.rows.length === 0) {
      console.log(`Creating default Admin account for ${adminEmail}...`);
      await query(
        `INSERT INTO users (email, role_id, full_name) 
         VALUES ($1, $2, $3)`,
        [adminEmail, adminRoleId, adminName]
      );
      console.log('Admin account created successfully.');
    } else {
      await query('UPDATE users SET role_id = $1 WHERE LOWER(email) = $2', [adminRoleId, adminEmail]);
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
