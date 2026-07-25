ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS promoted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promoted_until timestamptz;

CREATE INDEX IF NOT EXISTS stories_promoted_idx ON public.stories (promoted) WHERE promoted = true;