/* ============================================================
   🧹  Canonicalise get_user_by_username()
   • wipes all overloads (citext, text, any wrong signatures)
   • recreates ONE text-based version (case-insensitive)
   • re-grants to both anon & authenticated
   ============================================================ */

/* 1️⃣  discover & drop every overload */

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT  proname, pg_get_function_identity_arguments(proname::regproc) AS args
    FROM    pg_proc
    JOIN    pg_namespace n ON n.oid = pg_proc.pronamespace
    WHERE   n.nspname = 'public'
      AND   proname   = 'get_user_by_username'
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS public.%I(%s);',
      rec.proname,
      rec.args            -- e.g. "citext", "text"
    );
  END LOOP;
END $$;

/* 2️⃣  create the one true version */

CREATE OR REPLACE FUNCTION public.get_user_by_username(lookup_username text)
RETURNS TABLE (
  id           uuid,
  username     citext,
  display_name text,
  avatar_url   text,
  bio          text
)
LANGUAGE sql
STABLE
SECURITY DEFINER            -- ignore profile RLS; returns only public fields
SET search_path = public
AS $func$
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio
  FROM public.profiles p
  WHERE lower(p.username::text) = lower(lookup_username)
  LIMIT 1;
$func$;

/* 3️⃣  grant to both anon (pre-login) & authenticated */

GRANT EXECUTE ON FUNCTION public.get_user_by_username(text)
  TO anon, authenticated;