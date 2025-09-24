-- 20A: populate_field_tiles that sets tile_id deterministically
CREATE OR REPLACE FUNCTION public.populate_field_tiles() RETURNS void
LANGUAGE plpgsql AS $$
DECLARE tile_id_type text;
BEGIN
  SELECT data_type INTO tile_id_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='field_tiles' AND column_name='tile_id';

  IF tile_id_type IS NULL THEN
    RAISE EXCEPTION 'field_tiles.tile_id column is required';
  END IF;

  WITH venue_agg AS (
    SELECT ST_GeoHash(v.geom::geometry, 6) AS geohash6,
           COUNT(*)::int                   AS venue_cnt
    FROM public.venues v
    WHERE v.geom IS NOT NULL
    GROUP BY 1
  ),
  presence_agg AS (
    SELECT p.geohash6,
           COUNT(DISTINCT p.profile_id)::int AS presence_cnt
    FROM public.presence p
    WHERE p.updated_at >= now() - interval '30 minutes'
      AND p.geohash6 IS NOT NULL
    GROUP BY p.geohash6
  ),
  keys AS (
    SELECT geohash6 FROM venue_agg
    UNION
    SELECT geohash6 FROM presence_agg
  )
  INSERT INTO public.field_tiles (tile_id, geohash6, centroid, venue_cnt, presence_cnt, updated_at)
  SELECT
    CASE
      WHEN tile_id_type IN ('text','character varying') THEN k.geohash6::text
      WHEN tile_id_type = 'uuid' THEN gen_random_uuid()
      ELSE k.geohash6::text
    END AS tile_id,
    k.geohash6,
    ST_Centroid(ST_GeomFromGeoHash(k.geohash6, 6))::geography AS centroid,
    COALESCE(v.venue_cnt, 0),
    COALESCE(p.presence_cnt, 0),
    now()
  FROM keys k
  LEFT JOIN venue_agg    v USING (geohash6)
  LEFT JOIN presence_agg p USING (geohash6)
  ON CONFLICT (geohash6) DO UPDATE
    SET centroid     = EXCLUDED.centroid,
        venue_cnt    = EXCLUDED.venue_cnt,
        presence_cnt = EXCLUDED.presence_cnt,
        updated_at   = now();
END$$;

-- 20B: cleanup helper (already present as job name, here for completeness)
CREATE OR REPLACE FUNCTION public.cleanup_field_tiles() RETURNS void
LANGUAGE sql AS $$
DELETE FROM public.field_tiles WHERE updated_at < now() - interval '2 days';
$$;