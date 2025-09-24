-- ──────────────────────────────────────────────────────────────
-- 0.  Extensions (already present, but keep for idempotency)
-- ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS postgis;

-- ──────────────────────────────────────────────────────────────
-- 1.  TEXT SEARCH INDEXES (trigram)
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm
  ON public.profiles USING gin ((lower(display_name)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_venues_name_trgm
  ON public.venues   USING gin ((lower(name))        gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_floqs_title_trgm
  ON public.floqs    USING gin ((lower(title))       gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_event_areas_name_trgm
  ON public.event_areas USING gin ((lower(name))     gin_trgm_ops);

-- ──────────────────────────────────────────────────────────────
-- 2.  SEARCH RPC
--     • 5 users + 5 venues + 5 floqs + 5 events  (20 rows max)
--     • Similarity DESC first, then distance (venues) or recency (floqs)
-- ──────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.search_everything(text, int);

CREATE FUNCTION public.search_everything(
  query text,
  limit_count int DEFAULT 20          -- hard cap
)
RETURNS TABLE(
  kind          text,                 -- 'user' | 'venue' | 'floq' | 'event'
  id            uuid,
  label         text,                 -- display string
  sublabel      text,                 -- optional (e.g. vibe, username)
  similarity    real,                 -- trigram similarity score
  distance_m    int,                  -- only for venues (else 0)
  starts_at     timestamptz           -- only for floqs/events (else null)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  trimmed   AS (SELECT lower(trim(query)) AS q WHERE length(trim(query)) >= 2),
  -------------------------------------------------------------
  user_hits AS (
    SELECT 'user'      AS kind,
           p.id,
           p.display_name      AS label,
           null                AS sublabel,
           similarity(lower(p.display_name), t.q) AS similarity,
           0                   AS distance_m,
           null::timestamptz   AS starts_at
    FROM trimmed t, profiles p
    WHERE lower(p.display_name) % t.q
    ORDER BY similarity DESC
    LIMIT 5
  ),

  -------------------------------------------------------------
  venue_hits AS (
    SELECT 'venue'     AS kind,
           v.id,
           v.name                AS label,
           v.vibe                AS sublabel,
           similarity(lower(v.name), t.q) AS similarity,
           0        -- caller can sort by distance client-side if desired
           + 0      AS distance_m,
           null::timestamptz      AS starts_at
    FROM trimmed t, venues v
    WHERE lower(v.name) % t.q
    ORDER BY similarity DESC
    LIMIT 5
  ),

  -------------------------------------------------------------
  floq_hits AS (
    SELECT 'floq'      AS kind,
           f.id,
           f.title              AS label,
           to_char(f.starts_at, 'Mon DD HH24:MI') AS sublabel,
           similarity(lower(f.title), t.q) AS similarity,
           0                   AS distance_m,
           f.starts_at
    FROM trimmed t, floqs f
    WHERE lower(f.title) % t.q
      AND (
            (f.starts_at <= now() AND f.ends_at >= now()) -- active
         OR (f.starts_at >  now() AND f.starts_at <= now() + interval '1 day') -- next 24 h
          )
    ORDER BY similarity DESC, f.starts_at
    LIMIT 5
  ),

  -------------------------------------------------------------
  event_hits AS (
    SELECT 'event'     AS kind,
           e.id,
           e.name               AS label,
           to_char(e.starts_at, 'Mon DD HH24:MI') AS sublabel,
           similarity(lower(e.name), t.q) AS similarity,
           0                   AS distance_m,
           e.starts_at
    FROM trimmed t, event_areas e
    WHERE lower(e.name) % t.q
      AND e.ends_at >= now()
    ORDER BY similarity DESC, e.starts_at
    LIMIT 5
  )

  -------------------------------------------------------------
  SELECT * FROM (
    SELECT * FROM user_hits
    UNION ALL
    SELECT * FROM venue_hits
    UNION ALL
    SELECT * FROM floq_hits
    UNION ALL
    SELECT * FROM event_hits
  ) all_hits
  ORDER BY similarity DESC
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION public.search_everything(text, int) TO authenticated;