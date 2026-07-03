const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not defined in server/.env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

const sql = `
  DROP POLICY IF EXISTS admin_all_roles ON roles;
  DROP POLICY IF EXISTS admin_all_departments ON departments;
  DROP POLICY IF EXISTS admin_all_users ON users;
  DROP POLICY IF EXISTS admin_all_allowed_domains ON allowed_domains;
  DROP POLICY IF EXISTS admin_all_otp_codes ON otp_codes;
  DROP POLICY IF EXISTS admin_all_refresh_tokens ON refresh_tokens;
  DROP POLICY IF EXISTS admin_all_mood_entries ON mood_entries;
  DROP POLICY IF EXISTS admin_all_feelings ON feelings;
  DROP POLICY IF EXISTS admin_all_contributors ON contributors;
  DROP POLICY IF EXISTS admin_all_entry_feelings ON entry_feelings;
  DROP POLICY IF EXISTS admin_all_entry_contributors ON entry_contributors;
  DROP POLICY IF EXISTS admin_all_reports ON reports;
  DROP POLICY IF EXISTS admin_all_email_logs ON email_logs;
  DROP POLICY IF EXISTS admin_all_settings ON settings;
  DROP POLICY IF EXISTS admin_all_audit_logs ON audit_logs;
`;

async function run() {
  console.log('Connecting to database and dropping permissive RLS policies...');
  try {
    await pool.query(sql);
    console.log('SUCCESS: All permissive policies dropped successfully. Supabase public API endpoints are now locked down!');
  } catch (err) {
    console.error('ERROR securing database:', err);
  } finally {
    await pool.end();
  }
}

run();
