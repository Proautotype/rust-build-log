-- Right2Read — likes, flags (+ admin notifications) and paid text-to-speech.
-- Run this once in the SQL editor of the project that holds your data
-- (hybzcouzsxktxgakuplw). It is idempotent.

-- ---------------------------------------------------------------- counters
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flag_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS flag_threshold integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS tts_price_coins integer NOT NULL DEFAULT 1;

-- ------------------------------------------------------------------- likes
CREATE TABLE IF NOT EXISTS public.story_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.story_likes TO authenticated;
GRANT SELECT ON public.story_likes TO anon;
GRANT ALL ON public.story_likes TO service_role;
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read likes" ON public.story_likes;
CREATE POLICY "Anyone can read likes" ON public.story_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users like as themselves" ON public.story_likes;
CREATE POLICY "Users like as themselves" ON public.story_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users remove own likes" ON public.story_likes;
CREATE POLICY "Users remove own likes" ON public.story_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ------------------------------------------------------------------- flags
CREATE TABLE IF NOT EXISTS public.story_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, reporter_id)
);

GRANT SELECT, INSERT ON public.story_flags TO authenticated;
GRANT ALL ON public.story_flags TO service_role;
ALTER TABLE public.story_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users flag as themselves" ON public.story_flags;
CREATE POLICY "Users flag as themselves" ON public.story_flags
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users read own flags" ON public.story_flags;
CREATE POLICY "Users read own flags" ON public.story_flags
  FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Staff read all flags" ON public.story_flags;
CREATE POLICY "Staff read all flags" ON public.story_flags
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- ---------------------------------------------------- admin notifications
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE,
  message text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read notifications" ON public.admin_notifications;
CREATE POLICY "Staff read notifications" ON public.admin_notifications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Staff resolve notifications" ON public.admin_notifications;
CREATE POLICY "Staff resolve notifications" ON public.admin_notifications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Keep stories.flag_count in sync and raise an admin notification once a
-- story crosses the configured flag threshold.
CREATE OR REPLACE FUNCTION public.on_story_flagged()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
  _threshold integer;
  _title text;
BEGIN
  UPDATE public.stories
    SET flag_count = flag_count + 1
    WHERE id = NEW.story_id
    RETURNING flag_count, title INTO _count, _title;

  SELECT COALESCE(max(flag_threshold), 3) INTO _threshold FROM public.site_settings;

  IF _count >= _threshold THEN
    INSERT INTO public.admin_notifications (kind, story_id, message)
    SELECT 'story_flagged', NEW.story_id,
           format('"%s" has %s flags (threshold %s)', _title, _count, _threshold)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.admin_notifications
      WHERE kind = 'story_flagged' AND story_id = NEW.story_id AND resolved = false
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_story_flagged ON public.story_flags;
CREATE TRIGGER trg_on_story_flagged
  AFTER INSERT ON public.story_flags
  FOR EACH ROW EXECUTE FUNCTION public.on_story_flagged();

-- --------------------------------------------------- paid listens (TTS)
CREATE TABLE IF NOT EXISTS public.story_listens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price_paid integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);

GRANT SELECT ON public.story_listens TO authenticated;
GRANT ALL ON public.story_listens TO service_role;
ALTER TABLE public.story_listens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own listens" ON public.story_listens;
CREATE POLICY "Users read own listens" ON public.story_listens
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
