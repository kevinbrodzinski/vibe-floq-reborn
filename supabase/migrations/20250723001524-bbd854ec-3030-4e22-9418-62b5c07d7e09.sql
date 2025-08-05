-- Add sample user_vibe_states entries using existing user IDs from profiles
INSERT INTO public.user_vibe_states (user_id, vibe_tag, location, started_at, active) VALUES
-- SF Bay Area active vibes (using existing user IDs)
('11111111-1111-1111-1111-111111111111', 'chill', ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326), now() - interval '10 minutes', true),
('22222222-2222-2222-2222-222222222222', 'hype', ST_SetSRID(ST_MakePoint(-122.4094, 37.7849), 4326), now() - interval '5 minutes', true),
('33333333-3333-3333-3333-333333333333', 'curious', ST_SetSRID(ST_MakePoint(-122.4294, 37.7649), 4326), now() - interval '15 minutes', true),
('44444444-4444-4444-4444-444444444444', 'social', ST_SetSRID(ST_MakePoint(-122.4394, 37.7549), 4326), now() - interval '8 minutes', true),

-- LA Area active vibes  
('b25fd249-5bc0-4b67-a012-f64dacbaef1a', 'flowing', ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326), now() - interval '12 minutes', true),
('7384c3e3-0c0c-4343-8c43-6a7f2f0bb7de', 'hype', ST_SetSRID(ST_MakePoint(-118.2537, 34.0622), 4326), now() - interval '7 minutes', true),
('d2d2b0a2-bc32-4c7b-92d8-c09f2ec16cea', 'social', ST_SetSRID(ST_MakePoint(-118.2337, 34.0422), 4326), now() - interval '20 minutes', true),
('e2a658f7-a20b-4c5d-9a8f-53c84d202e82', 'open', ST_SetSRID(ST_MakePoint(-118.2637, 34.0322), 4326), now() - interval '3 minutes', true)

ON CONFLICT (user_id) DO UPDATE SET
  vibe_tag = EXCLUDED.vibe_tag,
  location = EXCLUDED.location,
  started_at = EXCLUDED.started_at,
  active = EXCLUDED.active;