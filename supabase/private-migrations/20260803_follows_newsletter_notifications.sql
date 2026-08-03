-- Right2Read — likes/flags (re-included so likes finally work), writer follows,
-- newsletter subscribers and in-app notifications.
-- Run once in the SQL editor of the project that holds your data
-- (hybzcouzsxktxgakuplw). Idempotent — safe to re-run.

-- =====================================================================
-- 0. Counters used by likes / flags
-- =====================================================================
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flag_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS flag_threshold integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS tts_price_coins integer NOT NULL DEFAULT 1;

-- =====================================================================
-- 1. Likes
-- =====================================================================
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
CREATE POLICY "Anyone can read likes" ON public.story_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users like as themselves" ON public.story_likes;
CREATE POLICY "Users like as themselves" ON public.story_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users remove own likes" ON public.story_likes;
CREATE POLICY "Users remove own likes" ON public.story_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =====================================================================
-- 2. Flags + admin notifications
-- =====================================================================
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

CREATE OR REPLACE FUNCTION public.on_story_flagged()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _count integer;
  _threshold integer;
  _title text;
BEGIN
  UPDATE public.stories SET flag_count = flag_count + 1
    WHERE id = NEW.story_id RETURNING flag_count, title INTO _count, _title;

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
CREATE TRIGGER trg_on_story_flagged AFTER INSERT ON public.story_flags
  FOR EACH ROW EXECUTE FUNCTION public.on_story_flagged();

-- =====================================================================
-- 3. Paid listens (text-to-speech)
-- =====================================================================
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

-- =====================================================================
-- 4. Writer follows
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.writer_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  writer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, writer_id),
  CHECK (follower_id <> writer_id)
);

CREATE INDEX IF NOT EXISTS writer_follows_writer_idx ON public.writer_follows(writer_id);

GRANT SELECT, INSERT, DELETE ON public.writer_follows TO authenticated;
GRANT SELECT ON public.writer_follows TO anon;
GRANT ALL ON public.writer_follows TO service_role;
ALTER TABLE public.writer_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read follows" ON public.writer_follows;
CREATE POLICY "Anyone can read follows" ON public.writer_follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users follow as themselves" ON public.writer_follows;
CREATE POLICY "Users follow as themselves" ON public.writer_follows
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users unfollow themselves" ON public.writer_follows;
CREATE POLICY "Users unfollow themselves" ON public.writer_follows
  FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- =====================================================================
-- 5. In-app notifications (per reader)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  story_slug text,
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON public.notifications(user_id, read, created_at DESC);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- 6. Newsletter subscribers + send log
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  topics text[] NOT NULL DEFAULT '{}',
  source text NOT NULL DEFAULT 'site',
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.newsletter_subscribers TO service_role;
GRANT SELECT ON public.newsletter_subscribers TO authenticated;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own subscription" ON public.newsletter_subscribers;
CREATE POLICY "Users read own subscription" ON public.newsletter_subscribers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff read subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Staff read subscribers" ON public.newsletter_subscribers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE TABLE IF NOT EXISTS public.newsletter_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  recipient_count integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

GRANT ALL ON public.newsletter_sends TO service_role;
GRANT SELECT ON public.newsletter_sends TO authenticated;
ALTER TABLE public.newsletter_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read sends" ON public.newsletter_sends;
CREATE POLICY "Staff read sends" ON public.newsletter_sends
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- =====================================================================
-- 7. Fan-out: a published story notifies followers; a promoted story also
--    reaches readers whose interests match its category.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.story_notification_log (
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, kind)
);
GRANT ALL ON public.story_notification_log TO service_role;
ALTER TABLE public.story_notification_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.on_story_published_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _writer text;
  _kind text := CASE WHEN NEW.promoted THEN 'promoted' ELSE 'followers' END;
BEGIN
  IF NEW.published IS NOT TRUE OR NEW.creator_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- only once per story per kind
  BEGIN
    INSERT INTO public.story_notification_log (story_id, kind) VALUES (NEW.id, _kind);
  EXCEPTION WHEN unique_violation THEN
    RETURN NEW;
  END;

  SELECT COALESCE(display_name, 'A writer') INTO _writer
  FROM public.profiles WHERE id = NEW.creator_id;

  -- followers of the writer
  INSERT INTO public.notifications (user_id, kind, title, body, story_id, story_slug)
  SELECT f.follower_id, 'new_story',
         format('%s published "%s"', _writer, NEW.title),
         COALESCE(NEW.short_description, ''), NEW.id, NEW.slug
  FROM public.writer_follows f
  WHERE f.writer_id = NEW.creator_id;

  -- promoted stories additionally reach interest-matched readers
  IF NEW.promoted THEN
    INSERT INTO public.notifications (user_id, kind, title, body, story_id, story_slug)
    SELECT p.id, 'promoted_story',
           format('Trending: "%s"', NEW.title),
           COALESCE(NEW.short_description, ''), NEW.id, NEW.slug
    FROM public.profiles p
    WHERE p.id <> NEW.creator_id
      AND (
        NEW.category IS NULL
        OR array_length(p.interests, 1) IS NULL
        OR NEW.category = ANY (p.interests)
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = p.id AND n.story_id = NEW.id
      );
  END IF;

  -- queue a newsletter blast for this story
  INSERT INTO public.newsletter_sends (story_id, subject, status, recipient_count)
  SELECT NEW.id, format('New on Right2Read: %s', NEW.title), 'queued',
         (SELECT count(*) FROM public.newsletter_subscribers WHERE unsubscribed_at IS NULL)
  WHERE NOT EXISTS (SELECT 1 FROM public.newsletter_sends WHERE story_id = NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_story_published_notify ON public.stories;
CREATE TRIGGER trg_on_story_published_notify
  AFTER INSERT OR UPDATE OF published, promoted ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.on_story_published_notify();
