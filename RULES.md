# TrialSaathi (SIH26046), built on top of the existing MediKiosk project

## Goal
Add a clinical-trial management system (CTMS) for Ayurveda research to the existing app. The existing MediKiosk features (voice/touch patient intake, OCR of documents, red-flag checker, AYUSH/Dosha assessment, doctor dashboard, slot booking, EN/HI language) MUST keep working exactly as they do today.

## LEGACY GUARD RULES (most important)
1. Never delete, rename, move or edit existing files, routes, components, API endpoints, database tables/columns/policies/functions/triggers, storage buckets or env vars, unless a prompt names them explicitly.
2. New frontend code goes only in: app/trial/** (or the equivalent in this repo's router), components/trial/**, lib/trial/**. New backend code goes only in files named ct_*.py (routers/ct_*.py, services/ct_*.py).
3. Every new database object is prefixed ct_ (tables, views, functions, types, triggers, policies, storage bucket "ct-files"). Migrations are NEW files only, use "create ... if not exists", and never drop or alter legacy objects.
4. Shared files that must be touched (navigation, layout, i18n JSON, router registration, .env.example) get small append-only edits. List every shared file touched in docs/CHANGES.md.
5. Before starting any task run the existing build and tests. After finishing, run them again. If anything old breaks, fix or revert it before continuing.
6. Never run "supabase db reset" or any destructive SQL against the linked/live project. Test migrations on a local Supabase (supabase start). Print the push command for me to run; do not run it.
7. Work on branch trialsaathi-additive.

## Product rules
- Say "GCP-aligned prototype", never "GCP-compliant" or "certified". Say "tamper-evident", never "immutable".
- AI assists; staff confirm every adverse event, record and sign-off.
- Regulatory deadlines come from an editable rule pack and show "verify before production".
- MedDRA/WHODrug are licensed: use only the small demo dictionary labelled "illustrative demo, not MedDRA".
- All demo data is synthetic and labelled so.
- Roles: pi, coordinator, monitor, ethics_committee, pharmacovigilance, admin, regulator_ro (read-only), leadership (read-only).

## Stack
Next.js + Tailwind, FastAPI + LangGraph, Supabase (Postgres, RLS, storage, realtime), Sarvam AI (ASR/TTS/OCR), open-weight LLMs on Groq.

## Judged on
Data accuracy and integrity; timeliness of safety and regulatory reporting; interoperability (FHIR, CDISC-style export); access-control and audit completeness.
