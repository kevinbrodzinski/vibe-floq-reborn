CREATE OR REPLACE FUNCTION public.set_user_vibe(
  new_vibe  vibe_enum,
  lat       double precision DEFAULT NULL,
  lng       double precision DEFAULT NULL
)  RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  ------------------------------------------------------------------
  -- ↓ build a GEOMETRY point (matches table column type)
  ------------------------------------------------------------------
  -- if lat / lng are null we KEEP the previous location
  WITH new_loc AS (
    SELECT CASE
             WHEN lat IS NULL OR lng IS NULL
               THEN (SELECT location
                       FROM public.user_vibe_states
                      WHERE user_id = auth.uid())
             ELSE ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry
           END AS geo
  )
  INSERT INTO public.user_vibe_states (user_id, vibe_tag, location, started_at, active)
  SELECT
      auth.uid(),
      new_vibe,
      geo,
      now(),
      TRUE
  FROM new_loc
  ON CONFLICT (user_id) DO UPDATE
    SET vibe_tag   = EXCLUDED.vibe_tag,
        location   = EXCLUDED.location,
        started_at = CASE
                       WHEN user_vibe_states.vibe_tag <> EXCLUDED.vibe_tag
                         THEN now()           -- reset timer only when vibe changes
                       ELSE user_vibe_states.started_at
                     END,
        active     = TRUE;
END;
$$;