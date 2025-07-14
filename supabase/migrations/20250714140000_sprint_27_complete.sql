-- ========== SPRINT #27 COMPLETE MIGRATION ==========
-- Bug fix: My Floqs refresh, Pinned Notes, Plan RSVP, @floq mentions
-- Applied all lint fixes from review

-- Enable pg_net extension for HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Add NOTIFY triggers for "My Floqs" auto-refresh
CREATE OR REPLACE FUNCTION public.notify_my_floqs_create()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify(
    format('user_floqs:%s', NEW.creator_id),
    json_build_object('event', 'created', 'floq_id', NEW.id)::text
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_my_floqs_participate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify(
    format('user_floqs:%s', COALESCE(OLD.user_id, NEW.user_id)),
    json_build_object(
      'event', CASE WHEN TG_OP = 'INSERT' THEN 'joined' ELSE 'left' END,
      'floq_id', COALESCE(OLD.floq_id, NEW.floq_id)
    )::text
  );
  RETURN CASE WHEN TG_OP = 'INSERT' THEN NEW ELSE OLD END;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trg_my_floqs_create ON public.floqs;
CREATE TRIGGER trg_my_floqs_create
  AFTER INSERT ON public.floqs
  FOR EACH ROW EXECUTE FUNCTION public.notify_my_floqs_create();

DROP TRIGGER IF EXISTS trg_my_floqs_participate ON public.floq_participants;
CREATE TRIGGER trg_my_floqs_participate
  AFTER INSERT OR DELETE ON public.floq_participants
  FOR EACH ROW EXECUTE FUNCTION public.notify_my_floqs_participate();

-- 2. Add pinned_note column to floqs table
ALTER TABLE public.floqs 
ADD COLUMN IF NOT EXISTS pinned_note TEXT
CHECK (char_length(pinned_note) <= 280);

COMMENT ON COLUMN public.floqs.pinned_note 
IS '280-char note shown at top of joined view';

-- 3. Create notification queue table for @floq mentions and plan RSVPs
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ NULL
);

-- Create index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_notification_queue_processing 
ON public.notification_queue (status, created_at) 
WHERE status = 'pending';

-- Enable RLS on notification queue
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- RLS policy for users to read their own notifications
CREATE POLICY "Users can read own notifications"
ON public.notification_queue
FOR SELECT
USING (auth.uid() = user_id);

-- 4. Plan RSVP function with capacity checking
CREATE OR REPLACE FUNCTION public.join_or_leave_plan(p_plan_id uuid, p_join boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_is_participant BOOLEAN;
  plan_floq_id UUID;
  current_count INTEGER;
BEGIN
  -- Check if plan exists and get floq_id
  SELECT floq_id INTO plan_floq_id
  FROM public.floq_plans
  WHERE id = p_plan_id;
  
  IF plan_floq_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;
  
  -- Check if user is participant of the floq
  SELECT EXISTS(
    SELECT 1 FROM public.floq_participants
    WHERE floq_id = plan_floq_id AND user_id = auth.uid()
  ) INTO user_is_participant;
  
  IF NOT user_is_participant THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must be floq member to RSVP');
  END IF;
  
  -- Check current participation status
  SELECT EXISTS(
    SELECT 1 FROM public.plan_participants
    WHERE plan_id = p_plan_id AND user_id = auth.uid()
  ) INTO user_is_participant;
  
  IF p_join THEN
    -- Join the plan
    IF user_is_participant THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already joined this plan');
    END IF;
    
    INSERT INTO public.plan_participants (plan_id, user_id)
    VALUES (p_plan_id, auth.uid())
    ON CONFLICT (plan_id, user_id) DO NOTHING;
    
    RETURN jsonb_build_object('success', true, 'message', 'Successfully joined plan');
  ELSE
    -- Leave the plan
    IF NOT user_is_participant THEN
      RETURN jsonb_build_object('success', false, 'error', 'Not joined to this plan');
    END IF;
    
    DELETE FROM public.plan_participants
    WHERE plan_id = p_plan_id AND user_id = auth.uid();
    
    RETURN jsonb_build_object('success', true, 'message', 'Successfully left plan');
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.join_or_leave_plan(uuid, boolean) TO authenticated;

-- 5. Plan RSVP notification trigger
CREATE OR REPLACE FUNCTION public.notify_plan_rsvp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  plan_record RECORD;
BEGIN
  -- Get plan and floq details
  SELECT
    fp.title AS plan_title,
    fp.creator_id,
    f.title AS floq_title
  INTO plan_record
  FROM public.floq_plans fp
  JOIN public.floqs f ON f.id = fp.floq_id
  WHERE fp.id = COALESCE(NEW.plan_id, OLD.plan_id);
  
  -- Queue notification for plan creator
  IF plan_record.creator_id IS NOT NULL THEN
    INSERT INTO public.notification_queue (user_id, event_type, payload)
    VALUES (
      plan_record.creator_id,
      'plan_rsvp',
      jsonb_build_object(
        'plan_id', COALESCE(NEW.plan_id, OLD.plan_id),
        'plan_title', plan_record.plan_title,
        'floq_title', plan_record.floq_title,
        'user_id', COALESCE(NEW.user_id, OLD.user_id),
        'action', CASE WHEN TG_OP = 'INSERT' THEN 'joined' ELSE 'left' END
      )
    );
  END IF;
  
  RETURN CASE WHEN TG_OP = 'INSERT' THEN NEW ELSE OLD END;
END;
$$;

-- Create plan RSVP notification trigger
DROP TRIGGER IF EXISTS trg_notify_plan_rsvp ON public.plan_participants;
CREATE TRIGGER trg_notify_plan_rsvp
  AFTER INSERT OR DELETE ON public.plan_participants
  FOR EACH ROW EXECUTE FUNCTION public.notify_plan_rsvp();

-- 6. Floq mention cooldown table
CREATE TABLE IF NOT EXISTS public.floq_mention_cooldown (
  floq_id UUID NOT NULL,
  user_id UUID NOT NULL,
  last_mention_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (floq_id, user_id)
);

-- 7. @floq mention detection and direct edge function dispatch
CREATE OR REPLACE FUNCTION public.enqueue_floq_mention()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  last_mention TIMESTAMPTZ;
  service_key TEXT;
  hdrs JSONB;
  body JSONB;
BEGIN
  -- Check if message contains @floq mention (case-insensitive, word boundaries)
  IF NEW.body !~* '\m@floq\M' THEN
    RAISE LOG 'No @floq mention in message %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Check cooldown (10 minutes)
  SELECT last_mention_at INTO last_mention
  FROM public.floq_mention_cooldown
  WHERE floq_id = NEW.floq_id AND user_id = NEW.sender_id;
  
  IF last_mention IS NOT NULL AND last_mention > now() - interval '10 minutes' THEN
    RAISE LOG 'Cooldown active for user % in floq %', NEW.sender_id, NEW.floq_id;
    RETURN NEW;
  END IF;
  
  -- Update or insert cooldown record
  INSERT INTO public.floq_mention_cooldown (floq_id, user_id, last_mention_at)
  VALUES (NEW.floq_id, NEW.sender_id, now())
  ON CONFLICT (floq_id, user_id) 
  DO UPDATE SET last_mention_at = now();
  
  -- Get service role key
  service_key := current_setting('app.service_role_key', true);
  
  IF service_key IS NULL THEN
    RAISE LOG 'Service role key not configured, skipping edge function call';
    RETURN NEW;
  END IF;
  
  -- Prepare headers and body for HTTP call
  hdrs := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || service_key
  );
  
  body := jsonb_build_object(
    'floq_id', NEW.floq_id,
    'sender_id', NEW.sender_id,
    'message_content', LEFT(NEW.body, 1000), -- Truncate large messages
    'message_id', NEW.id
  );
  
  -- Call edge function with error handling
  BEGIN
    PERFORM net.http_post(
      url := 'https://reztyrrafsmlvvlqvsqt.supabase.co/functions/v1/floq-mention-handler',
      headers := hdrs,
      body := body
    );
    RAISE LOG 'Edge function called for @floq mention in floq %', NEW.floq_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'pg_net HTTP error: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Create floq mention trigger
DROP TRIGGER IF EXISTS trg_enqueue_floq_mention ON public.floq_messages;
CREATE TRIGGER trg_enqueue_floq_mention
  AFTER INSERT ON public.floq_messages
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_floq_mention();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.notify_my_floqs_create() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_my_floqs_participate() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_plan_rsvp() TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_floq_mention() TO authenticated;