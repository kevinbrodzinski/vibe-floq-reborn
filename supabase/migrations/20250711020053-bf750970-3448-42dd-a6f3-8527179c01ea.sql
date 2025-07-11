-- Enhanced award_if_goal_met function with single-statement upsert and security hardening
CREATE OR REPLACE FUNCTION award_if_goal_met(
  _user uuid,
  _code text,
  _increment integer
) RETURNS boolean
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cat achievement_catalogue;
  just_earned boolean;
BEGIN
  -- Validate increment is positive
  IF _increment <= 0 THEN
    RAISE EXCEPTION 'Achievement increment must be positive, got: %', _increment;
  END IF;

  -- Get achievement definition
  SELECT * INTO cat FROM achievement_catalogue WHERE code = _code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown achievement code: %', _code;
  END IF;

  -- Single atomic upsert with race condition protection
  INSERT INTO user_achievements (user_id, code, progress)
  VALUES (_user, _code, _increment)
  ON CONFLICT (user_id, code) DO UPDATE
  SET
    progress = LEAST(user_achievements.progress + EXCLUDED.progress, cat.goal),
    earned_at = COALESCE(
      user_achievements.earned_at,
      CASE
        WHEN user_achievements.progress + EXCLUDED.progress >= cat.goal
        THEN now()
      END
    )
  RETURNING (earned_at IS NOT NULL AND earned_at IS DISTINCT FROM user_achievements.earned_at) INTO just_earned;

  RETURN COALESCE(just_earned, false);
END $$;

-- Add upper-bound validation trigger
CREATE OR REPLACE FUNCTION validate_achievement_progress()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  max_goal integer;
BEGIN
  -- Get the goal for this achievement
  SELECT goal INTO max_goal 
  FROM achievement_catalogue 
  WHERE code = NEW.code;
  
  -- Validate progress doesn't exceed goal
  IF NEW.progress > max_goal THEN
    RAISE EXCEPTION 'Progress (%) cannot exceed goal (%) for achievement %', 
      NEW.progress, max_goal, NEW.code;
  END IF;
  
  -- Validate progress is non-negative
  IF NEW.progress < 0 THEN
    RAISE EXCEPTION 'Progress cannot be negative, got: %', NEW.progress;
  END IF;
  
  RETURN NEW;
END $$;

-- Create trigger for progress validation
DROP TRIGGER IF EXISTS validate_progress_trigger ON user_achievements;
CREATE TRIGGER validate_progress_trigger
  BEFORE INSERT OR UPDATE ON user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION validate_achievement_progress();

-- Add performance index for earned achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned 
ON user_achievements (user_id, earned_at) 
WHERE earned_at IS NOT NULL;

-- Add index for in-progress achievements  
CREATE INDEX IF NOT EXISTS idx_user_achievements_progress 
ON user_achievements (user_id, code) 
WHERE earned_at IS NULL;