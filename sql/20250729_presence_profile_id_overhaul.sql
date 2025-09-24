/****************************************************************************************
* 2025-07-28  | Presence & Social Suggestions overhaul (profile_id edition)
*   • Purge ALL existing upsert_presence overloads (loop-drop)
*   • Recreate canonical profile_id version
*   • Add performance indexes
*   • Replace get_social_suggestions
****************************************************************************************/

BEGIN;

--------------------------------------------------------------------------------
-- 1.  Wipe every legacy overload of upsert_presence (whatever its signature)
--------------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT  pg_get_function_identity_arguments(p.oid) AS args
        FROM    pg_proc p
        JOIN    pg_namespace n ON n.oid = p.pronamespace
        WHERE   n.nspname = 'public'
        AND     p.proname = 'upsert_presence'
    LOOP
        EXECUTE format(
            'DROP FUNCTION IF EXISTS public.upsert_presence(%s);',
            r.args
        );
    END LOOP;
END $$;

--------------------------------------------------------------------------------
-- 2.  Canonical upsert_presence (profile_id, lat, lng, vibe[, visibility])
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_presence(
    p_lat        DOUBLE PRECISION,
    p_lng        DOUBLE PRECISION,
    p_vibe       TEXT,
    p_visibility TEXT DEFAULT 'public'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_profile_id UUID := auth.uid();
    v_location   GEOMETRY;
    v_expires_at TIMESTAMPTZ := NOW() + INTERVAL '90 seconds';
BEGIN
    -- Input guards
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    IF p_lat IS NULL OR p_lng IS NULL THEN
        RAISE EXCEPTION 'Latitude/longitude required';
    END IF;
    IF p_vibe IS NULL THEN
        RAISE EXCEPTION 'Vibe is required';
    END IF;

    v_location := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);

    INSERT INTO public.vibes_now (
        profile_id,  location,  vibe,
        expires_at,  updated_at, visibility
    )
    VALUES (
        v_profile_id,
        v_location,
        p_vibe::public.vibe_enum,
        v_expires_at,
        NOW(),
        p_visibility
    )
    ON CONFLICT (profile_id)
    DO UPDATE SET
        location   = EXCLUDED.location,
        vibe       = EXCLUDED.vibe,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW(),
        visibility = EXCLUDED.visibility;

    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.upsert_presence(
    DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT
) IS
'Heartbeat write for the current user''s vibe & location (keyed by profile_id)';

GRANT EXECUTE ON FUNCTION public.upsert_presence(
    DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT
) TO anon, authenticated;

--------------------------------------------------------------------------------
-- 3.  Performance indexes
--------------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_vibes_now_profile_id
    ON public.vibes_now(profile_id);

CREATE INDEX IF NOT EXISTS idx_vibes_now_location_gist
    ON public.vibes_now
USING GIST (location);

--------------------------------------------------------------------------------
-- 4.  Replace get_social_suggestions
--------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_social_suggestions(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.get_social_suggestions(
    p_uid       UUID,
    max_dist_m  INTEGER DEFAULT 1000,
    limit_n     INTEGER DEFAULT 5
)
RETURNS TABLE (
    friend_id    UUID,
    display_name TEXT,
    avatar_url   TEXT,
    vibe_tag     vibe_enum,
    vibe_match   REAL,
    distance_m   REAL,
    started_at   TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH me AS (
    SELECT location
    FROM   public.vibes_now
    WHERE  profile_id = p_uid
    AND    expires_at > NOW()
    LIMIT  1
)
SELECT
    vn.profile_id                     AS friend_id,
    pr.display_name,
    pr.avatar_url,
    vn.vibe::public.vibe_enum         AS vibe_tag,
    0.5::REAL                         AS vibe_match,   -- TODO: real affinity
    ST_DistanceSphere(vn.location, me.location)::REAL  AS distance_m,
    vn.updated_at                     AS started_at
FROM   public.vibes_now vn
JOIN   me                 ON TRUE
JOIN   public.profiles pr ON pr.id = vn.profile_id
WHERE  vn.profile_id <> p_uid
  AND  vn.expires_at  > NOW()
  AND  ST_DistanceSphere(vn.location, me.location) <= max_dist_m
ORDER  BY distance_m, vn.updated_at DESC
LIMIT  limit_n;
$$;

GRANT EXECUTE ON FUNCTION public.get_social_suggestions(
    uuid, integer, integer
) TO anon, authenticated;

--------------------------------------------------------------------------------
-- 5.  (Optional) Temporary bridge view for legacy clients
--     Drop after 2025-08-31
--------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vibes_now_user_id_bridge AS
SELECT
    profile_id AS user_id,
    location,
    vibe,
    expires_at,
    updated_at,
    visibility
FROM public.vibes_now;

COMMIT;