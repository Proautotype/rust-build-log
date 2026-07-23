
-- 1. Profiles: add coin_balance and banned
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS coin_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;

-- 2. Stories: monetization
DO $$ BEGIN
  CREATE TYPE public.story_monetization AS ENUM ('free', 'tips', 'locked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS monetization public.story_monetization NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS unlock_price integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tip_enabled boolean NOT NULL DEFAULT false;

-- 3. coin_transactions ledger
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('purchase','unlock_spend','unlock_earn','tip_spend','tip_earn','welcome','admin_adjust')),
  story_id uuid NULL,
  counterparty_id uuid NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coin_transactions TO authenticated;
GRANT ALL ON public.coin_transactions TO service_role;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own tx" ON public.coin_transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 4. story_unlocks
CREATE TABLE IF NOT EXISTS public.story_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  price_paid integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, story_id)
);
GRANT SELECT ON public.story_unlocks TO authenticated;
GRANT ALL ON public.story_unlocks TO service_role;
ALTER TABLE public.story_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own unlocks" ON public.story_unlocks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 5. Admin-only profile writes (role/ban). Admin read-all policy for user management.
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update any profile" ON public.profiles;
CREATE POLICY "Admins update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Admin-only role management on user_roles (in addition to existing policies).
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Welcome coins on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, coin_balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    50
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'reader')
  ON CONFLICT DO NOTHING;
  INSERT INTO public.coin_transactions (user_id, amount, kind, note)
  VALUES (NEW.id, 50, 'welcome', 'Welcome bonus');
  RETURN NEW;
END;
$function$;
