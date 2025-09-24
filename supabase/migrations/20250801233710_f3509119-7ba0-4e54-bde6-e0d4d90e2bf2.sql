-- Phase 2: Generate Test Data for Afterglow System
-- Create sample venue visits and location data for recent days

-- First, let's create some test venues if they don't exist
INSERT INTO public.venues (id, name, categories, geom, created_at)
VALUES 
  ('123e4567-e89b-12d3-a456-426614174000', 'The Coffee House', ARRAY['cafe', 'food'], ST_SetSRID(ST_MakePoint(-118.4740, 33.9870), 4326), now() - interval '1 day'),
  ('123e4567-e89b-12d3-a456-426614174001', 'Downtown Gym', ARRAY['gym', 'fitness'], ST_SetSRID(ST_MakePoint(-118.4750, 33.9880), 4326), now() - interval '1 day'),
  ('123e4567-e89b-12d3-a456-426614174002', 'Central Park', ARRAY['park', 'recreation'], ST_SetSRID(ST_MakePoint(-118.4730, 33.9860), 4326), now() - interval '1 day'),
  ('123e4567-e89b-12d3-a456-426614174003', 'Local Restaurant', ARRAY['restaurant', 'food'], ST_SetSRID(ST_MakePoint(-118.4720, 33.9890), 4326), now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- Create test venue visits for the last 3 days for any authenticated users
-- This uses a function that will only run if there's an authenticated user
DO $$
DECLARE
  test_user_id uuid;
  test_date date;
  venue_ids uuid[] := ARRAY[
    '123e4567-e89b-12d3-a456-426614174000',
    '123e4567-e89b-12d3-a456-426614174001', 
    '123e4567-e89b-12d3-a456-426614174002',
    '123e4567-e89b-12d3-a456-426614174003'
  ];
  venue_id uuid;
  i int;
BEGIN
  -- Get the first user from auth.users (for testing)
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  -- Only proceed if we have a user
  IF test_user_id IS NOT NULL THEN
    -- Create venue visits for the last 3 days
    FOR i IN 0..2 LOOP
      test_date := (CURRENT_DATE - i);
      
      -- Visit 2-3 venues per day
      FOR venue_id IN SELECT unnest(venue_ids[1:2+i]) LOOP
        
        -- Create venue visit record
        INSERT INTO public.venue_visits (
          id, profile_id, venue_id, arrived_at, departed_at, duration_minutes, day_key
        ) VALUES (
          gen_random_uuid(),
          test_user_id,
          venue_id,
          test_date::timestamp + interval '1 hour' * (8 + random() * 8), -- Between 8am-4pm
          test_date::timestamp + interval '1 hour' * (8 + random() * 8) + interval '30 minutes' + interval '1 hour' * random(), -- 30min-1.5hr stay
          30 + (random() * 90)::int, -- 30-120 minutes
          test_date
        )
        ON CONFLICT DO NOTHING;

        -- Create corresponding venue stay record  
        INSERT INTO public.venue_stays (
          id, profile_id, venue_id, vibe, arrived_at, departed_at
        ) VALUES (
          gen_random_uuid(),
          test_user_id,
          venue_id,
          (ARRAY['chill', 'social', 'energetic', 'focused'])[1 + (random() * 4)::int],
          test_date::timestamp + interval '1 hour' * (8 + random() * 8),
          test_date::timestamp + interval '1 hour' * (8 + random() * 8) + interval '30 minutes' + interval '1 hour' * random()
        )
        ON CONFLICT DO NOTHING;

      END LOOP;
    END LOOP;

    -- Create some raw location data as well
    FOR i IN 0..20 LOOP
      INSERT INTO public.raw_locations (
        id, profile_id, lat, lng, accuracy, recorded_at, geohash5, yyyymm, p_hash
      ) VALUES (
        gen_random_uuid(),
        test_user_id,
        33.987 + (random() - 0.5) * 0.01, -- Small area around our venues
        -118.474 + (random() - 0.5) * 0.01,
        10 + random() * 20,
        now() - interval '1 hour' * (random() * 72), -- Last 3 days
        'u4ce8', -- Geohash for the area
        to_char(now(), 'YYYYMM'),
        (random() * 1024)::int
      );
    END LOOP;
    
    RAISE NOTICE 'Created test data for user: %', test_user_id;
  ELSE
    RAISE NOTICE 'No users found - test data not created';
  END IF;
END $$;