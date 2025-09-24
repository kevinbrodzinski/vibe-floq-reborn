-- Update user_credential table to rename user_id to profile_id
-- This is part of the user_id -> profile_id migration

BEGIN;

-- First, drop dependent objects
DROP POLICY IF EXISTS "owner" ON integrations.user_credential;

-- Rename the column
ALTER TABLE integrations.user_credential RENAME COLUMN user_id TO profile_id;

-- Update the unique constraint
ALTER TABLE integrations.user_credential DROP CONSTRAINT IF EXISTS user_credential_user_id_provider_id_key;
ALTER TABLE integrations.user_credential ADD CONSTRAINT user_credential_profile_id_provider_id_key 
  UNIQUE (profile_id, provider_id);

-- Recreate the RLS policy with the new column name
CREATE POLICY "owner" ON integrations.user_credential
  USING (profile_id = auth.uid());

-- Update the normalise_place_feed function to use profile_id
CREATE OR REPLACE FUNCTION integrations.normalise_place_feed()
RETURNS INT 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE 
  ins INT;
BEGIN
  WITH batch AS (
    SELECT id, profile_id, provider_id, payload
    FROM integrations.place_feed_raw
    WHERE processed_at IS NULL
    LIMIT 200
  ), parsed AS (
    SELECT id, profile_id,
           jsonb_array_elements(
             CASE provider_id
               WHEN 1 THEN payload->'results'    -- Google
               WHEN 2 THEN payload->'results'    -- Foursquare
             END
           ) AS item
    FROM batch
  ), up AS (
    INSERT INTO public.venue_visits(profile_id, venue_id, arrived_at, distance_m)
    SELECT p.profile_id,
           v.id,
           now(),
           25
    FROM   parsed p
    JOIN   public.venues v
       ON  v.external_id = COALESCE(p.item->>'place_id', p.item->>'fsq_id')
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  UPDATE integrations.place_feed_raw
     SET processed_at = now()
   WHERE id IN (SELECT id FROM batch);

  GET DIAGNOSTICS ins = ROW_COUNT;
  RETURN ins;
END $$;

COMMIT; 