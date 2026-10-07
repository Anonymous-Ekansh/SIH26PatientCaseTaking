# Hosting and Data Residency

Currently, the prototype is hosted on global infrastructure:
- **Frontend**: Hosted on Vercel.
- **Backend API**: Hosted on Render (US or EU region depending on dynamic allocation).
- **Database (Supabase)**: Hosted on AWS/Supabase cloud infrastructure (typically US East/West, unless enterprise pinned).

**Data Residency Note:** 
At this prototype stage, the data is **NOT** strictly localized within Indian data centers. To comply with Indian data localization laws (like the Digital Personal Data Protection Act, 2023) and ABDM requirements, production deployments must explicitly provision Supabase (AWS Mumbai/ap-south-1) and backend servers within India. We do not claim data residency compliance for this prototype instance.
