-- Seed script for Employee Mood Index

-- 1. Insert Roles (if not exists)
INSERT INTO roles (id, name) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'super_admin'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'admin'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'employee')
ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name;

-- 2. Insert Departments
INSERT INTO departments (id, name) VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'Engineering'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'Sales'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13', 'Marketing'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14', 'HR'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b15', 'Finance'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b16', 'Operations'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b17', 'Other')
ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name;

-- 3. Insert Allowed Domains
INSERT INTO allowed_domains (domain) VALUES
    ('company.com'),
    ('localhost')
ON CONFLICT (domain) DO NOTHING;

-- 4. Insert Feelings with mood mapping
-- Great (5)
INSERT INTO feelings (name, mood_score_relation) VALUES
    ('Happy', 5), ('Excited', 5), ('Grateful', 5), ('Inspired', 5),
    ('Confident', 5), ('Energetic', 5), ('Proud', 5), ('Optimistic', 5)
ON CONFLICT (name, mood_score_relation) DO NOTHING;

-- Good (4)
INSERT INTO feelings (name, mood_score_relation) VALUES
    ('Content', 4), ('Calm', 4), ('Productive', 4), ('Focused', 4),
    ('Relaxed', 4), ('Hopeful', 4), ('Satisfied', 4), ('Positive', 4)
ON CONFLICT (name, mood_score_relation) DO NOTHING;

-- Okay (3)
INSERT INTO feelings (name, mood_score_relation) VALUES
    ('Neutral', 3), ('Tired', 3), ('Busy', 3), ('Thoughtful', 3),
    ('Uncertain', 3), ('Distracted', 3)
ON CONFLICT (name, mood_score_relation) DO NOTHING;

-- Bad (2)
INSERT INTO feelings (name, mood_score_relation) VALUES
    ('Stressed', 2), ('Anxious', 2), ('Frustrated', 2), ('Overwhelmed', 2),
    ('Drained', 2), ('Irritated', 2), ('Pressured', 2)
ON CONFLICT (name, mood_score_relation) DO NOTHING;

-- Awful (1)
INSERT INTO feelings (name, mood_score_relation) VALUES
    ('Burned Out', 1), ('Exhausted', 1), ('Disconnected', 1), ('Demotivated', 1),
    ('Defeated', 1), ('Angry', 1)
ON CONFLICT (name, mood_score_relation) DO NOTHING;

-- 5. Insert Contributors
INSERT INTO contributors (name) VALUES
    ('Work'), ('Team'), ('Manager'), ('Health'), ('Sleep'),
    ('Exercise'), ('Family'), ('Finances'), ('Relationships'),
    ('Personal Life'), ('Learning'), ('Other')
ON CONFLICT (name) DO NOTHING;

-- 6. Insert Default Settings
INSERT INTO settings (key, value) VALUES
    ('company_name', 'Acme Corp'),
    ('reminder_time', '09:00'),
    ('company_logo_url', ''),
    ('email_configuration', '{"from": "onboarding@resend.dev"}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
