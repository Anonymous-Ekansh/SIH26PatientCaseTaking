-- Migration: ct_core
-- Description: Initial core tables for the CTMS (Clinical Trial Management System)
-- Creates additive tables only. No legacy object changed.

-- ROLLBACK SECTION:
/*
DROP TABLE IF EXISTS ct_consents;
DROP TABLE IF EXISTS ct_consent_versions;
DROP TABLE IF EXISTS ct_participant_pii;
DROP TABLE IF EXISTS ct_participants;
DROP TABLE IF EXISTS ct_milestones;
DROP TABLE IF EXISTS ct_ethics_approvals;
DROP TABLE IF EXISTS ct_study_sites;
DROP TABLE IF EXISTS ct_studies;
DROP TABLE IF EXISTS ct_sites;
*/

CREATE TABLE IF NOT EXISTS ct_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    city TEXT,
    state TEXT
);

CREATE TABLE IF NOT EXISTS ct_studies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    title TEXT NOT NULL,
    short_code TEXT UNIQUE NOT NULL,
    design TEXT, -- interventional/observational
    phase TEXT,
    status TEXT, -- draft, ethics_review, approved, active, paused, closed
    target_enrolment INT,
    planned_start DATE,
    actual_start DATE,
    planned_end DATE,
    actual_end DATE,
    ctri_number TEXT,
    ctri_registered_on DATE,
    ctri_update_due DATE,
    regime TEXT -- ndct / gcp_asu_only
);

CREATE TABLE IF NOT EXISTS ct_study_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    study_id UUID NOT NULL REFERENCES ct_studies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES ct_sites(id) ON DELETE CASCADE,
    activation_date DATE,
    site_target INT
);

CREATE INDEX IF NOT EXISTS idx_ct_study_sites_study_id ON ct_study_sites(study_id);
CREATE INDEX IF NOT EXISTS idx_ct_study_sites_site_id ON ct_study_sites(site_id);

CREATE TABLE IF NOT EXISTS ct_ethics_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    study_id UUID NOT NULL REFERENCES ct_studies(id) ON DELETE CASCADE,
    committee_name TEXT NOT NULL,
    approval_date DATE,
    valid_until DATE,
    continuing_review_due DATE,
    amendment_ref TEXT,
    status TEXT
);

CREATE INDEX IF NOT EXISTS idx_ct_ethics_approvals_study_id ON ct_ethics_approvals(study_id);

CREATE TABLE IF NOT EXISTS ct_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    study_id UUID NOT NULL REFERENCES ct_studies(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- protocol_approval, ctri_registration, site_activation, first_enrolment, last_visit, database_lock, closeout
    planned_date DATE,
    actual_date DATE
);

CREATE INDEX IF NOT EXISTS idx_ct_milestones_study_id ON ct_milestones(study_id);

CREATE TABLE IF NOT EXISTS ct_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    study_id UUID NOT NULL REFERENCES ct_studies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES ct_sites(id) ON DELETE CASCADE,
    subject_code TEXT NOT NULL,
    pin_hash TEXT,
    status TEXT, -- screened, screen_failed, enrolled, completed, withdrawn
    enrolled_on DATE,
    arm TEXT,
    language TEXT, -- en/hi
    legacy_patient_ref TEXT, -- NO foreign key to legacy tables
    UNIQUE(study_id, subject_code)
);

CREATE INDEX IF NOT EXISTS idx_ct_participants_study_id ON ct_participants(study_id);
CREATE INDEX IF NOT EXISTS idx_ct_participants_site_id ON ct_participants(site_id);

CREATE TABLE IF NOT EXISTS ct_participant_pii (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    participant_id UUID NOT NULL REFERENCES ct_participants(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    UNIQUE(participant_id)
);

CREATE INDEX IF NOT EXISTS idx_ct_participant_pii_participant_id ON ct_participant_pii(participant_id);

CREATE TABLE IF NOT EXISTS ct_consent_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    study_id UUID NOT NULL REFERENCES ct_studies(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    language TEXT NOT NULL,
    body_text TEXT,
    effective_date DATE,
    UNIQUE(study_id, version, language)
);

CREATE INDEX IF NOT EXISTS idx_ct_consent_versions_study_id ON ct_consent_versions(study_id);

CREATE TABLE IF NOT EXISTS ct_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    participant_id UUID NOT NULL REFERENCES ct_participants(id) ON DELETE CASCADE,
    consent_version_id UUID NOT NULL REFERENCES ct_consent_versions(id) ON DELETE CASCADE,
    given_at TIMESTAMPTZ,
    method TEXT, -- voice/touch
    read_aloud BOOLEAN,
    withdrawn_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ct_consents_participant_id ON ct_consents(participant_id);
CREATE INDEX IF NOT EXISTS idx_ct_consents_consent_version_id ON ct_consents(consent_version_id);
