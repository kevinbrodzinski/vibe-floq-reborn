-- Improve get_profile_stats function with optimizations and proper grants
CREATE OR REPLACE FUNCTION public.get_profile_stats(
  target_profile_id uuid,
  metres  integer DEFAULT 100,     -- reserved, currently unused
  seconds integer DEFAULT 3600     -- reserved, currently unused
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_friend_count        int    := 0;
  v_crossings_7d        int    := 0;
  v_most_active_vibe    text   := 'unknown';
  v_days_active_month   int    := 0;
  v_total_achievements  int    := 0;
  v_vibe_distribution   jsonb  := '[]'::jsonb;
  v_recent_vibes        jsonb  := '[]'::jsonb;
BEGIN
  IF target_profile_id IS NULL THEN
    RAISE EXCEPTION 'target_profile_id cannot be null';
  END IF;

  /* friend count */
  SELECT COUNT(*)
  INTO   v_friend_count
  FROM   v_friends_with_presence
  WHERE  friend_state = 'accepted'
  AND    (profile_id = target_profile_id OR friend_id = target_profile_id);

  /* crossings last 7 days */
  SELECT COUNT(*)
  INTO   v_crossings_7d
  FROM   crossed_paths
  WHERE  (user_a = target_profile_id OR user_b = target_profile_id)
  AND    encounter_date >= CURRENT_DATE - INTERVAL '7 days';

  /* achievements */
  SELECT COUNT(*)
  INTO   v_total_achievements
  FROM   achievements
  WHERE  profile_id = target_profile_id;

  /* active days this month */
  SELECT COUNT(DISTINCT DATE(ts))
  INTO   v_days_active_month
  FROM   vibes_log
  WHERE  profile_id = target_profile_id
  AND    ts >= DATE_TRUNC('month', CURRENT_DATE);

  /* vibe distribution last 7 days */
  WITH vibe_stats AS (
    SELECT vibe, COUNT(*) AS cnt
    FROM   vibes_log
    WHERE  profile_id = target_profile_id
    AND    ts >= CURRENT_DATE - INTERVAL '7 days'
    GROUP  BY vibe
  ), totals AS (SELECT SUM(cnt) AS total FROM vibe_stats)
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'vibe',        vs.vibe,
          'count',       vs.cnt,
          'percentage',  ROUND((vs.cnt::numeric / GREATEST(t.total,1))*100,1)
        )
        ORDER BY vs.cnt DESC
      ), '[]'::jsonb
    ),
    COALESCE((SELECT vibe FROM vibe_stats ORDER BY cnt DESC LIMIT 1), 'unknown')
  INTO   v_vibe_distribution, v_most_active_vibe
  FROM   vibe_stats vs, totals t;

  /* 10 most-recent vibes */
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'vibe',      vibe,
        'timestamp', EXTRACT(EPOCH FROM ts)::bigint,
        'ts',        ts::text
      )
      ORDER BY ts DESC
    ), '[]'::jsonb
  )
  INTO   v_recent_vibes
  FROM (
    SELECT vibe, ts
    FROM   vibes_log
    WHERE  profile_id = target_profile_id
    ORDER  BY ts DESC
    LIMIT  10
  ) recent;

  RETURN jsonb_build_object(
    'friend_count',           v_friend_count,
    'crossings_7d',           v_crossings_7d,
    'most_active_vibe',       v_most_active_vibe,
    'days_active_this_month', v_days_active_month,
    'total_achievements',     v_total_achievements,
    'vibe_distribution',      v_vibe_distribution,
    'recent_vibes',           v_recent_vibes
  );
END;
$$;

-- Grant execution to client roles
GRANT EXECUTE ON FUNCTION public.get_profile_stats(uuid, integer, integer)
       TO authenticated, anon;

-- Performance index for vibes_log queries
CREATE INDEX IF NOT EXISTS vibes_log_profile_ts_idx
  ON public.vibes_log (profile_id, ts DESC);