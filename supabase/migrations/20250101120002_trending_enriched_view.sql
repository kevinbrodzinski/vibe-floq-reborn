BEGIN;
SET search_path = public;

-- Enriched view (reads your live v_trending_venues)
DROP VIEW IF EXISTS public.v_trending_venues_enriched CASCADE;
CREATE VIEW public.v_trending_venues_enriched AS
SELECT
  tv.venue_id,
  v.name,
  v.provider,
  v.categories,
  v.photo_url,
  v.vibe       AS vibe_tag,
  v.vibe_score,
  v.live_count,
  tv.people_now,
  tv.visits_15m,
  tv.trend_score,
  tv.last_seen_at,
  COALESCE(v.canonical_tags, public.canonicalize_venue_enum(v.provider, v.categories, v.name)) AS canonical_tags
FROM public.v_trending_venues tv
JOIN public.venues v ON v.id = tv.venue_id;

COMMENT ON VIEW public.v_trending_venues_enriched IS
  'Trending venues joined with venue metadata; exposes canonical_tags.';

COMMIT;