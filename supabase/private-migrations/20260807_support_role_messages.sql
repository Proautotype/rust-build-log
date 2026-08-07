-- Right2Read — customer service role + support inbox.
-- Run once in the SQL editor of the project that holds your data
-- (hybzcouzsxktxgakuplw). Idempotent — safe to re-run.

-- =====================================================================
-- 1. New 'support' role (customer service)
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'support'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'support';
  END IF;
END $$;

-- =====================================================================
-- 2. Support messages (customer service inbox)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'support',
  status text NOT NULL DEFAULT 'open',
  reply text,
  handled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_messages_status_idx
  ON public.support_messages (status, created_at DESC);

-- Writes/reads go through server functions using the service role only.
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: the table is server-only by design.
DROP POLICY IF EXISTS "Users read own support messages" ON public.support_messages;
CREATE POLICY "Users read own support messages" ON public.support_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

GRANT SELECT ON public.support_messages TO authenticated;

DROP TRIGGER IF EXISTS support_messages_updated_at ON public.support_messages;
CREATE TRIGGER support_messages_updated_at
  BEFORE UPDATE ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
