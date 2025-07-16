/* ======================================================= *
   INTELLIGENT ARCHIVE  —  SEARCH · FILTER · ORGANISATION
   ======================================================= */

/* ------------------------------------------------------------------ *
   0. PERFORMANCE INDEXES
   ------------------------------------------------------------------ */

CREATE INDEX IF NOT EXISTS idx_daily_afterglow_user_date
    ON public.daily_afterglow (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_venue_live_presence_user_date
    ON public.venue_live_presence (user_id, checked_in_at);

-- Text-search expression index used by `search_afterglows`
CREATE INDEX IF NOT EXISTS idx_daily_afterglow_search
    ON public.daily_afterglow
    USING gin (
      setweight(to_tsvector('english', coalesce(summary_text, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(dominant_vibe ,'')), 'B')
    );

-- Array-overlap for vibe_path
CREATE INDEX IF NOT EXISTS idx_daily_afterglow_vibe_path
    ON public.daily_afterglow USING gin(vibe_path);


/* ------------------------------------------------------------------ *
   1. FULL–TEXT / FACETTED SEARCH
   ------------------------------------------------------------------ */
CREATE OR REPLACE FUNCTION public.search_afterglows(
  p_user_id        uuid     DEFAULT auth.uid(),
  p_search_query   text     DEFAULT NULL,
  p_start_date     date     DEFAULT NULL,
  p_end_date       date     DEFAULT NULL,
  p_min_energy     integer  DEFAULT NULL,
  p_max_energy     integer  DEFAULT NULL,
  p_dominant_vibe  text     DEFAULT NULL,
  p_tags           text[]   DEFAULT NULL,        -- overlaps vibe_path
  p_is_pinned      boolean  DEFAULT NULL,
  p_limit          integer  DEFAULT 20,
  p_offset         integer  DEFAULT 0
)
RETURNS TABLE (
  id                    uuid,
  date                  date,
  energy_score          integer,
  social_intensity      integer,
  dominant_vibe         text,
  summary_text          text,
  total_venues          integer,
  total_floqs           integer,
  crossed_paths_count   integer,
  vibe_path             text[],
  is_pinned             boolean,
  moments_count         bigint,
  created_at            timestamptz,
  search_rank           real
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;                -- caller not authenticated  ➜ empty set
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT da.*,
           (SELECT count(*) FROM afterglow_moments am
            WHERE am.daily_afterglow_id = da.id)            AS moments_count,
           CASE
             WHEN p_search_query IS NULL THEN 1.0           -- neutral rank
             ELSE ts_rank(
                    setweight(to_tsvector('english', coalesce(da.summary_text,'')), 'A') ||
                    setweight(to_tsvector('english', coalesce(da.dominant_vibe ,'')), 'B'),
                    plainto_tsquery('english', p_search_query)
                  )
           END                                              AS search_rank
    FROM   daily_afterglow da
    WHERE  da.user_id = p_user_id
      AND  (p_start_date   IS NULL OR da.date >= p_start_date)
      AND  (p_end_date     IS NULL OR da.date <= p_end_date)
      AND  (p_min_energy   IS NULL OR da.energy_score      >= p_min_energy)
      AND  (p_max_energy   IS NULL OR da.energy_score      <= p_max_energy)
      AND  (p_dominant_vibe IS NULL OR da.dominant_vibe   =  p_dominant_vibe)
      AND  (p_is_pinned    IS NULL OR da.is_pinned        =  p_is_pinned)
      AND  (
             p_search_query IS NULL OR
             (
               setweight(to_tsvector('english', coalesce(da.summary_text,'')), 'A') ||
               setweight(to_tsvector('english', coalesce(da.dominant_vibe ,'')), 'B')
             ) @@ plainto_tsquery('english', p_search_query)
           )
      AND  (p_tags IS NULL OR p_tags && da.vibe_path)
  )
  SELECT *
  FROM   base
  ORDER  BY search_rank DESC, date DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;


/* ------------------------------------------------------------------ *
   2. ARCHIVE-WIDE STATISTICS
   ------------------------------------------------------------------ */
CREATE OR REPLACE FUNCTION public.get_archive_stats(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('error','user not authenticated');
  END IF;

  WITH agg AS (
    SELECT
      count(*)                                         AS total_days,
      count(*) FILTER (WHERE is_pinned)               AS pinned_days,
      count(*) FILTER (WHERE energy_score >= 80)      AS high_energy_days,
      count(*) FILTER (WHERE social_intensity >= 80)  AS high_social_days,
      count(*) FILTER (WHERE total_venues+total_floqs>0) AS active_days,
      avg(energy_score)                               AS avg_energy,
      avg(social_intensity)                           AS avg_social,
      sum(total_venues)                               AS total_venues,
      sum(total_floqs)                                AS total_floqs,
      sum(crossed_paths_count)                        AS total_paths_crossed,
      min(date)                                       AS first_entry,
      max(date)                                       AS latest_entry,
      mode() WITHIN GROUP (ORDER BY dominant_vibe)    AS most_common_vibe
    FROM daily_afterglow
    WHERE user_id = p_user_id
  ),
  moments AS (
    SELECT
      count(*)                                         AS total_moments,
      count(DISTINCT moment_type)                      AS unique_moment_types,
      mode() WITHIN GROUP (ORDER BY moment_type)       AS most_common_moment_type
    FROM afterglow_moments am
    JOIN daily_afterglow da ON da.id = am.daily_afterglow_id
    WHERE da.user_id = p_user_id
  ),
  recent AS (
    SELECT
      count(*)                                         AS days_last_30,
      avg(energy_score)                                AS avg_energy_30,
      avg(social_intensity)                            AS avg_social_30
    FROM daily_afterglow
    WHERE user_id = p_user_id
      AND date >= current_date - interval '30 days'
  ),
  vibes AS (
    SELECT jsonb_object_agg(dominant_vibe, cnt) AS vibe_counts
    FROM (
      SELECT dominant_vibe, count(*) cnt
      FROM daily_afterglow
      WHERE user_id = p_user_id
        AND dominant_vibe IS NOT NULL
      GROUP BY dominant_vibe
    ) x
  )
  SELECT jsonb_build_object(
           'overview', jsonb_build_object(
             'total_days',           agg.total_days,
             'pinned_days',          agg.pinned_days,
             'active_days',          agg.active_days,
             'first_entry',          agg.first_entry,
             'latest_entry',         agg.latest_entry,
             'total_moments',        moments.total_moments
           ),
           'energy_insights', jsonb_build_object(
             'avg_energy_all_time',  round(coalesce(agg.avg_energy,0),2),
             'avg_energy_last_30',   round(coalesce(recent.avg_energy_30,0),2),
             'high_energy_days',     agg.high_energy_days,
             'energy_trend', CASE
                               WHEN recent.avg_energy_30 > agg.avg_energy * 1.1 THEN 'improving'
                               WHEN recent.avg_energy_30 < agg.avg_energy * 0.9 THEN 'declining'
                               ELSE 'stable'
                             END
           ),
           'social_insights', jsonb_build_object(
             'avg_social_all_time',  round(coalesce(agg.avg_social,0),2),
             'avg_social_last_30',   round(coalesce(recent.avg_social_30,0),2),
             'high_social_days',     agg.high_social_days,
             'social_trend', CASE
                               WHEN recent.avg_social_30 > agg.avg_social * 1.1 THEN 'improving'
                               WHEN recent.avg_social_30 < agg.avg_social * 0.9 THEN 'declining'
                               ELSE 'stable'
                             END
           ),
           'activity_summary', jsonb_build_object(
             'total_venues_visited', agg.total_venues,
             'total_floqs_joined',   agg.total_floqs,
             'total_paths_crossed',  agg.total_paths_crossed,
             'most_common_vibe',     agg.most_common_vibe,
             'vibe_distribution',    vibes.vibe_counts
           ),
           'moments_insights', jsonb_build_object(
             'total_moments',        moments.total_moments,
             'unique_moment_types',  moments.unique_moment_types,
             'most_common_moment_type', moments.most_common_moment_type,
             'avg_moments_per_day',  CASE WHEN agg.total_days>0
                                          THEN round(moments.total_moments::numeric/agg.total_days,2)
                                          ELSE 0 END
           ),
           'recent_activity', jsonb_build_object(
             'days_logged_last_30',  recent.days_last_30,
             'activity_rate_last_30', CASE
                                        WHEN recent.days_last_30 > 20 THEN 'high'
                                        WHEN recent.days_last_30 > 10 THEN 'medium'
                                        ELSE 'low'
                                      END
           )
         ) INTO result
  FROM agg, moments, recent, vibes;

  RETURN result;
END;
$$;


/* ------------------------------------------------------------------ *
   3. FAVOURITES   (table + RLS)
   ------------------------------------------------------------------ */
CREATE TABLE IF NOT EXISTS public.afterglow_favorites (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
  daily_afterglow_id uuid NOT NULL REFERENCES daily_afterglow(id)   ON DELETE CASCADE,
  created_at         timestamptz DEFAULT now(),
  UNIQUE(user_id, daily_afterglow_id)
);

ALTER TABLE public.afterglow_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_favourites"
  ON public.afterglow_favorites
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


/* ------------------------------------------------------------------ *
   4. COLLECTIONS  (tables + trigger + RLS)
   ------------------------------------------------------------------ */
CREATE TABLE IF NOT EXISTS public.afterglow_collections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  color       text DEFAULT '#3b82f6',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.afterglow_collection_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id      uuid NOT NULL REFERENCES afterglow_collections(id) ON DELETE CASCADE,
  daily_afterglow_id uuid NOT NULL REFERENCES daily_afterglow(id)       ON DELETE CASCADE,
  added_at           timestamptz DEFAULT now(),
  UNIQUE(collection_id, daily_afterglow_id)
);

ALTER TABLE public.afterglow_collections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afterglow_collection_items  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_collections"
  ON public.afterglow_collections
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "own_collection_items"
  ON public.afterglow_collection_items
  USING (
    EXISTS(
      SELECT 1 FROM afterglow_collections ac
      WHERE ac.id = collection_id AND ac.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM afterglow_collections ac
      WHERE ac.id = collection_id AND ac.user_id = auth.uid()
    )
  );

-- auto-touch updated_at
CREATE OR REPLACE FUNCTION public.touch_collection_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_collection ON public.afterglow_collections;
CREATE TRIGGER trg_touch_collection
  BEFORE UPDATE ON public.afterglow_collections
  FOR EACH ROW EXECUTE FUNCTION public.touch_collection_updated_at();


/* ------------------------------------------------------------------ *
   5. DATA EXPORT
   ------------------------------------------------------------------ */
CREATE OR REPLACE FUNCTION public.export_afterglow_data(
  p_user_id     uuid   DEFAULT auth.uid(),
  p_start_date  date   DEFAULT NULL,
  p_end_date    date   DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('error','user not authenticated');
  END IF;

  WITH to_export AS (
    SELECT da.*,
           ( SELECT jsonb_agg(
                     jsonb_build_object(
                       'type',  am.moment_type,
                       'title', am.title,
                       'description', am.description,
                       'timestamp', am.timestamp,
                       'color', am.color
                     )
                   ORDER BY am.timestamp )
             FROM afterglow_moments am
             WHERE am.daily_afterglow_id = da.id ) AS moments_json
    FROM daily_afterglow da
    WHERE da.user_id = p_user_id
      AND (p_start_date IS NULL OR da.date >= p_start_date)
      AND (p_end_date   IS NULL OR da.date <= p_end_date)
    ORDER BY da.date DESC
  )
  SELECT jsonb_build_object(
           'export_info', jsonb_build_object(
             'exported_at', now(),
             'user_id',     p_user_id,
             'date_range',  jsonb_build_object(
                              'start_date', p_start_date,
                              'end_date',   p_end_date
                            ),
             'total_entries', (SELECT count(*) FROM to_export)
           ),
           'afterglows',   jsonb_agg(
             jsonb_build_object(
               'date',                 te.date,
               'energy_score',         te.energy_score,
               'social_intensity',     te.social_intensity,
               'dominant_vibe',        te.dominant_vibe,
               'summary_text',         te.summary_text,
               'total_venues',         te.total_venues,
               'total_floqs',          te.total_floqs,
               'crossed_paths_count',  te.crossed_paths_count,
               'vibe_path',            te.vibe_path,
               'peak_vibe_time',       te.peak_vibe_time,
               'is_pinned',            te.is_pinned,
               'created_at',           te.created_at,
               'moments',              coalesce(te.moments_json, '[]'::jsonb)
             ) ORDER BY te.date DESC
           )
         ) INTO payload
  FROM to_export te;

  RETURN payload;
END;
$$;


/* ------------------------------------------------------------------ *
   6. GRANTS
   ------------------------------------------------------------------ */
GRANT EXECUTE ON FUNCTION public.search_afterglows            TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_archive_stats            TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_afterglow_data        TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.afterglow_favorites,
     public.afterglow_collections,
     public.afterglow_collection_items
  TO authenticated;