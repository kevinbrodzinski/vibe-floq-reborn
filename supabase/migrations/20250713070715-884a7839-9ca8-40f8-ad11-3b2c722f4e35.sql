-- Phase 1C: Enhanced Database Foundation Migration
-- Rock-solid foundation with type safety, performance, and comprehensive RLS

-- 1. Create new enums for type safety
CREATE TYPE public.flock_type_enum AS ENUM ('momentary', 'persistent', 'recurring', 'template');
CREATE TYPE public.flock_event_type_enum AS ENUM ('created', 'joined', 'left', 'vibe_changed', 'location_changed', 'activity_detected', 'merged', 'split');
CREATE TYPE public.suggestion_type_enum AS ENUM ('merge_flocks', 'invite_user', 'recommend_venue', 'schedule_activity', 'change_vibe');
CREATE TYPE public.suggestion_status_enum AS ENUM ('pending', 'accepted', 'dismissed', 'expired');

-- 2. Extend floqs table with enhanced columns
ALTER TABLE public.floqs 
ADD COLUMN IF NOT EXISTS flock_type flock_type_enum DEFAULT 'momentary',
ADD COLUMN IF NOT EXISTS parent_flock_id uuid REFERENCES public.floqs(id),
ADD COLUMN IF NOT EXISTS recurrence_pattern jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS flock_tags text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS auto_created boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS activity_score numeric(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS last_activity_at timestamp with time zone DEFAULT now();

-- 3. Create flock_relationships table for co-occurrence tracking
CREATE TABLE IF NOT EXISTS public.flock_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL,
  user_b_id uuid NOT NULL,
  relationship_strength numeric(5,2) DEFAULT 0.0,
  last_interaction_at timestamp with time zone DEFAULT now(),
  interaction_count integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT fk_user_a FOREIGN KEY (user_a_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_b FOREIGN KEY (user_b_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT chk_user_order CHECK (user_a_id < user_b_id),
  CONSTRAINT unq_user_pair UNIQUE (user_a_id, user_b_id)
);

-- 4. Create flock_history table for comprehensive tracking
CREATE TABLE IF NOT EXISTS public.flock_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floq_id uuid NOT NULL REFERENCES public.floqs(id) ON DELETE CASCADE,
  event_type flock_event_type_enum NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  previous_vibe vibe_enum,
  new_vibe vibe_enum,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Create flock_auto_suggestions table for ML recommendations
CREATE TABLE IF NOT EXISTS public.flock_auto_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  suggestion_type suggestion_type_enum NOT NULL,
  target_floq_id uuid REFERENCES public.floqs(id) ON DELETE CASCADE,
  suggested_users uuid[] DEFAULT ARRAY[]::uuid[],
  confidence_score numeric(3,2) DEFAULT 0.0,
  reasoning_data jsonb DEFAULT '{}',
  status suggestion_status_enum DEFAULT 'pending',
  expires_at timestamp with time zone DEFAULT (now() + interval '24 hours'),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT chk_confidence_range CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0)
);

-- 6. Performance indexes
-- GIN index for flock_tags array operations
CREATE INDEX IF NOT EXISTS idx_floqs_flock_tags_gin ON public.floqs USING GIN (flock_tags);

-- Composite index for flock_history timeline queries
CREATE INDEX IF NOT EXISTS idx_flock_history_floq_timeline ON public.flock_history (floq_id, created_at DESC);

-- Partial index for pending high-confidence suggestions
CREATE INDEX IF NOT EXISTS idx_suggestions_pending_high ON public.flock_auto_suggestions (confidence_score DESC) 
WHERE status = 'pending';

-- Indexes for flock_relationships
CREATE INDEX IF NOT EXISTS idx_flock_relationships_user_a ON public.flock_relationships (user_a_id);
CREATE INDEX IF NOT EXISTS idx_flock_relationships_user_b ON public.flock_relationships (user_b_id);
CREATE INDEX IF NOT EXISTS idx_flock_relationships_strength ON public.flock_relationships (relationship_strength DESC);

-- Activity score and type indexes
CREATE INDEX IF NOT EXISTS idx_floqs_activity_score ON public.floqs (activity_score DESC);
CREATE INDEX IF NOT EXISTS idx_floqs_flock_type ON public.floqs (flock_type);
CREATE INDEX IF NOT EXISTS idx_floqs_parent_flock ON public.floqs (parent_flock_id) WHERE parent_flock_id IS NOT NULL;

-- 7. Enable RLS on new tables
ALTER TABLE public.flock_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flock_auto_suggestions ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for flock_relationships
CREATE POLICY "Users can view their own relationships" ON public.flock_relationships
  FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "Edge function can insert relationships" ON public.flock_relationships
  FOR INSERT WITH CHECK (current_setting('role') = 'service_role');

CREATE POLICY "Edge function can update relationships" ON public.flock_relationships
  FOR UPDATE USING (current_setting('role') = 'service_role');

-- 9. RLS Policies for flock_history
CREATE POLICY "Users can view flock history they participated in" ON public.flock_history
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.floq_participants fp 
      WHERE fp.floq_id = flock_history.floq_id AND fp.user_id = auth.uid()
    )
  );

CREATE POLICY "Edge function can insert history" ON public.flock_history
  FOR INSERT WITH CHECK (current_setting('role') = 'service_role');

-- 10. RLS Policies for flock_auto_suggestions
CREATE POLICY "Users can view their own suggestions" ON public.flock_auto_suggestions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestions" ON public.flock_auto_suggestions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suggestions" ON public.flock_auto_suggestions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Edge function can insert suggestions" ON public.flock_auto_suggestions
  FOR INSERT WITH CHECK (current_setting('role') = 'service_role');

-- 11. Advanced Functions

-- Function to update relationship strength (IMMUTABLE for inline use)
CREATE OR REPLACE FUNCTION public.calculate_relationship_strength(
  interaction_count integer,
  days_since_last_interaction numeric
) RETURNS numeric AS $$
BEGIN
  RETURN LEAST(
    1.0,
    (interaction_count::numeric * 0.1) * EXP(-days_since_last_interaction / 30.0)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function for relationship strength updates
CREATE OR REPLACE FUNCTION public.update_flock_relationship_strength()
RETURNS TRIGGER AS $$
DECLARE
  days_diff numeric;
BEGIN
  days_diff := EXTRACT(EPOCH FROM (now() - COALESCE(NEW.last_interaction_at, now()))) / 86400.0;
  
  NEW.relationship_strength := public.calculate_relationship_strength(
    NEW.interaction_count,
    days_diff
  );
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update floq activity score
CREATE OR REPLACE FUNCTION public.update_floq_activity_score()
RETURNS TRIGGER AS $$
DECLARE
  participant_count integer;
  hours_since_activity numeric;
  new_score numeric;
BEGIN
  -- Count active participants
  SELECT COUNT(*) INTO participant_count
  FROM public.floq_participants 
  WHERE floq_id = NEW.floq_id;
  
  -- Calculate hours since last activity
  hours_since_activity := EXTRACT(EPOCH FROM (now() - COALESCE(NEW.created_at, now()))) / 3600.0;
  
  -- Calculate activity score (decays over time, boosted by participants)
  new_score := LEAST(
    100.0,
    (participant_count * 10.0) * EXP(-hours_since_activity / 24.0)
  );
  
  -- Update the floq
  UPDATE public.floqs 
  SET 
    activity_score = new_score,
    last_activity_at = now()
  WHERE id = NEW.floq_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function for expired suggestions
CREATE OR REPLACE FUNCTION public.cleanup_expired_suggestions()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.flock_auto_suggestions 
  WHERE expires_at < now() OR status = 'expired';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add updated_at trigger to tables
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create triggers

-- Relationship strength triggers
CREATE TRIGGER trg_set_strength_before_insert
  BEFORE INSERT ON public.flock_relationships
  FOR EACH ROW EXECUTE FUNCTION public.update_flock_relationship_strength();

CREATE TRIGGER trg_set_strength_before_update
  BEFORE UPDATE ON public.flock_relationships
  FOR EACH ROW EXECUTE FUNCTION public.update_flock_relationship_strength();

-- Activity score triggers
CREATE TRIGGER trg_update_activity_score
  AFTER INSERT OR UPDATE OR DELETE ON public.flock_history
  FOR EACH ROW EXECUTE FUNCTION public.update_floq_activity_score();

-- Updated_at triggers
CREATE TRIGGER trg_floqs_updated_at
  BEFORE UPDATE ON public.floqs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_suggestions_updated_at
  BEFORE UPDATE ON public.flock_auto_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 13. Schedule cleanup job (if cron is available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-expired-suggestions',
      '0 * * * *', -- every hour
      $$SELECT public.cleanup_expired_suggestions();$$
    );
  END IF;
END $$;

-- 14. Grant permissions for Edge Functions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;