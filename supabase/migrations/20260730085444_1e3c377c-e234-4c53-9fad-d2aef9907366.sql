DELETE FROM public.stories WHERE slug = 'tmp-view-test';

CREATE OR REPLACE FUNCTION public.my_story_analytics()
RETURNS TABLE (
  story_id uuid,
  creator_id uuid,
  title text,
  slug text,
  published boolean,
  view_count integer,
  views_7d integer,
  views_30d integer,
  searches_7d integer,
  unlock_count integer,
  unlock_revenue integer,
  tip_count integer,
  tip_revenue integer,
  comment_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.creator_id,
    s.title,
    s.slug,
    s.published,
    s.view_count,
    COALESCE((SELECT count(*) FROM story_views v WHERE v.story_id = s.id AND v.created_at > now() - interval '7 days'), 0)::int,
    COALESCE((SELECT count(*) FROM story_views v WHERE v.story_id = s.id AND v.created_at > now() - interval '30 days'), 0)::int,
    COALESCE((SELECT count(*) FROM story_search_events e WHERE e.story_id = s.id AND e.created_at > now() - interval '7 days'), 0)::int,
    COALESCE((SELECT count(*) FROM story_unlocks u WHERE u.story_id = s.id), 0)::int,
    COALESCE((SELECT sum(u.price_paid) FROM story_unlocks u WHERE u.story_id = s.id), 0)::int,
    COALESCE((SELECT count(*) FROM coin_transactions t WHERE t.story_id = s.id AND t.kind = 'tip'), 0)::int,
    COALESCE((SELECT sum(t.amount) FROM coin_transactions t WHERE t.story_id = s.id AND t.kind = 'tip'), 0)::int,
    COALESCE((SELECT count(*) FROM comments c WHERE c.story_slug = s.slug), 0)::int
  FROM stories s
  WHERE s.creator_id = auth.uid()
  ORDER BY s.view_count DESC;
$$;

REVOKE ALL ON FUNCTION public.my_story_analytics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_story_analytics() TO authenticated, service_role;