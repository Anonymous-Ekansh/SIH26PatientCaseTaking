-- Migration: ct_kpis
-- Description: CTMS KPI views and alerting function.
-- Creates additive views and functions only. No legacy object changed.

CREATE OR REPLACE VIEW ct_v_enrolment WITH (security_invoker = true) AS
SELECT 
    s.id AS study_id,
    s.target_enrolment,
    COUNT(p.id) AS enrolled_count,
    CASE 
        WHEN s.target_enrolment > 0 THEN (COUNT(p.id)::numeric / s.target_enrolment) * 100 
        ELSE 0 
    END AS enrolled_percent,
    CASE 
        WHEN CURRENT_DATE <= s.planned_start THEN 0
        WHEN CURRENT_DATE >= s.planned_end THEN 100
        WHEN s.planned_start IS NOT NULL AND s.planned_end IS NOT NULL AND s.planned_start < s.planned_end THEN
            ((CURRENT_DATE - s.planned_start)::numeric / (s.planned_end - s.planned_start)) * 100
        ELSE 0
    END AS planned_percent,
    CASE 
        WHEN s.target_enrolment > 0 AND s.planned_start IS NOT NULL AND s.planned_end IS NOT NULL THEN
            ((COUNT(p.id)::numeric / s.target_enrolment) * 100) < (((CURRENT_DATE - s.planned_start)::numeric / (s.planned_end - s.planned_start)) * 100)
        ELSE false
    END AS lag_flag
FROM ct_studies s
LEFT JOIN ct_participants p ON s.id = p.study_id AND p.status IN ('enrolled', 'completed', 'withdrawn')
GROUP BY s.id, s.target_enrolment, s.planned_start, s.planned_end;

CREATE OR REPLACE VIEW ct_v_visit_adherence WITH (security_invoker = true) AS
SELECT 
    p.study_id,
    p.site_id,
    COUNT(v.id) FILTER (WHERE v.status = 'scheduled') AS scheduled,
    COUNT(v.id) FILTER (WHERE v.status = 'done') AS done,
    COUNT(v.id) FILTER (WHERE v.status = 'missed') AS missed,
    COUNT(v.id) FILTER (WHERE (v.status = 'scheduled' OR v.status IS NULL) AND v.scheduled_on < CURRENT_DATE) AS overdue
FROM ct_participants p
JOIN ct_visits v ON p.id = v.participant_id
GROUP BY p.study_id, p.site_id;

CREATE OR REPLACE VIEW ct_v_query_aging WITH (security_invoker = true) AS
SELECT 
    study_id,
    COUNT(id) FILTER (WHERE status = 'open') AS open_queries,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (NOW() - opened_at))) AS median_age_days,
    MAX(EXTRACT(DAY FROM (NOW() - opened_at))) AS max_age_days
FROM ct_queries
WHERE status = 'open'
GROUP BY study_id;

CREATE OR REPLACE VIEW ct_v_deviations WITH (security_invoker = true) AS
SELECT 
    p.study_id,
    COUNT(d.id) AS deviation_count,
    CASE 
        WHEN COUNT(v.id) > 0 THEN (COUNT(d.id)::numeric / COUNT(v.id)) * 100
        ELSE 0
    END AS deviations_per_100_visits
FROM ct_participants p
LEFT JOIN ct_visits v ON p.id = v.participant_id
LEFT JOIN ct_deviations d ON p.id = d.participant_id
GROUP BY p.study_id;

CREATE OR REPLACE VIEW ct_v_ethics_expiry WITH (security_invoker = true) AS
SELECT 
    study_id,
    committee_name,
    valid_until,
    continuing_review_due,
    (valid_until - CURRENT_DATE) AS days_to_valid_until,
    (continuing_review_due - CURRENT_DATE) AS days_to_review_due,
    (valid_until - CURRENT_DATE) < 30 OR (continuing_review_due - CURRENT_DATE) < 30 AS expiring_under_30_days
FROM ct_ethics_approvals
WHERE status = 'approved' OR status IS NULL;

CREATE OR REPLACE VIEW ct_v_ctri WITH (security_invoker = true) AS
SELECT 
    id AS study_id,
    (ctri_number IS NOT NULL AND ctri_number != '') AS ctri_present,
    ctri_registered_on,
    ctri_update_due,
    (ctri_update_due - CURRENT_DATE) AS days_left
FROM ct_studies;

CREATE OR REPLACE VIEW ct_v_monitoring WITH (security_invoker = true) AS
SELECT 
    id AS monitoring_id,
    study_id,
    site_id,
    planned_on,
    actual_on,
    status,
    (CURRENT_DATE - planned_on) AS days_overdue
FROM ct_monitoring_visits
WHERE (status = 'planned' OR status IS NULL) AND planned_on < CURRENT_DATE;

CREATE OR REPLACE VIEW ct_v_ae_summary WITH (security_invoker = true) AS
SELECT 
    p.study_id,
    c.soc,
    ae.severity,
    ae.serious,
    ae.causality,
    COUNT(ae.id) AS ae_count
FROM ct_adverse_events ae
JOIN ct_participants p ON ae.participant_id = p.id
LEFT JOIN ct_ae_coding c ON ae.id = c.ae_id
GROUP BY p.study_id, c.soc, ae.severity, ae.serious, ae.causality;

CREATE OR REPLACE VIEW ct_v_sae_timeliness WITH (security_invoker = true) AS
SELECT 
    clk.id AS clock_id,
    p.study_id,
    clk.ae_id,
    clk.milestone,
    clk.due_at,
    clk.satisfied_at,
    EXTRACT(EPOCH FROM (clk.due_at - NOW())) / 3600 AS hours_left,
    CASE
        WHEN clk.satisfied_at IS NOT NULL AND clk.satisfied_at <= clk.due_at THEN 'on_time'
        WHEN clk.satisfied_at IS NOT NULL AND clk.satisfied_at > clk.due_at THEN 'late'
        WHEN clk.satisfied_at IS NULL AND clk.due_at >= NOW() THEN 'open'
        WHEN clk.satisfied_at IS NULL AND clk.due_at < NOW() THEN 'overdue'
    END AS status
FROM ct_ae_clocks clk
JOIN ct_adverse_events ae ON clk.ae_id = ae.id
JOIN ct_participants p ON ae.participant_id = p.id;

-- Alerts Function
CREATE OR REPLACE FUNCTION ct_run_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    v_rule_id UUID;
    v_enabled BOOLEAN;
BEGIN
    -- 1. Enrolment lag
    SELECT id, enabled INTO v_rule_id, v_enabled FROM ct_alert_rules WHERE metric = 'enrolment_lag' LIMIT 1;
    IF v_enabled THEN
        FOR r IN SELECT study_id FROM ct_v_enrolment WHERE lag_flag = true LOOP
            INSERT INTO ct_alerts (rule_id, study_id, message, status, dedupe_key)
            VALUES (v_rule_id, r.study_id, 'Enrolment is lagging behind plan', 'open', 'enrolment_lag_' || r.study_id)
            ON CONFLICT (dedupe_key) DO NOTHING;
        END LOOP;
    END IF;

    -- 2. Ethics Expiring
    SELECT id, enabled INTO v_rule_id, v_enabled FROM ct_alert_rules WHERE metric = 'ethics_days_left' LIMIT 1;
    IF v_enabled THEN
        FOR r IN SELECT study_id, committee_name, days_to_valid_until FROM ct_v_ethics_expiry WHERE expiring_under_30_days = true LOOP
            INSERT INTO ct_alerts (rule_id, study_id, message, status, dedupe_key)
            VALUES (v_rule_id, r.study_id, 'Ethics ' || r.committee_name || ' expiring in ' || COALESCE(r.days_to_valid_until, 0) || ' days', 'open', 'ethics_exp_' || r.study_id || '_' || r.committee_name)
            ON CONFLICT (dedupe_key) DO NOTHING;
        END LOOP;
    END IF;

    -- 3. CTRI Update
    SELECT id, enabled INTO v_rule_id, v_enabled FROM ct_alert_rules WHERE metric = 'ctri_days_left' LIMIT 1;
    IF v_enabled THEN
        FOR r IN SELECT study_id, days_left FROM ct_v_ctri WHERE days_left < 30 LOOP
            INSERT INTO ct_alerts (rule_id, study_id, message, status, dedupe_key)
            VALUES (v_rule_id, r.study_id, 'CTRI update due in ' || COALESCE(r.days_left, 0) || ' days', 'open', 'ctri_upd_' || r.study_id)
            ON CONFLICT (dedupe_key) DO NOTHING;
        END LOOP;
    END IF;

    -- 4. Monitoring Overdue
    SELECT id, enabled INTO v_rule_id, v_enabled FROM ct_alert_rules WHERE metric = 'monitoring_days_overdue' LIMIT 1;
    IF v_enabled THEN
        FOR r IN SELECT study_id, monitoring_id, days_overdue FROM ct_v_monitoring WHERE days_overdue > 7 LOOP
            INSERT INTO ct_alerts (rule_id, study_id, message, status, dedupe_key)
            VALUES (v_rule_id, r.study_id, 'Monitoring visit ' || r.monitoring_id || ' overdue by ' || COALESCE(r.days_overdue, 0) || ' days', 'open', 'mon_overdue_' || r.monitoring_id)
            ON CONFLICT (dedupe_key) DO NOTHING;
        END LOOP;
    END IF;

    -- 5. SAE Clock Risk
    SELECT id, enabled INTO v_rule_id, v_enabled FROM ct_alert_rules WHERE metric = 'sae_hours_left' LIMIT 1;
    IF v_enabled THEN
        FOR r IN SELECT study_id, clock_id, hours_left, status FROM ct_v_sae_timeliness WHERE (hours_left < 6 OR status = 'overdue') AND status != 'on_time' AND status != 'late' LOOP
            INSERT INTO ct_alerts (rule_id, study_id, message, status, dedupe_key)
            VALUES (v_rule_id, r.study_id, 'SAE clock ' || r.clock_id || ' is ' || r.status || ' (' || COALESCE(r.hours_left, 0) || ' hours left)', 'open', 'sae_clock_' || r.clock_id)
            ON CONFLICT (dedupe_key) DO NOTHING;
        END LOOP;
    END IF;

    -- 6. Query Open Aging
    SELECT id, enabled INTO v_rule_id, v_enabled FROM ct_alert_rules WHERE metric = 'query_age_days' LIMIT 1;
    IF v_enabled THEN
        FOR r IN SELECT study_id, max_age_days FROM ct_v_query_aging WHERE max_age_days > 14 LOOP
            INSERT INTO ct_alerts (rule_id, study_id, message, status, dedupe_key)
            VALUES (v_rule_id, r.study_id, 'Queries open for up to ' || r.max_age_days || ' days', 'open', 'query_age_' || r.study_id)
            ON CONFLICT (dedupe_key) DO NOTHING;
        END LOOP;
    END IF;
END;
$$;

-- Insert default rules
INSERT INTO ct_alert_rules (name, metric, operator, threshold, severity, enabled)
SELECT name, metric, operator, threshold, severity, enabled FROM (VALUES
    ('Enrolment Lag', 'enrolment_lag', '==', 1::numeric, 'warning', true),
    ('Ethics Expiring Soon', 'ethics_days_left', '<', 30::numeric, 'critical', true),
    ('CTRI Update Due', 'ctri_days_left', '<', 30::numeric, 'warning', true),
    ('Monitoring Overdue', 'monitoring_days_overdue', '>', 7::numeric, 'critical', true),
    ('SAE Clock Risk', 'sae_hours_left', '<', 6::numeric, 'critical', true),
    ('Query Open Aging', 'query_age_days', '>', 14::numeric, 'warning', true)
) AS v(name, metric, operator, threshold, severity, enabled)
WHERE NOT EXISTS (
    SELECT 1 FROM ct_alert_rules WHERE metric = v.metric
);

-- ROLLBACK SECTION:
/*
DROP FUNCTION IF EXISTS ct_run_alerts();
DROP VIEW IF EXISTS ct_v_sae_timeliness;
DROP VIEW IF EXISTS ct_v_ae_summary;
DROP VIEW IF EXISTS ct_v_monitoring;
DROP VIEW IF EXISTS ct_v_ctri;
DROP VIEW IF EXISTS ct_v_ethics_expiry;
DROP VIEW IF EXISTS ct_v_deviations;
DROP VIEW IF EXISTS ct_v_query_aging;
DROP VIEW IF EXISTS ct_v_visit_adherence;
DROP VIEW IF EXISTS ct_v_enrolment;
*/
