-- Phase 2: Generate Test Data for Afterglow System (Final corrected version)
-- Create sample venue visits and location data for recent days

-- First, let's create some test venues if they don't exist
INSERT INTO public.venues (id, name, categories, lat, lng, provider, provider_id, created_at)
VALUES 
  ('123e4567-e89b-12d3-a456-426614174000', 'The Coffee House', ARRAY['cafe', 'food'], 33.9870, -118.4740, 'manual', 'test-coffee-house', now() - interval '1 day'),
  ('123e4567-e89b-12d3-a456-426614174001', 'Downtown Gym', ARRAY['gym', 'fitness'], 33.9880, -118.4750, 'manual', 'test-downtown-gym', now() - interval '1 day'),
  ('123e4567-e89b-12d3-a456-426614174002', 'Central Park', ARRAY['park', 'recreation'], 33.9860, -118.4730, 'manual', 'test-central-park', now() - interval '1 day'),
  ('123e4567-e89b-12d3-a456-426614174003', 'Local Restaurant', ARRAY['restaurant', 'food'], 33.9890, -118.4720, 'manual', 'test-local-restaurant', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- Create test venue visits for the last 3 days for any authenticated users
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
  visit_start timestamp;
  visit_end timestamp;
BEGIN
  -- Get the first user from auth.users (for testing)
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  -- Only proceed if we have a user
  IF test_user_id IS NOT NULL THEN
    RAISE NOTICE 'Creating test data for user: %', test_user_id;
    
    -- Create venue visits for the last 3 days
    FOR i IN 0..2 LOOP
      test_date := (CURRENT_DATE - i);
      
      -- Visit 2-3 venues per day
      FOR venue_id IN SELECT unnest(venue_ids[1:LEAST(array_length(venue_ids, 1), 2+i)]) LOOP
        -- Generate consistent visit times
        visit_start := test_date::timestamp + interval '1 hour' * (8 + random() * 8);
        visit_end := visit_start + interval '30 minutes' + interval '1 hour' * random();
        
        -- Create venue visit record (using actual column names)
        INSERT INTO public.venue_visits (
          profile_id, venue_id, arrived_at, departed_at, day_key
        ) VALUES (
          test_user_id,
          venue_id,
          visit_start,
          visit_end,
          test_date
        )
        ON CONFLICT DO NOTHING;

        -- Create corresponding venue stay record (using actual column names)
        INSERT INTO public.venue_stays (
          profile_id, venue_id, arrived_at, departed_at
        ) VALUES (
          test_user_id,
          venue_id,
          visit_start,
          visit_end
        )
        ON CONFLICT DO NOTHING;

      END LOOP;
    END LOOP;

    -- Create some raw location data using the actual column structure
    FOR i IN 0..20 LOOP
      INSERT INTO public.raw_locations (
        profile_id, 
        captured_at, 
        geom, 
        accuracy_m, 
        geohash5
      ) VALUES (
        test_user_id,
        now() - interval '1 hour' * (random() * 72), -- Last 3 days
        ST_SetSRID(ST_MakePoint(
          -118.474 + (random() - 0.5) * 0.01,  -- lng
          33.987 + (random() - 0.5) * 0.01     -- lat
        ), 4326),
        (10 + random() * 20)::int,
        'u4ce8' -- Geohash for the area
      );
    END LOOP;
    
    RAISE NOTICE 'Successfully created test data for user: %', test_user_id;
  ELSE
    RAISE NOTICE 'No users found - test data not created';
  END IF;
END $$;