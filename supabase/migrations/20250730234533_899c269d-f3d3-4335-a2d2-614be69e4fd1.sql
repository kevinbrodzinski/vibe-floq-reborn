-- Fix set_user_vibe constraint error by adding unique constraint on profile_id

-- First, clean up any potential duplicate records (keeping the most recent)
WITH duplicates AS (
  SELECT profile_id, 
         ROW_NUMBER() OVER (PARTITION BY profile_id ORDER BY started_at DESC) as rn
  FROM user_vibe_states
)
DELETE FROM user_vibe_states 
WHERE (profile_id, started_at) IN (
  SELECT uvs.profile_id, uvs.started_at
  FROM user_vibe_states uvs
  JOIN duplicates d ON uvs.profile_id = d.profile_id
  WHERE d.rn > 1
);

-- Add unique constraint on profile_id to support ON CONFLICT clause
ALTER TABLE public.user_vibe_states 
ADD CONSTRAINT user_vibe_states_profile_id_unique UNIQUE (profile_id);

-- Also make profile_id NOT NULL since it's required for the constraint and business logic
ALTER TABLE public.user_vibe_states 
ALTER COLUMN profile_id SET NOT NULL;