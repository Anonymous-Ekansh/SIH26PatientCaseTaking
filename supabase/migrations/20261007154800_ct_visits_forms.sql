-- Migration: ct_visits_forms
-- Description: Visit and forms templates, responses, deviations, and monitoring for CTMS.
-- Creates additive tables only. No legacy object changed.

CREATE TABLE IF NOT EXISTS ct_visit_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    study_id UUID NOT NULL REFERENCES ct_studies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    day_offset INT,
    window_days INT
);

CREATE INDEX IF NOT EXISTS idx_ct_visit_templates_study_id ON ct_visit_templates(study_id);

CREATE TABLE IF NOT EXISTS ct_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    participant_id UUID NOT NULL REFERENCES ct_participants(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES ct_visit_templates(id) ON DELETE CASCADE,
    scheduled_on DATE,
    actual_on DATE,
    status TEXT -- scheduled, done, missed
);

CREATE INDEX IF NOT EXISTS idx_ct_visits_participant_id ON ct_visits(participant_id);
CREATE INDEX IF NOT EXISTS idx_ct_visits_template_id ON ct_visits(template_id);

CREATE TABLE IF NOT EXISTS ct_form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    study_id UUID REFERENCES ct_studies(id) ON DELETE CASCADE, -- nullable
    name TEXT NOT NULL,
    kind TEXT NOT NULL, -- screening, visit, dashavidha, prakriti, side_effects
    questions JSONB -- list of {id, text_en, text_hi, type, options}
);

CREATE INDEX IF NOT EXISTS idx_ct_form_templates_study_id ON ct_form_templates(study_id);

CREATE TABLE IF NOT EXISTS ct_form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    visit_id UUID NOT NULL REFERENCES ct_visits(id) ON DELETE CASCADE,
    form_template_id UUID NOT NULL REFERENCES ct_form_templates(id) ON DELETE CASCADE,
    answers JSONB,
    source TEXT, -- voice, touch, staff, ocr
    entered_by UUID,
    verified_by UUID,
    verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ct_form_responses_visit_id ON ct_form_responses(visit_id);
CREATE INDEX IF NOT EXISTS idx_ct_form_responses_form_template_id ON ct_form_responses(form_template_id);

CREATE TABLE IF NOT EXISTS ct_lab_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    visit_id UUID NOT NULL REFERENCES ct_visits(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    ocr_text TEXT,
    extracted JSONB,
    status TEXT -- uploaded, extracted, confirmed
);

CREATE INDEX IF NOT EXISTS idx_ct_lab_documents_visit_id ON ct_lab_documents(visit_id);

CREATE TABLE IF NOT EXISTS ct_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    study_id UUID NOT NULL REFERENCES ct_studies(id) ON DELETE CASCADE,
    form_response_id UUID REFERENCES ct_form_responses(id) ON DELETE CASCADE, -- nullable
    raised_by UUID,
    assigned_to UUID,
    text TEXT NOT NULL,
    status TEXT, -- open, answered, closed
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ct_queries_study_id ON ct_queries(study_id);
CREATE INDEX IF NOT EXISTS idx_ct_queries_form_response_id ON ct_queries(form_response_id);

CREATE TABLE IF NOT EXISTS ct_deviations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    participant_id UUID NOT NULL REFERENCES ct_participants(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES ct_visits(id) ON DELETE SET NULL, -- nullable
    category TEXT, -- major/minor
    description TEXT,
    status TEXT
);

CREATE INDEX IF NOT EXISTS idx_ct_deviations_participant_id ON ct_deviations(participant_id);
CREATE INDEX IF NOT EXISTS idx_ct_deviations_visit_id ON ct_deviations(visit_id);

CREATE TABLE IF NOT EXISTS ct_monitoring_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    study_id UUID NOT NULL REFERENCES ct_studies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES ct_sites(id) ON DELETE CASCADE,
    planned_on DATE,
    actual_on DATE,
    findings TEXT,
    status TEXT
);

CREATE INDEX IF NOT EXISTS idx_ct_monitoring_visits_study_id ON ct_monitoring_visits(study_id);
CREATE INDEX IF NOT EXISTS idx_ct_monitoring_visits_site_id ON ct_monitoring_visits(site_id);


-- ROLLBACK SECTION:
/*
DROP TABLE IF EXISTS ct_monitoring_visits;
DROP TABLE IF EXISTS ct_deviations;
DROP TABLE IF EXISTS ct_queries;
DROP TABLE IF EXISTS ct_lab_documents;
DROP TABLE IF EXISTS ct_form_responses;
DROP TABLE IF EXISTS ct_form_templates;
DROP TABLE IF EXISTS ct_visits;
DROP TABLE IF EXISTS ct_visit_templates;
*/
