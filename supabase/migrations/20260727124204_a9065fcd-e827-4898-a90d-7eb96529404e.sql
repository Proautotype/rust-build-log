ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS theme jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'story',
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  preview text NOT NULL DEFAULT '',
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  card_variant text NOT NULL DEFAULT 'poster',
  visibility text NOT NULL DEFAULT 'private',
  price integer NOT NULL DEFAULT 0,
  uses integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated;
GRANT SELECT ON public.templates TO anon;
GRANT ALL ON public.templates TO service_role;

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shared templates viewable by everyone"
  ON public.templates FOR SELECT USING (visibility = 'public');
CREATE POLICY "Creators view own templates"
  ON public.templates FOR SELECT TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Creators insert own templates"
  ON public.templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators update own templates"
  ON public.templates FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators delete own templates"
  ON public.templates FOR DELETE TO authenticated USING (auth.uid() = creator_id);

CREATE TRIGGER templates_set_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.template_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  price_paid integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, template_id)
);

GRANT SELECT ON public.template_unlocks TO authenticated;
GRANT ALL ON public.template_unlocks TO service_role;

ALTER TABLE public.template_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own template unlocks"
  ON public.template_unlocks FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));