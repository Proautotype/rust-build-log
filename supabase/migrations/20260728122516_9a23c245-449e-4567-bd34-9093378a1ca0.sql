CREATE TABLE public.writer_x_settings (
  creator_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  keywords text[] NOT NULL DEFAULT '{}',
  use_reader_interests boolean NOT NULL DEFAULT true,
  min_engagement integer NOT NULL DEFAULT 0,
  default_category text NOT NULL DEFAULT 'social',
  default_tone text NOT NULL DEFAULT 'clear, engaging, factual',
  auto_publish boolean NOT NULL DEFAULT false,
  show_on_home boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.writer_x_settings TO authenticated;
GRANT ALL ON public.writer_x_settings TO service_role;

ALTER TABLE public.writer_x_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Writers manage own X settings"
ON public.writer_x_settings FOR ALL TO authenticated
USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE TRIGGER writer_x_settings_updated_at
BEFORE UPDATE ON public.writer_x_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS x_trend_keyword text,
  ADD COLUMN IF NOT EXISTS x_source_urls text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS stories_x_trend_keyword_idx ON public.stories (x_trend_keyword) WHERE x_trend_keyword IS NOT NULL;