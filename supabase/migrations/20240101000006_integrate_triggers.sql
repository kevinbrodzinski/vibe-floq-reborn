-- Integrate Venue Intelligence with Existing Triggers
-- Add real-time updates and cache invalidation

-- Function to invalidate venue intelligence cache on venue updates
CREATE OR REPLACE FUNCTION invalidate_venue_intelligence_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear venue intelligence cache when venue data changes
  DELETE FROM venue_intelligence_cache 
  WHERE venue_id = COALESCE(NEW.id, OLD.id);
  
  -- Notify venue intelligence system of changes
  PERFORM pg_notify('venue_intelligence_update', json_build_object(
    'venue_id', COALESCE(NEW.id, OLD.id),
    'event_type', TG_OP,
    'timestamp', extract(epoch from now())
  )::text);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to update crowd intelligence on presence changes
CREATE OR REPLACE FUNCTION update_crowd_intelligence_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update crowd intelligence cache when presence changes
  IF NEW.venue_id IS NOT NULL OR OLD.venue_id IS NOT NULL THEN
    -- Clear crowd intelligence cache for affected venue
    UPDATE venue_intelligence_cache 
    SET 
      crowd_data = NULL,
      updated_at = NOW()
    WHERE venue_id = COALESCE(NEW.venue_id, OLD.venue_id);
    
    -- Notify crowd intelligence system
    PERFORM pg_notify('crowd_intelligence_update', json_build_object(
      'venue_id', COALESCE(NEW.venue_id, OLD.venue_id),
      'event_type', TG_OP,
      'profile_id', COALESCE(NEW.profile_id, OLD.profile_id),
      'timestamp', extract(epoch from now())
    )::text);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to update social proof on venue stays
CREATE OR REPLACE FUNCTION update_social_proof_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update social proof cache when venue stays change
  DELETE FROM venue_intelligence_cache 
  WHERE venue_id = COALESCE(NEW.venue_id, OLD.venue_id)
    AND cache_type = 'social_proof';
  
  -- Notify social proof system
  PERFORM pg_notify('social_proof_update', json_build_object(
    'venue_id', COALESCE(NEW.venue_id, OLD.venue_id),
    'profile_id', COALESCE(NEW.profile_id, OLD.profile_id),
    'event_type', TG_OP,
    'timestamp', extract(epoch from now())
  )::text);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add triggers to integrate with existing system

-- Trigger on venues table (integrates with existing t_sync_location trigger)
CREATE TRIGGER trg_venue_intelligence_cache_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON venues
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_venue_intelligence_cache();

-- Trigger on vibes_now table (integrates with existing presence_notify triggers)  
CREATE TRIGGER trg_crowd_intelligence_update
  AFTER INSERT OR UPDATE OR DELETE ON vibes_now
  FOR EACH ROW
  EXECUTE FUNCTION update_crowd_intelligence_cache();

-- Trigger on venue_stays table (integrates with existing venue_stays_notify trigger)
CREATE TRIGGER trg_social_proof_update
  AFTER INSERT OR UPDATE OR DELETE ON venue_stays
  FOR EACH ROW
  EXECUTE FUNCTION update_social_proof_cache();

-- Add function to listen for real-time notifications
CREATE OR REPLACE FUNCTION setup_venue_intelligence_listeners()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Listen for venue intelligence updates
  LISTEN venue_intelligence_update;
  LISTEN crowd_intelligence_update;
  LISTEN social_proof_update;
  
  -- Log that listeners are set up
  INSERT INTO venue_recommendation_analytics (
    user_id, 
    venue_id, 
    event_type, 
    context_data,
    created_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'system_listeners_setup',
    jsonb_build_object('timestamp', extract(epoch from now())),
    NOW()
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION invalidate_venue_intelligence_cache TO authenticated;
GRANT EXECUTE ON FUNCTION update_crowd_intelligence_cache TO authenticated;
GRANT EXECUTE ON FUNCTION update_social_proof_cache TO authenticated;
GRANT EXECUTE ON FUNCTION setup_venue_intelligence_listeners TO authenticated;