-- Demo Seeding Script for Employee Mood Index
-- This script creates mock employees and populates 30 days of daily check-in histories.

INSERT INTO users (id, email, role_id, department_id, full_name, created_at) VALUES
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', 'alice@company.com', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'Alice Johnson', NOW() - INTERVAL '35 days'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e02', 'bob@company.com', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'Bob Smith', NOW() - INTERVAL '35 days'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e03', 'charlie@company.com', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'Charlie Brown', NOW() - INTERVAL '35 days'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e04', 'david@company.com', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'David Miller', NOW() - INTERVAL '35 days'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e05', 'eve@company.com', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13', 'Eve Anderson', NOW() - INTERVAL '35 days'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e06', 'frank@company.com', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14', 'Frank Wright', NOW() - INTERVAL '35 days'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e07', 'grace@company.com', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b15', 'Grace Hopper', NOW() - INTERVAL '35 days'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e08', 'hank@company.com', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b16', 'Hank Hill', NOW() - INTERVAL '35 days')
ON CONFLICT (email) DO NOTHING;

DELETE FROM mood_entries WHERE user_id IN (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e02',
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e03', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e04',
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e05', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e06',
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e07', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e08'
);

DO $$
DECLARE
    u_id UUID;
    check_day DATE;
    entry_id UUID;
    score INT;
    feel_id UUID;
    cont_id UUID;
    journal TEXT;
BEGIN
    FOR u_id IN SELECT id FROM users WHERE id::text LIKE 'e0eebc99%' LOOP
        FOR check_day IN SELECT (CURRENT_DATE - i)::DATE FROM generate_series(0, 30) i LOOP
            
            IF EXTRACT(ISODOW FROM check_day) IN (6, 7) THEN
                CONTINUE;
            END IF;

            IF u_id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01' THEN
                score := floor(random() * 3 + 3);
            ELSIF u_id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e02' THEN
                score := floor(random() * 3 + 1.8);
            ELSIF u_id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e03' THEN
                score := floor(random() * 4 + 1.5);
            ELSIF u_id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e08' THEN
                score := floor(random() * 2 + 2.5);
            ELSE
                score := floor(random() * 3 + 3);
            END IF;

            IF score > 5 THEN score := 5; END IF;
            IF score < 1 THEN score := 1; END IF;

            journal := NULL;
            IF random() < 0.2 THEN
                IF score = 5 THEN
                    journal := 'Had an amazing release deployment today. Feel super accomplished.';
                ELSIF score = 4 THEN
                    journal := 'Quiet productive day. Caught up on code reviews.';
                ELSIF score = 3 THEN
                    journal := 'A bit busy with meetings, but overall fine.';
                ELSIF score = 2 THEN
                    journal := 'Too many context switches today. Feeling a bit anxious about deadlines.';
                ELSIF score = 1 THEN
                    journal := 'Extremely burnt out. Critical server crash took up the entire day.';
                END IF;
            END IF;

            INSERT INTO mood_entries (user_id, mood_score, journal_text, created_at)
            VALUES (u_id, score, journal, check_day + time '09:30:00' + (random() * interval '6 hours'))
            RETURNING id INTO entry_id;

            FOR feel_id IN (
                SELECT id FROM feelings 
                WHERE mood_score_relation = score 
                ORDER BY random() LIMIT floor(random() * 2 + 1)
            ) LOOP
                INSERT INTO entry_feelings (entry_id, feeling_id) VALUES (entry_id, feel_id);
            END LOOP;

            FOR cont_id IN (
                SELECT id FROM contributors 
                ORDER BY random() LIMIT floor(random() * 2 + 1)
            ) LOOP
                INSERT INTO entry_contributors (entry_id, contributor_id) VALUES (entry_id, cont_id);
            END LOOP;

        END LOOP;
    END LOOP;
END;
$$;
