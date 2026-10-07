# Database Backup and Restore Commands

To back up the live database, you should use the following methods (depending on your access to the Supabase CLI vs. dashboard):

## 1. Using Supabase CLI (Dashboard Link Required)
If you have linked your local project to the remote database, you can run:
```bash
supabase db dump --linked > full_backup.sql
```

## 2. Using pg_dump
If you have the database password, you can run standard `pg_dump`:
```bash
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" > full_backup.sql
```

## 3. Via Supabase Dashboard (Recommended)
1. Navigate to the **Supabase Dashboard**.
2. Select your project.
3. Go to **Database > Backups**.
4. Depending on your plan, you can trigger a backup or use Point in Time Recovery (PITR) to restore. You can also download Logical Backups from this interface.
