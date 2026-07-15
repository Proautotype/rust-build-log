
CREATE TABLE public.journeys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  cover TEXT,
  started_at DATE NOT NULL DEFAULT (now()::date),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.journeys TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journeys TO authenticated;
GRANT ALL ON public.journeys TO service_role;

ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Journeys viewable by everyone" ON public.journeys
  FOR SELECT USING (true);
CREATE POLICY "Creators can insert own journeys" ON public.journeys
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update own journeys" ON public.journeys
  FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can delete own journeys" ON public.journeys
  FOR DELETE TO authenticated USING (auth.uid() = creator_id);

CREATE TRIGGER update_journeys_updated_at
  BEFORE UPDATE ON public.journeys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.stories
  ADD COLUMN journey_id UUID REFERENCES public.journeys(id) ON DELETE SET NULL;

CREATE INDEX stories_journey_id_idx ON public.stories(journey_id);
CREATE INDEX stories_creator_id_idx ON public.stories(creator_id);
CREATE UNIQUE INDEX IF NOT EXISTS stories_slug_key ON public.stories(slug);
