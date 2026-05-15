-- 005_clinic_assets_bucket.sql
-- Create a public bucket for clinic assets (logos, signatures)

INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic_assets', 'clinic_assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS para clinic_assets
DROP POLICY IF EXISTS "clinic_assets_select" ON storage.objects;
CREATE POLICY "clinic_assets_select"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'clinic_assets');

DROP POLICY IF EXISTS "clinic_assets_insert" ON storage.objects;
CREATE POLICY "clinic_assets_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'clinic_assets');

DROP POLICY IF EXISTS "clinic_assets_update" ON storage.objects;
CREATE POLICY "clinic_assets_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'clinic_assets')
  WITH CHECK (bucket_id = 'clinic_assets');

DROP POLICY IF EXISTS "clinic_assets_delete" ON storage.objects;
CREATE POLICY "clinic_assets_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'clinic_assets');
