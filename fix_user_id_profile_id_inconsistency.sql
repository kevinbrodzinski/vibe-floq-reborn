-- ═══════════════════════════════════════════════════════════════════════════════
-- Fix user_id vs profile_id Inconsistency Migration
-- This migration addresses the critical issue where some tables use user_id 
-- while others use profile_id, causing RLS policy failures and query errors
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Fix venue_visits table schema
-- =====================================

-- Check if venue_visits has user_id column
DO $$
BEGIN
    -- Add profile_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'venue_visits' 
        AND column_name = 'profile_id'
    ) THEN
        ALTER TABLE public.venue_visits ADD COLUMN profile_id UUID;
    END IF;
    
    -- Copy data from user_id to profile_id if user_id exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'venue_visits' 
        AND column_name = 'user_id'
    ) THEN
        UPDATE public.venue_visits SET profile_id = user_id WHERE profile_id IS NULL;
        
        -- Make profile_id NOT NULL
        ALTER TABLE public.venue_visits ALTER COLUMN profile_id SET NOT NULL;
        
        -- Drop old user_id column
        ALTER TABLE public.venue_visits DROP COLUMN user_id;
    END IF;
END
$$;

-- Update venue_visits indexes
DROP INDEX IF EXISTS idx_venue_visits_user_day;
CREATE INDEX IF NOT EXISTS idx_venue_visits_profile_day 
  ON public.venue_visits(profile_id, day_key);

-- Update venue_visits RLS policy
DROP POLICY IF EXISTS "users_own_venue_visits" ON public.venue_visits;
CREATE POLICY "users_own_venue_visits" ON public.venue_visits
  FOR ALL USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- 2. Fix crossed_paths table schema
-- ===================================

DO $$
BEGIN
    -- Add profile columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'crossed_paths' 
        AND column_name = 'profile_a'
    ) THEN
        ALTER TABLE public.crossed_paths ADD COLUMN profile_a UUID;
        ALTER TABLE public.crossed_paths ADD COLUMN profile_b UUID;
    END IF;
    
    -- Copy data from user_a/user_b to profile_a/profile_b if user columns exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'crossed_paths' 
        AND column_name = 'user_a'
    ) THEN
        UPDATE public.crossed_paths 
        SET profile_a = user_a, profile_b = user_b 
        WHERE profile_a IS NULL;
        
        -- Make profile columns NOT NULL
        ALTER TABLE public.crossed_paths ALTER COLUMN profile_a SET NOT NULL;
        ALTER TABLE public.crossed_paths ALTER COLUMN profile_b SET NOT NULL;
        
        -- Drop old user columns
        ALTER TABLE public.crossed_paths DROP COLUMN user_a;
        ALTER TABLE public.crossed_paths DROP COLUMN user_b;
    END IF;
END
$$;

-- Update crossed_paths indexes
DROP INDEX IF EXISTS idx_crossed_paths_users;
CREATE INDEX IF NOT EXISTS idx_crossed_paths_profiles 
  ON public.crossed_paths(profile_a, profile_b);

-- Update crossed_paths RLS policy
DROP POLICY IF EXISTS "Users can view their own crossed paths" ON public.crossed_paths;
DROP POLICY IF EXISTS "crossed_paths_read" ON public.crossed_paths;
CREATE POLICY "crossed_paths_read" ON public.crossed_paths
  FOR SELECT USING (
    auth.uid() = profile_a OR 
    auth.uid() = profile_b
  );

-- 3. Fix get_vibe_breakdown function
-- ====================================

CREATE OR REPLACE FUNCTION public.get_vibe_breakdown(me_id uuid, target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  overall_score numeric := 50.0;
  venue_dna_score numeric := 50.0;
  time_rhythm_score numeric := 50.0;
  social_pattern_score numeric := 50.0;
  shared_venues_count integer := 0;
  total_unique_venues integer := 1;
BEGIN
  -- Overall score: venue-based similarity
  SELECT 
    COUNT(DISTINCT CASE WHEN v1.venue_id IS NOT NULL AND v2.venue_id IS NOT NULL THEN v1.venue_id END),
    COUNT(DISTINCT COALESCE(v1.venue_id, v2.venue_id))
  INTO shared_venues_count, total_unique_venues
  FROM venue_visits v1
  FULL OUTER JOIN venue_visits v2 
    ON v1.venue_id = v2.venue_id
   AND v1.profile_id = me_id  -- ✅ Fixed: use profile_id
   AND v2.profile_id = target_id  -- ✅ Fixed: use profile_id
  WHERE COALESCE(v1.arrived_at, v2.arrived_at) > now() - interval '30 days';
  
  overall_score := LEAST(100.0, (shared_venues_count::numeric / GREATEST(total_unique_venues, 1) * 100.0));

  -- Venue DNA: shared venue categories and types
  SELECT COALESCE(COUNT(DISTINCT v1.venue_id) * 15.0, 0)
  INTO venue_dna_score
  FROM venue_visits v1
  JOIN venue_visits v2 ON v1.venue_id = v2.venue_id
  JOIN venues v ON v.id = v1.venue_id
  WHERE v1.profile_id = me_id  -- ✅ Fixed: use profile_id
    AND v2.profile_id = target_id  -- ✅ Fixed: use profile_id
    AND v1.arrived_at > now() - interval '30 days'
    AND v2.arrived_at > now() - interval '30 days'
  LIMIT 5;
  
  venue_dna_score := LEAST(100.0, venue_dna_score);

  -- Time Rhythm: fixed midnight wrapping with modulo logic
  SELECT COALESCE(AVG(
    CASE WHEN ((EXTRACT(hour FROM v1.arrived_at)::int -
                EXTRACT(hour FROM v2.arrived_at)::int + 24) % 24) <= 3
         THEN 80 ELSE 20 END), 50.0)
  INTO time_rhythm_score
  FROM venue_visits v1
  JOIN venue_visits v2 
    ON v1.profile_id = me_id  -- ✅ Fixed: use profile_id
   AND v2.profile_id = target_id  -- ✅ Fixed: use profile_id
   AND v1.arrived_at > now() - interval '14 days'
   AND v2.arrived_at > now() - interval '14 days'
  FETCH FIRST 20 ROWS ONLY;

  -- Social Pattern: floq participation overlap
  SELECT COALESCE(COUNT(DISTINCT fp1.floq_id) * 12.0, 0)
  INTO social_pattern_score
  FROM floq_participants fp1
  JOIN floq_participants fp2 ON fp1.floq_id = fp2.floq_id
  WHERE fp1.profile_id = me_id  -- ✅ Already correct
    AND fp2.profile_id = target_id  -- ✅ Already correct
    AND fp1.joined_at > now() - interval '60 days'
  LIMIT 8;
  
  social_pattern_score := LEAST(100.0, social_pattern_score);

  RETURN jsonb_build_object(
    'overall', ROUND(overall_score),
    'venueDNA', ROUND(venue_dna_score), 
    'timeRhythm', ROUND(time_rhythm_score),
    'socialPattern', ROUND(social_pattern_score)
  );
END;
$$;

-- 4. Fix get_crossed_paths_stats function
-- =========================================

CREATE OR REPLACE FUNCTION public.get_crossed_paths_stats(me_id uuid, target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  week_count integer := 0;
  last_venue_name text := '';
  last_encounter_time timestamptz;
BEGIN
  -- Count crossings in last 7 days
  SELECT COUNT(*)
  INTO week_count
  FROM crossed_paths cp
  WHERE (cp.profile_a = me_id AND cp.profile_b = target_id)  -- ✅ Fixed: use profile_a/profile_b
     OR (cp.profile_a = target_id AND cp.profile_b = me_id)  -- ✅ Fixed: use profile_a/profile_b
    AND cp.created_at > now() - interval '7 days';

  -- Get most recent encounter details
  SELECT 
    COALESCE(v.name, 'Unknown location'),
    cp.created_at
  INTO last_venue_name, last_encounter_time
  FROM crossed_paths cp
  LEFT JOIN venues v ON v.id = cp.venue_id
  WHERE (cp.profile_a = me_id AND cp.profile_b = target_id)  -- ✅ Fixed: use profile_a/profile_b
     OR (cp.profile_a = target_id AND cp.profile_b = me_id)  -- ✅ Fixed: use profile_a/profile_b
  ORDER BY cp.created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'countWeek', week_count,
    'lastVenue', COALESCE(last_venue_name, 'No recent encounters'),
    'lastAt', COALESCE(last_encounter_time, now() - interval '30 days'),
    'distance', NULL
  );
END;
$$;

-- 5. Update any other functions that reference venue_visits.user_id
-- ==================================================================

-- Fix merge_venue_visits function
CREATE OR REPLACE FUNCTION public.merge_venue_visits()
RETURNS INT 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE 
  _updated INT := 0;
BEGIN
  WITH ranked AS (
    SELECT id, profile_id, venue_id,  -- ✅ Fixed: use profile_id
           arrived_at,
           LAG(arrived_at) OVER (PARTITION BY profile_id,venue_id ORDER BY arrived_at) AS prev_at  -- ✅ Fixed: use profile_id
    FROM   public.venue_visits
    WHERE  departed_at IS NULL
      AND  arrived_at < now() - INTERVAL '5 minutes'
  )
  UPDATE public.venue_visits v
     SET departed_at = ranked.arrived_at
  FROM ranked
  WHERE v.id = ranked.id
    AND ranked.prev_at IS NULL;

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END $$;

-- Fix detect_crossed_paths function
CREATE OR REPLACE FUNCTION public.detect_crossed_paths()
RETURNS INT 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE 
  ins INT;
BEGIN
  INSERT INTO public.crossed_paths(profile_a, profile_b, venue_id, ts, encounter_date)  -- ✅ Fixed: use profile_a/profile_b
  SELECT v1.profile_id, v2.profile_id, v1.venue_id,  -- ✅ Fixed: use profile_id
         GREATEST(v1.arrived_at, v2.arrived_at) as encounter_ts,
         v1.day_key as encounter_date
  FROM   public.venue_visits v1
  JOIN   public.venue_visits v2 USING (venue_id, day_key)
  WHERE  v1.profile_id < v2.profile_id  -- ✅ Fixed: use profile_id
    AND  COALESCE(v1.departed_at, now()) >
         COALESCE(v2.arrived_at, now())
    AND  v1.day_key = (current_date - INTERVAL '1 day')::DATE
  ON CONFLICT (profile_a, profile_b, venue_id, encounter_date) DO NOTHING;  -- ✅ Fixed: use profile_a/profile_b
  
  GET DIAGNOSTICS ins = ROW_COUNT;
  RETURN ins;
END $$;

-- 6. Grant permissions
-- =====================

GRANT EXECUTE ON FUNCTION
  public.get_vibe_breakdown(uuid, uuid),
  public.get_crossed_paths_stats(uuid, uuid),
  public.merge_venue_visits(),
  public.detect_crossed_paths()
TO authenticated;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Summary of Changes:
-- - venue_visits: user_id → profile_id  
-- - crossed_paths: user_a/user_b → profile_a/profile_b
-- - Updated all RLS policies to use correct column names
-- - Fixed get_vibe_breakdown() function
-- - Fixed get_crossed_paths_stats() function
-- - Fixed merge_venue_visits() function  
-- - Fixed detect_crossed_paths() function
-- - Updated all indexes to use correct column names
-- ═══════════════════════════════════════════════════════════════════════════════