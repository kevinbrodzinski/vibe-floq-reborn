/*───────────────────────────────────────────────────────────────
  0.  Extensions (idempotent, just in case)
───────────────────────────────────────────────────────────────*/
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS citext   WITH SCHEMA extensions;

/*───────────────────────────────────────────────────────────────
  1.  Make every helper function's search_path deterministic
      — we ALTER only if the function exists
───────────────────────────────────────────────────────────────*/
DO $$
BEGIN
  PERFORM 1 FROM pg_proc WHERE proname = 'ensure_username_lowercase'
                          AND pronamespace = 'public'::regnamespace;
  IF FOUND THEN
    EXECUTE 'ALTER FUNCTION public.ensure_username_lowercase()
             SET search_path TO public, auth, extensions';
  END IF;

  PERFORM 1 FROM pg_proc WHERE proname = 'prevent_reserved_usernames'
                          AND pronamespace = 'public'::regnamespace;
  IF FOUND THEN
    EXECUTE 'ALTER FUNCTION public.prevent_reserved_usernames()
             SET search_path TO public, auth, extensions';
  END IF;

  PERFORM 1 FROM pg_proc WHERE proname = 'monitor_username_conflict'
                          AND pronamespace = 'public'::regnamespace;
  IF FOUND THEN
    EXECUTE 'ALTER FUNCTION public.monitor_username_conflict()
             SET search_path TO public, auth, extensions';
  END IF;

  PERFORM 1 FROM pg_proc WHERE proname = 'touch_vibe_updated_at'
                          AND pronamespace = 'public'::regnamespace;
  IF FOUND THEN
    EXECUTE 'ALTER FUNCTION public.touch_vibe_updated_at()
             SET search_path TO public, extensions';
  END IF;

  PERFORM 1 FROM pg_proc WHERE proname = 'cleanup_old_vibes'
                          AND pronamespace = 'public'::regnamespace;
  IF FOUND THEN
    EXECUTE 'ALTER FUNCTION public.cleanup_old_vibes()
             SET search_path TO public, extensions';
  END IF;
END$$;

/*───────────────────────────────────────────────────────────────
  2.  Add a SERVER-ONLY INSERT policy on profiles
───────────────────────────────────────────────────────────────*/
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename  = 'profiles'
         AND policyname = 'profiles_insert_owner'
     )
  THEN
    EXECUTE $pol$
      CREATE POLICY profiles_insert_owner
      ON public.profiles
      FOR INSERT
      WITH CHECK ( id = auth.uid() );
    $pol$;
  END IF;
END$$;

/*───────────────────────────────────────────────────────────────
  3.  Replace handle_new_user() with deterministic search_path
      + idempotent insert (ON CONFLICT id DO NOTHING)
───────────────────────────────────────────────────────────────*/
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  base      text;
  candidate text;
  n         int := 0;
BEGIN
  /* ── Base handle from e-mail ─────────────────────────────── */
  base := lower(
            regexp_replace(split_part(NEW.email, '@', 1),
                           '[^a-z0-9_]', '', 'g')
          );
  IF base IS NULL OR base = '' THEN
    base := 'user';
  END IF;

  /* ── Find a unique username (max 5 collisions, then UUID) ── */
  LOOP
    candidate := base || CASE WHEN n = 0 THEN '' ELSE n::text END;
    EXIT WHEN NOT EXISTS (
                SELECT 1 FROM public.profiles
                WHERE username = candidate
              );
    n := n + 1;
    IF n >= 5 THEN
      candidate := 'user_' || LEFT(gen_random_uuid()::text, 8);
      EXIT;
    END IF;
  END LOOP;

  /* ── Insert profile (idempotent) ─────────────────────────── */
  INSERT INTO public.profiles
        (id,      email,      username, display_name, avatar_url)
  VALUES(NEW.id,  NEW.email,  candidate,
         COALESCE(NEW.raw_user_meta_data->>'full_name', candidate),
         NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;