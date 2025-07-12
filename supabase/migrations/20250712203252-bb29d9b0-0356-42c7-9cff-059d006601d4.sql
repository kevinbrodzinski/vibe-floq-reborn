-- Create demo schema with proper table structure and foreign keys
CREATE SCHEMA IF NOT EXISTS demo;

-- Create demo tables (copy structure but not constraints that reference public schema)
CREATE TABLE IF NOT EXISTS demo.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username text,
  display_name text,
  avatar_url text,
  bio text,
  interests text[] DEFAULT '{}',
  custom_status text,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS demo.venues (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  vibe text,
  source text DEFAULT 'demo',
  description text,
  radius_m integer DEFAULT 100,
  geo geometry(Point, 4326),
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS demo.floqs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  name text,
  primary_vibe vibe_enum NOT NULL,
  vibe_tag vibe_enum,
  type text DEFAULT 'auto',
  starts_at timestamp with time zone DEFAULT now(),
  ends_at timestamp with time zone DEFAULT (now() + interval '4 hours'),
  max_participants integer DEFAULT 20,
  visibility text DEFAULT 'public',
  creator_id uuid,
  expires_at timestamp with time zone,
  location geometry(Point, 4326) NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  radius_m integer DEFAULT 100,
  geo geometry(Point, 4326),
  catchment_area geometry,
  walkable_zone geometry,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS demo.floq_participants (
  floq_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member',
  joined_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (floq_id, user_id)
);

CREATE TABLE IF NOT EXISTS demo.floq_boosts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  floq_id uuid NOT NULL,
  user_id uuid NOT NULL,
  boost_type text DEFAULT 'vibe',
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '1 hour'),
  PRIMARY KEY (id)
);

-- Add foreign key constraints within demo schema
ALTER TABLE demo.floq_participants
  DROP CONSTRAINT IF EXISTS demo_floq_participants_floq_fk,
  ADD CONSTRAINT demo_floq_participants_floq_fk
  FOREIGN KEY (floq_id) REFERENCES demo.floqs(id) ON DELETE CASCADE;

ALTER TABLE demo.floq_participants
  DROP CONSTRAINT IF EXISTS demo_floq_participants_user_fk,
  ADD CONSTRAINT demo_floq_participants_user_fk
  FOREIGN KEY (user_id) REFERENCES demo.profiles(id) ON DELETE CASCADE;

ALTER TABLE demo.floq_boosts
  DROP CONSTRAINT IF EXISTS demo_floq_boosts_floq_fk,
  ADD CONSTRAINT demo_floq_boosts_floq_fk
  FOREIGN KEY (floq_id) REFERENCES demo.floqs(id) ON DELETE CASCADE;

ALTER TABLE demo.floq_boosts
  DROP CONSTRAINT IF EXISTS demo_floq_boosts_user_fk,
  ADD CONSTRAINT demo_floq_boosts_user_fk
  FOREIGN KEY (user_id) REFERENCES demo.profiles(id) ON DELETE CASCADE;

-- Clear and seed demo data (proper order to handle foreign keys)
TRUNCATE demo.floq_boosts, demo.floq_participants, demo.floqs, demo.profiles, demo.venues RESTART IDENTITY CASCADE;

-- Insert demo profiles
INSERT INTO demo.profiles (id, username, display_name, avatar_url, bio) VALUES
  ('00000000-0000-0000-0000-000000000001', 'alex_dev', 'Alex', 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex', 'Full-stack developer, coffee enthusiast'),
  ('00000000-0000-0000-0000-000000000002', 'sarah_design', 'Sarah', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah', 'UX/UI designer with a passion for beautiful interfaces'),
  ('00000000-0000-0000-0000-000000000003', 'mike_photo', 'Mike', 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike', 'Photographer capturing LA moments'),
  ('00000000-0000-0000-0000-000000000004', 'emma_art', 'Emma', 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma', 'Digital artist and creative director'),
  ('00000000-0000-0000-0000-000000000005', 'jake_music', 'Jake', 'https://api.dicebear.com/7.x/avataaars/svg?seed=jake', 'Music producer and DJ');

-- Insert demo venues (LA locations)
INSERT INTO demo.venues (id, name, lat, lng, vibe, source, description) VALUES
  ('00000000-0000-0000-0000-000000000101', 'Venice Beach Coffee', 33.985100, -118.469200, 'chill', 'demo', 'Beachside coffee shop with great wifi'),
  ('00000000-0000-0000-0000-000000000102', 'Griffith Park Yoga', 34.118400, -118.300400, 'social', 'demo', 'Outdoor yoga sessions with city views'),
  ('00000000-0000-0000-0000-000000000103', 'DTLA Rooftop Lounge', 34.052235, -118.243685, 'hype', 'demo', 'Downtown rooftop with skyline views'),
  ('00000000-0000-0000-0000-000000000104', 'Santa Monica Library', 34.015564, -118.491655, 'curious', 'demo', 'Quiet study space near the beach'),
  ('00000000-0000-0000-0000-000000000105', 'Melrose Art Gallery', 34.083812, -118.361506, 'curious', 'demo', 'Contemporary art space on Melrose');

-- Insert demo floqs (with realistic timing and valid geometry)
INSERT INTO demo.floqs (id, title, name, primary_vibe, starts_at, ends_at, location, visibility, creator_id) VALUES
  ('00000000-0000-0000-0000-000000000201', 'Coffee & Code', 'Venice Beach Coffee', 'chill', 
   now() + interval '15 minutes', now() + interval '2 hours',
   ST_SetSRID(ST_MakePoint(-118.469200, 33.985100), 4326), 'public', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000202', 'Sunset Yoga', 'Griffith Park Yoga', 'social', 
   now() + interval '45 minutes', now() + interval '3 hours',
   ST_SetSRID(ST_MakePoint(-118.300400, 34.118400), 4326), 'public', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000203', 'Rooftop DJ Set', 'DTLA Rooftop Lounge', 'hype', 
   now() + interval '90 minutes', now() + interval '4 hours',
   ST_SetSRID(ST_MakePoint(-118.243685, 34.052235), 4326), 'public', '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000204', 'Book Club', 'Santa Monica Library', 'curious', 
   now() + interval '2 hours', now() + interval '4 hours',
   ST_SetSRID(ST_MakePoint(-118.491655, 34.015564), 4326), 'public', '00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000205', 'Art Gallery Opening', 'Melrose Art Gallery', 'curious', 
   now() + interval '3 hours', now() + interval '5 hours',
   ST_SetSRID(ST_MakePoint(-118.361506, 34.083812), 4326), 'public', '00000000-0000-0000-0000-000000000005');

-- Insert demo participants
INSERT INTO demo.floq_participants (floq_id, user_id, role) VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'creator'),
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000002', 'member'),
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000003', 'member'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000002', 'creator'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000004', 'member'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000005', 'member'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000003', 'creator'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', 'member'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000005', 'member'),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000004', 'creator'),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001', 'member'),
  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000005', 'creator'),
  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000002', 'member');

-- Insert demo boosts
INSERT INTO demo.floq_boosts (floq_id, user_id, boost_type, expires_at) VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000002', 'vibe', now() + interval '45 minutes'),
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000003', 'vibe', now() + interval '30 minutes'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 'vibe', now() + interval '1 hour'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000004', 'vibe', now() + interval '2 hours'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000005', 'vibe', now() + interval '90 minutes');

-- Update the RPC function to support demo mode
CREATE OR REPLACE FUNCTION public.get_active_floqs_with_members(
  p_use_demo boolean DEFAULT false,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_user_lat numeric DEFAULT NULL,
  p_user_lng numeric DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  title text,
  name text,
  primary_vibe vibe_enum,
  vibe_tag vibe_enum,
  type text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  participant_count bigint,
  boost_count bigint,
  starts_in_min integer,
  distance_meters numeric,
  members jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  schema_name text;
BEGIN
  -- Set schema based on demo mode
  schema_name := CASE WHEN p_use_demo THEN 'demo' ELSE 'public' END;
  
  -- Execute dynamic query with proper schema selection
  RETURN QUERY EXECUTE format('
    WITH floq_with_distance AS (
      SELECT
        f.id,
        f.title,
        f.name,
        f.primary_vibe,
        f.primary_vibe AS vibe_tag,
        COALESCE(f.type, ''auto'') AS type,
        f.starts_at,
        f.ends_at,
        CASE 
          WHEN $3 IS NOT NULL AND $4 IS NOT NULL
          THEN ST_Distance(
            f.location::geography,
            ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography
          )::numeric
          ELSE NULL::numeric
        END AS distance_meters
      FROM %I.floqs f
      WHERE f.ends_at > now()
        AND f.visibility = ''public''
    )
    SELECT
      fwd.id,
      fwd.title,
      fwd.name,
      fwd.primary_vibe,
      fwd.vibe_tag,
      fwd.type,
      fwd.starts_at,
      fwd.ends_at,
      COALESCE(participants.participant_count, 0) AS participant_count,
      COALESCE(boosts.boost_count, 0) AS boost_count,
      GREATEST(0, EXTRACT(EPOCH FROM (fwd.starts_at - now()))/60)::int AS starts_in_min,
      fwd.distance_meters,
      COALESCE(members.members, ''[]''::jsonb) AS members
    FROM floq_with_distance fwd
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS participant_count
      FROM %I.floq_participants fp
      WHERE fp.floq_id = fwd.id
    ) participants ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS boost_count
      FROM %I.floq_boosts fb
      WHERE fb.floq_id = fwd.id 
      AND fb.boost_type = ''vibe''
      AND fb.expires_at > now()
    ) boosts ON TRUE
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object(
        ''avatar_url'', p.avatar_url,
        ''id'', p.id,
        ''username'', p.username,
        ''display_name'', p.display_name
      ) ORDER BY fp.joined_at DESC) AS members
      FROM %I.floq_participants fp
      JOIN %I.profiles p ON p.id = fp.user_id
      WHERE fp.floq_id = fwd.id
      LIMIT 8
    ) members ON TRUE
    ORDER BY 
      COALESCE(fwd.distance_meters, 999999),
      boosts.boost_count DESC,
      fwd.starts_at
    LIMIT $1 OFFSET $2
  ', schema_name, schema_name, schema_name, schema_name, schema_name)
  USING p_limit, p_offset, p_user_lat, p_user_lng;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_active_floqs_with_members(boolean, integer, integer, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_floqs_with_members(boolean, integer, integer, numeric, numeric) TO anon;