-- Migration: ct_safety
-- Description: Adverse events, coding dictionaries, regulatory clocks and reports for CTMS.
-- Creates additive tables only. No legacy object changed.

CREATE TABLE IF NOT EXISTS ct_adverse_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    participant_id UUID NOT NULL REFERENCES ct_participants(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES ct_visits(id) ON DELETE SET NULL, -- nullable
    verbatim_term TEXT NOT NULL,
    onset_at TIMESTAMPTZ,
    aware_at TIMESTAMPTZ,
    severity TEXT, -- mild, moderate, severe
    serious BOOLEAN,
    seriousness_criteria TEXT[], -- death, life_threatening, hospitalisation, disability, congenital_anomaly, medically_important
    causality TEXT, -- certain, probable, possible, unlikely, conditional, unassessable
    causality_note TEXT,
    outcome TEXT,
    action_taken TEXT,
    source TEXT, -- voice_flag, form, lab, staff
    status TEXT, -- candidate, confirmed, rejected
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    reject_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_ct_adverse_events_participant_id ON ct_adverse_events(participant_id);
CREATE INDEX IF NOT EXISTS idx_ct_adverse_events_visit_id ON ct_adverse_events(visit_id);

CREATE TABLE IF NOT EXISTS ct_dictionary_demo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    code TEXT NOT NULL UNIQUE,
    term TEXT NOT NULL,
    soc TEXT NOT NULL -- System Organ Class
);

COMMENT ON TABLE ct_dictionary_demo IS 'illustrative demo, NOT MedDRA/WHODrug';

INSERT INTO ct_dictionary_demo (code, term, soc) VALUES
('D001', 'Headache', 'Nervous System Disorders'),
('D002', 'Dizziness', 'Nervous System Disorders'),
('D003', 'Somnolence', 'Nervous System Disorders'),
('D004', 'Tremor', 'Nervous System Disorders'),
('D005', 'Insomnia', 'Psychiatric Disorders'),
('D006', 'Anxiety', 'Psychiatric Disorders'),
('D007', 'Depression', 'Psychiatric Disorders'),
('D008', 'Nausea', 'Gastrointestinal Disorders'),
('D009', 'Vomiting', 'Gastrointestinal Disorders'),
('D010', 'Diarrhea', 'Gastrointestinal Disorders'),
('D011', 'Constipation', 'Gastrointestinal Disorders'),
('D012', 'Abdominal Pain', 'Gastrointestinal Disorders'),
('D013', 'Dyspepsia', 'Gastrointestinal Disorders'),
('D014', 'Rash', 'Skin and Subcutaneous Tissue Disorders'),
('D015', 'Pruritus', 'Skin and Subcutaneous Tissue Disorders'),
('D016', 'Urticaria', 'Skin and Subcutaneous Tissue Disorders'),
('D017', 'Erythema', 'Skin and Subcutaneous Tissue Disorders'),
('D018', 'Fever', 'General Disorders'),
('D019', 'Fatigue', 'General Disorders'),
('D020', 'Chills', 'General Disorders'),
('D021', 'Asthenia', 'General Disorders'),
('D022', 'Cough', 'Respiratory Disorders'),
('D023', 'Dyspnea', 'Respiratory Disorders'),
('D024', 'Nasal Congestion', 'Respiratory Disorders'),
('D025', 'Palpitations', 'Cardiac Disorders'),
('D026', 'Tachycardia', 'Cardiac Disorders'),
('D027', 'Hypertension', 'Vascular Disorders'),
('D028', 'Hypotension', 'Vascular Disorders'),
('D029', 'Myalgia', 'Musculoskeletal Disorders'),
('D030', 'Arthralgia', 'Musculoskeletal Disorders')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS ct_ae_coding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    ae_id UUID NOT NULL REFERENCES ct_adverse_events(id) ON DELETE CASCADE,
    dictionary TEXT, -- demo, meddra, whodrug
    code TEXT,
    term TEXT,
    soc TEXT,
    coded_by UUID,
    coded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ct_ae_coding_ae_id ON ct_ae_coding(ae_id);

CREATE TABLE IF NOT EXISTS ct_rule_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    verify_note TEXT,
    rules JSONB NOT NULL,
    UNIQUE(name, version)
);

INSERT INTO ct_rule_packs (name, version, verify_note, rules) VALUES (
    'NDCT_2019_default',
    '1.0',
    'Verify against the current gazette before production',
    '{"investigator_initial_hours": 24, "investigator_detailed_days": 14, "sponsor_analysis_days": 14, "ethics_committee_days": 30, "clock_start": "awareness"}'::jsonb
) ON CONFLICT (name, version) DO NOTHING;

CREATE TABLE IF NOT EXISTS ct_ae_clocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    ae_id UUID NOT NULL REFERENCES ct_adverse_events(id) ON DELETE CASCADE,
    rule_pack_id UUID NOT NULL REFERENCES ct_rule_packs(id) ON DELETE RESTRICT,
    milestone TEXT NOT NULL, -- initial_report, detailed_report, ec_report
    recipient TEXT NOT NULL,
    due_at TIMESTAMPTZ,
    satisfied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ct_ae_clocks_ae_id ON ct_ae_clocks(ae_id);
CREATE INDEX IF NOT EXISTS idx_ct_ae_clocks_rule_pack_id ON ct_ae_clocks(rule_pack_id);

CREATE TABLE IF NOT EXISTS ct_regulatory_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    ae_id UUID NOT NULL REFERENCES ct_adverse_events(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    recipient TEXT NOT NULL,
    submitted_at TIMESTAMPTZ,
    reference TEXT,
    payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_ct_regulatory_reports_ae_id ON ct_regulatory_reports(ae_id);


-- ROLLBACK SECTION:
/*
DROP TABLE IF EXISTS ct_regulatory_reports;
DROP TABLE IF EXISTS ct_ae_clocks;
DROP TABLE IF EXISTS ct_rule_packs;
DROP TABLE IF EXISTS ct_ae_coding;
DROP TABLE IF EXISTS ct_dictionary_demo;
DROP TABLE IF EXISTS ct_adverse_events;
*/
