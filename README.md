# MediKiosk

AI powered patient case taking software for Indian OPDs, built for Smart India Hackathon 2026 (Problem Statement SIH26047, Ministry of Ayush / AIIA).

## The Problem

Indian government hospital OPDs handle 4,000 to 10,000 patients a day, with doctor consultation time often falling to just 2 to 5 minutes. There is no time left for proper history taking, even though a good history alone gives the correct diagnosis in 70 to 80 percent of cases. On top of that, patients carry scattered paper prescriptions, lab reports, and discharge summaries that the doctor has to manually sort through during the same short window.

AYUSH OPDs face an added layer: Ayurvedic history taking (Dashavidha Pariksha) requires a much deeper assessment than allopathic intake, which is nearly impossible to complete manually in OPD time constraints.

No existing tool solves this end to end:
- Hospital registration systems only capture demographics.
- Health apps need smartphone literacy and pre-visit setup, which excludes elderly, rural, and first time patients.
- Manual triage desks do not scale past a few thousand patients.
- Generic scanners digitize documents but do not structure them or link them to a patient record.

**The gap:** there is no patient facing platform that lets a patient independently give their medical history through voice or touch, digitize their existing documents, and hand the doctor a ready, structured summary before the consultation even starts.

## Our Approach

Build MediKiosk, a kiosk style web platform used in the hospital waiting area, before the patient enters the consultation room. It talks to the patient (or lets them tap through options), reads their old medical documents, and hands the doctor a clean, structured history in seconds instead of the doctor spending minutes extracting it manually.

The system does three jobs in parallel while the patient waits:
1. Has a structured conversation with the patient to build their history.
2. Digitizes and reads any physical documents they bring.
3. Merges both into one summary the doctor sees the moment the patient walks in.

## Core Features

1. **Voice and touch intake** - patient answers by speaking or tapping, in Hindi, English, or a regional language.
2. **Adaptive questioning** - follow up questions branch based on the chief complaint (SOCRATES style: onset, character, radiation, aggravating and relieving factors).
3. **AYUSH history mode** - extended flow capturing Dashavidha Pariksha parameters for Ayurvedic OPDs.
4. **Red flag detection** - a rule based check that flags emergency symptoms and pushes the patient to priority triage instead of the normal queue.
5. **Document scanning and OCR** - patient uploads or scans old prescriptions, lab reports, and discharge summaries. The system extracts diagnoses, medications, and lab values from them.
6. **Chronological document timeline** - uploaded documents are dated and ordered automatically into one timeline.
7. **Abnormal value flagging** - lab values outside the normal reference range are highlighted for the doctor.
8. **Structured history summary** - AI combines the conversation and the documents into one standard clinical format. The doctor can edit or confirm it, it is never presented as an automatic diagnosis.
9. **Consent and ABHA linkage** - patient logs in with an ABHA ID, gives explicit consent, and the summary is linked to their ABDM health record. For development and demo purposes, since real ABHA IDs are limited right now, a test login using just a name and phone number (stored as a dummy patient record in Supabase) works as a stand in, with ABHA login layered on top once real IDs are available.
10. **Accessibility** - large text and high contrast mode, audio guided prompts, multilingual UI, usable by a first time patient with zero training.
11. **Patient dashboard** - a simple login for patients to view and store their own past records.

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (React) |
| Backend | FastAPI (Python) |
| Database, storage, auth | Supabase (Postgres with pgvector, S3 compatible storage bucket, built in auth, realtime updates) |
| Voice (ASR and TTS) | Bhashini API, with AI4Bharat or Whisper as fallback |
| OCR | PaddleOCR for printed text, cloud OCR (Google Vision or Azure Document Intelligence) for handwritten prescriptions |
| Conversational AI and summarization | Local open weight LLM (Llama 3.1 8B via Ollama) orchestrated with LangGraph as a state machine, with Groq's free Llama 3.3 70B API as a cloud fallback |
| Interoperability | FHIR format, ABDM sandbox APIs for ABHA login and health record linkage |

The core value of this project is AI and document processing, and that ecosystem is Python first, which is why FastAPI is the backend instead of Node. Supabase replaces three separate services (database, file storage, auth) with one. Next.js gives a fast, deployable frontend with built in support for multiple languages.

## System Architecture

```
Next.js kiosk UI (touch + mic)
        |
        |-- direct calls --> Supabase (login, fetch record, upload file, realtime updates)
        |
        |-- AI calls --> FastAPI backend
                              |
                              |-- ASR (Bhashini) -> transcript
                              |-- LangGraph dialogue agent -> next question, tracks which history sections are filled
                              |-- Red flag rule checker -> priority alert
                              |-- OCR pipeline (PaddleOCR / cloud OCR) -> raw text from documents
                              |-- LLM entity extraction -> structured diagnoses, medications, lab values
                              |-- LLM summary generator -> final physician ready summary
                              |
                              v
                        Supabase Postgres (structured EHR data)
                        Supabase Storage (raw PDFs and scans, organized by patient and encounter)
                              |
                              v
                        FHIR formatted output -> Hospital HIS + ABDM health record
```

Documents are stored in Supabase Storage using a folder structure like `{abha_id}/encounters/{encounter_id}/raw/` for original files and `.../processed/` for OCR output, so every file is traceable to a patient and a specific visit, never dumped flat into one folder.

## How a Single Patient Visit Flows

**Step 1: Identify**
Patient logs in with ABHA ID or Aadhaar, or registers fresh if it is their first visit. Since real ABHA IDs are hard to get right now for testing, the same step also supports a simple test login (name and phone number, stored as a dummy Supabase record) so the full flow can be built and demoed without needing a real ABHA ID for every test patient. They pick a language. The system explains what data it collects and asks for consent, read aloud for low literacy patients.

**Step 2: Converse**
The LangGraph agent starts asking questions, starting with the chief complaint. Every question can be answered by speaking or tapping a quick reply. Based on the answer, the agent decides the next question itself (a patient saying "chest pain" gets asked about onset, radiation, and triggers, a patient saying "fever" gets a different set of follow ups). If AYUSH mode is on, the same engine also walks through Dashavidha Pariksha. If a red flag symptom is detected at any point, the system immediately raises a priority alert to staff instead of continuing the normal flow.

**Step 3: Scan**
In parallel or right after, the patient uploads or scans any physical documents they have. The OCR pipeline reads the text, and the LLM extraction step turns it into structured fields: what was diagnosed, what medicine was given, what the lab values were. Documents are automatically sorted by date into a single timeline, and any abnormal lab value is flagged.

**Step 4: Summarize and route**
Once both the conversation and the documents are processed, the LLM summary generator merges everything into one standard clinical format: chief complaint, history of present illness, past medical and surgical history, drug and allergy history, family history, personal history, review of systems, and a summary of prior investigations. This gets saved to Supabase, converted to FHIR format, and linked to the patient's ABHA record.

**Step 5: Consult**
The moment the patient is called in, the summary is already sitting on the doctor's screen through a realtime update, no refresh needed. The doctor reads the full history in seconds, edits or confirms anything, and spends the actual consultation time on examination and treatment instead of re-asking questions the patient already answered outside.

