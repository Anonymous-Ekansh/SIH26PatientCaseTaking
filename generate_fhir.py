import os
import sys
import json
import requests

sys.path.insert(0, os.path.abspath('backend'))
from app.supabase_client import supabase

st_res = supabase.table("ct_studies").select("id").limit(1).execute()
study_id = st_res.data[0]["id"]

# Because local FASTAPI isn't running, I can just call the python function directly
from app.routers.ct_export import export_fhir
import asyncio

async def main():
    bundle = await export_fhir(study_id)
    with open("sample_fhir.json", "w") as f:
        json.dump(bundle, f)

asyncio.run(main())
