/*───────────────────────────────────────────────────────────────
  FUNCTION: generate_daily_afterglow_sql
  Purpose  : Aggregate a user's day into a single daily_afterglow row
────────────────────────────────────────────────────────────────*/
CREATE OR REPLACE FUNCTION public.generate_daily_afterglow_sql (
  p_user_id uuid,
  p_date    date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_afterglow_id uuid;
BEGIN
  /* ───────── VALIDATION ───────── */
  IF p_user_id IS NULL OR p_date IS NULL THEN
    RAISE EXCEPTION 'user_id and date must be provided';
  END IF;

  /* ───────── STATS + MOMENTS ───────── */
  WITH
  /*‐‐‐ 1. vibe statistics ‐‐-*/
  vibe_stats AS (
    SELECT
      array_agg(vibe_tag ORDER BY started_at)          AS vibe_path,
      COALESCE(
        (SELECT vibe_tag
         FROM user_vibe_states
         WHERE user_id = p_user_id
           AND started_at::date = p_date
         GROUP BY vibe_tag
         ORDER BY COUNT(*) DESC
         LIMIT 1), 'chill'
      )                                               AS dominant_vibe,
      COUNT(*)                                        AS vibe_events,
      MAX(started_at)                                 AS peak_vibe_time
    FROM user_vibe_states
    WHERE user_id = p_user_id
      AND started_at::date = p_date
      AND active = true
  ),

  /*‐‐‐ 2. social stats ‐‐-*/
  social_stats AS (
    SELECT COUNT(DISTINCT friend) AS crossed_paths
    FROM   friend_presence
    WHERE  me = p_user_id
      AND  started_at::date = p_date
      AND  friend IS NOT NULL
  ),

  /*‐‐‐ 3. venue stats ‐‐-*/
  venue_stats AS (
    SELECT COUNT(DISTINCT venue_id) AS total_venues
    FROM   venue_live_presence
    WHERE  user_id = p_user_id
      AND  checked_in_at::date = p_date
      AND  venue_id IS NOT NULL
  ),

  /*‐‐‐ 4. floq stats ‐‐-*/
  floq_stats AS (
    SELECT COUNT(DISTINCT floq_id) AS total_floqs
    FROM   floq_participants
    WHERE  user_id = p_user_id
      AND  joined_at::date = p_date
  ),

  /*‐‐‐ 5. plan stats ‐‐-*/
  plan_stats AS (
    SELECT COUNT(DISTINCT plan_id) AS total_plans
    FROM   plan_participants
    WHERE  user_id = p_user_id
      AND  joined_at::date = p_date
  ),

  /*‐‐‐ 6. venue moments (enum → venue_checkin) ‐‐-*/
  venue_moments AS (
    SELECT jsonb_build_object(
             'id',         gen_random_uuid(),
             'timestamp',  vlp.checked_in_at,
             'moment_type','venue_checkin',
             'title',      COALESCE(v.name,'Unknown venue'),
             'description','Checked-in • felt ' || vlp.vibe || ' vibes',
             'color',      CASE vlp.vibe
                             WHEN 'chill'   THEN 'blue'
                             WHEN 'hype'    THEN 'orange'
                             WHEN 'flowing' THEN 'emerald'
                             ELSE 'slate'
                           END,
             'metadata',   jsonb_build_object(
                             'venue_id', vlp.venue_id,
                             'vibe',     vlp.vibe
                           )
           ) AS moment_json,
           vlp.checked_in_at AS ts
    FROM   venue_live_presence vlp
    LEFT   JOIN venues v ON v.id = vlp.venue_id
    WHERE  vlp.user_id = p_user_id
      AND  vlp.checked_in_at::date = p_date
      AND  vlp.venue_id IS NOT NULL
  ),

  /*‐‐‐ 7. plan moments (enum → plan_start) ‐‐-*/
  plan_moments AS (
    SELECT jsonb_build_object(
             'id',         gen_random_uuid(),
             'timestamp',  fp.planned_at,
             'moment_type','plan_start',
             'title',      fp.title,
             'description','Joined plan • ' || fp.title,
             'color',      'purple',
             'metadata',   jsonb_build_object(
                             'plan_id', fp.id,
                             'floq_id', fp.floq_id
                           )
           ) AS moment_json,
           fp.planned_at AS ts
    FROM   floq_plans        fp
    JOIN   plan_participants pp ON pp.plan_id = fp.id
    WHERE  pp.user_id = p_user_id
      AND  fp.planned_at::date = p_date
  ),

  /*‐‐‐ 8. combined, chronologically ordered moments ‐‐-*/
  ordered_moments AS (
    SELECT moment_json
    FROM (
      SELECT * FROM venue_moments
      UNION ALL
      SELECT * FROM plan_moments
    ) sub
    ORDER BY ts
  )

  /* ───────── UPSERT INTO daily_afterglow ───────── */
  INSERT INTO public.daily_afterglow (
    user_id, "date",
    dominant_vibe,  vibe_path,  peak_vibe_time,
    energy_score,   social_intensity,
    crossed_paths_count, total_floqs, total_venues,
    emotion_journey, moments,
    summary_text,    is_pinned,
    created_at,      regenerated_at
  )
  SELECT
    p_user_id, p_date,
    vs.dominant_vibe,
    COALESCE(vs.vibe_path, '{}'),
    vs.peak_vibe_time,

    /* energy_score */
    LEAST(100,
      (vs.vibe_events * 10) +
      (ven.total_venues * 5) +
      (fs.total_floqs * 8)
    )::int,

    /* social_intensity */
    LEAST(100,
      (ss.crossed_paths * 15) +
      (fs.total_floqs * 10) +
      (ps.total_plans * 10)
    )::int,

    ss.crossed_paths,
    fs.total_floqs,
    ven.total_venues,

    '[]'::jsonb, -- emotion_journey placeholder
    COALESCE(
      (SELECT jsonb_agg(moment_json) FROM ordered_moments),
      '[]'::jsonb
    ),
    NULL,        -- summary_text (AI later)
    false,       -- is_pinned
    now(), now()

  FROM vibe_stats   vs
  LEFT JOIN social_stats ss ON TRUE
  LEFT JOIN venue_stats  ven ON TRUE
  LEFT JOIN floq_stats   fs  ON TRUE
  LEFT JOIN plan_stats   ps  ON TRUE

  ON CONFLICT (user_id, "date")
  DO UPDATE SET
    dominant_vibe        = EXCLUDED.dominant_vibe,
    vibe_path            = EXCLUDED.vibe_path,
    peak_vibe_time       = EXCLUDED.peak_vibe_time,
    energy_score         = EXCLUDED.energy_score,
    social_intensity     = EXCLUDED.social_intensity,
    crossed_paths_count  = EXCLUDED.crossed_paths_count,
    total_floqs          = EXCLUDED.total_floqs,
    total_venues         = EXCLUDED.total_venues,
    moments              = EXCLUDED.moments,
    regenerated_at       = now()
  RETURNING id INTO v_afterglow_id;

  RETURN v_afterglow_id;
END;
$$;

----------------------------------------------------------------
-- PERMISSIONS (edge functions / client-side RPC)
----------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.generate_daily_afterglow_sql(uuid, date)
  TO authenticated, service_role;