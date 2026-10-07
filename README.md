# TrialSaathi (SIH26046) & MediKiosk (SIH26047)

**TrialSaathi (SIH26046): voice-first, audit-ready CTMS for Ayurveda research. Built on the MediKiosk intake platform (SIH26047).**

**Live Demo:** [https://medikiosk-sih26.vercel.app/trial](https://medikiosk-sih26.vercel.app/trial)

## Demo Access
To instantly access the role-specific dashboards, click the **Demo Login** buttons on the login page.
*(Note: Real authentication via OAuth/SSO and Kiosk PIN checks would be implemented here in production. For this prototype, the demo buttons bypass these checks to directly show the functional dashboards).*

*(Regular patient Google OAuth accounts cannot access the TrialSaathi module by design).*

---

## Feature Status

| Feature | Status | Notes |
|---|---|---|
| **Voice-First Kiosk (AYUSH/Allopathy)** | ✅ Built | Multilingual (Sarvam), LLM-driven branching, Kiosk locked by Staff PIN |
| **Document OCR & Structuring** | ✅ Built | Reads PDFs/Images, extracts labs/diagnoses, flags abnormalities |
| **Role-Based Workspaces** | ✅ Built | PI, Coordinator, Monitor, PV, EC, Regulator dashboards |
| **Cryptographic Audit Trail (Blockchain-like)** | ✅ Built | Hash-chained rows in Postgres, live verifiable ledger |
| **21 CFR Part 11 / GCP E-Signatures** | ✅ Built | Requires password re-auth, securely hashes current record state |
| **Safety Desk & SAE Clocks** | ✅ Built | WHO-UMC causality grading, LLM-driven Red Flag detection, countdown SLAs |
| **SDTM & FHIR Exports** | ✅ Built | Downloads de-identified ZIPs of clinical domains and R4 JSON bundles |
| **Automated Edit Checks / Queries** | ✅ Built | Protocol deviation detection, automated data queries |
| **ADaM & Define-XML Exports** | 🚧 Roadmap | Target for Phase 2 scaling |
| **Live ABDM Integration (M3)** | 🚧 Roadmap | PHR linkage and Ayushman Bharat network hooks |
| **Licensed MedDRA/WHODrug Dictionaries** | 🚧 Roadmap | Currently using standard text verbatims |
| **ISO 27001 Certification** | 🚧 Roadmap | Formal audit pending post-prototype |
| **Field-Level PII Encryption** | 🚧 Roadmap | Currently mitigated by strict RLS and separate table designs |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend UI & Routing** | NextJS (React) + Tailwind CSS, Lucide Icons, Deployed on **Vercel**. |
| **Backend API** | FastAPI (Python). Deployed on **Render**. |
| **Database & Auth** | Supabase (Postgres, Storage Buckets, Auth, Row-Level Security) |
| **OCR (Document Reading)** | Sarvam AI API |
| **ASR & TTS (Voice)** | Sarvam AI API |
| **LLMs (Reasoning & Extraction)** | Groq (Llama 3 / Mixtral for speed) |

---

## TrialSaathi Architecture

```mermaid
graph TD
    UI[Next.js Frontend (Role Dashboards & Kiosk)]
    API[FastAPI Backend]
    DB[(Supabase Postgres & Storage)]
    Auth[Supabase Auth]
    
    UI <--> |REST API| API
    UI <--> |Direct RLS Access| DB
    UI <--> Auth
    
    API <--> |Server-side logic| DB
    API --> |Audio| SarvamASR[Sarvam ASR/TTS]
    API --> |Images/PDFs| SarvamOCR[Sarvam OCR]
    API --> |Text/Reasoning| GroqLLM[Groq LLM]
    
    DB --> AuditTrigger[Cryptographic Audit Trigger]
    DB --> RLS[Row-Level Security Policies]
```

---

## Original MediKiosk intake module

Indian government hospital OPDs handle 4,000 to 10,000 patients a day, with doctor consultation time often falling to just 2 to 5 minutes. There is no time left for proper history taking, even though a good history alone gives the correct diagnosis in 70 to 80 percent of cases. On top of that, patients carry scattered paper prescriptions, lab reports, and discharge summaries that the doctor has to manually sort through during the same short window.

AYUSH OPDs face an added layer: Ayurvedic history taking (Dashavidha Pariksha) requires a much deeper assessment than allopathic intake, which is nearly impossible to complete manually in OPD time constraints.

No existing tool solves this end-to-end:
- Hospital registration systems only capture demographics.
- Health apps need smartphone literacy and pre-visit setup, which excludes elderly, rural, and first-time patients.
- Manual triage desks do not scale past a few thousand patients.
- Generic scanners digitize documents but do not structure them or link them to a patient record.

**The gap:** there is no patient-facing platform that lets a patient independently give their medical history through voice or touch, digitize their existing documents, and hand the doctor a ready, structured summary before the consultation even starts.

### Our Approach (MediKiosk)

Build MediKiosk, a kiosk-style web platform used in the hospital waiting area, before the patient enters the consultation room. It talks to the patient (or lets them tap through options), reads their old medical documents, and hands the doctor a clean, structured history in seconds instead of the doctor spending minutes extracting it manually.

The system does three jobs in parallel while the patient waits:
1. Conducts a structured conversation with the patient to build their history.
2. Digitizes and reads any physical documents they bring.
3. Merges both into one summary the doctor sees the moment the patient walks in.

### Key Features
- **Bilingual Audio-Guided Support**: Fully supports Hindi and English for both speech recognition and voice responses.
- **Accessibility for All**: A tap-or-speak dual input interface designed specifically for low-literacy, first-time, and elderly patients, requiring zero training.
- **Red-Flag Detection**: Immediate rule-based screening flags emergency symptoms.
- **Chronological Document Timeline**: Scanned physical records are automatically parsed, dated, and organized into a coherent timeline for the physician.

### How a Single Patient Visit Flows
**Step 1: Identify & Book**
Patient logs in using Google OAuth. They select their preferred medical system (Allopathy/Ayurveda), a specialization, and a doctor.

**Step 2: Converse**
The LangGraph agent kicks off the conversation, starting with the chief complaint. Every question can be answered by speaking or tapping. Based on the answer, the agent dynamically branches the conversation. If AYUSH mode is selected, it walks through Dashavidha Pariksha.

**Step 3: Scan**
The patient uploads physical documents. The backend OCR reads the text, and the LLM extraction turns it into structured fields (diagnoses, medications, abnormal lab values).

**Step 4: Summarize and Route**
Once both the conversation and documents are processed, everything is synthesized into a standardized clinical format: chief complaint, HPI, past medical history, family history, etc.

**Step 5: Consult**
The moment the patient is called in, the doctor opens their dashboard, clicks "View Case Summary," and reads the entire structured history in seconds, allowing them to focus entirely on examination and treatment.

---

## Testing

A small CI test suite is included to verify logic without touching live production data.

### Backend Tests (Pytest)
Runs mock-based tests for clock logic, AE candidate creation, edit checks, and export PII stripping.
```bash
cd backend
source venv/bin/activate
pytest tests/test_trial.py
```

### Database Tests (pgTAP)
Verifies RLS access control and cryptographic audit chain tampering detection on a local test database.
```bash
npx supabase test db
```

### Frontend E2E Tests (Playwright)
Verifies the old MediKiosk intake flow, redirects, demo login, and role-based portal loading.
```bash
cd frontend
npm run dev &
npx playwright test
```
