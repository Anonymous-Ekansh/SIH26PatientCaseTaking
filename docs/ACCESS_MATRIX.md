# CTMS Access Matrix

| Role | Read Access | Write Access |
|---|---|---|
| **PI** | All `ct_` tables | All study data |
| **Coordinator** | All `ct_` tables (incl. PII) | `ct_participants`, `ct_consents`, `ct_visits`, `ct_form_responses`, `ct_lab_documents`, `ct_adverse_events` (candidate/confirmed), queries (answers) |
| **Monitor** | All `ct_` tables (excl. PII) | `ct_queries`, `ct_deviations`, `ct_monitoring_visits` |
| **Pharmacovigilance** | All `ct_` tables (excl. PII) | `ct_adverse_events` (review), `ct_ae_coding`, `ct_ae_clocks`, `ct_regulatory_reports` |
| **Ethics Committee** | All `ct_` tables (excl. PII) | `ct_ethics_approvals`, `ct_adverse_events` (SAE opinion) |
| **Admin** | All `ct_` tables (incl. PII) | `ct_studies`, `ct_sites`, `ct_profiles`, `ct_rule_packs`, `ct_alert_rules` |
| **Regulator (RO)** | All `ct_` tables (excl. PII) | None |
| **Leadership** | All `ct_` tables (excl. PII) | None |
| **Participant** | None (No `ct_profiles` row) | None |

## Notes
- Users must have a row in `ct_profiles` to access any `ct_` table.
- Legacy users (patients) do not get a `ct_profiles` row, so they cannot read/write CTMS data.
- Audit Log is readable by any `ct_profiles` user but strictly immutable (no updates or deletes allowed).
