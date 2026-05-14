INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public read submissions" ON storage.objects;
CREATE POLICY "Allow public read submissions" ON storage.objects
FOR SELECT USING (bucket_id = 'submissions');

DROP POLICY IF EXISTS "Allow uploads submissions" ON storage.objects;
CREATE POLICY "Allow uploads submissions" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'submissions');

DROP POLICY IF EXISTS "Allow updates submissions" ON storage.objects;
CREATE POLICY "Allow updates submissions" ON storage.objects
FOR UPDATE USING (bucket_id = 'submissions');

DROP POLICY IF EXISTS "Allow deletes submissions" ON storage.objects;
CREATE POLICY "Allow deletes submissions" ON storage.objects
FOR DELETE USING (bucket_id = 'submissions');
