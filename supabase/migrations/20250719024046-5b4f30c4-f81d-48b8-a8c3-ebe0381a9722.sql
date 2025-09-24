-- Safe backfill - only insert if not already exists
INSERT INTO public.user_vibe_states (user_id,vibe_tag,location,started_at,active)
SELECT DISTINCT v.user_id, v.vibe, v.location, v.updated_at, true
FROM public.vibes_now v
LEFT JOIN public.user_vibe_states uvs ON uvs.user_id = v.user_id AND uvs.started_at = v.updated_at
WHERE v.updated_at > now()-interval '30 days'
  AND v.vibe IS NOT NULL
  AND uvs.id IS NULL;