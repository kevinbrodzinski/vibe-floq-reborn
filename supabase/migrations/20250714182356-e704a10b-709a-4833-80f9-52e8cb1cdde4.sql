-- Complete unread count backend engine implementation
-- Creates table, indexes, functions, views, and bootstrap data

-- Phase 1: Create the user activity tracking table
CREATE TABLE IF NOT EXISTS public.user_floq_activity_tracking (
  user_id uuid NOT NULL,
  floq_id uuid NOT NULL,
  last_chat_viewed_at timestamptz NOT NULL DEFAULT '1970-01-01'::timestamptz,
  last_activity_viewed_at timestamptz NOT NULL DEFAULT '1970-01-01'::timestamptz,
  last_plans_viewed_at timestamptz NOT NULL DEFAULT '1970-01-01'::timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, floq_id)
);

-- Add FK constraints
ALTER TABLE public.user_floq_activity_tracking
  ADD CONSTRAINT fk_tracking_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_tracking_floq FOREIGN KEY (floq_id) REFERENCES public.floqs(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.user_floq_activity_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own activity tracking"
  ON public.user_floq_activity_tracking
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Phase 2: Create helper functions
CREATE OR REPLACE FUNCTION _tracking_touch_updated_at()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION _tracking_set_created_at()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.created_at := COALESCE(NEW.created_at, now());
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER tracking_touch_updated_at
BEFORE UPDATE ON public.user_floq_activity_tracking
FOR EACH ROW EXECUTE FUNCTION _tracking_touch_updated_at();

CREATE TRIGGER tracking_set_created_at
BEFORE INSERT ON public.user_floq_activity_tracking
FOR EACH ROW EXECUTE FUNCTION _tracking_set_created_at();

-- Phase 3: Create the activity tracking function
CREATE OR REPLACE FUNCTION public.update_user_activity_tracking(
  p_floq_id uuid,
  p_section text DEFAULT 'all'
) RETURNS void
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
BEGIN
  INSERT INTO public.user_floq_activity_tracking (user_id, floq_id)
  VALUES (auth.uid(), p_floq_id)
  ON CONFLICT (user_id, floq_id) DO UPDATE
  SET last_chat_viewed_at = 
        CASE WHEN p_section IN ('all','chat') THEN now()
             ELSE EXCLUDED.last_chat_viewed_at END,
      last_activity_viewed_at = 
        CASE WHEN p_section IN ('all','activity') THEN now()
             ELSE EXCLUDED.last_activity_viewed_at END,
      last_plans_viewed_at = 
        CASE WHEN p_section IN ('all','plans') THEN now()
             ELSE EXCLUDED.last_plans_viewed_at END,
      updated_at = now();
  
  RETURN;
END;
$$;

-- Phase 4: Create the unread counts view
CREATE OR REPLACE VIEW public.user_floq_unread_counts
WITH (security_invoker = true)
AS
WITH count_data AS (
  SELECT 
    fp.user_id,
    fp.floq_id,
    COALESCE(
      (SELECT COUNT(*)::integer 
       FROM public.floq_messages fm 
       WHERE fm.floq_id = fp.floq_id 
         AND fm.sender_id != fp.user_id
         AND fm.created_at > COALESCE(uat.last_chat_viewed_at, COALESCE(fp.joined_at, '1970-01-01'::timestamptz))
      ), 0
    ) AS chat_ct,
    
    COALESCE(
      (SELECT COUNT(*)::integer 
       FROM public.flock_history fh 
       WHERE fh.floq_id = fp.floq_id 
         AND fh.user_id != fp.user_id
         AND fh.created_at > COALESCE(uat.last_activity_viewed_at, COALESCE(fp.joined_at, '1970-01-01'::timestamptz))
      ), 0
    ) AS act_ct,
    
    COALESCE(
      (SELECT COUNT(*)::integer 
       FROM public.floq_plans fpl 
       WHERE fpl.floq_id = fp.floq_id 
         AND fpl.creator_id != fp.user_id
         AND GREATEST(fpl.created_at, COALESCE(fpl.updated_at, fpl.created_at)) > COALESCE(uat.last_plans_viewed_at, COALESCE(fp.joined_at, '1970-01-01'::timestamptz))
      ), 0
    ) AS plan_ct
  
  FROM public.floq_participants fp
  LEFT JOIN public.user_floq_activity_tracking uat 
    ON uat.user_id = fp.user_id AND uat.floq_id = fp.floq_id
  WHERE fp.user_id = auth.uid()
)
SELECT 
  user_id,
  floq_id,
  chat_ct AS unread_chat,
  act_ct AS unread_activity,
  plan_ct AS unread_plans,
  (chat_ct + act_ct + plan_ct) AS unread_total
FROM count_data;

-- Phase 5: Create optimized indexes
CREATE INDEX idx_floq_messages_unread_tracking 
  ON public.floq_messages (floq_id, created_at DESC) 
  INCLUDE (sender_id)
  WHERE created_at > (CURRENT_DATE - INTERVAL '90 days');

CREATE INDEX idx_flock_history_unread_tracking 
  ON public.flock_history (floq_id, created_at DESC) 
  INCLUDE (user_id)
  WHERE created_at > (CURRENT_DATE - INTERVAL '90 days');

CREATE INDEX idx_floq_plans_unread_tracking 
  ON public.floq_plans (floq_id, created_at DESC) 
  INCLUDE (creator_id)
  WHERE created_at > (CURRENT_DATE - INTERVAL '90 days');

-- Phase 6: Grant permissions
GRANT SELECT ON public.user_floq_unread_counts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_floq_activity_tracking TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_activity_tracking(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.update_user_activity_tracking(uuid, text) FROM PUBLIC;

-- Phase 7: Bootstrap existing data
CREATE OR REPLACE FUNCTION _bootstrap_tracking_data()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $bootstrap$
DECLARE
  batch_size INTEGER := 1000;
  processed INTEGER := 0;
  total_count INTEGER;
  processed_sum INTEGER := 0;
BEGIN
  -- Get total count for logging
  SELECT COUNT(*) INTO total_count
  FROM public.floq_participants fp
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_floq_activity_tracking uat
    WHERE uat.user_id = fp.user_id AND uat.floq_id = fp.floq_id
  );
  
  RAISE NOTICE 'Initializing tracking for % existing participants', total_count;
  
  -- Process in batches to avoid long locks
  LOOP
    WITH batch AS (
      SELECT fp.user_id, fp.floq_id, COALESCE(fp.joined_at, '1970-01-01'::timestamptz) as joined_at
      FROM public.floq_participants fp
      WHERE NOT EXISTS (
        SELECT 1 FROM public.user_floq_activity_tracking uat
        WHERE uat.user_id = fp.user_id AND uat.floq_id = fp.floq_id
      )
      LIMIT batch_size
    )
    INSERT INTO public.user_floq_activity_tracking (
      user_id, 
      floq_id, 
      last_chat_viewed_at,
      last_activity_viewed_at, 
      last_plans_viewed_at
    )
    SELECT 
      user_id, 
      floq_id, 
      joined_at,
      joined_at,
      joined_at
    FROM batch;
    
    GET DIAGNOSTICS processed = ROW_COUNT;
    processed_sum := processed_sum + processed;
    
    IF processed = 0 THEN
      EXIT;
    END IF;
    
    RAISE NOTICE 'Processed % rows (% total, % remaining)', processed, processed_sum, total_count - processed_sum;
    
    -- Small delay to prevent overwhelming the system
    PERFORM pg_sleep(0.1);
  END LOOP;
  
  RAISE NOTICE 'Bootstrap initialization completed: % total rows processed', processed_sum;
END;
$bootstrap$;

-- Execute bootstrap
SELECT _bootstrap_tracking_data();

-- Clean up
DROP FUNCTION _bootstrap_tracking_data();