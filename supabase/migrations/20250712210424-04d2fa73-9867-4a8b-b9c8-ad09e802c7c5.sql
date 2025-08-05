-- Enable uuid-ossp extension for demo mode UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing functions with old signatures
DROP FUNCTION IF EXISTS public.join_floq(uuid, uuid);
DROP FUNCTION IF EXISTS public.leave_floq(uuid, uuid);
DROP FUNCTION IF EXISTS public.find_or_create_dm(uuid, uuid);

-- Create join_floq with demo support and race-safe capacity checking
CREATE OR REPLACE FUNCTION public.join_floq(
  p_floq_id uuid, 
  p_user_id uuid DEFAULT NULL, 
  p_use_demo boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_floq record;
  v_participants int;
  v_user_id uuid;
  schema_name text;
BEGIN
  -- Set schema and user ID
  schema_name := CASE WHEN p_use_demo THEN 'demo' ELSE 'public' END;
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- Validate inputs
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Prevent demo IDs in production and vice versa
  IF NOT p_use_demo AND p_floq_id::text LIKE 'demo-%' THEN
    RAISE EXCEPTION 'Demo floq ID not allowed in production mode';
  END IF;
  
  IF p_use_demo AND p_floq_id::text NOT LIKE 'demo-%' THEN
    RAISE EXCEPTION 'Production floq ID not allowed in demo mode';
  END IF;

  -- Lock the floq row to prevent race conditions
  EXECUTE format('SELECT * FROM %I.floqs WHERE id = $1 FOR UPDATE', schema_name)
  INTO v_floq
  USING p_floq_id;

  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Floq not found'; 
  END IF;
  
  IF v_floq.ends_at <= now() THEN 
    RAISE EXCEPTION 'Floq has expired'; 
  END IF;

  -- Check current participant count before inserting
  EXECUTE format('SELECT COUNT(*) FROM %I.floq_participants WHERE floq_id = $1', schema_name)
  INTO v_participants
  USING p_floq_id;
  
  -- Enforce capacity before insert
  IF v_floq.max_participants IS NOT NULL AND v_participants >= v_floq.max_participants THEN
    RAISE EXCEPTION 'Floq is full (capacity: %)', v_floq.max_participants;
  END IF;

  -- Race-safe insert
  EXECUTE format(
    'INSERT INTO %I.floq_participants (floq_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT (floq_id, user_id) DO NOTHING',
    schema_name
  ) USING p_floq_id, v_user_id, 'member';

  -- Get final participant count
  EXECUTE format('SELECT COUNT(*) FROM %I.floq_participants WHERE floq_id = $1', schema_name)
  INTO v_participants
  USING p_floq_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'participant_count', v_participants,
    'floq_id', p_floq_id,
    'user_id', v_user_id
  );
END;
$$;

-- Create leave_floq with demo support
CREATE OR REPLACE FUNCTION public.leave_floq(
  p_floq_id uuid, 
  p_user_id uuid DEFAULT NULL, 
  p_use_demo boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_participants int;
  v_user_id uuid;
  v_deleted_count int;
  schema_name text;
BEGIN
  -- Set schema and user ID
  schema_name := CASE WHEN p_use_demo THEN 'demo' ELSE 'public' END;
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- Validate inputs
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Prevent demo IDs in production and vice versa
  IF NOT p_use_demo AND p_floq_id::text LIKE 'demo-%' THEN
    RAISE EXCEPTION 'Demo floq ID not allowed in production mode';
  END IF;
  
  IF p_use_demo AND p_floq_id::text NOT LIKE 'demo-%' THEN
    RAISE EXCEPTION 'Production floq ID not allowed in demo mode';
  END IF;

  -- Check if floq exists
  EXECUTE format('SELECT 1 FROM %I.floqs WHERE id = $1', schema_name)
  USING p_floq_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Floq not found';
  END IF;

  -- Remove participant
  EXECUTE format('DELETE FROM %I.floq_participants WHERE floq_id = $1 AND user_id = $2', schema_name)
  USING p_floq_id, v_user_id;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count = 0 THEN
    RAISE EXCEPTION 'User was not a participant in this floq';
  END IF;

  -- Get updated participant count
  EXECUTE format('SELECT COUNT(*) FROM %I.floq_participants WHERE floq_id = $1', schema_name)
  INTO v_participants
  USING p_floq_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'participant_count', v_participants,
    'floq_id', p_floq_id,
    'user_id', v_user_id
  );
END;
$$;

-- Create find_or_create_dm with demo support (returns deterministic fake ID for demo mode)
CREATE OR REPLACE FUNCTION public.find_or_create_dm(
  a uuid, 
  b uuid, 
  p_use_demo boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  thread_id uuid;
BEGIN
  -- Prevent demo IDs in production and vice versa
  IF NOT p_use_demo AND (a::text LIKE 'demo-%' OR b::text LIKE 'demo-%') THEN
    RAISE EXCEPTION 'Demo user ID not allowed in production mode';
  END IF;
  
  IF p_use_demo AND (a::text NOT LIKE 'demo-%' OR b::text NOT LIKE 'demo-%') THEN
    RAISE EXCEPTION 'Production user ID not allowed in demo mode';
  END IF;

  -- Demo mode: return deterministic fake thread ID
  IF p_use_demo THEN
    RETURN uuid_generate_v5(
      uuid_ns_url(), 
      LEAST(a::text, b::text) || '_' || GREATEST(a::text, b::text)
    );
  END IF;

  -- Production mode: find or create real thread
  SELECT id INTO thread_id
  FROM public.direct_threads 
  WHERE (member_a = a AND member_b = b) OR (member_a = b AND member_b = a);

  IF thread_id IS NULL THEN
    INSERT INTO public.direct_threads (member_a, member_b) 
    VALUES (LEAST(a, b), GREATEST(a, b)) 
    RETURNING id INTO thread_id;
  END IF;

  RETURN thread_id;
END;
$$;

-- Enable RLS on existing demo schema tables
ALTER TABLE demo.floqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo.floq_participants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for demo tables
CREATE POLICY "demo_floqs_public_read" ON demo.floqs FOR SELECT USING (true);
CREATE POLICY "demo_floq_participants_public_read" ON demo.floq_participants FOR SELECT USING (true);

-- Grant permissions for demo mode access
GRANT SELECT ON demo.floqs TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON demo.floq_participants TO anon, authenticated;