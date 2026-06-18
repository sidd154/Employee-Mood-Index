-- Create schema for Employee Mood Index

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Allowed domains table
CREATE TABLE IF NOT EXISTS allowed_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Mood entries table
CREATE TABLE IF NOT EXISTS mood_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mood_score INT NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
    journal_text VARCHAR(2000),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Feelings table
CREATE TABLE IF NOT EXISTS feelings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    mood_score_relation INT NOT NULL CHECK (mood_score_relation BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_feeling_mood UNIQUE (name, mood_score_relation)
);

-- 9. Contributors table
CREATE TABLE IF NOT EXISTS contributors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Entry feelings mapping table
CREATE TABLE IF NOT EXISTS entry_feelings (
    entry_id UUID NOT NULL REFERENCES mood_entries(id) ON DELETE CASCADE,
    feeling_id UUID NOT NULL REFERENCES feelings(id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, feeling_id)
);

-- 11. Entry contributors mapping table
CREATE TABLE IF NOT EXISTS entry_contributors (
    entry_id UUID NOT NULL REFERENCES mood_entries(id) ON DELETE CASCADE,
    contributor_id UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, contributor_id)
);

-- 12. Reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- 'employee' or 'admin'
    date_range VARCHAR(100) NOT NULL, -- 'Last 7 Days', 'Last 30 Days', 'Since January', 'Custom'
    file_url VARCHAR(512),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient VARCHAR(255) NOT NULL,
    email_type VARCHAR(100) NOT NULL, -- 'OTP', 'Reminder_9AM', 'Reminder_4PM', 'Report'
    status VARCHAR(50) NOT NULL, -- 'sent', 'failed'
    error TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Settings table
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_email_code ON otp_codes(email, code);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_mood_entries_user ON mood_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_created_at ON mood_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_entry_feelings_entry ON entry_feelings(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_contributors_entry ON entry_contributors(entry_id);

-- Enable Row Level Security (RLS) on tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE feelings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_feelings ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_all_roles ON roles;
CREATE POLICY admin_all_roles ON roles FOR ALL USING (true);

DROP POLICY IF EXISTS admin_all_departments ON departments;
CREATE POLICY admin_all_departments ON departments FOR ALL USING (true);

DROP POLICY IF EXISTS admin_all_users ON users;
CREATE POLICY admin_all_users ON users FOR ALL USING (true);

DROP POLICY IF EXISTS admin_all_allowed_domains ON allowed_domains;
CREATE POLICY admin_all_allowed_domains ON allowed_domains FOR ALL USING (true);

DROP POLICY IF EXISTS admin_all_otp_codes ON otp_codes;
CREATE POLICY admin_all_otp_codes ON otp_codes FOR ALL USING (true);

DROP POLICY IF EXISTS admin_all_refresh_tokens ON refresh_tokens;
CREATE POLICY admin_all_refresh_tokens ON refresh_tokens FOR ALL USING (true);

DROP POLICY IF EXISTS admin_all_mood_entries ON mood_entries;
CREATE POLICY admin_all_mood_entries ON mood_entries FOR ALL USING (true);

DROP POLICY IF EXISTS admin_all_feelings ON feelings;
CREATE POLICY admin_all_feelings ON feelings FOR ALL USING (true);

DROP POLICY IF EXISTS admin_all_contributors ON contributors;
CREATE POLICY admin_all_contributors ON contributors FOR ALL USING (true);

DROP POLICY IF EXISTS admin_all_entry_feelings ON entry_feelings;
CREATE POLICY admin_all_entry_feelings ON entry_feelings FOR ALL USING (true);

DROP POLICY IF EXISTS admin_all_entry_contributors ON entry_contributors;
CREATE POLICY admin_all_entry_contributors ON entry_contributors FOR ALL USING (true);

DROP POLICY IF EXISTS admin_all_reports ON reports;
CREATE POLICY admin_all_reports ON reports FOR ALL USING (true);

DROP POLICY IF EXISTS admin_all_email_logs ON email_logs;
CREATE POLICY admin_all_email_logs ON email_logs FOR ALL USING (true);

DROP POLICY IF EXISTS admin_all_settings ON settings;
CREATE POLICY admin_all_settings ON settings FOR ALL USING (true);

DROP POLICY IF EXISTS admin_all_audit_logs ON audit_logs;
CREATE POLICY admin_all_audit_logs ON audit_logs FOR ALL USING (true);
