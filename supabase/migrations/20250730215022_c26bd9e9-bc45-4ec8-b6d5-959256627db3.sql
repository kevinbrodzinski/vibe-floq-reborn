-- Phase 2: Comprehensive RLS & Security Hardening (Revised)
-- Addresses all remaining security issues with idempotent implementation

-- ══════════════════════════════════════════════════════════════════════════
-- 1. Enable RLS with FORCE on missing tables (idempotent)
-- ══════════════════════════════════════════════════════════════════════════

-- Enable RLS for friend_last_points
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1
                 FROM pg_class c
                 JOIN pg_namespace n ON n.oid = c.relnamespace
                 WHERE n.nspname='public'
                   AND c.relname='friend_last_points'
                   AND c.relrowsecurity) THEN
    EXECUTE 'ALTER TABLE public.friend_last_points ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.friend_last_points FORCE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Enable RLS for function_replacements
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1
                 FROM pg_class c
                 JOIN pg_namespace n ON n.oid = c.relnamespace
                 WHERE n.nspname='public'
                   AND c.relname='function_replacements'
                   AND c.relrowsecurity) THEN
    EXECUTE 'ALTER TABLE public.function_replacements ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.function_replacements FORCE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Enable RLS for presence
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1
                 FROM pg_class c
                 JOIN pg_namespace n ON n.oid = c.relnamespace
                 WHERE n.nspname='public'
                   AND c.relname='presence'
                   AND c.relrowsecurity) THEN
    EXECUTE 'ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.presence FORCE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════
-- 2. Create RLS policies for newly protected tables
-- ══════════════════════════════════════════════════════════════════════════

-- Friend last points: owner access only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='friend_last_points'
      AND policyname='friend_last_points_owner_access') THEN
    CREATE POLICY friend_last_points_owner_access
      ON public.friend_last_points
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Function replacements: read access for authenticated users and service role
DO $$
BEGIN
  IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'function_replacements'
        AND policyname = 'function_replacements_read') THEN
    EXECUTE 'DROP POLICY function_replacements_read ON public.function_replacements';
  END IF;

  CREATE POLICY function_replacements_read
  ON public.function_replacements
  FOR SELECT
  USING (auth.uid() IS NOT NULL  -- covers anon ⇒ false, authenticated ⇒ true
         OR auth.role() = 'service_role');
END $$;

-- Presence: public, self, or friends visibility
DO $$
BEGIN
  -- Replace the old policy if it exists
  IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = 'presence'
        AND policyname = 'presence_public_read') THEN
    EXECUTE 'DROP POLICY presence_public_read ON public.presence';
  END IF;

  CREATE POLICY presence_public_read
  ON public.presence
  FOR SELECT
  USING (
        visibility = 'public'
     OR profile_id = auth.uid()
     OR (visibility = 'friends' AND EXISTS (
            SELECT 1
            FROM   public.friendships f
            WHERE (f.user_low  = auth.uid() AND f.user_high = profile_id)
               OR (f.user_high = auth.uid() AND f.user_low  = profile_id)
        ))
  );
END $$;

-- Presence: owner can manage their own presence
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='presence'
      AND policyname='presence_owner_manage') THEN
    CREATE POLICY presence_owner_manage
      ON public.presence
      FOR ALL
      USING (profile_id = auth.uid())
      WITH CHECK (profile_id = auth.uid());
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════
-- 3. Create default authenticated-only SELECT policies for tables with RLS but no policies
-- ══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    rec RECORD;
BEGIN
  FOR rec IN
      SELECT c.relname AS table_name
      FROM   pg_class  c
      JOIN   pg_namespace n ON n.oid = c.relnamespace
      WHERE  n.nspname = 'public'
        AND  c.relkind = 'r'
        AND  c.relrowsecurity = true
        AND NOT EXISTS (SELECT 1
                        FROM pg_policies p
                        WHERE p.schemaname = 'public'
                          AND p.tablename  = c.relname)
  LOOP
    EXECUTE format(
      $ddl$
      CREATE POLICY IF NOT EXISTS %I_default_select
      ON public.%I
      FOR SELECT
      USING (auth.uid() IS NOT NULL);
      $ddl$,
      rec.table_name, rec.table_name
    );
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════════════════
-- 4. Secure functions with search_path and improve implementations
-- ══════════════════════════════════════════════════════════════════════════

-- Update get_vibe_clusters with secure search_path
CREATE OR REPLACE FUNCTION public.get_vibe_clusters(
  min_lng double precision, 
  min_lat double precision, 
  max_lng double precision, 
  max_lat double precision, 
  p_precision integer DEFAULT 6
)
RETURNS TABLE(
  gh6 text, 
  centroid geometry, 
  total bigint, 
  vibe_counts jsonb, 
  vibe_mode text, 
  member_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  eff_precision integer := cluster_precision(p_precision);
  bbox            geometry := ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326);
BEGIN
  /* ── Fast-path: pre-aggregated MV at precision 6 ─────────────────────── */
  IF eff_precision = 6 THEN
    RETURN QUERY
    SELECT
      mv.gh6,
      mv.centroid::geometry,
      mv.total,
      mv.vibe_counts,
      COALESCE(
        (SELECT key FROM jsonb_each_text(mv.vibe_counts)
         ORDER BY value::bigint DESC LIMIT 1),
        'chill'
      )               AS vibe_mode,
      mv.total        AS member_count
    FROM   public.vibe_cluster_momentum mv
    WHERE  ST_Intersects(mv.centroid, bbox);
    RETURN;
  END IF;

  /* ── Slow-path: build clusters ad-hoc for other precisions ───────────── */
  RETURN QUERY
  WITH tiles AS (
    SELECT tile_id, crowd_count, avg_vibe
    FROM   field_tiles
    WHERE  length(tile_id) = (15 - eff_precision)
      AND  crowd_count > 0
      AND  ST_Intersects(
             ST_SetSRID(h3_cell_to_boundary_geometry(tile_id), 4326), bbox)
  ),
  clusters AS (
    SELECT
      substring(tile_id, 1, 15 - eff_precision)          AS gh6,
      SUM(crowd_count)                                   AS total,
      ST_Centroid(
        ST_Union(
          ST_SetSRID(h3_cell_to_boundary_geometry(tile_id), 4326)
        )
      )                                                  AS centroid,
      jsonb_object_agg(
        COALESCE((avg_vibe->>'h')::text, 'unknown'),
        SUM(crowd_count)
      )                                                  AS vibe_counts
    FROM tiles
    GROUP BY substring(tile_id, 1, 15 - eff_precision)
    HAVING SUM(crowd_count) >= 3
  )
  SELECT
    gh6,
    centroid,
    total,
    COALESCE(vibe_counts, '{}'::jsonb),
    (SELECT key FROM jsonb_each_text(vibe_counts)
      ORDER BY value::bigint DESC LIMIT 1)               AS vibe_mode,
    total                                                AS member_count
  FROM clusters
  ORDER BY total DESC;
END;
$function$;

-- Update upsert_presence with secure search_path
CREATE OR REPLACE FUNCTION public.upsert_presence(
  p_venue_id uuid, 
  p_lat double precision, 
  p_lng double precision, 
  p_vibe vibe_enum, 
  p_visibility text DEFAULT 'public'::text, 
  p_profile_id uuid DEFAULT auth.uid()
)
RETURNS vibes_now
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_row public.vibes_now%rowtype;
BEGIN
  IF p_lat IS NULL OR p_lng IS NULL THEN
     RAISE EXCEPTION 'Latitude / longitude required';
  END IF;

  /* ----------------------------------------------------------------------
     INSERT or UPDATE, letting Postgres generate geohash6 automatically
  ---------------------------------------------------------------------- */
  INSERT INTO public.vibes_now AS v
      (profile_id, venue_id, vibe, visibility,
       location, updated_at, expires_at)
  VALUES (p_profile_id,
          p_venue_id,
          p_vibe,
          p_visibility,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
          NOW(),
          NOW() + INTERVAL '30 minutes')
  ON CONFLICT (profile_id)
  DO UPDATE
     SET venue_id   = EXCLUDED.venue_id,
         vibe       = EXCLUDED.vibe,
         visibility = EXCLUDED.visibility,
         location   = EXCLUDED.location,
         updated_at = NOW(),
         expires_at = NOW() + INTERVAL '30 minutes'
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

-- Complete award_achievement_optimized function
CREATE OR REPLACE FUNCTION public.award_achievement_optimized(
  _user      uuid,
  _code      text,
  _increment integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $func$
DECLARE
  achievement_goal   integer;
  was_just_earned    boolean := false;
  final_progress     integer;
  achievement_info   record;
BEGIN
  IF _increment <= 0 THEN
    RAISE EXCEPTION 'Achievement increment must be positive, got %', _increment;
  END IF;

  SELECT goal, name, icon, metadata
  INTO   achievement_info
  FROM   achievement_catalogue
  WHERE  code = _code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown achievement code %', _code;
  END IF;

  INSERT INTO user_achievements (profile_id, code, progress)
  VALUES (_user, _code, _increment)
  ON CONFLICT (profile_id, code) DO UPDATE
  SET progress = LEAST(user_achievements.progress + EXCLUDED.progress,
                       achievement_info.goal),
      earned_at = COALESCE(
        user_achievements.earned_at,
        CASE
          WHEN user_achievements.progress + EXCLUDED.progress >= achievement_info.goal
          THEN NOW()
        END)
  RETURNING progress,
            (earned_at IS NOT NULL
             AND earned_at > NOW() - INTERVAL '2 seconds') AS just_earned
  INTO final_progress, was_just_earned;

  RETURN jsonb_build_object(
    'code',     _code,
    'was_earned', was_just_earned,
    'progress', final_progress,
    'goal',     achievement_info.goal,
    'progress_pct',
      ROUND(final_progress::numeric
            / GREATEST(achievement_info.goal,1) * 100, 1),
    'achievement_info', jsonb_build_object(
        'name',     achievement_info.name,
        'icon',     achievement_info.icon,
        'metadata', achievement_info.metadata
    )
  );
END;
$func$;

-- ══════════════════════════════════════════════════════════════════════════
-- 5. Create security helper functions
-- ══════════════════════════════════════════════════════════════════════════

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
STRICT
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Helper function to check friendship
CREATE OR REPLACE FUNCTION public.are_friends(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
STRICT
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships f
    WHERE (f.user_low = user_a AND f.user_high = user_b)
       OR (f.user_high = user_a AND f.user_low = user_b)
  );
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- 6. Create audit functionality
-- ══════════════════════════════════════════════════════════════════════════

-- Create audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL,
  user_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit_log and allow service_role to insert
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public'
        AND tablename='audit_log'
        AND policyname='audit_log_service_write') THEN
    CREATE POLICY audit_log_service_write
      ON public.audit_log
      FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- Audit function
CREATE OR REPLACE FUNCTION public.audit_data_access(
  p_table_name text,
  p_operation text,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO audit_log (table_name, operation, user_id, old_data, new_data)
  VALUES (p_table_name, p_operation, auth.uid(), p_old_data, p_new_data);
EXCEPTION
  WHEN OTHERS THEN
    -- Silently ignore audit failures to prevent blocking operations
    NULL;
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- 7. Secure materialized views
-- ══════════════════════════════════════════════════════════════════════════

-- Ensure authenticated role exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

-- Grant SELECT on materialized views to authenticated role
DO $$
DECLARE
  mv RECORD;
BEGIN
  FOR mv IN
    SELECT schemaname, matviewname
    FROM   pg_matviews
    WHERE  schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON %I.%I FROM PUBLIC', mv.schemaname, mv.matviewname);
    EXECUTE format('GRANT SELECT ON %I.%I TO authenticated', mv.schemaname, mv.matviewname);
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════════════════
-- 8. Create indexes for performance
-- ══════════════════════════════════════════════════════════════════════════

-- Index for presence policy lookups
CREATE INDEX IF NOT EXISTS idx_friendships_user_lookup 
ON public.friendships (user_low, user_high);

CREATE INDEX IF NOT EXISTS idx_friendships_reverse_lookup 
ON public.friendships (user_high, user_low);

-- Index for presence visibility
CREATE INDEX IF NOT EXISTS idx_presence_visibility_profile 
ON public.presence (visibility, profile_id);

COMMIT;