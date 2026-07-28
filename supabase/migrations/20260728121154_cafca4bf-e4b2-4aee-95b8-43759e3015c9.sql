ALTER TABLE public.creator_agents
  ADD COLUMN IF NOT EXISTS source_mode text NOT NULL DEFAULT 'topic',
  ADD COLUMN IF NOT EXISTS x_keywords text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS use_reader_interests boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_engagement integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.agent_trend_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  agent_id uuid REFERENCES public.creator_agents(id) ON DELETE CASCADE,
  story_id uuid REFERENCES public.stories(id) ON DELETE SET NULL,
  trend_key text NOT NULL,
  label text NOT NULL DEFAULT '',
  source_urls text[] NOT NULL DEFAULT '{}'::text[],
  used_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_trend_sources_creator_trend_idx
  ON public.agent_trend_sources (creator_id, trend_key);

GRANT SELECT ON public.agent_trend_sources TO authenticated;
GRANT ALL ON public.agent_trend_sources TO service_role;

ALTER TABLE public.agent_trend_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators view own trend sources"
  ON public.agent_trend_sources FOR SELECT TO authenticated
  USING (auth.uid() = creator_id);