-- Create the 'ct-files' bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'ct-files') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('ct-files', 'ct-files', true);
  END IF;
END $$;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow All" ON storage.objects;

-- Create policy to allow all operations for now (prototype)
CREATE POLICY "Allow All" ON storage.objects FOR ALL USING (bucket_id = 'ct-files') WITH CHECK (bucket_id = 'ct-files');
