# MediKiosk

AI-powered patient case-taking software for Indian OPDs, built for Smart India Hackathon 2026 (Problem Statement SIH26047, Ministry of Ayush / AIIA).

## The Problem

Indian government hospital OPDs handle 4,000 to 10,000 patients a day, with doctor consultation time often falling to just 2 to 5 minutes. There is no time left for proper history taking, even though a good history alone gives the correct diagnosis in 70 to 80 percent of cases. On top of that, patients carry scattered paper prescriptions, lab reports, and discharge summaries that the doctor has to manually sort through during the same short window.

AYUSH OPDs face an added layer: Ayurvedic history taking (Dashavidha Pariksha) requires a much deeper assessment than allopathic intake, which is nearly impossible to complete manually in OPD time constraints.

No existing tool solves this end-to-end:
- Hospital registration systems only capture demographics.
- Health apps need smartphone literacy and pre-visit setup, which excludes elderly, rural, and first-time patients.
- Manual triage desks do not scale past a few thousand patients.
- Generic scanners digitize documents but do not structure them or link them to a patient record.

**The gap:** there is no patient-facing platform that lets a patient independently give their medical history through voice or touch, digitize their existing documents, and hand the doctor a ready, structured summary before the consultation even starts.

## Our Approach (MediKiosk)

Build MediKiosk, a kiosk-style web platform used in the hospital waiting area, before the patient enters the consultation room. It talks to the patient (or lets them tap through options), reads their old medical documents, and hands the doctor a clean, structured history in seconds instead of the doctor spending minutes extracting it manually.

The system does three jobs in parallel while the patient waits:
1. Conducts a structured conversation with the patient to build their history.
2. Digitizes and reads any physical documents they bring.
3. Merges both into one summary the doctor sees the moment the patient walks in.

## Key Features

- **Bilingual Audio-Guided Support**: Fully supports Hindi and English for both speech recognition and voice responses (via Sarvam AI ASR & TTS).
- **Accessibility for All**: A tap-or-speak dual input interface designed specifically for low-literacy, first-time, and elderly patients, requiring zero training.
- **Red-Flag Detection**: Immediate rule-based screening flags emergency symptoms (e.g., chest pain, shortness of breath) for priority triage instead of standard queueing.
- **Chronological Document Timeline**: Scanned physical records are automatically parsed, dated, and organized into a coherent timeline for the physician.

## Project Structure

```text
├── frontend/             # Next.js web application (Kiosk UI & Dashboards)
│   ├── app/              # App router (booking, conversation, documents, summary)
│   ├── components/       # Reusable UI components
│   ├── lib/              # Utility functions and Supabase client setup
│   └── public/           # Static assets (images, fonts)
├── backend/              # FastAPI Python backend (AI pipelines & orchestration)
│   ├── app/
│   │   ├── agent/        # LangGraph conversational agent logic and state
│   │   ├── routers/      # API endpoints (documents, conversation, ayush)
│   │   ├── services/     # Integration with Sarvam OCR, Groq LLM extraction
│   │   └── data/         # Clinical frameworks (AYUSH Pariksha parameters)
│   ├── main.py           # FastAPI entry point
│   └── requirements.txt  # Python dependencies
└── README.md             # Project documentation
```

## Current Implementation Status

### ✅ What is Implemented
- **Patient Booking Flow**: Patients can log in via Google OAuth, choose between Allopathy and Ayurveda systems, select a specialization, pick a doctor, and book an available slot.
- **Voice and Touch Intake**: Interactive history-taking session utilizing WebRTC mic capture.
- **Adaptive Questioning**: LLM-driven conversational branching based on the chief complaint (e.g., SOCRATES style probing for pain).
- **AYUSH History Mode**: An extended flow that specifically captures Dashavidha Pariksha parameters for Ayurvedic OPDs.
- **Document Scanning & Extraction**: Patients can upload existing prescriptions, reports, and summaries. The system automatically performs OCR and extracts key entities (diagnoses, medications, lab values, abnormal flags).
- **Doctor Dashboard**: A dedicated dashboard for physicians to manage their availability slots, view booked patients, and instantly access generated clinical summaries.
- **Structured Clinical Summary**: AI merges both conversation and document entities into a standardized physician-ready format.

### ⏳ What is Pending (Future Scope)
- **ABDM/FHIR Interoperability**: Currently, the system uses Google OAuth for sign-in. Full integration with the Ayushman Bharat Digital Mission (ABDM) using ABHA IDs and exporting summaries in strict FHIR format is planned for a later phase.
- **Hardware Integration**: Transitioning the web application into a fully embedded, physical kiosk setup with thermal printers and specialized mic arrays.

## Tech Stack & AI Models

We use a modern, modular software stack paired with state-of-the-art open-weight AI models.

| Layer | Technology |
|---|---|
| **Frontend (Kiosk UI)** | NextJS (React) + Tailwind CSS, utilizing Web Speech API / WebRTC for mic capture. Deployed on **Vercel**. |
| **Backend API** | FastAPI (Python). Deployed on **Render**. |
| **Database & Auth** | Supabase (Postgres, Storage Buckets, Auth, Row-Level Security) |
| **OCR (Document Reading)** | Sarvam AI (Bulbul v3) |
| **ASR & TTS (Voice)** | Sarvam AI (Saarva) |
| **Conversational Agent** | Qwen 27B v3.3 model, orchestrated via LangGraph |
| **Extraction & Summarization** | GPT OSS models (via Groq or similar fast-inference APIs) |

## System Architecture

```text
Next.js Kiosk UI (Touch + Mic)
        |
        |-- Direct calls --> Supabase (OAuth Login, DB Fetch/Insert, File Uploads)
        |
        |-- AI calls --> FastAPI Backend
                              |
                              |-- ASR (Sarvam Saarva) -> User transcript
                              |-- Orchestration (LangGraph) -> Manages state and routes tasks
                              |-- Conversational LLM (Qwen 27B v3.3) -> Generates adaptive questions
                              |-- OCR Pipeline (Sarvam Bulbul v3) -> Raw text from documents
                              |-- Extraction LLM (GPT OSS) -> Structured diagnoses, medications, labs
                              |
                              v
                        Supabase Postgres (Structured EHR data)
                        Supabase Storage (Raw PDFs and scans, organized by patient and encounter)
                              |
                              v
                        Doctor Dashboard -> Physician-ready summary view
```

## How a Single Patient Visit Flows

**Step 1: Identify & Book**
Patient logs in using Google OAuth. They select their preferred medical system (Allopathy/Ayurveda), a specialization, and a doctor. After confirming an available time slot, a new "encounter" is generated.

**Step 2: Converse**
The LangGraph agent kicks off the conversation, starting with the chief complaint. Every question can be answered by speaking or tapping. Based on the answer, the agent (powered by Qwen 27B v3.3) dynamically branches the conversation. If AYUSH mode is selected, it walks through Dashavidha Pariksha.

**Step 3: Scan**
The patient uploads physical documents. The backend OCR (Sarvam Bulbul v3) reads the text, and the GPT OSS extraction turns it into structured fields (diagnoses, medications, abnormal lab values).

**Step 4: Summarize and Route**
Once both the conversation and documents are processed, everything is synthesized into a standardized clinical format: chief complaint, HPI, past medical history, family history, etc.

**Step 5: Consult**
The moment the patient is called in, the doctor opens their dashboard, clicks "View Case Summary," and reads the entire structured history in seconds, allowing them to focus entirely on examination and treatment.
