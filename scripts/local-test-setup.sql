-- Local Test Setup for Function Updates
-- Creates basic types and tables needed for testing

-- Create vibe_enum type
CREATE TYPE vibe_enum AS ENUM (
  'chill', 'energetic', 'social', 'creative', 'focused', 'relaxed', 'adventurous'
);

-- Create suggestion_type_enum
CREATE TYPE suggestion_type_enum AS ENUM (
  'floq', 'friend', 'venue'
);

-- Create basic tables for testing
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS floqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles(id),
  location GEOMETRY(POINT, 4326),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  primary_vibe vibe_enum,
  visibility TEXT DEFAULT 'public',
  title TEXT,
  flock_type TEXT DEFAULT 'momentary',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS floq_participants (
  floq_id UUID REFERENCES floqs(id),
  profile_id UUID REFERENCES profiles(id),
  role TEXT DEFAULT 'participant',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (floq_id, profile_id)
);

CREATE TABLE IF NOT EXISTS floq_invitations (
  floq_id UUID REFERENCES floqs(id),
  inviter_id UUID REFERENCES profiles(id),
  invitee_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending',
  PRIMARY KEY (floq_id, invitee_id)
);

CREATE TABLE IF NOT EXISTS flock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floq_id UUID REFERENCES floqs(id),
  profile_id UUID REFERENCES profiles(id),
  event_type TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS friendships (
  profile_id UUID REFERENCES profiles(id),
  friend_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (profile_id, friend_id)
);

CREATE TABLE IF NOT EXISTS vibes_now (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id),
  vibe vibe_enum,
  location GEOMETRY(POINT, 4326),
  geo GEOGRAPHY,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  visibility TEXT DEFAULT 'public',
  venue_id UUID
);

CREATE TABLE IF NOT EXISTS vibes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  ts TIMESTAMPTZ DEFAULT NOW(),
  location GEOGRAPHY,
  venue_id UUID,
  vibe vibe_enum
);

CREATE TABLE IF NOT EXISTS floq_ignored (
  floq_id UUID REFERENCES floqs(id),
  profile_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (floq_id, profile_id)
);

CREATE TABLE IF NOT EXISTS floq_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floq_id UUID REFERENCES floqs(id),
  profile_id UUID REFERENCES profiles(id),
  boost_type TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_participants (
  plan_id UUID,
  profile_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (plan_id, profile_id)
);

CREATE TABLE IF NOT EXISTS floq_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floq_id UUID REFERENCES floqs(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID,
  stop_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS direct_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_a UUID REFERENCES profiles(id),
  member_b UUID REFERENCES profiles(id),
  last_read_at_a TIMESTAMPTZ,
  last_read_at_b TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vibes_now_profile_id ON vibes_now(profile_id);
CREATE INDEX IF NOT EXISTS idx_vibes_log_profile_id ON vibes_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_floq_participants_floq_id ON floq_participants(floq_id);
CREATE INDEX IF NOT EXISTS idx_floq_participants_profile_id ON floq_participants(profile_id);
CREATE INDEX IF NOT EXISTS idx_friendships_profile_id ON friendships(profile_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE floqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE floq_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibes_now ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibes_log ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Insert test data
INSERT INTO profiles (id, username, display_name) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'testuser', 'Test User')
ON CONFLICT (id) DO NOTHING;

-- Notify completion
DO $$
BEGIN
    RAISE NOTICE 'Local test setup completed at %', now();
    RAISE NOTICE 'Created basic schema with test data';
END $$; 