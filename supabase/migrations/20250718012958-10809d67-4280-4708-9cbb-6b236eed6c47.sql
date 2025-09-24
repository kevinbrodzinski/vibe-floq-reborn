/*───────────────────────────────────────────────────────────────*/
/*  People & Location metadata hard-ening for afterglow_moments  */
/*───────────────────────────────────────────────────────────────*/

-- 1.  Document the structure (your original statement, kept as-is)
COMMENT ON COLUMN public.afterglow_moments.metadata IS
$$
Enhanced metadata structure:
{
  "location": {
    "coordinates": [lng, lat],
    "venue_name": "string",
    "venue_id": "uuid",
    "address": "string",
    "distance_from_previous": number (meters)
  },
  "people": {
    "encountered_users": [
      {
        "user_id": "uuid",
        "interaction_strength": number (0-1),
        "shared_duration": number (minutes),
        "interaction_type": "string"
      }
    ],
    "total_people_count": number
  },
  "social_context": {
    "floq_id": "uuid",
    "group_size": number,
    "activity_type": "string"
  },
  "vibe": "string",
  "intensity": number (0-1)
}
$$;

-- 2.  Cheap JSON-schema guard: require the top-level keys we rely on
ALTER TABLE public.afterglow_moments
  ADD CONSTRAINT moments_metadata_keys_chk
  CHECK (
    metadata ? 'location'
    AND metadata ? 'people'
    AND metadata ? 'vibe'
  );

-- 3.  GIN index for fast "people encountered" look-ups
CREATE INDEX IF NOT EXISTS idx_moments_metadata_people
  ON public.afterglow_moments
  USING gin ((metadata -> 'people' -> 'encountered_users'));

-- 4.  Optional: PostGIS point for geo-queries (keeps JSON for raw payload)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'afterglow_moments' AND column_name = 'location_geom'
  ) THEN
    ALTER TABLE public.afterglow_moments
      ADD COLUMN location_geom geometry(Point, 4326);

    -- Populate back-fill for existing rows
    UPDATE public.afterglow_moments
       SET location_geom = ST_SetSRID(
           ST_MakePoint(
             (metadata -> 'location' -> 'coordinates' ->> 0)::double precision,
             (metadata -> 'location' -> 'coordinates' ->> 1)::double precision
           ),
           4326
         )
     WHERE metadata -> 'location' -> 'coordinates' IS NOT NULL;

    -- Spatial index
    CREATE INDEX idx_moments_location_geom
      ON public.afterglow_moments USING gist (location_geom);
  END IF;
END$$;