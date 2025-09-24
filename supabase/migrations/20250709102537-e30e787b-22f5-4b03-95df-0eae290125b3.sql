
-- Enable PostGIS extension and create core spatial schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enums for app data types
CREATE TYPE public.vibe_enum AS ENUM (
  'chill','hype','curious','social','solo','romantic','weird','down','flowing','open'
);

CREATE TYPE public.cluster_type_enum AS ENUM (
  'nightlife', 'cafe', 'park', 'transit', 'creative', 'wellness'
);

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID PRIMARY KEY DEFAULT auth.uid(),
  display_name   TEXT,
  avatar_url     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles: self access" ON public.profiles FOR ALL USING (id = auth.uid());

-- 2. VIBES_NOW (Real-time presence with PostGIS location)
CREATE TABLE IF NOT EXISTS public.vibes_now (
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  vibe            public.vibe_enum NOT NULL,
  location        GEOMETRY(POINT, 4326) NOT NULL,
  broadcast_radius INTEGER DEFAULT 500,
  visibility      TEXT DEFAULT 'public',
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 minutes')
);

-- Spatial indexes for fast proximity queries
CREATE INDEX idx_vibes_now_location ON public.vibes_now USING GIST (location);
CREATE INDEX idx_vibes_now_expires ON public.vibes_now (expires_at);

ALTER TABLE public.vibes_now ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Presence: read within range" ON public.vibes_now FOR SELECT USING (
  visibility = 'public' OR 
  user_id = auth.uid() OR
  ST_DWithin(location, (SELECT location FROM public.vibes_now WHERE user_id = auth.uid()), broadcast_radius)
);
CREATE POLICY "Presence: upsert self" ON public.vibes_now FOR ALL USING (user_id = auth.uid());

-- 3. VENUE CLUSTERS (PostGIS geofencing)
CREATE TABLE IF NOT EXISTS public.venue_clusters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  boundary        GEOMETRY(POLYGON, 4326),
  cluster_type    public.cluster_type_enum NOT NULL,
  venue_count     INTEGER DEFAULT 0,
  active_hours    TSTZRANGE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_venue_clusters_boundary ON public.venue_clusters USING GIST (boundary);

-- 4. FLOQS (Enhanced with catchment areas)
CREATE TABLE IF NOT EXISTS public.floqs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  location        GEOMETRY(POINT, 4326) NOT NULL,
  catchment_area  GEOMETRY(POLYGON, 4326),
  walkable_zone   GEOMETRY(POLYGON, 4326),
  primary_vibe    public.vibe_enum NOT NULL,
  starts_at       TIMESTAMPTZ DEFAULT NOW(),
  ends_at         TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '4 hours'),
  max_participants INTEGER DEFAULT 20,
  visibility      TEXT DEFAULT 'public',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_floqs_location ON public.floqs USING GIST (location);
CREATE INDEX idx_floqs_catchment ON public.floqs USING GIST (catchment_area);
CREATE INDEX idx_floqs_walkable ON public.floqs USING GIST (walkable_zone);

ALTER TABLE public.floqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Floqs: read nearby public" ON public.floqs FOR SELECT USING (
  visibility = 'public' AND ends_at > NOW()
);

-- 5. FLOQ PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.floq_participants (
  floq_id         UUID REFERENCES public.floqs(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role            TEXT CHECK (role IN ('host','member')) DEFAULT 'member',
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (floq_id, user_id)
);

ALTER TABLE public.floq_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Floq participants: see own membership" ON public.floq_participants FOR ALL 
USING (user_id = auth.uid());

-- 6. FRIENDS
CREATE TABLE IF NOT EXISTS public.friends (
  user_id    UUID NOT NULL,
  friend_id  UUID NOT NULL,
  status     TEXT CHECK (status IN ('pending','accepted')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id),
  CONSTRAINT no_self_friend CHECK (user_id <> friend_id)
);

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Friends: mutual visibility" ON public.friends FOR SELECT 
USING (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY "Friends: send requests" ON public.friends FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Friends: accept requests" ON public.friends FOR UPDATE 
USING (friend_id = auth.uid()) WITH CHECK (status = 'accepted');

-- UTILITY FUNCTIONS FOR POSTGIS QUERIES
CREATE OR REPLACE FUNCTION public.get_nearby_presence(
  user_lat FLOAT,
  user_lng FLOAT,
  radius_meters INTEGER DEFAULT 800
)
RETURNS TABLE (
  user_id UUID,
  vibe public.vibe_enum,
  distance_meters INTEGER,
  updated_at TIMESTAMPTZ
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 
    v.user_id,
    v.vibe,
    ST_Distance(v.location, ST_Point(user_lng, user_lat)::geography)::integer as distance_meters,
    v.updated_at
  FROM public.vibes_now v
  WHERE v.expires_at > NOW()
    AND ST_DWithin(v.location, ST_Point(user_lng, user_lat)::geography, radius_meters)
    AND v.user_id != auth.uid()
  ORDER BY distance_meters;
$$;

CREATE OR REPLACE FUNCTION public.get_walkable_floqs(
  user_lat FLOAT,
  user_lng FLOAT,
  max_walk_meters INTEGER DEFAULT 1200
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  primary_vibe public.vibe_enum,
  participant_count BIGINT,
  distance_meters INTEGER,
  starts_at TIMESTAMPTZ
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 
    f.id,
    f.title,
    f.primary_vibe,
    COUNT(fp.user_id) as participant_count,
    ST_Distance(f.location, ST_Point(user_lng, user_lat)::geography)::integer as distance_meters,
    f.starts_at
  FROM public.floqs f
  LEFT JOIN public.floq_participants fp ON f.id = fp.floq_id
  WHERE f.ends_at > NOW()
    AND f.visibility = 'public'
    AND ST_DWithin(f.location, ST_Point(user_lng, user_lat)::geography, max_walk_meters)
  GROUP BY f.id, f.title, f.primary_vibe, f.starts_at, f.location
  ORDER BY distance_meters;
$$;

-- Cleanup function for expired presence
CREATE OR REPLACE FUNCTION public.gc_vibes_now()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.vibes_now WHERE expires_at < NOW();
END;
$$;

-- Enable realtime for presence updates
ALTER TABLE public.vibes_now REPLICA IDENTITY FULL;
ALTER TABLE public.floqs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vibes_now;
ALTER PUBLICATION supabase_realtime ADD TABLE public.floqs;
