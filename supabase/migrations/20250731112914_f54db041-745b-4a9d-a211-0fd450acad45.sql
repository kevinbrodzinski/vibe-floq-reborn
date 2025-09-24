-- Fix v_friend_last_seen view to work with friendships table structure
BEGIN;

-- Drop the broken view
DROP VIEW IF EXISTS public.v_friend_last_seen;

-- Create the corrected view that properly handles friendships bidirectional structure
CREATE VIEW public.v_friend_last_seen AS
SELECT 
  f.user_low AS current_profile_id,
  f.user_high AS other_profile_id,
  COALESCE(p.updated_at, '1970-01-01'::timestamptz) AS last_seen_at,
  f.friend_state
FROM public.friendships f
LEFT JOIN public.presence p ON p.profile_id = f.user_high
WHERE f.friend_state = 'accepted'

UNION ALL

SELECT 
  f.user_high AS current_profile_id,
  f.user_low AS other_profile_id,
  COALESCE(p.updated_at, '1970-01-01'::timestamptz) AS last_seen_at,
  f.friend_state
FROM public.friendships f
LEFT JOIN public.presence p ON p.profile_id = f.user_low
WHERE f.friend_state = 'accepted';

-- Enable RLS on the view
ALTER VIEW public.v_friend_last_seen SET (security_invoker = true);

-- Grant access to authenticated users
GRANT SELECT ON public.v_friend_last_seen TO authenticated;

COMMIT;