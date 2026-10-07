# Legacy Inventory

## Folder Tree (depth 3)
```text
.
./README.md
./RULES.md
./backend
./backend/README.md
./backend/app
./backend/app/__init__.py
./backend/app/agent
./backend/app/config.py
./backend/app/data
./backend/app/routers
./backend/app/services
./backend/app/supabase_client.py
./backend/main.py
./backend/query_conversations.py
./backend/requirements.txt
./backend/test_interrupt.py
./backend/test_sarvam.py
./backend/test_sarvam_stt.py
./backend/test_sarvam_stt2.py
./backend/test_supabase.py
./docs
./docs/ARCHITECTURE.md
./docs/CHANGES.md
./docs/DATABASE_AND_RLS.md
./frontend
./frontend/app
./frontend/app/auth
./frontend/app/components
./frontend/app/dashboard
./frontend/app/doctor
./frontend/app/favicon.ico
./frontend/app/globals.css
./frontend/app/i18n
./frontend/app/layout.tsx
./frontend/app/lib
./frontend/app/onboarding
./frontend/app/page.tsx
./frontend/eslint.config.mjs
./frontend/messages
./frontend/messages/en.json
./frontend/messages/hi.json
./frontend/middleware.ts
./frontend/next-env.d.ts
./frontend/next.config.ts
./frontend/package-lock.json
./frontend/package.json
./frontend/postcss.config.mjs
./frontend/public
./frontend/tsconfig.json
```

## Framework Versions
- Next.js: `16.3.4` (from frontend/package.json)
- React: `19.2.8`
- FastAPI & LangGraph (from Python environment / documentation)
- Sarvam AI & Supabase Realtime (from backend and frontend environments)

## Frontend Routes
- `/auth/callback`
- `/doctor/dashboard`
- `/doctor/patient/[patientId]`
- `/doctor/summary/[encounterId]`
- `/dashboard/doctor`
- `/dashboard/profile`
- `/dashboard/ayush`
- `/dashboard/book`
- `/dashboard/documents`
- `/dashboard`
- `/dashboard/summary`
- `/dashboard/conversation`
- `/` (Home)
- `/onboarding/details`
- `/onboarding/signin`
- `/onboarding`

## FastAPI Endpoints
- `GET /`
- `POST /conversation/start`
- `POST /conversation/answer`
- `GET /conversation/state/{encounter_id}`
- `POST /conversation/tts`
- `POST /conversation/asr`
- `POST /documents/upload`
- `GET /documents/by-patient/{auth_user_id}`
- `GET /documents/encounter-summary/{encounter_id}`
- `GET /documents/doctor-bookings/{doctor_auth_id}`
- `GET /documents/patient-summary/{patient_id}`
- `POST /documents/doctor-notes`
- `POST /ayush/start`
- `GET /ayush/questions`
- `POST /ayush/submit`

## Environment Variables (Names Only)
- `CONVERSATION_GROQ_API_KEY`
- `CONVERSATION_SARVAM_API_KEY`
- `GROQ_API_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SARVAM_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`

## Feature Locations
- **Voice interview**: `frontend/app/dashboard/conversation/page.tsx`, `backend/app/routers/conversation.py`
- **Sarvam ASR/TTS client**: `backend/app/routers/conversation.py`, `backend/app/config.py`
- **OCR/extraction**: `backend/app/routers/documents.py`
- **Red-flag checker**: `backend/app/agent/nodes.py` (logic), `frontend/app/dashboard/conversation/page.tsx` (UI)
- **LangGraph graph**: `backend/app/agent/nodes.py`, `backend/app/agent/persistence.py`
- **EN/HI i18n**: `frontend/app/i18n`, `frontend/app/lib/language-context.tsx`
- **Dosha analysis**: `backend/app/routers/ayush.py`, `frontend/app/dashboard/ayush/page.tsx`
- **Doctor dashboard**: `frontend/app/doctor/dashboard/page.tsx`
- **Slot booking**: `frontend/app/dashboard/book/page.tsx`, `backend/app/routers/documents.py`
- **Realtime subscriptions**: Not heavily implemented but `@supabase/realtime-js` exists in dependencies
- **Audit logging**: None explicitly implemented
- **RLS**: Documented in `docs/DATABASE_AND_RLS.md`, enforced on frontend, bypassed on backend via service role key

## Database Overview
*(Note: Complete local dump generation was skipped since the project is unlinked/mocked and contains no local `.sql` migrations. Table data was sourced via static code analysis and documentation)*
- **Tables**: `patients`, `doctors`, `encounters`, `conversations`, `documents`, `extracted_entities`, `bookings`, `doctor_availability_slots`, `ayush_assessments`.
- **Columns**: Deduced from foreign keys (e.g., `id`, `patient_id`, `doctor_id`, `encounter_id`, `auth_user_id`).
- **RLS Status & Policies**: RLS is active. Row-level security restricts patients to their own data. A function bridges doctor access.
- **Functions**: `public.is_doctor_for_patient(patient_uuid UUID)`
- **Triggers**: N/A found
- **Storage Buckets**: Upload endpoints are configured for document storage, likely using a `documents` or default bucket.

## Collision Check
No existing tables, functions, or entities start with `ct_`. There are zero collisions with the planned CTMS namespace.
