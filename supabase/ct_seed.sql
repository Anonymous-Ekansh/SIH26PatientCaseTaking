-- Seed script: ct_seed.sql
-- NOT A MIGRATION
-- Synthetic data only

DO $$
DECLARE
    v_study1 UUID;
    v_study2 UUID;
    v_study3 UUID;
    v_site1 UUID;
    v_site2 UUID;
    v_site3 UUID;
    v_site4 UUID;
    v_vt1 UUID;
    v_vt2 UUID;
    v_form1 UUID;
    v_ae1 UUID;
    v_ae2 UUID;
    v_p1 UUID;
    v_p_cursor UUID;
    v_rule_pack UUID;
BEGIN
    -- 4 Sites
    INSERT INTO ct_sites (name, city, state) VALUES 
    ('Synthetic Site Alpha', 'Mumbai', 'Maharashtra') RETURNING id INTO v_site1;
    INSERT INTO ct_sites (name, city, state) VALUES 
    ('Synthetic Site Beta', 'Delhi', 'Delhi') RETURNING id INTO v_site2;
    INSERT INTO ct_sites (name, city, state) VALUES 
    ('Synthetic Site Gamma', 'Bengaluru', 'Karnataka') RETURNING id INTO v_site3;
    INSERT INTO ct_sites (name, city, state) VALUES 
    ('Synthetic Site Delta', 'Chennai', 'Tamil Nadu') RETURNING id INTO v_site4;

    -- 3 Studies
    INSERT INTO ct_studies (title, short_code, design, phase, status, target_enrolment, planned_start, planned_end, ctri_number, ctri_registered_on, ctri_update_due, regime) VALUES
    ('Synthetic Knee Osteoarthritis Interventional', 'SYN-KOA-01', 'interventional', 'Phase 2', 'active', 100, CURRENT_DATE - 100, CURRENT_DATE + 200, 'FAKE-CTRI-001', CURRENT_DATE - 100, CURRENT_DATE + 20, 'gcp_asu_only') RETURNING id INTO v_study1;
    
    INSERT INTO ct_studies (title, short_code, design, phase, status, target_enrolment, planned_start, planned_end, ctri_number, ctri_registered_on, ctri_update_due, regime) VALUES
    ('Synthetic Diabetes Adjunct Interventional', 'SYN-DIA-02', 'interventional', 'Phase 3', 'active', 200, CURRENT_DATE - 50, CURRENT_DATE + 300, 'FAKE-CTRI-002', CURRENT_DATE - 50, CURRENT_DATE + 150, 'gcp_asu_only') RETURNING id INTO v_study2;
    
    INSERT INTO ct_studies (title, short_code, design, phase, status, target_enrolment, planned_start, planned_end, ctri_number, ctri_registered_on, ctri_update_due, regime) VALUES
    ('Synthetic Prakriti Observational', 'SYN-PRA-03', 'observational', 'N/A', 'active', 500, CURRENT_DATE - 200, CURRENT_DATE + 100, 'FAKE-CTRI-003', CURRENT_DATE - 200, CURRENT_DATE + 30, 'gcp_asu_only') RETURNING id INTO v_study3;

    -- Study Sites
    INSERT INTO ct_study_sites (study_id, site_id, activation_date, site_target) VALUES
    (v_study1, v_site1, CURRENT_DATE - 90, 50),
    (v_study1, v_site2, CURRENT_DATE - 90, 50),
    (v_study2, v_site2, CURRENT_DATE - 40, 100),
    (v_study2, v_site3, CURRENT_DATE - 40, 100),
    (v_study3, v_site1, CURRENT_DATE - 190, 125),
    (v_study3, v_site2, CURRENT_DATE - 190, 125),
    (v_study3, v_site3, CURRENT_DATE - 190, 125),
    (v_study3, v_site4, CURRENT_DATE - 190, 125);

    -- Ethics Approvals
    -- One valid for a long time
    INSERT INTO ct_ethics_approvals (study_id, committee_name, approval_date, valid_until, continuing_review_due, status) VALUES
    (v_study1, 'Synthetic IEC Alpha', CURRENT_DATE - 95, CURRENT_DATE + 200, CURRENT_DATE + 200, 'approved');
    
    -- One expiring under 30 days
    INSERT INTO ct_ethics_approvals (study_id, committee_name, approval_date, valid_until, continuing_review_due, status) VALUES
    (v_study2, 'Synthetic IEC Beta', CURRENT_DATE - 300, CURRENT_DATE + 10, CURRENT_DATE + 10, 'approved');

    -- Milestones
    INSERT INTO ct_milestones (study_id, type, planned_date, actual_date) VALUES
    (v_study1, 'first_enrolment', CURRENT_DATE - 80, CURRENT_DATE - 80),
    (v_study2, 'first_enrolment', CURRENT_DATE - 30, CURRENT_DATE - 30);

    -- Form Templates
    INSERT INTO ct_form_templates (study_id, name, kind, questions) VALUES
    (v_study1, 'Screening Questionnaire', 'screening', '[{"id": "q1", "type": "boolean", "text_en": "Are you above 18?", "text_hi": "क्या आप 18 वर्ष से अधिक आयु के हैं?"}]'),
    (v_study1, 'Visit Questionnaire', 'visit', '[{"id": "q1", "type": "scale", "text_en": "Knee pain level (1-10)?", "text_hi": "घुटने के दर्द का स्तर (1-10)?"}]'),
    (v_study1, 'Dashavidha Pariksha', 'dashavidha', '[{"id": "q1", "type": "text", "text_en": "Sara?", "text_hi": "सार?"}]'),
    (v_study1, 'Prakriti Assessment', 'prakriti', '[{"id": "q1", "type": "choice", "text_en": "Body Frame?", "text_hi": "शरीर का ढांचा?", "options": ["Thin", "Medium", "Broad"]}]'),
    (v_study1, 'Side Effects', 'side_effects', '[{"id": "q1", "type": "text", "text_en": "Any side effects?", "text_hi": "कोई दुष्प्रभाव?"}]');

    -- Consent versions
    INSERT INTO ct_consent_versions (study_id, version, language, body_text, effective_date) VALUES
    (v_study1, '1.0', 'en', 'Synthetic Consent Form Body English...', CURRENT_DATE - 100),
    (v_study1, '1.0', 'hi', 'Synthetic Consent Form Body Hindi...', CURRENT_DATE - 100);

    -- Visit Templates
    INSERT INTO ct_visit_templates (study_id, name, day_offset, window_days) VALUES
    (v_study1, 'V1 - Baseline', 0, 0) RETURNING id INTO v_vt1;
    INSERT INTO ct_visit_templates (study_id, name, day_offset, window_days) VALUES
    (v_study1, 'V2 - Follow up', 30, 3) RETURNING id INTO v_vt2;

    -- Participants (about 60)
    FOR i IN 1..60 LOOP
        INSERT INTO ct_participants (study_id, site_id, subject_code, status, enrolled_on)
        VALUES (
            CASE WHEN i <= 20 THEN v_study1 WHEN i <= 40 THEN v_study2 ELSE v_study3 END,
            CASE WHEN i % 2 = 0 THEN v_site1 ELSE v_site2 END,
            'SYN-SUBJ-' || LPAD(i::text, 3, '0'),
            'enrolled',
            CURRENT_DATE - (i * 2)
        ) RETURNING id INTO v_p_cursor;

        -- Create visits for study 1
        IF i <= 20 THEN
            INSERT INTO ct_visits (participant_id, template_id, scheduled_on, actual_on, status)
            VALUES (v_p_cursor, v_vt1, CURRENT_DATE - (i * 2), CURRENT_DATE - (i * 2), 'done');

            -- some overdue/missed
            IF i % 3 = 0 THEN
                INSERT INTO ct_visits (participant_id, template_id, scheduled_on, actual_on, status)
                VALUES (v_p_cursor, v_vt2, CURRENT_DATE - 5, NULL, 'scheduled'); -- overdue
            ELSIF i % 4 = 0 THEN
                INSERT INTO ct_visits (participant_id, template_id, scheduled_on, actual_on, status)
                VALUES (v_p_cursor, v_vt2, CURRENT_DATE - 10, NULL, 'missed'); -- missed
            END IF;
        END IF;

        IF i = 1 THEN v_p1 := v_p_cursor; END IF;
    END LOOP;

    -- 6 Deviations
    FOR i IN 1..6 LOOP
        INSERT INTO ct_deviations (participant_id, category, description, status)
        VALUES (v_p1, 'minor', 'Synthetic deviation out of window ' || i, 'open');
    END LOOP;

    -- 12 Queries of different ages
    FOR i IN 1..12 LOOP
        INSERT INTO ct_queries (study_id, text, status, opened_at)
        VALUES (v_study1, 'Synthetic Query ' || i, 'open', NOW() - ((i*3) || ' days')::interval);
    END LOOP;

    -- 1 overdue monitoring visit
    INSERT INTO ct_monitoring_visits (study_id, site_id, planned_on, status)
    VALUES (v_study1, v_site1, CURRENT_DATE - 15, 'planned');

    -- 20 Adverse Events (2 serious)
    FOR i IN 1..20 LOOP
        INSERT INTO ct_adverse_events (participant_id, verbatim_term, onset_at, aware_at, severity, serious, causality, status)
        VALUES (
            v_p1,
            'Synthetic AE ' || i,
            NOW() - (i || ' days')::interval,
            NOW() - (i || ' days')::interval,
            CASE WHEN i <= 2 THEN 'severe' ELSE 'mild' END,
            CASE WHEN i <= 2 THEN true ELSE false END,
            'possible',
            'confirmed'
        ) RETURNING id INTO v_ae1;

        -- Coding for some
        IF i > 2 AND i <= 10 THEN
            INSERT INTO ct_ae_coding (ae_id, dictionary, code, term, soc)
            VALUES (v_ae1, 'demo', 'D014', 'Rash', 'Skin and Subcutaneous Tissue Disorders');
        END IF;

        -- Clocks for serious
        IF i = 1 THEN
            -- overdue
            SELECT id INTO v_rule_pack FROM ct_rule_packs LIMIT 1;
            INSERT INTO ct_ae_clocks (ae_id, rule_pack_id, milestone, recipient, due_at, satisfied_at)
            VALUES (v_ae1, v_rule_pack, 'initial_report', 'Sponsor', NOW() - interval '2 days', NULL);
        ELSIF i = 2 THEN
            -- 4 hours left
            SELECT id INTO v_rule_pack FROM ct_rule_packs LIMIT 1;
            INSERT INTO ct_ae_clocks (ae_id, rule_pack_id, milestone, recipient, due_at, satisfied_at)
            VALUES (v_ae1, v_rule_pack, 'initial_report', 'Sponsor', NOW() + interval '4 hours', NULL);
        END IF;
    END LOOP;

END $$;
UPDATE ct_participants SET pin_hash = crypt('1234', gen_salt('bf'));
