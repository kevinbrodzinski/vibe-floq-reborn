
-- Update presence_nearby function to filter by visibility column with polish tweaks
CREATE OR REPLACE FUNCTION public.presence_nearby(lat NUMERIC, lng NUMERIC, km NUMERIC, include_self BOOLEAN DEFAULT false)
RETURNS SETOF public.vibes_now AS $$
  SELECT * FROM public.vibes_now
  WHERE ST_DWithin(geo, ST_MakePoint(lng, lat)::geography, km * 1000)
  AND expires_at > NOW()
  AND (include_self OR user_id != auth.uid())
  AND (
    COALESCE(visibility, 'public') = 'public'
    OR (visibility = 'friends' AND user_id IN (
      -- Placeholder for friends filtering - returns empty until friends table is ready
      SELECT NULL::uuid WHERE FALSE
    ))
    -- 'off' visibility is excluded entirely
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Set function owner to high-privilege role for anonymous access
ALTER FUNCTION public.presence_nearby OWNER TO postgres;
