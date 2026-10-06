from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import io
import csv
import json
import zipfile
from app.supabase_client import supabase

router = APIRouter()

def get_study_data(study_id: str):
    # Fetch study
    st_res = supabase.table("ct_studies").select("*").eq("id", study_id).single().execute()
    if not st_res.data: raise HTTPException(404, "Study not found")
    study = st_res.data
    
    # Fetch sites
    sites_res = supabase.table("ct_study_sites").select("site_id, ct_sites(name)").eq("study_id", study_id).execute()
    sites = [{"id": s["site_id"], "name": s["ct_sites"]["name"]} for s in (sites_res.data or []) if s.get("ct_sites")]
    
    # Fetch participants
    parts_res = supabase.table("ct_participants").select("id, subject_code, status, enrolled_on, arm, site_id").eq("study_id", study_id).execute()
    participants = parts_res.data or []
    
    # Fetch AEs
    aes_res = supabase.table("ct_adverse_events").select("id, participant_id, verbatim_term, onset_at, aware_at, severity, seriousness_criteria, causality, outcome, serious").execute()
    aes = [a for a in (aes_res.data or []) if a["participant_id"] in [p["id"] for p in participants]]
    
    # Fetch Consents
    consents_res = supabase.table("ct_consents").select("id, participant_id, given_at, ct_consent_versions(version)").execute()
    consents = [c for c in (consents_res.data or []) if c["participant_id"] in [p["id"] for p in participants]]
    
    # Fetch visits
    visits_res = supabase.table("ct_visits").select("id, participant_id, actual_on, ct_visit_templates(name)").execute()
    visits = [v for v in (visits_res.data or []) if v["participant_id"] in [p["id"] for p in participants]]
    visit_ids = [v["id"] for v in visits]

    # Fetch forms and labs
    forms_res = supabase.table("ct_form_responses").select("id, participant_id, visit_id, answers_jsonb, status").eq("status", "verified").execute()
    forms = [f for f in (forms_res.data or []) if f["participant_id"] in [p["id"] for p in participants]]

    labs_res = supabase.table("ct_lab_documents").select("id, participant_id, visit_id, extracted, status").eq("status", "confirmed").execute()
    labs = [l for l in (labs_res.data or []) if l["participant_id"] in [p["id"] for p in participants]]
    
    return study, sites, participants, aes, consents, visits, forms, labs

@router.get("/fhir/{study_id}")
async def export_fhir(study_id: str):
    study, sites, participants, aes, consents, visits, forms, labs = get_study_data(study_id)
    
    entries = []
    
    # 1. ResearchStudy
    entries.append({
        "resource": {
            "resourceType": "ResearchStudy",
            "id": study["id"],
            "identifier": [{"system": "http://ctri.nic.in", "value": study.get("ctri_number", "TBD")}],
            "title": study["title"],
            "status": study["status"]
        }
    })
    
    # 2. Organization (Sites)
    for site in sites:
        entries.append({
            "resource": {
                "resourceType": "Organization",
                "id": site["id"],
                "name": site["name"]
            }
        })
        
    # 3. ResearchSubject
    for p in participants:
        entries.append({
            "resource": {
                "resourceType": "ResearchSubject",
                "id": p["id"],
                "identifier": [{"system": "http://trials.local", "value": p["subject_code"]}],
                "status": "candidate" if p["status"] == "screened" else "active" if p["status"] == "enrolled" else "completed",
                "study": {"reference": f"ResearchStudy/{study['id']}"}
            }
        })
        
    # 4. Consent
    for c in consents:
        entries.append({
            "resource": {
                "resourceType": "Consent",
                "id": c["id"],
                "status": "active",
                "patient": {"reference": f"ResearchSubject/{c['participant_id']}"},
                "dateTime": c["given_at"]
            }
        })
        
    # 5. AdverseEvent
    for a in aes:
        entries.append({
            "resource": {
                "resourceType": "AdverseEvent",
                "id": a["id"],
                "subject": {"reference": f"ResearchSubject/{a['participant_id']}"},
                "event": {"text": a["verbatim_term"]},
                "seriousness": {"text": ", ".join(a.get("seriousness_criteria") or [])} if a.get("serious") else None,
                "severity": {"text": a.get("severity")},
                "date": a.get("onset_at")
            }
        })
    
    # 6. Observation (Forms)
    for f in forms:
        if isinstance(f.get("answers_jsonb"), dict):
            for k, v in f["answers_jsonb"].items():
                entries.append({
                    "resource": {
                        "resourceType": "Observation",
                        "id": f"{f['id']}-{k}",
                        "status": "final",
                        "subject": {"reference": f"ResearchSubject/{f['participant_id']}"},
                        "code": {"text": k},
                        "valueString": str(v)
                    }
                })

    # 7. Observation (Labs)
    for l in labs:
        if isinstance(l.get("extracted"), dict):
            for test_name, test_val in l["extracted"].items():
                entries.append({
                    "resource": {
                        "resourceType": "Observation",
                        "id": f"{l['id']}-{test_name}",
                        "status": "final",
                        "subject": {"reference": f"ResearchSubject/{l['participant_id']}"},
                        "code": {"text": test_name},
                        "valueString": str(test_val)
                    }
                })
    
    bundle = {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": entries
    }
    
    return bundle


@router.get("/sdtm/{study_id}")
async def export_sdtm(study_id: str):
    study, sites, participants, aes, consents, visits, forms, labs = get_study_data(study_id)
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        
        # DM (Demographics / Subject)
        dm_buffer = io.StringIO()
        writer = csv.writer(dm_buffer)
        writer.writerow(["STUDYID", "DOMAIN", "USUBJID", "SUBJID", "RFSTDTC", "ARM"])
        for p in participants:
            writer.writerow([study.get("short_code"), "DM", p["subject_code"], p["subject_code"], p.get("enrolled_on", ""), p.get("arm", "")])
        zip_file.writestr("DM.csv", dm_buffer.getvalue())
        
        # AE (Adverse Events)
        ae_buffer = io.StringIO()
        writer = csv.writer(ae_buffer)
        writer.writerow(["STUDYID", "DOMAIN", "USUBJID", "AETERM", "AESEV", "AESER", "AEREL", "AESTDTC"])
        
        # map participant id to subject code
        p_map = {p["id"]: p["subject_code"] for p in participants}
        for a in aes:
            usubjid = p_map.get(a["participant_id"], "")
            aeser = "Y" if a.get("serious") else "N"
            writer.writerow([study.get("short_code"), "AE", usubjid, a.get("verbatim_term"), a.get("severity"), aeser, a.get("causality"), a.get("onset_at")])
        zip_file.writestr("AE.csv", ae_buffer.getvalue())
        
        # SV (Subject Visits)
        sv_buffer = io.StringIO()
        writer = csv.writer(sv_buffer)
        writer.writerow(["STUDYID", "DOMAIN", "USUBJID", "VISIT", "SVSTDTC"])
        for v in visits:
            usubjid = p_map.get(v["participant_id"], "")
            vname = v.get("ct_visit_templates", {}).get("name", "") if v.get("ct_visit_templates") else ""
            writer.writerow([study.get("short_code"), "SV", usubjid, vname, v.get("actual_on")])
        zip_file.writestr("SV.csv", sv_buffer.getvalue())
        
        # LB (Laboratory Test Results)
        lb_buffer = io.StringIO()
        writer = csv.writer(lb_buffer)
        writer.writerow(["STUDYID", "DOMAIN", "USUBJID", "LBTEST", "LBORRES"])
        for l in labs:
            usubjid = p_map.get(l["participant_id"], "")
            if isinstance(l.get("extracted"), dict):
                for test_name, test_val in l["extracted"].items():
                    writer.writerow([study.get("short_code"), "LB", usubjid, test_name, str(test_val)])
        zip_file.writestr("LB.csv", lb_buffer.getvalue())
        
    zip_buffer.seek(0)
    return StreamingResponse(
        iter([zip_buffer.getvalue()]), 
        media_type="application/x-zip-compressed", 
        headers={"Content-Disposition": f"attachment; filename=SDTM_{study.get('short_code')}.zip"}
    )

@router.get("/dsmb/{study_id}")
async def export_dsmb(study_id: str):
    study, sites, participants, aes, consents, visits, forms, labs = get_study_data(study_id)
    
    csv_buffer = io.StringIO()
    writer = csv.writer(csv_buffer)
    writer.writerow(["Study", "Subject", "Site", "Verbatim Term", "Severity", "Serious", "Causality", "Outcome", "Onset Date"])
    
    p_map = {p["id"]: p for p in participants}
    s_map = {s["id"]: s["name"] for s in sites}
    
    for a in aes:
        p = p_map.get(a["participant_id"], {})
        site_name = s_map.get(p.get("site_id"), "")
        writer.writerow([
            study.get("short_code"),
            p.get("subject_code", ""),
            site_name,
            a.get("verbatim_term"),
            a.get("severity"),
            "Yes" if a.get("serious") else "No",
            a.get("causality"),
            a.get("outcome"),
            a.get("onset_at")
        ])
        
    return StreamingResponse(
        iter([csv_buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=DSMB_{study.get('short_code')}.csv"}
    )
