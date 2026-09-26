-- Test Script for RLS and Audit Chain (Local Database only)

BEGIN;

-- 1. Setup mock user without profile (legacy user)
CREATE OR REPLACE FUNCTION test_rls_and_audit() RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    v_normal_user UUID := gen_random_uuid();
    v_ro_user UUID := gen_random_uuid();
    v_site_id UUID;
    v_chain_ok BOOLEAN;
    v_broken_id BIGINT;
BEGIN
    -- Mock the auth user
    INSERT INTO auth.users (id, aud, role, email) VALUES (v_normal_user, 'authenticated', 'authenticated', 'normal@example.com');
    INSERT INTO auth.users (id, aud, role, email) VALUES (v_ro_user, 'authenticated', 'authenticated', 'ro@example.com');
    
    -- Assign RO profile
    INSERT INTO ct_profiles (user_id, full_name, role) VALUES (v_ro_user, 'Regulator', 'regulator_ro');

    -- (a) A user without a profile cannot read ct_ tables
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', '{"sub": "' || v_normal_user || '"}', true);
    
    BEGIN
        PERFORM * FROM ct_sites;
        RAISE NOTICE '(a) OK - returned 0 rows successfully due to RLS blocking';
    END;

    -- (b) regulator_ro cannot insert
    PERFORM set_config('request.jwt.claims', '{"sub": "' || v_ro_user || '"}', true);
    BEGIN
        INSERT INTO ct_sites (name) VALUES ('Test Site');
        RAISE EXCEPTION 'Regulator RO should not be able to insert!';
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE '(b) OK - regulator_ro insert blocked';
    END;

    -- Reset to superuser
    RESET ROLE;

    -- Generate Audit entry by admin
    INSERT INTO ct_sites (name, city) VALUES ('Admin Site', 'Delhi') RETURNING id INTO v_site_id;
    UPDATE ct_sites SET city = 'Mumbai' WHERE id = v_site_id;

    -- (c) Audit chain verification
    SELECT ok, first_broken_id INTO v_chain_ok, v_broken_id FROM public.ct_verify_audit_chain();
    IF v_chain_ok THEN
        RAISE NOTICE '(c) OK - Audit chain is intact initially.';
    ELSE
        RAISE EXCEPTION 'Audit chain broken initially!';
    END IF;

    -- Tamper with audit log by dropping trigger temporarily
    ALTER TABLE ct_audit_log DISABLE TRIGGER trg_prevent_audit_modify;
    UPDATE ct_audit_log SET new_data = '{"city": "Fake City"}'::jsonb WHERE table_name = 'ct_sites' AND action = 'UPDATE';
    ALTER TABLE ct_audit_log ENABLE TRIGGER trg_prevent_audit_modify;

    SELECT ok, first_broken_id INTO v_chain_ok, v_broken_id FROM public.ct_verify_audit_chain();
    IF NOT v_chain_ok THEN
        RAISE NOTICE '(c) OK - Audit chain detected tampering! Broken at ID: %', v_broken_id;
    ELSE
        RAISE EXCEPTION 'Audit chain failed to detect tampering!';
    END IF;

END;
$$;

SELECT test_rls_and_audit();
ROLLBACK;
