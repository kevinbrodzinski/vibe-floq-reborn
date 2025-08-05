-- Backfill last 30 days of vibes_now into user_vibe_states
INSERT INTO public.user_vibe_states (user_id,vibe_tag,location,started_at,active)
SELECT user_id,vibe,location,updated_at,true
FROM public.vibes_now
WHERE updated_at > now()-interval '30 days'
ON CONFLICT (user_id, started_at) DO NOTHING;