-- 1. Move has_role out of the exposed API schema (policies follow automatically)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION private.has_role(uuid, public.app_role) SET search_path = public;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

-- 2. SECURITY DEFINER view-counter functions: server-side only
DROP FUNCTION IF EXISTS public.increment_story_view(uuid);
REVOKE ALL ON FUNCTION public.increment_story_view(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_story_view(uuid, text) TO service_role;

-- 3. Storage: media files readable only by their owner
DROP POLICY IF EXISTS "media public read" ON storage.objects;
CREATE POLICY "media owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Profiles: hide sensitive columns from anon/authenticated Data API access
REVOKE SELECT, UPDATE, INSERT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name, avatar_url, bio, is_pro, created_at)
  ON public.profiles TO anon;
GRANT SELECT (id, display_name, avatar_url, bio, is_pro, created_at, updated_at, interests, onboarded)
  ON public.profiles TO authenticated;
GRANT INSERT (id, display_name, avatar_url, bio, interests, onboarded)
  ON public.profiles TO authenticated;
GRANT UPDATE (display_name, avatar_url, bio, interests, onboarded, updated_at)
  ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 5. Remove always-true INSERT policies
DROP POLICY IF EXISTS "Anyone can record a view" ON public.story_views;
CREATE POLICY "Record own view" ON public.story_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (viewer_id IS NULL OR viewer_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can record a search" ON public.story_search_events;
CREATE POLICY "Record own search" ON public.story_search_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (searcher_id IS NULL OR searcher_id = auth.uid());