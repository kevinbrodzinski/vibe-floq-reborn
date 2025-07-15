-- Phase 1: Display-name & username enhancement
-- ===========================================

-- 0. Make sure citext exists (needed for reserved_usernames and case-insensitive compares)
CREATE EXTENSION IF NOT EXISTS citext;

BEGIN;  -- keep DDL that *must* be transactional here
---------------------------------------------

-- 1. new column ---------------------------------------------------------------
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name text;

-- 2. back-fill username *before* we add constraints / indexes -----------------
-- (skip rows that already have a valid username)
UPDATE public.profiles
SET username = lower(
      left(
        COALESCE(
          NULLIF(regexp_replace(display_name, '[^a-zA-Z0-9_]', '', 'g'), ''),
          'user_' || substr(id::text,1,8)
        ), 32)
    )
WHERE (username IS NULL OR trim(username) = '');

-- 3. back-fill full_name (skip "looks like an e-mail") ------------------------
UPDATE public.profiles
SET full_name = display_name
WHERE full_name IS NULL
  AND display_name IS NOT NULL
  AND display_name !~ '@'
  AND length(trim(display_name)) > 0;

-- 4. username format CHECK (now that data is clean) ---------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_username_format'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT chk_username_format
      CHECK ( username ~ '^[a-z0-9_]{3,32}$' );
  END IF;
END$$;

COMMIT;  -- stop the txn so we can create index CONCURRENTLY
-------------------------------------------------------------------------------

-- 5. CI-unique index (non-blocking) ------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'uniq_profiles_username_ci'
  ) THEN
    -- must be executed *outside* a transaction
    EXECUTE 'CREATE UNIQUE INDEX CONCURRENTLY uniq_profiles_username_ci
             ON public.profiles ( lower(username) )';
  END IF;
END$$ LANGUAGE plpgsql;

-- 6. reserved usernames table -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reserved_usernames (
  name citext PRIMARY KEY
);

INSERT INTO public.reserved_usernames (name)
SELECT name
FROM (VALUES
  ('admin'),('root'),('api'),('www'),('mail'),('support'),
  ('help'),('info'),('contact'),('about'),('blog'),('news'),
  ('user'),('users'),('profile'),('profiles'),('account'),
  ('accounts'),('login'),('logout'),('register'),('signup'),
  ('signin'),('auth'),('settings'),('config'),('dashboard'),
  ('floq'),('floqs')
) AS t(name)
ON CONFLICT DO NOTHING;

-- 7. RPC for username updates -------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_username(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_new_username citext;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','Not authenticated');
  END IF;

  v_new_username := lower(trim(p_username));

  IF v_new_username !~ '^[a-z0-9_]{3,32}$' THEN
    RETURN jsonb_build_object('success',false,'error',
      'Username must be 3-32 chars, letters/numbers/underscores');
  END IF;

  IF EXISTS (SELECT 1 FROM public.reserved_usernames WHERE name = v_new_username) THEN
    RETURN jsonb_build_object('success',false,'error','Username is reserved');
  END IF;

  BEGIN
    UPDATE public.profiles
    SET username = v_new_username
    WHERE id = v_user_id;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success',false,'error','Username already taken');
  END;

  RETURN jsonb_build_object('success',true,'username',v_new_username);
END;
$$;

-- 8. permissions --------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.update_username(text) TO authenticated;