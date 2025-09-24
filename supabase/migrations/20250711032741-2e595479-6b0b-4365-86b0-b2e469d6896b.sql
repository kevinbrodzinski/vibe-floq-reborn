-- Insert 20 test venues across Venice, Santa Monica, and Culver City
INSERT INTO public.venues (id, name, lat, lng, description, vibe, radius_m, source) VALUES

-- VENICE (8 venues)
('11111111-1111-1111-1111-111111111111', 'Gjelina', 34.0522, -118.4770, 'Farm-to-table restaurant on Abbot Kinney with California cuisine', 'cozy', 100, 'test'),
('22222222-2222-2222-2222-222222222222', 'The Butcher''s Daughter', 34.0518, -118.4765, 'Plant-based cafe and juice bar in the heart of Abbot Kinney', 'energetic', 75, 'test'),
('33333333-3333-3333-3333-333333333333', 'Venice Beach Boardwalk', 34.0195, -118.4912, 'Iconic beachfront promenade with street performers and vendors', 'adventurous', 200, 'test'),
('44444444-4444-4444-4444-444444444444', 'High Rooftop Lounge', 34.0514, -118.4774, 'Elevated cocktail bar with Venice skyline views', 'sophisticated', 80, 'test'),
('55555555-5555-5555-5555-555555555555', 'Muscle Beach', 34.0195, -118.4895, 'Famous outdoor gym and fitness area on Venice Beach', 'motivated', 150, 'test'),
('66666666-6666-6666-6666-666666666666', 'Felix Trattoria', 34.0520, -118.4768, 'Roman-style trattoria serving handmade pasta on Abbot Kinney', 'romantic', 90, 'test'),
('77777777-7777-7777-7777-777777777777', 'The Brig', 34.0515, -118.4772, 'Dive bar and music venue with local bands and DJs', 'rebellious', 85, 'test'),
('88888888-8888-8888-8888-888888888888', 'Venice Canals', 34.0118, -118.4739, 'Historic waterways with charming bridges and walkways', 'peaceful', 120, 'test'),

-- SANTA MONICA (8 venues)
('99999999-9999-9999-9999-999999999999', 'Santa Monica Pier', 34.0092, -118.4984, 'Historic amusement pier with rides, games, and ocean views', 'playful', 200, 'test'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'The Misfit Restaurant + Bar', 34.0195, -118.4912, 'Modern American gastropub on Lincoln Boulevard', 'social', 100, 'test'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Third Street Promenade', 34.0154, -118.4945, 'Pedestrian mall with shops, restaurants, and street performers', 'vibrant', 150, 'test'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Dogtown Coffee', 34.0195, -118.4925, 'Local coffee roaster with multiple Santa Monica locations', 'cozy', 60, 'test'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'The Penthouse', 34.0154, -118.4955, 'Rooftop lounge at the Huntley Hotel with panoramic ocean views', 'sophisticated', 80, 'test'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Palisades Park', 34.0234, -118.5012, 'Clifftop park overlooking the Pacific Ocean', 'peaceful', 180, 'test'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'The Galley', 34.0195, -118.4920, 'Seafood restaurant and raw bar on Main Street', 'romantic', 95, 'test'),
('10101010-1010-1010-1010-101010101010', 'Muscle Beach Santa Monica', 34.0195, -118.4890, 'Original outdoor gym location with fitness equipment', 'energetic', 100, 'test'),

-- CULVER CITY (4 venues)
('11111111-2222-3333-4444-555555555555', 'Republique', 34.0394, -118.3826, 'French bistro in a historic Charlie Chaplin studio building', 'sophisticated', 110, 'test'),
('22222222-3333-4444-5555-666666666666', 'Culver City Arts District', 34.0394, -118.3900, 'Creative hub with galleries, studios, and cultural venues', 'creative', 200, 'test'),
('33333333-4444-5555-6666-777777777777', 'Dear John''s', 34.0420, -118.3950, 'Classic steakhouse and piano bar since 1962', 'nostalgic', 85, 'test'),
('44444444-5555-6666-7777-888888888888', 'Platform', 34.0250, -118.4150, 'Open-air shopping and dining destination', 'trendy', 120, 'test');