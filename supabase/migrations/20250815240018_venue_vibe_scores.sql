-- 18: compute vibe_score from vibes_now over last 7d (requires vibe_enum)
CREATE OR REPLACE FUNCTION public.update_venue_vibe_scores() RETURNS void
LANGUAGE sql AS $$
WITH scores AS (
  SELECT venue_id,
         AVG(
           CASE (vibe::text)
             WHEN 'energetic' THEN 90
             WHEN 'excited'   THEN 80
             WHEN 'social'    THEN 70
             WHEN 'chill'     THEN 50
             WHEN 'focused'   THEN 40
             WHEN 'hype'      THEN 85
             WHEN 'curious'   THEN 60
             WHEN 'solo'      THEN 45
             WHEN 'romantic'  THEN 65
             WHEN 'weird'     THEN 55
             WHEN 'down'      THEN 30
             WHEN 'flowing'   THEN 70
             WHEN 'open'      THEN 60
             ELSE 50
           END
         ) AS avg_vibe_intensity
  FROM public.vibes_now
  WHERE updated_at >= now() - interval '7 days'
    AND venue_id IS NOT NULL
  GROUP BY venue_id
  HAVING COUNT(*) >= 3
)
UPDATE public.venues v
SET vibe_score = LEAST(100.0, GREATEST(0.0, COALESCE(s.avg_vibe_intensity, 50.0))),
    updated_at = now()
FROM scores s
WHERE v.id = s.venue_id;
$$;