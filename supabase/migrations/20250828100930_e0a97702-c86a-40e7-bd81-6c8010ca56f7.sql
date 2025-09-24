-- Create comprehensive schema for Phase 2: Advanced Social Mechanics

-- Enhanced floq system with role-based permissions
CREATE TABLE IF NOT EXISTS floq_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floq_id UUID NOT NULL,
  profile_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('creator', 'co_admin', 'member')),
  permissions JSONB DEFAULT '{}',
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(floq_id, profile_id)
);

-- Floq invitations system
CREATE TABLE IF NOT EXISTS floq_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floq_id UUID NOT NULL,
  inviter_id UUID NOT NULL,
  invitee_email TEXT,
  invitee_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

-- Plan coordination system
CREATE TABLE IF NOT EXISTS collaborative_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  floq_id UUID,
  created_by UUID NOT NULL,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'confirmed', 'active', 'completed', 'cancelled')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  location_name TEXT,
  location_lat DECIMAL,
  location_lng DECIMAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Plan participants with roles
CREATE TABLE IF NOT EXISTS plan_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL,
  profile_id UUID NOT NULL,
  role TEXT DEFAULT 'collaborator' CHECK (role IN ('creator', 'collaborator', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, profile_id)
);

-- Enhanced plan stops with proper ordering
CREATE TABLE IF NOT EXISTS plan_stops_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  venue_id UUID,
  venue_name TEXT,
  venue_address TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  estimated_cost_per_person DECIMAL,
  stop_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Plan stop votes and reactions
CREATE TABLE IF NOT EXISTS plan_stop_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id UUID NOT NULL,
  profile_id UUID NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('love', 'like', 'neutral', 'dislike', 'veto')),
  emoji_reaction TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stop_id, profile_id)
);

-- Plan comments system
CREATE TABLE IF NOT EXISTS plan_stop_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id UUID NOT NULL,
  profile_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enhanced vibe system
CREATE TABLE IF NOT EXISTS user_vibe_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  vibe_tag TEXT NOT NULL,
  location_lat DECIMAL,
  location_lng DECIMAL,
  visibility TEXT DEFAULT 'friends' CHECK (visibility IN ('public', 'friends', 'private')),
  is_broadcasting BOOLEAN DEFAULT false,
  duration_minutes INTEGER DEFAULT 60,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vibe matching preferences
CREATE TABLE IF NOT EXISTS vibe_matching_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  preferred_vibes TEXT[] DEFAULT '{}',
  max_distance_km INTEGER DEFAULT 5,
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id)
);

-- Real-time plan collaboration
CREATE TABLE IF NOT EXISTS plan_collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL,
  profile_id UUID NOT NULL,
  cursor_position JSONB,
  editing_field TEXT,
  last_seen TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '5 minutes')
);

-- Enable RLS on all new tables
ALTER TABLE floq_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE floq_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_stops_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_stop_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_stop_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vibe_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_matching_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_collaboration_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for floq_roles
CREATE POLICY "floq_roles_member_read" ON floq_roles
  FOR SELECT USING (
    profile_id = auth.uid() OR 
    floq_id IN (SELECT floq_id FROM floq_roles WHERE profile_id = auth.uid())
  );

CREATE POLICY "floq_roles_admin_manage" ON floq_roles
  FOR ALL USING (
    floq_id IN (
      SELECT floq_id FROM floq_roles 
      WHERE profile_id = auth.uid() 
      AND role IN ('creator', 'co_admin')
    )
  );

-- RLS Policies for floq_invitations
CREATE POLICY "floq_invitations_inviter_create" ON floq_invitations
  FOR INSERT WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "floq_invitations_participant_read" ON floq_invitations
  FOR SELECT USING (
    inviter_id = auth.uid() OR 
    invitee_id = auth.uid()
  );

-- RLS Policies for collaborative_plans
CREATE POLICY "collaborative_plans_participant_read" ON collaborative_plans
  FOR SELECT USING (
    created_by = auth.uid() OR
    id IN (SELECT plan_id FROM plan_participants WHERE profile_id = auth.uid())
  );

CREATE POLICY "collaborative_plans_creator_manage" ON collaborative_plans
  FOR ALL USING (created_by = auth.uid());

-- RLS Policies for plan_participants
CREATE POLICY "plan_participants_member_read" ON plan_participants
  FOR SELECT USING (
    profile_id = auth.uid() OR
    plan_id IN (SELECT plan_id FROM plan_participants WHERE profile_id = auth.uid())
  );

CREATE POLICY "plan_participants_creator_manage" ON plan_participants
  FOR ALL USING (
    plan_id IN (
      SELECT id FROM collaborative_plans WHERE created_by = auth.uid()
    )
  );

-- RLS Policies for plan_stops_v2
CREATE POLICY "plan_stops_participant_read" ON plan_stops_v2
  FOR SELECT USING (
    plan_id IN (
      SELECT plan_id FROM plan_participants WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "plan_stops_collaborator_manage" ON plan_stops_v2
  FOR ALL USING (
    created_by = auth.uid() OR
    plan_id IN (
      SELECT plan_id FROM plan_participants 
      WHERE profile_id = auth.uid() 
      AND role IN ('creator', 'collaborator')
    )
  );

-- RLS Policies for plan_stop_votes
CREATE POLICY "plan_stop_votes_own_manage" ON plan_stop_votes
  FOR ALL USING (profile_id = auth.uid());

CREATE POLICY "plan_stop_votes_participant_read" ON plan_stop_votes
  FOR SELECT USING (
    stop_id IN (
      SELECT id FROM plan_stops_v2 
      WHERE plan_id IN (
        SELECT plan_id FROM plan_participants WHERE profile_id = auth.uid()
      )
    )
  );

-- RLS Policies for user_vibe_history
CREATE POLICY "user_vibe_history_own_manage" ON user_vibe_history
  FOR ALL USING (profile_id = auth.uid());

CREATE POLICY "user_vibe_history_friends_read" ON user_vibe_history
  FOR SELECT USING (
    visibility = 'public' OR
    (visibility = 'friends' AND profile_id IN (
      SELECT CASE 
        WHEN profile_low = auth.uid() THEN profile_high
        WHEN profile_high = auth.uid() THEN profile_low
      END
      FROM friendships 
      WHERE (profile_low = auth.uid() OR profile_high = auth.uid())
      AND friend_state = 'accepted'
    ))
  );

-- RLS Policies for vibe_matching_preferences
CREATE POLICY "vibe_matching_preferences_own_manage" ON vibe_matching_preferences
  FOR ALL USING (profile_id = auth.uid());

-- Update triggers for timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_collaborative_plans_updated_at 
  BEFORE UPDATE ON collaborative_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_stops_v2_updated_at 
  BEFORE UPDATE ON plan_stops_v2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vibe_matching_preferences_updated_at 
  BEFORE UPDATE ON vibe_matching_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();