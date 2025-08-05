-- Fix set_live_share_bulk function to use correct column names
BEGIN;

-- Drop the existing function with all its overloads
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT pg_get_function_identity_arguments(p.oid) AS args
        FROM   pg_proc p
        JOIN   pg_namespace n ON n.oid = p.pronamespace
        WHERE  n.nspname = 'public'
          AND  p.proname = 'set_live_share_bulk'
    LOOP
        EXECUTE format(
            'DROP FUNCTION IF EXISTS public.set_live_share_bulk(%s);',
            r.args
        );
    END LOOP;
END $$;

-- Create the corrected function using other_profile_id instead of friend_id
CREATE FUNCTION public.set_live_share_bulk(
  _friend_ids UUID[],
  _on         BOOLEAN,
  _auto_when  auto_when_enum[] DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  _fid UUID;
BEGIN
  FOREACH _fid IN ARRAY _friend_ids LOOP
    INSERT INTO public.friend_share_pref(
        profile_id, other_profile_id, is_live, auto_when)
    VALUES (auth.uid(), _fid, _on, _auto_when)
    ON CONFLICT (profile_id, other_profile_id)
    DO UPDATE
      SET is_live  = EXCLUDED.is_live,
          auto_when = EXCLUDED.auto_when;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_live_share_bulk(UUID[], BOOLEAN, auto_when_enum[])
       TO anon, authenticated;

COMMIT;