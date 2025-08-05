-- QA Testing Seed Data (Fixed)
-- Create demo users (profiles will be created via triggers)

-- Insert demo profiles for testing
INSERT INTO public.profiles (id, username, display_name, avatar_url, bio, interests) VALUES
('11111111-1111-1111-1111-111111111111', 'alice_dev', 'Alice Developer', 'https://i.pravatar.cc/150?img=1', 'Full-stack developer who loves coffee', ARRAY['coding', 'coffee', 'hiking']),
('22222222-2222-2222-2222-222222222222', 'bob_design', 'Bob Designer', 'https://i.pravatar.cc/150?img=2', 'UI/UX designer passionate about user experience', ARRAY['design', 'art', 'music']),
('33333333-3333-3333-3333-333333333333', 'charlie_pm', 'Charlie PM', 'https://i.pravatar.cc/150?img=3', 'Product manager building the future', ARRAY['product', 'strategy', 'startups']),
('44444444-4444-4444-4444-444444444444', 'diana_data', 'Diana Data', 'https://i.pravatar.cc/150?img=4', 'Data scientist exploring insights', ARRAY['data', 'analytics', 'ai'])
ON CONFLICT (id) DO NOTHING;

-- Create test floqs at different locations (LA area)
INSERT INTO public.floqs (
  id, title, primary_vibe, location, creator_id, starts_at, ends_at, 
  visibility, max_participants, activity_score, last_activity_at
) VALUES
-- Santa Monica Beach floq
('a1111111-1111-1111-1111-111111111111', 'Sunset Yoga Session', 'chill', 
 ST_SetSRID(ST_MakePoint(-118.4912, 34.0195), 4326),
 '11111111-1111-1111-1111-111111111111',
 now() + interval '30 minutes', now() + interval '2 hours',
 'public', 20, 45.0, now()),

-- Venice Beach floq
('b2222222-2222-2222-2222-222222222222', 'Beach Volleyball Tournament', 'hype',
 ST_SetSRID(ST_MakePoint(-118.4695, 34.0119), 4326),
 '22222222-2222-2222-2222-222222222222',
 now() + interval '1 hour', now() + interval '4 hours',
 'public', 12, 78.5, now()),

-- Beverly Hills coffee
('c3333333-3333-3333-3333-333333333333', 'Startup Networking Coffee', 'social',
 ST_SetSRID(ST_MakePoint(-118.4004, 34.0736), 4326),
 '33333333-3333-3333-3333-333333333333',
 now() + interval '15 minutes', now() + interval '2 hours',
 'public', 25, 67.2, now()),

-- Hollywood hiking
('d4444444-4444-4444-4444-444444444444', 'Hollywood Hills Hike', 'flowing',
 ST_SetSRID(ST_MakePoint(-118.3464, 34.1341), 4326),
 '44444444-4444-4444-4444-444444444444',
 now() + interval '45 minutes', now() + interval '3 hours',
 'public', 15, 52.8, now()),

-- Private study group
('e5555555-5555-5555-5555-555555555555', 'Private Study Group', 'solo',
 ST_SetSRID(ST_MakePoint(-118.4765, 34.0194), 4326),
 '11111111-1111-1111-1111-111111111111',
 now() + interval '20 minutes', now() + interval '3 hours',
 'private', 8, 23.1, now())
ON CONFLICT (id) DO NOTHING;

-- Add participants to floqs (using correct role values)
INSERT INTO public.floq_participants (floq_id, user_id, role, joined_at) VALUES
-- Alice joins her own floqs
('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'member', now()),
('e5555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'member', now()),
-- Bob joins his own and Alice's
('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'member', now()),
('a1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'member', now()),
-- Charlie joins his own and others
('c3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'member', now()),
('b2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'member', now()),
-- Diana joins hers and the networking event
('d4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'member', now()),
('c3333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'member', now())
ON CONFLICT (floq_id, user_id) DO NOTHING;