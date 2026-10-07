# Database and RLS Rules

MediKiosk relies heavily on Supabase's Row-Level Security (RLS) to enforce data boundaries between Patient users and Doctor users.

## Core Schema Entities

- **`patients`**: Stores demographic information. Linked 1-to-1 with a Supabase `auth.users` ID.
- **`doctors`**: Stores physician profiles. Linked 1-to-1 with a Supabase `auth.users` ID.
- **`encounters`**: Represents a single hospital visit/consultation. Acts as the root foreign key for all case-taking data.
- **`conversations`**: Stores the LangGraph state (chief complaint, HPI, red flags). References `encounters(id)`.
- **`documents`**: Stores metadata for uploaded physical records. References `patients(id)`.
- **`extracted_entities`**: OCR parsed fields (diagnoses, labs). References `documents(id)`.
- **`bookings`**: Connects a `patient_id` and a `doctor_id` with a specific date and time slot.

## Row-Level Security (RLS) Approach

By default, users (patients) can only read, insert, or update rows that map back to their own `auth_user_id`.

Because doctors need cross-access to patient records, we use a specialized PostgreSQL function that acts as a secure tunnel. Instead of giving doctors blanket access to the `encounters` table, we restrict them to only seeing data for patients they have an active `booking` with.

### The Doctor Access Function

```sql
CREATE OR REPLACE FUNCTION public.is_doctor_for_patient(patient_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.doctors d ON b.doctor_id = d.id
    WHERE b.patient_id = patient_uuid 
    AND d.auth_user_id = auth.uid()
  );
$$;
```

### Implementing the Policy

Using this function, we safely expose tables to physicians without leaking global data:

```sql
-- Example Policy: Giving doctors access to read encounters
CREATE POLICY "Doctors can view encounters of their patients"
ON public.encounters FOR SELECT TO authenticated
USING (
  public.is_doctor_for_patient(patient_id)
);
```

### Backend Fast-Lane

The FastAPI backend utilizes the `SUPABASE_SERVICE_ROLE_KEY`. This key entirely bypasses RLS rules, allowing the backend to safely orchestrate entity creation (like starting new encounters or creating AYUSH assessments) on behalf of users without frontend permission friction.
