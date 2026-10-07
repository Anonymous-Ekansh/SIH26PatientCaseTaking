-- Migration: ct_platform
-- Description: Profiles, Audit Logging, eSignatures, Alerts, RLS, and Storage for CTMS.
-- Creates additive tables only. No legacy object changed.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS ct_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL, 
    site_id UUID REFERENCES ct_sites(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ct_profiles_user_id ON ct_profiles(user_id);

CREATE OR REPLACE FUNCTION public.ct_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER STABLE
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM public.ct_profiles WHERE user_id = auth.uid();
  RETURN v_role;
END;
$$;

CREATE TABLE IF NOT EXISTS ct_audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_id UUID,
    actor_role TEXT,
    old_data JSONB,
    new_data JSONB,
    at TIMESTAMPTZ DEFAULT NOW(),
    prev_hash TEXT,
    row_hash TEXT
);

CREATE TABLE IF NOT EXISTS ct_esignatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    record_table TEXT NOT NULL,
    record_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meaning TEXT NOT NULL, 
    signed_at TIMESTAMPTZ DEFAULT NOW(),
    record_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ct_alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    metric TEXT NOT NULL,
    operator TEXT NOT NULL,
    threshold NUMERIC NOT NULL,
    severity TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS ct_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    rule_id UUID NOT NULL REFERENCES ct_alert_rules(id) ON DELETE CASCADE,
    study_id UUID REFERENCES ct_studies(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status TEXT NOT NULL, 
    raised_at TIMESTAMPTZ DEFAULT NOW(),
    dedupe_key TEXT UNIQUE NOT NULL
);

-- Trigger functions

CREATE OR REPLACE FUNCTION ct_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role TEXT;
    v_old_data JSONB;
    v_new_data JSONB;
    v_record_id TEXT;
    v_prev_hash TEXT;
    v_row_hash TEXT;
    v_entry_text TEXT;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('ct_audit_lock'));

    v_actor_id := auth.uid();
    v_actor_role := public.ct_role();

    IF TG_OP = 'INSERT' THEN
        v_new_data := to_jsonb(NEW);
        v_old_data := NULL;
        v_record_id := NEW.id::TEXT;
    ELSIF TG_OP = 'UPDATE' THEN
        v_new_data := to_jsonb(NEW);
        v_old_data := to_jsonb(OLD);
        v_record_id := NEW.id::TEXT;
    ELSIF TG_OP = 'DELETE' THEN
        v_new_data := NULL;
        v_old_data := to_jsonb(OLD);
        v_record_id := OLD.id::TEXT;
    END IF;

    SELECT row_hash INTO v_prev_hash
    FROM public.ct_audit_log
    ORDER BY id DESC LIMIT 1;
    
    IF v_prev_hash IS NULL THEN
        v_prev_hash := '0000000000000000000000000000000000000000000000000000000000000000';
    END IF;

    v_entry_text := TG_TABLE_NAME || v_record_id || TG_OP || COALESCE(v_actor_id::TEXT, '') || COALESCE(v_actor_role, '') || COALESCE(v_old_data::TEXT, '') || COALESCE(v_new_data::TEXT, '');
    v_row_hash := encode(digest(v_prev_hash || v_entry_text, 'sha256'), 'hex');

    INSERT INTO public.ct_audit_log (table_name, record_id, action, actor_id, actor_role, old_data, new_data, prev_hash, row_hash)
    VALUES (TG_TABLE_NAME, v_record_id, TG_OP, v_actor_id, v_actor_role, v_old_data, v_new_data, v_prev_hash, v_row_hash);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION ct_prevent_audit_update_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Updates and Deletes are not permitted on the audit log';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_modify ON ct_audit_log;
CREATE TRIGGER trg_prevent_audit_modify
BEFORE UPDATE OR DELETE ON ct_audit_log
FOR EACH ROW EXECUTE FUNCTION ct_prevent_audit_update_delete();

CREATE OR REPLACE FUNCTION public.ct_verify_audit_chain()
RETURNS TABLE (ok BOOLEAN, checked INT, first_broken_id BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rec RECORD;
    v_expected_prev TEXT := '0000000000000000000000000000000000000000000000000000000000000000';
    v_computed_hash TEXT;
    v_entry_text TEXT;
    v_checked INT := 0;
BEGIN
    FOR rec IN SELECT * FROM public.ct_audit_log ORDER BY id ASC LOOP
        IF rec.prev_hash != v_expected_prev THEN
            RETURN QUERY SELECT FALSE, v_checked, rec.id;
            RETURN;
        END IF;

        v_entry_text := rec.table_name || rec.record_id || rec.action || COALESCE(rec.actor_id::TEXT, '') || COALESCE(rec.actor_role, '') || COALESCE(rec.old_data::TEXT, '') || COALESCE(rec.new_data::TEXT, '');
        v_computed_hash := encode(digest(rec.prev_hash || v_entry_text, 'sha256'), 'hex');

        IF rec.row_hash != v_computed_hash THEN
            RETURN QUERY SELECT FALSE, v_checked, rec.id;
            RETURN;
        END IF;

        v_expected_prev := rec.row_hash;
        v_checked := v_checked + 1;
    END LOOP;

    RETURN QUERY SELECT TRUE, v_checked, NULL::BIGINT;
END;
$$;


-- Attach audit triggers and setup RLS
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'ct_%' 
    LOOP
        -- Audit trigger for everything except audit_log
        IF tbl.tablename != 'ct_audit_log' THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%1$I ON %1$I;', tbl.tablename);
            EXECUTE format('
                CREATE TRIGGER trg_audit_%1$I
                AFTER INSERT OR UPDATE OR DELETE ON %1$I
                FOR EACH ROW EXECUTE FUNCTION public.ct_audit_trigger();
            ', tbl.tablename);
        END IF;

        -- RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "ct_read_all" ON %I;', tbl.tablename);

        IF tbl.tablename = 'ct_participant_pii' THEN
            EXECUTE format('CREATE POLICY "ct_read_all" ON %I FOR SELECT TO authenticated USING (public.ct_role() IN (''coordinator'', ''pi'', ''admin''));', tbl.tablename);
        ELSE
            EXECUTE format('CREATE POLICY "ct_read_all" ON %I FOR SELECT TO authenticated USING (public.ct_role() IS NOT NULL);', tbl.tablename);
        END IF;
    END LOOP;
END;
$$;

-- PI Write Policy
DO $$
DECLARE tbl TEXT;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'ct_%' AND tablename NOT IN ('ct_profiles', 'ct_rule_packs', 'ct_alert_rules', 'ct_dictionary_demo', 'ct_audit_log') LOOP
        EXECUTE format('DROP POLICY IF EXISTS "ct_pi_write" ON %I;', tbl);
        EXECUTE format('CREATE POLICY "ct_pi_write" ON %I FOR ALL TO authenticated USING (public.ct_role() = ''pi'');', tbl);
    END LOOP;
END;
$$;

-- Coordinator Write Policy
DO $$
DECLARE tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['ct_participants', 'ct_participant_pii', 'ct_consents', 'ct_consent_versions', 'ct_visits', 'ct_form_responses', 'ct_lab_documents', 'ct_adverse_events', 'ct_queries']) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "ct_coord_write" ON %I;', tbl);
        EXECUTE format('CREATE POLICY "ct_coord_write" ON %I FOR ALL TO authenticated USING (public.ct_role() = ''coordinator'');', tbl);
    END LOOP;
END;
$$;

-- Monitor Write Policy
DO $$
DECLARE tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['ct_queries', 'ct_deviations', 'ct_monitoring_visits']) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "ct_monitor_write" ON %I;', tbl);
        EXECUTE format('CREATE POLICY "ct_monitor_write" ON %I FOR ALL TO authenticated USING (public.ct_role() = ''monitor'');', tbl);
    END LOOP;
END;
$$;

-- Pharmacovigilance Write Policy
DO $$
DECLARE tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['ct_adverse_events', 'ct_ae_coding', 'ct_ae_clocks', 'ct_regulatory_reports']) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "ct_pv_write" ON %I;', tbl);
        EXECUTE format('CREATE POLICY "ct_pv_write" ON %I FOR ALL TO authenticated USING (public.ct_role() = ''pharmacovigilance'');', tbl);
    END LOOP;
END;
$$;

-- Ethics Committee Write Policy
DO $$
DECLARE tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['ct_ethics_approvals', 'ct_adverse_events']) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "ct_ec_write" ON %I;', tbl);
        EXECUTE format('CREATE POLICY "ct_ec_write" ON %I FOR ALL TO authenticated USING (public.ct_role() = ''ethics_committee'');', tbl);
    END LOOP;
END;
$$;

-- Admin Write Policy
DO $$
DECLARE tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['ct_studies', 'ct_sites', 'ct_profiles', 'ct_rule_packs', 'ct_alert_rules', 'ct_alerts']) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "ct_admin_write" ON %I;', tbl);
        EXECUTE format('CREATE POLICY "ct_admin_write" ON %I FOR ALL TO authenticated USING (public.ct_role() = ''admin'');', tbl);
    END LOOP;
END;
$$;


-- Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ct-files', 'ct-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "CT files accessible by CT profiles" ON storage.objects;
CREATE POLICY "CT files accessible by CT profiles"
ON storage.objects FOR ALL TO authenticated
USING ( bucket_id = 'ct-files' AND public.ct_role() IS NOT NULL );

-- ROLLBACK SECTION:
/*
DROP POLICY IF EXISTS "CT files accessible by CT profiles" ON storage.objects;
DELETE FROM storage.buckets WHERE id = 'ct-files';

DO $$
DECLARE tbl TEXT;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'ct_%' LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%1$I ON %1$I;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "ct_read_all" ON %I;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "ct_pi_write" ON %I;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "ct_coord_write" ON %I;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "ct_monitor_write" ON %I;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "ct_pv_write" ON %I;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "ct_ec_write" ON %I;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "ct_admin_write" ON %I;', tbl);
    END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS public.ct_verify_audit_chain();
DROP TRIGGER IF EXISTS trg_prevent_audit_modify ON ct_audit_log;
DROP FUNCTION IF EXISTS public.ct_prevent_audit_update_delete();
DROP FUNCTION IF EXISTS public.ct_audit_trigger();
DROP FUNCTION IF EXISTS public.ct_role();

DROP TABLE IF EXISTS ct_alerts;
DROP TABLE IF EXISTS ct_alert_rules;
DROP TABLE IF EXISTS ct_esignatures;
DROP TABLE IF EXISTS ct_audit_log;
DROP TABLE IF EXISTS ct_profiles;
*/
