-- Create achievement family enum
CREATE TYPE achievement_family AS ENUM (
  'social',
  'location', 
  'vibe',
  'activity',
  'milestone',
  'special'
);

-- Achievement catalogue table
CREATE TABLE achievement_catalogue (
  code        text PRIMARY KEY,
  family      achievement_family NOT NULL,
  name        text NOT NULL,
  description text NOT NULL,
  icon        text,
  goal        integer,
  metadata    jsonb DEFAULT '{}'::jsonb
);

-- User achievement progress table
CREATE TABLE user_achievements (
  user_id   uuid REFERENCES profiles(id) ON DELETE CASCADE,
  code      text REFERENCES achievement_catalogue(code),
  progress  integer DEFAULT 0,
  earned_at timestamptz,
  PRIMARY KEY (user_id, code)
);

-- Enable RLS on user_achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policy for user achievements
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT 
  USING (user_id = auth.uid());

-- Atomic stored procedure for awarding achievements
CREATE OR REPLACE FUNCTION award_if_goal_met(
  _user uuid,
  _code text,
  _increment integer
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cat achievement_catalogue;
  rec user_achievements;
BEGIN
  -- Get achievement definition
  SELECT * INTO cat FROM achievement_catalogue WHERE code = _code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown achievement code: %', _code;
  END IF;

  -- Upsert progress
  INSERT INTO user_achievements (user_id, code, progress)
       VALUES (_user, _code, _increment)
  ON CONFLICT (user_id, code) DO UPDATE
     SET progress = user_achievements.progress + EXCLUDED.progress
     RETURNING * INTO rec;

  -- Check if goal met and not already earned
  IF rec.progress >= cat.goal AND rec.earned_at IS NULL THEN
     UPDATE user_achievements
        SET earned_at = now()
      WHERE user_id = _user AND code = _code;
     RETURN true;  -- freshly earned
  END IF;
  
  RETURN false;  -- not earned or already earned
END $$;

-- Seed initial achievement catalogue
INSERT INTO achievement_catalogue 
  (code, family, name, description, icon, goal, metadata) VALUES
  ('first_friend', 'social', 'Social Butterfly', 'Add your first friend', 'UserPlus', 1, '{}'),
  ('explorer', 'location', 'Explorer', 'Check in at 3 unique venues', 'MapPin', 3, '{}'),
  ('social_vibe_master', 'vibe', 'Social Vibe Master', 'Spend 2 hours in Social vibe', 'Heart', 7200, '{"vibe":"social"}');