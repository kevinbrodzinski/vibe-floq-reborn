-- 1️⃣  Controlled enum for auto_when
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auto_when_enum') THEN
    CREATE TYPE auto_when_enum AS ENUM ('always','in_floq','at_venue','walking');
  END IF;
END $$;

-- 2️⃣  Table patch
ALTER TABLE public.friend_share_pref
  ADD COLUMN IF NOT EXISTS auto_when auto_when_enum[] DEFAULT ARRAY['always']::auto_when_enum[];

ALTER TABLE public.friend_share_pref
  ALTER COLUMN is_live SET DEFAULT FALSE,
  ALTER COLUMN is_live SET NOT NULL;

-- 3️⃣  Unique pair index (if it wasn't already created elsewhere)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pref_pair
    ON public.friend_share_pref(profile_id, friend_id);

-- 4️⃣  RLS
ALTER TABLE public.friend_share_pref ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS friend_share_pref_owner_all ON public.friend_share_pref;
CREATE POLICY friend_share_pref_owner_all
    ON public.friend_share_pref
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());

-- 5️⃣  Bulk-set helper
DROP FUNCTION IF EXISTS public.set_live_share_bulk(uuid[],boolean,auto_when_enum[]);
CREATE OR REPLACE FUNCTION public.set_live_share_bulk(
  _friend_ids uuid[],
  _on        boolean,
  _auto_when auto_when_enum[] DEFAULT ARRAY['always']::auto_when_enum[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER                                      -- << changed
SET search_path = public,pg_temp                     -- harmless safety
AS $$
BEGIN
  INSERT INTO public.friend_share_pref AS fsp (profile_id, friend_id, is_live, auto_when)
  SELECT auth.uid(), fid, _on, _auto_when
  FROM   UNNEST(_friend_ids) AS t(fid)
  ON CONFLICT (profile_id, friend_id) DO UPDATE
        SET is_live   = EXCLUDED.is_live,
            auto_when = EXCLUDED.auto_when;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_live_share_bulk(uuid[],boolean,auto_when_enum[]) TO authenticated;