-- Create floqs_living_view for efficient Living Floq Card data
CREATE OR REPLACE VIEW floqs_living_view AS
WITH floq_stats AS (
  SELECT 
    f.id,
    f.name,
    f.title,
    f.description,
    f.primary_vibe,
    f.created_at,
    f.visibility,
    -- Member counts
    COUNT(fp.profile_id) as member_count,
    COUNT(vn.profile_id) as active_now,
    -- Activity metrics
    GREATEST(0, LEAST(1, 
      COALESCE(
        EXTRACT(EPOCH FROM (NOW() - f.last_activity_at)) / 3600.0, 0
      ) * 0.1 + 0.3
    )) as energy,
    -- Determine floq kind based on patterns
    CASE 
      WHEN f.visibility = 'private' AND COUNT(fp.profile_id) <= 8 THEN 'friend'
      WHEN f.visibility = 'public' AND f.description LIKE '%business%' THEN 'business' 
      WHEN f.ends_at IS NOT NULL AND f.ends_at < NOW() + INTERVAL '24 hours' THEN 'momentary'
      ELSE 'club'
    END as kind,
    -- Status bucket logic
    CASE
      WHEN COUNT(vn.profile_id) > 0 AND f.last_activity_at > NOW() - INTERVAL '1 hour' THEN 'now'
      WHEN f.last_activity_at > NOW() - INTERVAL '1 day' THEN 'today'
      WHEN f.created_at > NOW() - INTERVAL '7 days' THEN 'upcoming'
      ELSE 'dormant'
    END as status_bucket,
    -- TTL for momentary floqs
    CASE 
      WHEN f.ends_at IS NOT NULL AND f.ends_at > NOW() THEN
        EXTRACT(EPOCH FROM (f.ends_at - NOW()))
      ELSE NULL 
    END as ttl_seconds,
    -- Recent activity indicators
    f.last_activity_at,
    -- Streak calculation for friend floqs (weeks since creation)
    CASE 
      WHEN f.visibility = 'private' THEN 
        FLOOR(EXTRACT(DAYS FROM (NOW() - f.created_at)) / 7)
      ELSE NULL 
    END as streak_weeks
  FROM floqs f
  LEFT JOIN floq_participants fp ON f.id = fp.floq_id
  LEFT JOIN vibes_now vn ON vn.profile_id = fp.profile_id 
    AND vn.updated_at > NOW() - INTERVAL '10 minutes'
  WHERE f.deleted_at IS NULL
  GROUP BY f.id, f.name, f.title, f.description, f.primary_vibe, 
           f.created_at, f.visibility, f.last_activity_at, f.ends_at
),
user_floq_relationships AS (
  SELECT 
    fs.*,
    CASE WHEN user_fp.profile_id IS NOT NULL THEN user_fp.role ELSE NULL END as user_role,
    CASE WHEN user_fp.profile_id IS NOT NULL THEN true ELSE false END as following,
    -- Convergence nearby (members within 1km)
    COALESCE(nearby.converging_count, 0) as converging_nearby,
    nearby.distance_label
  FROM floq_stats fs
  LEFT JOIN floq_participants user_fp ON fs.id = user_fp.floq_id 
    AND user_fp.profile_id = auth.uid()
  LEFT JOIN LATERAL (
    SELECT 
      COUNT(*) as converging_count,
      CASE 
        WHEN AVG(ST_Distance(vn1.location, vn2.location)) < 1000 
        THEN ROUND(AVG(ST_Distance(vn1.location, vn2.location))/1000.0, 1) || ' km'
        ELSE NULL 
      END as distance_label
    FROM floq_participants fp1
    JOIN vibes_now vn1 ON vn1.profile_id = fp1.profile_id
    JOIN vibes_now vn2 ON vn2.profile_id = auth.uid()
    WHERE fp1.floq_id = fs.id 
      AND fp1.profile_id != auth.uid()
      AND ST_Distance(vn1.location, vn2.location) < 5000  -- 5km radius
      AND vn1.updated_at > NOW() - INTERVAL '30 minutes'
  ) nearby ON true
)
SELECT 
  ufr.id,
  ufr.name,
  ufr.title,
  ufr.description,
  ufr.kind::text,
  ufr.primary_vibe,
  ufr.member_count,
  ufr.active_now,
  ufr.converging_nearby,
  ufr.distance_label,
  ufr.energy,
  -- Next action detection (simplified for now)
  CASE 
    WHEN ufr.kind = 'friend' AND ufr.active_now > 0 THEN 'Rally now'
    WHEN ufr.kind = 'club' AND EXTRACT(DOW FROM NOW()) IN (5,6) THEN 'Weekend meetup'
    WHEN ufr.kind = 'business' THEN 'Check updates'
    WHEN ufr.kind = 'momentary' THEN 'Join now'
    ELSE NULL
  END as next_label,
  CASE 
    WHEN ufr.kind = 'friend' AND ufr.active_now > 0 THEN 'Now'
    WHEN ufr.kind = 'club' AND EXTRACT(DOW FROM NOW()) IN (5,6) THEN 'This weekend'
    ELSE NULL
  END as next_when,
  ufr.ttl_seconds,
  -- Match percentage for discovery (simplified)
  CASE WHEN ufr.user_role IS NULL THEN RANDOM() * 0.4 + 0.6 ELSE NULL END as match_pct,
  ufr.following,
  ufr.streak_weeks,
  ufr.status_bucket
FROM user_floq_relationships ufr
WHERE ufr.visibility = 'public' OR ufr.user_role IS NOT NULL
ORDER BY 
  CASE ufr.status_bucket 
    WHEN 'now' THEN 1 
    WHEN 'today' THEN 2 
    WHEN 'upcoming' THEN 3 
    ELSE 4 
  END,
  ufr.active_now DESC,
  ufr.energy DESC;