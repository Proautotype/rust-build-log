
-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('reader', 'writer', 'admin');

-- 2. user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 3. has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Update handle_new_user to assign 'reader'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'reader')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill readers
INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'reader'::public.app_role FROM public.profiles
  WHERE id IN (SELECT id FROM auth.users)
  ON CONFLICT DO NOTHING;

-- 5. writer_requests
CREATE TABLE public.writer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.writer_requests TO authenticated;
GRANT ALL ON public.writer_requests TO service_role;
ALTER TABLE public.writer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own request"
  ON public.writer_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create own request"
  ON public.writer_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Users can cancel own pending request"
  ON public.writer_requests FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins can view all requests"
  ON public.writer_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update requests"
  ON public.writer_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER writer_requests_updated_at
  BEFORE UPDATE ON public.writer_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.on_writer_request_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'writer') ON CONFLICT DO NOTHING;
    NEW.reviewed_at := now();
    NEW.reviewed_by := auth.uid();
  ELSIF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    NEW.reviewed_at := now();
    NEW.reviewed_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER writer_request_approval
  BEFORE UPDATE ON public.writer_requests
  FOR EACH ROW EXECUTE FUNCTION public.on_writer_request_approved();

-- 6. Allow nullable creators for system-seeded content
ALTER TABLE public.stories ALTER COLUMN creator_id DROP NOT NULL;
ALTER TABLE public.journeys ALTER COLUMN creator_id DROP NOT NULL;

-- 7. Restrict inserts to writers/admins
DROP POLICY IF EXISTS "Creators can insert own stories" ON public.stories;
CREATE POLICY "Writers can insert own stories"
  ON public.stories FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
    AND (public.has_role(auth.uid(), 'writer') OR public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Creators can insert own journeys" ON public.journeys;
CREATE POLICY "Writers can insert own journeys"
  ON public.journeys FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
    AND (public.has_role(auth.uid(), 'writer') OR public.has_role(auth.uid(), 'admin'))
  );

-- 8. Seed content (creator_id = NULL for system content)
INSERT INTO public.journeys (id, creator_id, slug, title, description, cover, started_at)
VALUES (
  '00000000-0000-0000-0000-0000000000a1',
  NULL,
  'learning-rust',
  'Learning Rust',
  'From zero to shipping. Ownership, lifetimes, async, systems programming, and everything I break along the way.',
  'https://placehold.co/1600x900/1a1a1a/f97316?text=Learning+Rust',
  '2026-01-14'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.stories (
  creator_id, journey_id, slug, title, short_description, cover,
  category, difficulty, reading_minutes, tags, content, published, created_at
) VALUES
(
  NULL, '00000000-0000-0000-0000-0000000000a1',
  'is-rust-for-beginners', 'Is Rust for Beginners?',
  'The internet says Rust is hard. After a month with the borrow checker, here''s what I actually think.',
  'https://placehold.co/1600x900/1a1a1a/f97316?text=Is+Rust+for+Beginners',
  'Meta', 'Beginner', 6,
  ARRAY['rust','learning','beginners']::text[],
  '[
    {"type":"paragraph","text":"As a beginner Rust developer, I am okay telling you this: Rust can be a little out of your depth if you are completely new to software development."},
    {"type":"heading","level":2,"text":"The short answer","id":"the-short-answer"},
    {"type":"paragraph","text":"Yes, and no. Rust is unusual because it forces you to think about memory before your program runs. The compiler is a pair programmer that refuses to let you ship a segfault."},
    {"type":"heading","level":2,"text":"What actually helped me","id":"what-helped"},
    {"type":"list","items":["Reading The Book cover to cover before touching a real project.","Writing tiny CLIs instead of trying to build a web app on day one.","Treating compiler errors as prose, not noise.","Ignoring async for the first three weeks."]},
    {"type":"quote","text":"Rust doesn''t make hard things easy. It makes the hard things you were already doing visible."},
    {"type":"heading","level":2,"text":"A first program","id":"first-program"},
    {"type":"code","language":"rust","filename":"src/main.rs","code":"fn celsius_to_fahrenheit(c: f64) -> f64 {\n    c * 9.0 / 5.0 + 32.0\n}\n\nfn main() {\n    println!(\"{:.1}\", celsius_to_fahrenheit(100.0));\n}"}
  ]'::jsonb,
  true, '2026-07-13'
),
(
  NULL, '00000000-0000-0000-0000-0000000000a1',
  'why-rust-exists', 'Why Rust Exists',
  'A short history of Rust — from a Mozilla research project to the language rewriting the kernel.',
  'https://placehold.co/1600x900/1a1a1a/f97316?text=Why+Rust+Exists',
  'Fundamentals', 'Beginner', 8,
  ARRAY['rust','history','systems']::text[],
  '[
    {"type":"paragraph","text":"You can''t really understand Rust without understanding what it was reacting to. Every design decision is scar tissue from decades of C and C++ bugs."},
    {"type":"heading","level":2,"text":"The problem","id":"problem"},
    {"type":"paragraph","text":"Roughly 70% of security vulnerabilities in large C/C++ codebases come from memory safety issues: use-after-free, buffer overflows, data races."},
    {"type":"video","youtubeId":"5C_HPTJg5ek","title":"Rust in the Linux kernel — a short overview"},
    {"type":"heading","level":2,"text":"The bet","id":"bet"},
    {"type":"paragraph","text":"Rust bets you can eliminate that entire class of bugs at compile time — without a garbage collector, without runtime overhead — if you teach the compiler about ownership."},
    {"type":"heading","level":3,"text":"Two rules that changed everything","id":"two-rules"},
    {"type":"list","ordered":true,"items":["Every value has exactly one owner.","You can have many readers, or one writer — never both."]}
  ]'::jsonb,
  true, '2026-02-10'
),
(
  NULL, '00000000-0000-0000-0000-0000000000a1',
  'my-first-rust-project', 'My First Rust Project',
  'A tiny markdown-to-HTML converter. What I got wrong, what surprised me, and what I''d do again.',
  'https://placehold.co/1600x900/1a1a1a/f97316?text=First+Rust+Project',
  'CLI Tools', 'Beginner', 10,
  ARRAY['rust','cli','project']::text[],
  '[
    {"type":"paragraph","text":"After two weeks of reading, I needed to build something. Not a toy — something I''d actually use. I settled on a markdown-to-HTML converter."},
    {"type":"heading","level":2,"text":"Setting up the project","id":"setup"},
    {"type":"code","language":"bash","code":"cargo new md2html\ncd md2html\ncargo add pulldown-cmark clap --features clap/derive"},
    {"type":"heading","level":2,"text":"What surprised me","id":"surprises"},
    {"type":"list","items":["Cargo is the best package manager I''ve ever used.","Error messages actually suggest fixes.","I never wrote a single free() and the program has no leaks."]}
  ]'::jsonb,
  true, '2026-02-24'
)
ON CONFLICT DO NOTHING;
