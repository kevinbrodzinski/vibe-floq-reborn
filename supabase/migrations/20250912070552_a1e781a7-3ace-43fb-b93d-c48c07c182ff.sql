-- Fix rally_last_seen schema (corrected approach)

-- Add new columns first
ALTER TABLE rally_last_seen 
  ADD COLUMN IF NOT EXISTS thread_id uuid;

ALTER TABLE rally_last_seen 
  ADD COLUMN IF NOT EXISTS last_seen timestamptz;

-- Populate thread_id from rally_id via rally_threads
UPDATE rally_last_seen rls
SET thread_id = rt.id
FROM rally_threads rt
WHERE rt.rally_id = rls.rally_id
  AND rls.thread_id IS NULL;

-- Populate last_seen from last_seen_at
UPDATE rally_last_seen 
SET last_seen = last_seen_at
WHERE last_seen IS NULL;

-- Drop old primary key constraint
ALTER TABLE rally_last_seen DROP CONSTRAINT IF EXISTS rally_last_seen_pkey;

-- Add new primary key on (profile_id, thread_id)
ALTER TABLE rally_last_seen 
  ADD CONSTRAINT rally_last_seen_pkey PRIMARY KEY (profile_id, thread_id);

-- Create the fixed functions
CREATE OR REPLACE FUNCTION rally_mark_seen(_thread_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER 
SET search_path TO 'public'
AS $$
  INSERT INTO rally_last_seen (profile_id, thread_id, last_seen)
  VALUES (auth.uid(), _thread_id, now())
  ON CONFLICT (profile_id, thread_id)
  DO UPDATE SET last_seen = EXCLUDED.last_seen;
$$;

CREATE OR REPLACE FUNCTION rally_mark_all_seen()
RETURNS void LANGUAGE sql SECURITY DEFINER 
SET search_path TO 'public'
AS $$
  INSERT INTO rally_last_seen (profile_id, thread_id, last_seen)
  SELECT auth.uid(), t.id, now()
  FROM rally_threads t
  JOIN rally_invites i ON i.rally_id = t.rally_id
  WHERE i.to_profile = auth.uid()
  ON CONFLICT (profile_id, thread_id)
  DO UPDATE SET last_seen = EXCLUDED.last_seen;
$$;