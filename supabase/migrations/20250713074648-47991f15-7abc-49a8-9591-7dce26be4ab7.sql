-- Create view for active users with location data
CREATE OR REPLACE VIEW public.v_active_users AS
SELECT 
  vn.user_id,
  ST_Y(vn.location::geometry) as lat,
  ST_X(vn.location::geometry) as lng,
  vn.vibe,
  vn.updated_at
FROM public.vibes_now vn
WHERE vn.expires_at > now()
  AND vn.visibility = 'public';

-- Grant access to the view
GRANT SELECT ON public.v_active_users TO authenticated, anon;