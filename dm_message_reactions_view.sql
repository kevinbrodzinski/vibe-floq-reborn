-- Create optimized view for message reactions with aggregation
CREATE OR REPLACE VIEW public.v_dm_message_reactions_summary AS
SELECT 
  dmr.message_id,
  dmr.emoji,
  COUNT(*) as reaction_count,
  ARRAY_AGG(dmr.profile_id ORDER BY dmr.reacted_at) as reactor_profile_ids,
  ARRAY_AGG(
    JSON_BUILD_OBJECT(
      'profile_id', dmr.profile_id,
      'display_name', p.display_name,
      'username', p.username,
      'avatar_url', p.avatar_url,
      'reacted_at', dmr.reacted_at
    ) ORDER BY dmr.reacted_at
  ) as reactor_details,
  MIN(dmr.reacted_at) as first_reaction_at,
  MAX(dmr.reacted_at) as latest_reaction_at
FROM public.dm_message_reactions dmr
JOIN public.profiles p ON p.id = dmr.profile_id
GROUP BY dmr.message_id, dmr.emoji;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_dm_reactions_message_emoji 
ON public.dm_message_reactions (message_id, emoji, reacted_at DESC);

-- Create index for profile lookups
CREATE INDEX IF NOT EXISTS idx_dm_reactions_profile_message 
ON public.dm_message_reactions (profile_id, message_id);

COMMENT ON VIEW public.v_dm_message_reactions_summary IS 
'Aggregated view of DM message reactions with profile details for efficient frontend consumption';