
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_story_view(_story_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.stories SET view_count = view_count + 1 WHERE id = _story_id AND published = true;
$$;

REVOKE ALL ON FUNCTION public.increment_story_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_story_view(uuid) TO anon, authenticated;

ALTER TABLE public.stories ALTER COLUMN difficulty DROP NOT NULL;

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS media_bucket_public boolean NOT NULL DEFAULT false;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS media_max_mb integer NOT NULL DEFAULT 50;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS media_allowed_types text NOT NULL DEFAULT 'image/*,video/*';

DROP POLICY IF EXISTS "Managers can view writer requests" ON public.writer_requests;
CREATE POLICY "Managers can view writer requests" ON public.writer_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Managers can review writer requests" ON public.writer_requests;
CREATE POLICY "Managers can review writer requests" ON public.writer_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.story_analytics
WITH (security_invoker = true)
AS
SELECT
  s.id AS story_id,
  s.creator_id,
  s.title,
  s.slug,
  s.published,
  s.view_count,
  COALESCE(u.unlock_count, 0)::int AS unlock_count,
  COALESCE(u.unlock_revenue, 0)::int AS unlock_revenue,
  COALESCE(t.tip_count, 0)::int AS tip_count,
  COALESCE(t.tip_revenue, 0)::int AS tip_revenue,
  COALESCE(c.comment_count, 0)::int AS comment_count
FROM public.stories s
LEFT JOIN (
  SELECT story_id, COUNT(*) AS unlock_count, COALESCE(SUM(price_paid),0) AS unlock_revenue
  FROM public.story_unlocks GROUP BY story_id
) u ON u.story_id = s.id
LEFT JOIN (
  SELECT story_id, COUNT(*) AS tip_count, COALESCE(SUM(amount),0) AS tip_revenue
  FROM public.coin_transactions WHERE kind = 'tip' AND story_id IS NOT NULL GROUP BY story_id
) t ON t.story_id = s.id
LEFT JOIN (
  SELECT story_slug, COUNT(*) AS comment_count FROM public.comments GROUP BY story_slug
) c ON c.story_slug = s.slug;

GRANT SELECT ON public.story_analytics TO authenticated;
