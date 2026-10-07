# TrialSaathi (SIH26046) & MediKiosk (SIH26047)

**Live Demo:** [https://trialsaathi-sih26.vercel.app/](https://trialsaathi-sih26.vercel.app/)

TrialSaathi is a voice-first, audit-ready Clinical Trial Management System (CTMS) for Ayurveda and Allopathy research, built on top of the MediKiosk intake platform. It digitizes the entire trial lifecycle, from patient eConsent to real-time regulatory compliance.

## What The Platform Does

### 1. Participant Kiosk (ePRO & eConsent)
A secure, patient-facing portal designed for high accessibility and low-literacy users.
* **Bilingual Voice Input:** Fully supports English and Hindi for both speech recognition (ASR) and voice responses (TTS).
* **Electronic Informed Consent (eConsent):** Reads lengthy consent forms aloud to patients and tests their comprehension with quizzes before allowing a digital signature.
* **Electronic Patient-Reported Outcomes (ePRO):** Patients can independently log their symptoms, pain scales, and daily health diaries via large touch buttons or voice commands.
* **Privacy Controls:** Patients have direct access to their privacy rights and can withdraw consent digitally at any time.

### 2. Staff Dashboards (Role-Based Access Control)
The backend CTMS portal enforces strict data compartmentalization. Staff only see data and widgets relevant to their specific role (PI, Coordinator, Monitor, Pharmacovigilance, Ethics Committee, Regulator).
* **Command Center:** Real-time trial metrics (enrollment, open queries, severe adverse events) filtered dynamically by the user's role.
* **Verify Queue (SDV):** Investigators and coordinators clinically review and verify data submitted by patients in the Kiosk before it is permanently committed to the trial record.
* **Quality & Monitoring Desk:** Data Monitors can track unresolved data queries, log protocol deviations, and schedule on-site monitoring visits.
* **Safety & Pharmacovigilance Desk:** Automatically flags severe side effects. Allows PV teams to medically assess Adverse Events (AEs) using CDISC terminology (Severity, Causality) and generates automatic SLA countdown clocks for CDSCO and Ethics Committee reporting.
* **Compliance & Conformance Desk:** Aggregates real-time regulatory compliance metrics, mathematically evaluating ALCOA-CCEA adherence and consent validity.

### 3. Cryptographic Audit & Compliance Engine
* **Cryptographic Audit Trail:** Every single data mutation is cryptographically hashed to the preceding row (blockchain-style). Tampering is mathematically impossible without breaking the chain.
* **GCP E-Signatures:** Medical assessments and verifications are securely e-signed, capturing the exact state hash of the record at the time of signing.
* **De-identified Data Protocols:** Built entirely on synthetic, de-identified datasets to ensure zero Personally Identifiable Information (PII) leakage, adhering to strict data residency and GCP guidelines.

### 4. MediKiosk Intake Engine
* **Automated Clinical Intake:** Conducts a structured conversation with patients in the waiting room to build their medical history, including specific AYUSH assessments (Dashavidha Pariksha).
* **Document Digitization (OCR):** Reads physical patient documents (PDFs/Images), extracts diagnoses, and flags abnormal lab values.

---

## Demo Access Instructions
To instantly access the role-specific dashboards, click the **Demo Login** buttons on the staff login page.
*(Note: Real authentication via Enterprise SSO and Kiosk PIN checks are bypassed in this prototype to allow judges to instantly test all functional dashboards and roles).*

---

## Tech Stack
* **Frontend:** Next.js (React), Tailwind CSS, deployed on Vercel.
* **Backend:** FastAPI (Python), deployed on Render.
* **Database & Auth:** Supabase (Postgres, Storage Buckets, Row-Level Security).
* **AI & Voice:** Sarvam AI API (ASR/TTS/OCR), Groq LLMs (Llama 3 / Mixtral).

## Testing
A local test suite is included to verify core logic:
* **Backend:** Pytest (`pytest tests/test_trial.py`) for clock logic and edit checks.
* **Database:** pgTAP (`npx supabase test db`) for RLS access control and cryptographic audit tampering detection.
* **Frontend:** Playwright (`npx playwright test`) for E2E flow testing.
