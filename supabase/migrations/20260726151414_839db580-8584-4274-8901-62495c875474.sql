-- 1. Story view events
CREATE TABLE public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX story_views_story_created_idx ON public.story_views (story_id, created_at DESC);
CREATE INDEX story_views_dedupe_idx ON public.story_views (story_id, session_key, created_at DESC);

GRANT INSERT ON public.story_views TO anon, authenticated;
GRANT ALL ON public.story_views TO service_role;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can record a view" ON public.story_views FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 2. Search events
CREATE TABLE public.story_search_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE,
  searcher_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX story_search_events_story_created_idx ON public.story_search_events (story_id, created_at DESC);

GRANT INSERT ON public.story_search_events TO anon, authenticated;
GRANT ALL ON public.story_search_events TO service_role;
ALTER TABLE public.story_search_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can record a search" ON public.story_search_events FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 3. Record view rows + de-dupe per session within 6 hours
CREATE OR REPLACE FUNCTION public.increment_story_view(_story_id uuid, _session_key text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _recent boolean := false;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.stories WHERE id = _story_id AND published = true) THEN
    RETURN;
  END IF;

  IF _session_key IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.story_views
      WHERE story_id = _story_id
        AND session_key = _session_key
        AND created_at > now() - interval '6 hours'
    ) INTO _recent;
  END IF;

  IF _recent THEN
    RETURN;
  END IF;

  INSERT INTO public.story_views (story_id, viewer_id, session_key)
  VALUES (_story_id, auth.uid(), _session_key);

  UPDATE public.stories SET view_count = view_count + 1 WHERE id = _story_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_story_view(uuid, text) TO anon, authenticated, service_role;

-- 4. AI generated marker
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT false;

-- 5. Creator agents
CREATE TABLE public.creator_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My AI writer',
  enabled boolean NOT NULL DEFAULT false,
  topic text NOT NULL DEFAULT '',
  tone text NOT NULL DEFAULT 'practical, friendly',
  cadence text NOT NULL DEFAULT 'weekly',
  auto_publish boolean NOT NULL DEFAULT false,
  journey_id uuid REFERENCES public.journeys(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'Fundamentals',
  monetization story_monetization NOT NULL DEFAULT 'free',
  unlock_price integer NOT NULL DEFAULT 0,
  tip_enabled boolean NOT NULL DEFAULT false,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX creator_agents_creator_idx ON public.creator_agents (creator_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_agents TO authenticated;
GRANT ALL ON public.creator_agents TO service_role;
ALTER TABLE public.creator_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators manage own agents" ON public.creator_agents FOR ALL TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE TRIGGER creator_agents_updated_at BEFORE UPDATE ON public.creator_agents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Agent runs log
CREATE TABLE public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.creator_agents(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'schedule',
  status text NOT NULL DEFAULT 'ok',
  story_id uuid REFERENCES public.stories(id) ON DELETE SET NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_runs_creator_created_idx ON public.agent_runs (creator_id, created_at DESC);

GRANT SELECT ON public.agent_runs TO authenticated;
GRANT ALL ON public.agent_runs TO service_role;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators view own agent runs" ON public.agent_runs FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);

-- 7. Agent API keys (hashed)
CREATE TABLE public.agent_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Default key',
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX agent_api_keys_hash_idx ON public.agent_api_keys (key_hash);
CREATE INDEX agent_api_keys_creator_idx ON public.agent_api_keys (creator_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_api_keys TO authenticated;
GRANT ALL ON public.agent_api_keys TO service_role;
ALTER TABLE public.agent_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators manage own api keys" ON public.agent_api_keys FOR ALL TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- 8. Extended analytics view
DROP VIEW IF EXISTS public.story_analytics;
CREATE VIEW public.story_analytics
WITH (security_invoker = true) AS
SELECT
  s.id AS story_id,
  s.creator_id,
  s.title,
  s.slug,
  s.published,
  s.ai_generated,
  s.view_count,
  COALESCE(v7.c, 0)::integer AS views_7d,
  COALESCE(v30.c, 0)::integer AS views_30d,
  COALESCE(se7.c, 0)::integer AS searches_7d,
  COALESCE(u.unlock_count, 0)::integer AS unlock_count,
  COALESCE(u.unlock_revenue, 0)::integer AS unlock_revenue,
  COALESCE(t.tip_count, 0)::integer AS tip_count,
  COALESCE(t.tip_revenue, 0)::integer AS tip_revenue,
  COALESCE(c.comment_count, 0)::integer AS comment_count
FROM public.stories s
LEFT JOIN (SELECT story_id, count(*) c FROM public.story_views WHERE created_at > now() - interval '7 days' GROUP BY story_id) v7 ON v7.story_id = s.id
LEFT JOIN (SELECT story_id, count(*) c FROM public.story_views WHERE created_at > now() - interval '30 days' GROUP BY story_id) v30 ON v30.story_id = s.id
LEFT JOIN (SELECT story_id, count(*) c FROM public.story_search_events WHERE created_at > now() - interval '7 days' GROUP BY story_id) se7 ON se7.story_id = s.id
LEFT JOIN (SELECT story_id, count(*) AS unlock_count, COALESCE(sum(price_paid), 0) AS unlock_revenue FROM public.story_unlocks GROUP BY story_id) u ON u.story_id = s.id
LEFT JOIN (SELECT story_id, count(*) AS tip_count, COALESCE(sum(amount), 0) AS tip_revenue FROM public.coin_transactions WHERE kind = 'tip' AND story_id IS NOT NULL GROUP BY story_id) t ON t.story_id = s.id
LEFT JOIN (SELECT story_slug, count(*) AS comment_count FROM public.comments GROUP BY story_slug) c ON c.story_slug = s.slug;

GRANT SELECT ON public.story_analytics TO authenticated;
GRANT ALL ON public.story_analytics TO service_role;

-- 9. Trending view (public)
CREATE VIEW public.trending_stories
WITH (security_invoker = true) AS
SELECT
  s.id AS story_id,
  s.slug,
  COALESCE(v.c, 0)::integer AS views_7d,
  COALESCE(se.c, 0)::integer AS searches_7d,
  COALESCE(cm.c, 0)::integer AS comments_7d,
  COALESCE(t.c, 0)::integer AS tips_7d,
  COALESCE(u.c, 0)::integer AS unlocks_7d,
  (
    COALESCE(v.c, 0) * 1
    + COALESCE(se.c, 0) * 2
    + COALESCE(cm.c, 0) * 3
    + COALESCE(t.c, 0) * 4
    + COALESCE(u.c, 0) * 5
    + CASE WHEN s.promoted THEN 5 ELSE 0 END
  )::integer AS score
FROM public.stories s
LEFT JOIN (SELECT story_id, count(*) c FROM public.story_views WHERE created_at > now() - interval '7 days' GROUP BY story_id) v ON v.story_id = s.id
LEFT JOIN (SELECT story_id, count(*) c FROM public.story_search_events WHERE created_at > now() - interval '7 days' GROUP BY story_id) se ON se.story_id = s.id
LEFT JOIN (SELECT story_slug, count(*) c FROM public.comments WHERE created_at > now() - interval '7 days' GROUP BY story_slug) cm ON cm.story_slug = s.slug
LEFT JOIN (SELECT story_id, count(*) c FROM public.coin_transactions WHERE kind = 'tip' AND story_id IS NOT NULL AND created_at > now() - interval '7 days' GROUP BY story_id) t ON t.story_id = s.id
LEFT JOIN (SELECT story_id, count(*) c FROM public.story_unlocks WHERE created_at > now() - interval '7 days' GROUP BY story_id) u ON u.story_id = s.id
WHERE s.published = true;

GRANT SELECT ON public.trending_stories TO anon, authenticated;
GRANT ALL ON public.trending_stories TO service_role;