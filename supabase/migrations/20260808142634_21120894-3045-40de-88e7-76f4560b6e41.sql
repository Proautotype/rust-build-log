ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS socials jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS show_socials boolean NOT NULL DEFAULT true;