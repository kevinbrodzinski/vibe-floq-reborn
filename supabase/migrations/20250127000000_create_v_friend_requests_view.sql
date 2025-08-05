-- Create v_friend_requests view
CREATE OR REPLACE VIEW public.v_friend_requests WITH (security_invoker=on) AS
SELECT
    fr.id,                        -- Qualified with table alias
    fr.profile_id,
    fr.friend_id,
    fr.status,
    fr.created_at,
    requester_profile.id          AS requester_id,
    requester_profile.username,
    requester_profile.display_name,
    requester_profile.avatar_url
FROM  public.friend_requests  fr
LEFT JOIN public.profiles     requester_profile
       ON requester_profile.id = fr.profile_id; 