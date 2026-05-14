DROP POLICY IF EXISTS "Allow uploads osld" ON storage.objects;

CREATE POLICY "Allow uploads osld" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'osld-files');

DROP POLICY IF EXISTS "Allow public read access osld" ON storage.objects;

CREATE POLICY "Allow public read access osld" ON storage.objects
FOR SELECT USING (bucket_id = 'osld-files');

DROP POLICY IF EXISTS "Allow updates osld" ON storage.objects;

CREATE POLICY "Allow updates osld" ON storage.objects
FOR UPDATE USING (bucket_id = 'osld-files');

DROP POLICY IF EXISTS "Allow deletes osld" ON storage.objects;

CREATE POLICY "Allow deletes osld" ON storage.objects
FOR DELETE USING (bucket_id = 'osld-files');
