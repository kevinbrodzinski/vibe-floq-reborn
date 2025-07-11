-- Insert 20 test venues across Venice, Santa Monica, and Culver City
INSERT INTO public.venues (name, lat, lng, description, vibe, radius_m, source) VALUES

-- VENICE (8 venues)
('Gjelina', 34.0522, -118.4770, 'Farm-to-table restaurant on Abbot Kinney with California cuisine', 'cozy', 100, 'test'),
('The Butcher''s Daughter', 34.0518, -118.4765, 'Plant-based cafe and juice bar in the heart of Abbot Kinney', 'energetic', 75, 'test'),
('Venice Beach Boardwalk', 34.0195, -118.4912, 'Iconic beachfront promenade with street performers and vendors', 'adventurous', 200, 'test'),
('High Rooftop Lounge', 34.0514, -118.4774, 'Elevated cocktail bar with Venice skyline views', 'sophisticated', 80, 'test'),
('Muscle Beach Venice', 34.0195, -118.4895, 'Famous outdoor gym and fitness area on Venice Beach', 'motivated', 150, 'test'),
('Felix Trattoria', 34.0520, -118.4768, 'Roman-style trattoria serving handmade pasta on Abbot Kinney', 'romantic', 90, 'test'),
('The Brig', 34.0515, -118.4772, 'Dive bar and music venue with local bands and DJs', 'rebellious', 85, 'test'),
('Venice Canals', 34.0118, -118.4739, 'Historic waterways with charming bridges and walkways', 'peaceful', 120, 'test'),

-- SANTA MONICA (8 venues)
('Santa Monica Pier', 34.0092, -118.4984, 'Historic amusement pier with rides, games, and ocean views', 'playful', 200, 'test'),
('The Misfit Restaurant + Bar', 34.0195, -118.4912, 'Modern American gastropub on Lincoln Boulevard', 'social', 100, 'test'),
('Third Street Promenade', 34.0154, -118.4945, 'Pedestrian mall with shops, restaurants, and street performers', 'vibrant', 150, 'test'),
('Dogtown Coffee', 34.0195, -118.4925, 'Local coffee roaster with multiple Santa Monica locations', 'cozy', 60, 'test'),
('The Penthouse SM', 34.0154, -118.4955, 'Rooftop lounge at the Huntley Hotel with panoramic ocean views', 'sophisticated', 80, 'test'),
('Palisades Park', 34.0234, -118.5012, 'Clifftop park overlooking the Pacific Ocean', 'peaceful', 180, 'test'),
('The Galley SM', 34.0195, -118.4920, 'Seafood restaurant and raw bar on Main Street', 'romantic', 95, 'test'),
('Muscle Beach Santa Monica', 34.0195, -118.4890, 'Original outdoor gym location with fitness equipment', 'energetic', 100, 'test'),

-- CULVER CITY (4 venues)
('Republique', 34.0394, -118.3826, 'French bistro in a historic Charlie Chaplin studio building', 'sophisticated', 110, 'test'),
('Culver City Arts District', 34.0394, -118.3900, 'Creative hub with galleries, studios, and cultural venues', 'creative', 200, 'test'),
('Dear John''s', 34.0420, -118.3950, 'Classic steakhouse and piano bar since 1962', 'nostalgic', 85, 'test'),
('Platform', 34.0250, -118.4150, 'Open-air shopping and dining destination', 'trendy', 120, 'test');