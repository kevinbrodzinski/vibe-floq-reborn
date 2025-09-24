-- Add unique constraint for the conflict resolution
ALTER TABLE public.user_vibe_states 
ADD CONSTRAINT user_vibe_states_user_date_unique 
UNIQUE (user_id, started_at);

-- Now backfill last 30 days of vibes_now into user_vibe_states
INSERT INTO public.user_vibe_states (user_id,vibe_tag,location,started_at,active)
SELECT user_id,vibe,location,updated_at,true
FROM public.vibes_now
WHERE updated_at > now()-interval '30 days'
ON CONFLICT (user_id, started_at) DO NOTHING;