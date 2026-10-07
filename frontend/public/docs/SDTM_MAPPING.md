# SDTM-Style Mapping

This document describes the prototype mappings from the TrialSaathi unified PostgreSQL schema to the simplified SDTM-style CSV exports.

## DM (Demographics)
| Target Domain Variable | Source Table & Field | Note |
| :--- | :--- | :--- |
| `STUDYID` | `ct_studies.short_code` | |
| `DOMAIN` | Constant `DM` | |
| `USUBJID` | `ct_participants.subject_code` | PII is never included in exports. |
| `SUBJID` | `ct_participants.subject_code` | |
| `RFSTDTC` | `ct_participants.enrolled_on` | Date of enrollment/randomisation |
| `ARM` | `ct_participants.arm` | |

## AE (Adverse Events)
| Target Domain Variable | Source Table & Field | Note |
| :--- | :--- | :--- |
| `STUDYID` | `ct_studies.short_code` | |
| `DOMAIN` | Constant `AE` | |
| `USUBJID` | `ct_participants.subject_code` | Resolved via `participant_id` FK |
| `AETERM` | `ct_adverse_events.verbatim_term` | |
| `AESEV` | `ct_adverse_events.severity` | Mild/Moderate/Severe |
| `AESER` | Derived from `ct_adverse_events.serious` | Maps boolean to Y/N |
| `AEREL` | `ct_adverse_events.causality` | WHO-UMC causality classification |
| `AESTDTC` | `ct_adverse_events.onset_at` | |

## SV (Subject Visits)
| Target Domain Variable | Source Table & Field | Note |
| :--- | :--- | :--- |
| `STUDYID` | `ct_studies.short_code` | |
| `DOMAIN` | Constant `SV` | |
| `USUBJID` | `ct_participants.subject_code` | Resolved via `participant_id` FK |
| `VISIT` | `ct_visit_templates.name` | The name of the visit |
| `SVSTDTC` | `ct_visits.actual_on` | The exact day the visit occurred |

## LB (Laboratory Test Results)
*Note: LB extraction relies on OCR-extracted data which maps unstructured JSON payloads.*
| Target Domain Variable | Source Table & Field | Note |
| :--- | :--- | :--- |
| `STUDYID` | `ct_studies.short_code` | |
| `DOMAIN` | Constant `LB` | |
| `USUBJID` | `ct_participants.subject_code` | |
| `LBTEST` | `ct_lab_documents.extracted.testName` | Parsed dynamically from JSON |
| `LBORRES` | `ct_lab_documents.extracted.value` | Parsed dynamically from JSON |
