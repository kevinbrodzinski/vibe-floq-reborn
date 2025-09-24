-- Check if generate_daily_afterglow_sql function exists and create sample data for testing
DO $$
BEGIN
  -- Create a simple test function that generates sample afterglow data
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'generate_daily_afterglow_sql'
  ) THEN
    RAISE NOTICE 'generate_daily_afterglow_sql function does not exist, creating basic implementation';
    
    CREATE OR REPLACE FUNCTION public.generate_daily_afterglow_sql(
      p_user_id uuid,
      p_date date
    ) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $function$
    DECLARE
      afterglow_record daily_afterglow%ROWTYPE;
      result jsonb;
    BEGIN
      -- Check if afterglow already exists for this date
      SELECT * INTO afterglow_record
      FROM daily_afterglow
      WHERE user_id = p_user_id AND date = p_date;
      
      IF NOT FOUND THEN
        -- Create sample afterglow data
        INSERT INTO daily_afterglow (
          user_id,
          date,
          energy_score,
          social_intensity,
          total_venues,
          total_floqs,
          crossed_paths_count,
          dominant_vibe,
          summary_text,
          vibe_path,
          emotion_journey,
          moments
        ) VALUES (
          p_user_id,
          p_date,
          75, -- Sample energy score
          60, -- Sample social intensity
          3,  -- Sample venues
          2,  -- Sample floqs
          5,  -- Sample crossed paths
          'social', -- Sample dominant vibe
          'A great day filled with good vibes and meaningful connections',
          ARRAY['chill', 'social', 'excited'], -- Sample vibe path
          '[
            {"timestamp": "' || p_date || 'T18:00:00Z", "vibe": "chill", "intensity": 40},
            {"timestamp": "' || p_date || 'T20:00:00Z", "vibe": "social", "intensity": 70},
            {"timestamp": "' || p_date || 'T22:00:00Z", "vibe": "excited", "intensity": 85}
          ]'::jsonb,
          '[
            "{\\"id\\": \\"sample-1\\", \\"timestamp\\": \\"' || p_date || 'T18:30:00Z\\", \\"title\\": \\"Started the evening\\", \\"description\\": \\"Feeling chill and ready for the night\\", \\"moment_type\\": \\"vibe_change\\", \\"color\\": \\"#4ecdc4\\", \\"metadata\\": {}}",
            "{\\"id\\": \\"sample-2\\", \\"timestamp\\": \\"' || p_date || 'T20:15:00Z\\", \\"title\\": \\"Met up with friends\\", \\"description\\": \\"Great energy with the group\\", \\"moment_type\\": \\"social\\", \\"color\\": \\"#ffeaa7\\", \\"metadata\\": {}}",
            "{\\"id\\": \\"sample-3\\", \\"timestamp\\": \\"' || p_date || 'T22:45:00Z\\", \\"title\\": \\"Peak excitement\\", \\"description\\": \\"The night really came alive\\", \\"moment_type\\": \\"vibe_change\\", \\"color\\": \\"#ff6b6b\\", \\"metadata\\": {}}"
          ]'::jsonb
        ) RETURNING * INTO afterglow_record;
        
        RAISE NOTICE 'Created sample afterglow for user % on date %', p_user_id, p_date;
      ELSE
        RAISE NOTICE 'Afterglow already exists for user % on date %', p_user_id, p_date;
      END IF;
      
      -- Return the afterglow data
      result := jsonb_build_object(
        'success', true,
        'afterglow_id', afterglow_record.id,
        'message', 'Afterglow data ready'
      );
      
      RETURN result;
    END;
    $function$;
    
    -- Grant permissions
    GRANT EXECUTE ON FUNCTION generate_daily_afterglow_sql(uuid, date) TO authenticated, service_role;
  ELSE
    RAISE NOTICE 'generate_daily_afterglow_sql function already exists';
  END IF;
END
$$;