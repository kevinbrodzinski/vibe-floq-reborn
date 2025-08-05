-- Add missing columns to venues table with optimized data types
ALTER TABLE public.venues 
  ADD COLUMN IF NOT EXISTS popularity integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vibe_score numeric(5,2) CHECK (vibe_score BETWEEN 0 AND 100) DEFAULT 50.0,
  ADD COLUMN IF NOT EXISTS live_count integer NOT NULL DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_venues_popularity ON public.venues(popularity);
CREATE INDEX IF NOT EXISTS idx_venues_vibe_score ON public.venues(vibe_score);
CREATE INDEX IF NOT EXISTS idx_venues_live_count ON public.venues(live_count);

-- Function to update venue live counts from vibes_now data
CREATE OR REPLACE FUNCTION public.update_venue_live_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE venues v
  SET live_count = COALESCE(counts.live_count, 0),
      updated_at = now()
  FROM (
    SELECT 
      vn.venue_id,
      COUNT(*) as live_count
    FROM vibes_now vn
    WHERE vn.venue_id IS NOT NULL
    GROUP BY vn.venue_id
  ) counts
  WHERE v.id = counts.venue_id;
  
  -- Reset venues with no current vibes to 0
  UPDATE venues 
  SET live_count = 0,
      updated_at = now()
  WHERE id NOT IN (
    SELECT DISTINCT venue_id 
    FROM vibes_now 
    WHERE venue_id IS NOT NULL
  );
END;
$$;

-- Function to update venue vibe scores based on recent activity
CREATE OR REPLACE FUNCTION public.update_venue_vibe_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE venues v
  SET vibe_score = LEAST(100.0, GREATEST(0.0, 
    COALESCE(scores.avg_vibe_intensity, 50.0)
  )),
  updated_at = now()
  FROM (
    SELECT 
      vs.venue_id,
      AVG(
        CASE 
          WHEN vs.vibe = 'energetic' THEN 90
          WHEN vs.vibe = 'excited' THEN 80
          WHEN vs.vibe = 'social' THEN 70
          WHEN vs.vibe = 'chill' THEN 50
          WHEN vs.vibe = 'focused' THEN 40
          ELSE 50
        END
      ) as avg_vibe_intensity
    FROM venue_stays vs
    WHERE vs.arrived_at >= now() - interval '7 days'
      AND vs.venue_id IS NOT NULL
    GROUP BY vs.venue_id
    HAVING COUNT(*) >= 3  -- Only update venues with sufficient data
  ) scores
  WHERE v.id = scores.venue_id;
END;
$$;

-- Master function to refresh all venue metrics
CREATE OR REPLACE FUNCTION public.refresh_venue_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM update_venue_live_counts();
  PERFORM update_venue_vibe_scores();
  -- popularity is updated separately via existing update_venue_popularity() function
END;
$$;