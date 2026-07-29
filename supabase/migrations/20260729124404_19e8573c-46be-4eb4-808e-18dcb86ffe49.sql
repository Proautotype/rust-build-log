CREATE TABLE public.writer_x_credentials (
  creator_id uuid PRIMARY KEY,
  token_ciphertext text NOT NULL,
  token_last4 text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.writer_x_credentials TO service_role;
ALTER TABLE public.writer_x_credentials ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER writer_x_credentials_updated_at
BEFORE UPDATE ON public.writer_x_credentials
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.x_setup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_email text NOT NULL,
  x_handle text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'paid',
  price_coins integer NOT NULL DEFAULT 0,
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.x_setup_requests TO authenticated;
GRANT ALL ON public.x_setup_requests TO service_role;
ALTER TABLE public.x_setup_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Writers see their own X setup requests"
ON public.x_setup_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));

CREATE POLICY "Writers create their own X setup requests"
ON public.x_setup_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER x_setup_requests_updated_at
BEFORE UPDATE ON public.x_setup_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS x_setup_price_coins integer NOT NULL DEFAULT 500;