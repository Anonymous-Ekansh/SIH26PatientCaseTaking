BEGIN;
SELECT plan(4);

-- 1. Setup Test Users
-- Create users in auth.users
INSERT INTO auth.users (id, email) VALUES 
('00000000-0000-0000-0000-000000000001', 'test1@example.com'),
('00000000-0000-0000-0000-000000000002', 'test2@example.com');

-- test1 gets NO profile (so no role)
-- test2 gets 'regulator_ro' role
INSERT INTO public.ct_profiles (id, email, role) VALUES 
('00000000-0000-0000-0000-000000000002', 'test2@example.com', 'regulator_ro');

-- 2. Test Forbidden Operations for No Profile user
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SET request.jwt.claim.role = 'authenticated';

SELECT throws_ok(
    $$ INSERT INTO ct_adverse_events (participant_id, study_id, site_id) VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000') $$,
    'new row violates row-level security policy for table "ct_adverse_events"',
    'User with no profile cannot insert AEs'
);

-- 3. Test Forbidden Operations for Regulator RO
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
SELECT throws_ok(
    $$ INSERT INTO ct_adverse_events (participant_id, study_id, site_id) VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000') $$,
    'new row violates row-level security policy for table "ct_adverse_events"',
    'Regulator cannot insert AEs'
);

-- Reset auth
SET request.jwt.claim.sub = '';
SET request.jwt.claim.role = 'postgres';

-- 4. Test Audit Chain Intact on Seed Data
SELECT is(
    (SELECT ok FROM ct_verify_audit_chain()),
    true,
    'Audit chain should be intact initially'
);

-- 5. Test Audit Chain Tampering Detection
-- Disable trigger, tamper row, enable trigger
ALTER TABLE ct_audit_log DISABLE TRIGGER ALL;
UPDATE ct_audit_log SET new_data = '{"tampered": "yes"}'::jsonb WHERE id = (SELECT min(id) FROM ct_audit_log);
ALTER TABLE ct_audit_log ENABLE TRIGGER ALL;

SELECT is(
    (SELECT ok FROM ct_verify_audit_chain()),
    false,
    'Audit chain should detect tampering'
);

SELECT * FROM finish();
ROLLBACK;
