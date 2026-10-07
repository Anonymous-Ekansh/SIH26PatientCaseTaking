# ALCOA+ Implementation Map

TrialSaathi implements the GCP ALCOA+ principles through the following concrete features.

> **Note**: E-signatures and audit trails in this prototype demonstrate GCP-style controls but are **NOT** a certified legal e-sign implementation under FDA 21 CFR Part 11 or the Indian IT Act.

| Principle | Meaning | TrialSaathi Implementation |
| :--- | :--- | :--- |
| **A**ttributable | Who recorded the data? | `ct_profiles` tracking via Supabase Auth. Every action requires a JWT. E-signatures demand re-authentication (password prompt) and explicit recording of the user's role and "meaning" of the signature in `ct_esignatures`. |
| **L**egible | Is the data readable and permanent? | Data is persisted in PostgreSQL with large-text accessible interfaces via the Kiosk. Voice transcripts are saved cleanly alongside audio metadata. |
| **C**ontemporaneous | Was it recorded when it happened? | Database strictly records `created_at` in TIMESTAMPTZ. Offline caching is intentionally avoided for critical timestamps; the server controls the authoritative timeline. Clinical events require explicit `aware_at` vs `onset_at` fields. |
| **O**riginal | Is this the first record? | The `ct_audit_log` records exact JSON differences on `INSERT`/`UPDATE`/`DELETE`. Kiosk voice answers store both the raw transcript and the human-edited version as separate audited states. Lab OCR stores the raw `ocr_text` independently from the clinically verified JSON payload. |
| **A**ccurate | Is the data correct and valid? | Edit checks run automatically (e.g., visit window alerts). Lab uploads flag abnormal values automatically before human verification. Medical coding forces standardisation (Demo Dictionary mapping). |
| **+** Complete | Is anything missing? | Mandatory fields (e.g., Causality and Rejection notes) prevent empty critical data. |
| **+** Consistent | Does the timeline make sense? | Cryptographic hash chaining (`ct_verify_audit_chain()`) guarantees that audit logs have not been retroactively sorted, dropped, or stealth-modified by a direct database attack. |
| **+** Enduring | Will the data last? | Protected schemas and restricted table permissions prevent manual truncation. PostgreSQL's robust journaling ensures durability. |
| **+** Available | Can authorized people access it? | Strict Role-Based Access Control (RBAC) matrix enforced at both the UI and Row-Level Security (RLS) layers ensures data is available only to the right personnel (e.g., Ethics Committee vs Monitor). |
