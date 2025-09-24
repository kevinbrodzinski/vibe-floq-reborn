-- Drop all versions of the function completely
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

-- Re-create the single "good" version
CREATE FUNCTION public.set_live_share_bulk(
  _friend_ids uuid[],
  _on         boolean,
  _auto_when  auto_when_enum[] DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  _fid uuid;
BEGIN
  FOREACH _fid IN ARRAY _friend_ids LOOP
    INSERT INTO public.friend_share_pref AS fsp
           (profile_id, friend_id, is_live, auto_when)
    VALUES (auth.uid(), _fid, _on, _auto_when)
    ON CONFLICT (profile_id, friend_id) DO UPDATE
      SET is_live  = EXCLUDED.is_live,
          auto_when = EXCLUDED.auto_when;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_live_share_bulk(uuid[], boolean, auto_when_enum[])
  TO authenticated;