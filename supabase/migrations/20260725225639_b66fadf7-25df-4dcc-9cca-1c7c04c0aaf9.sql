
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS adsense_global_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('image','video')),
  url text NOT NULL,
  path text NOT NULL,
  filename text,
  size_bytes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own media select" ON public.media_assets;
CREATE POLICY "own media select" ON public.media_assets FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own media insert" ON public.media_assets;
CREATE POLICY "own media insert" ON public.media_assets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "own media delete" ON public.media_assets;
CREATE POLICY "own media delete" ON public.media_assets FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Storage policies for the "media" bucket
DROP POLICY IF EXISTS "media public read" ON storage.objects;
CREATE POLICY "media public read" ON storage.objects FOR SELECT USING (bucket_id = 'media');

DROP POLICY IF EXISTS "media auth upload own folder" ON storage.objects;
CREATE POLICY "media auth upload own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "media auth update own" ON storage.objects;
CREATE POLICY "media auth update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "media auth delete own" ON storage.objects;
CREATE POLICY "media auth delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
