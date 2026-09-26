import os
import sys

# We check for DEMO_MODE before doing anything else
if os.getenv('DEMO_MODE') != 'true':
    print("Error: Refusing to run unless DEMO_MODE=true", file=sys.stderr)
    sys.exit(1)

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: 'supabase' package is not installed. Please pip install supabase", file=sys.stderr)
    sys.exit(1)

def main():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Service role is required for admin operations
    
    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set.", file=sys.stderr)
        sys.exit(1)
        
    password = os.getenv("DEMO_USER_PASSWORD", "SyntheticDemo123!")
    
    print("WARNING: This script creates synthetic demo users. Never run against a live production database!")
    
    supabase: Client = create_client(supabase_url, supabase_key)
    
    roles = [
        "pi", 
        "coordinator", 
        "monitor", 
        "ethics_committee", 
        "pharmacovigilance", 
        "admin", 
        "regulator_ro", 
        "leadership"
    ]
    
    for role in roles:
        email = f"demo_{role}@synthetic.local"
        
        try:
            # 1. Create the user using Supabase Admin Auth API
            res = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True
            })
            user_id = res.user.id
            print(f"Created auth user: {email} ({user_id})")
            
            # 2. Insert into ct_profiles
            profile_data = {
                "user_id": user_id,
                "full_name": f"Synthetic {role.title().replace('_', ' ')}",
                "role": role
            }
            # Note: since the migration enforces RLS, using service_role bypasses RLS and allows insert
            supabase.table("ct_profiles").insert(profile_data).execute()
            print(f"Created ct_profiles row for {role}")
            
        except Exception as e:
            # If the user already exists, it will throw an exception
            print(f"Error creating user {email}: {e}")

if __name__ == "__main__":
    main()
