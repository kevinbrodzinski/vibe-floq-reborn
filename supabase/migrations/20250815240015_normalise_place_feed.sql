-- 15A: public version (jsonpath cast + explode)
CREATE OR REPLACE FUNCTION public.normalise_place_feed()
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE inserted int := 0;
BEGIN
  WITH to_process AS (
    SELECT id, profile_id, provider_id, payload
    FROM integrations.place_feed_raw
    WHERE processed_at IS NULL
    ORDER BY fetched_at
    FOR UPDATE SKIP LOCKED
    LIMIT 200
  ),
  batch AS (
    UPDATE integrations.place_feed_raw r
       SET processed_at = now()
      FROM to_process t
     WHERE r.id = t.id
    RETURNING t.id, t.profile_id, t.provider_id, t.payload
  ),
  unraveled AS (
    SELECT
      b.id,
      b.profile_id,
      b.provider_id,
      it.item
    FROM batch b
    CROSS JOIN LATERAL jsonb_path_query(
      b.payload,
      CASE b.provider_id
        WHEN 1 THEN '$.results[*]'::jsonpath
        WHEN 2 THEN '$.results[*]'::jsonpath
        ELSE '$.results[*]'::jsonpath
      END
    ) AS it(item)
  ),
  venues AS (
    INSERT INTO public.venues
            (provider, provider_id, name, lat, lng, geom, categories, source)
    SELECT
      CASE u.provider_id WHEN 1 THEN 'google' ELSE 'foursquare' END,
      COALESCE(u.item->>'place_id', u.item->>'fsq_id'),
      COALESCE(u.item->>'name', u.item->>'name'),
      CASE u.provider_id
        WHEN 1 THEN (u.item#>>'{geometry,location,lat}')::float
        ELSE       (u.item#>>'{geocodes,main,latitude}')::float
      END,
      CASE u.provider_id
        WHEN 1 THEN (u.item#>>'{geometry,location,lng}')::float
        ELSE       (u.item#>>'{geocodes,main,longitude}')::float
      END,
      ST_SetSRID(ST_MakePoint(
        CASE u.provider_id
          WHEN 1 THEN (u.item#>>'{geometry,location,lng}')::float
          ELSE       (u.item#>>'{geocodes,main,longitude}')::float
        END,
        CASE u.provider_id
          WHEN 1 THEN (u.item#>>'{geometry,location,lat}')::float
          ELSE       (u.item#>>'{geocodes,main,latitude}')::float
        END
      ), 4326)::geography,
      CASE u.provider_id
        WHEN 1 THEN ARRAY(SELECT jsonb_array_elements_text(u.item->'types'))
        ELSE       ARRAY(SELECT jsonb_array_elements(u.item->'categories')->>'name')
      END,
      'import'
    FROM unraveled u
    WHERE COALESCE(u.item->>'place_id', u.item->>'fsq_id') IS NOT NULL
    ON CONFLICT (provider, provider_id) DO UPDATE
      SET name       = EXCLUDED.name,
          categories = EXCLUDED.categories
    RETURNING provider, provider_id, id
  ),
  visits AS (
    INSERT INTO public.venue_visits (profile_id, venue_id, arrived_at, distance_m)
    SELECT u.profile_id, v.id, now(), 25
    FROM unraveled u
    JOIN venues v
      ON v.provider    = CASE u.provider_id WHEN 1 THEN 'google' ELSE 'foursquare' END
     AND v.provider_id = COALESCE(u.item->>'place_id', u.item->>'fsq_id')
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted FROM visits;

  RETURN COALESCE(inserted, 0);
END;
$function$;

-- 15B: integrations version (security definer + same fix)
CREATE OR REPLACE FUNCTION integrations.normalise_place_feed()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'integrations','public'
AS $function$
DECLARE inserted int := 0;
BEGIN
  WITH to_process AS (
    SELECT id, profile_id, provider_id, payload
    FROM integrations.place_feed_raw
    WHERE processed_at IS NULL
    ORDER BY fetched_at
    LIMIT 200
  ),
  batch AS (
    UPDATE integrations.place_feed_raw
       SET processed_at = now()
     WHERE id IN (SELECT id FROM to_process)
     RETURNING id, profile_id, provider_id, payload
  ),
  unraveled AS (
    SELECT id, profile_id, provider_id,
           jsonb_path_query_first(
             payload,
             CASE provider_id
               WHEN 1 THEN '$.results[*]'::jsonpath
               WHEN 2 THEN '$.results[*]'::jsonpath
             END
           ) AS item
    FROM batch
  ),
  venues AS (
    INSERT INTO public.venues
            (provider, provider_id, name, lat, lng, geom, categories, source)
    SELECT CASE provider_id WHEN 1 THEN 'google' ELSE 'foursquare' END,
           COALESCE(item->>'place_id', item->>'fsq_id'),
           COALESCE(item->>'name',     item->>'name'),
           CASE provider_id WHEN 1 THEN (item#>>'{geometry,location,lat}')::float
                            ELSE (item#>>'{geocodes,main,latitude}')::float END,
           CASE provider_id WHEN 1 THEN (item#>>'{geometry,location,lng}')::float
                            ELSE (item#>>'{geocodes,main,longitude}')::float END,
           ST_SetSRID(
             ST_MakePoint(
               CASE provider_id WHEN 1 THEN (item#>>'{geometry,location,lng}')::float
                                ELSE (item#>>'{geocodes,main,longitude}')::float END,
               CASE provider_id WHEN 1 THEN (item#>>'{geometry,location,lat}')::float
                                ELSE (item#>>'{geocodes,main,latitude}')::float END
             ), 4326
           ),
           CASE provider_id
             WHEN 1 THEN ARRAY(SELECT jsonb_array_elements_text(item->'types'))
             ELSE ARRAY(SELECT jsonb_array_elements(item->'categories')->>'name')
           END,
           'import'
    FROM unraveled
    WHERE COALESCE(item->>'place_id', item->>'fsq_id') IS NOT NULL
    ON CONFLICT (provider, provider_id) DO UPDATE
      SET name       = EXCLUDED.name,
          categories = EXCLUDED.categories
    RETURNING provider, provider_id, id
  ),
  visits AS (
    INSERT INTO public.venue_visits (profile_id, venue_id, arrived_at, distance_m)
    SELECT u.profile_id, v.id, now(), 25
    FROM unraveled u
    JOIN venues     v USING (provider, provider_id)
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted FROM visits;

  RETURN inserted;
END;
$function$;

-- 15C: cron 48 already points to integrations.normalise_place_feed(); re-affirm
SELECT cron.alter_job(
  48,
  command => ' SELECT integrations.normalise_place_feed(); '
);