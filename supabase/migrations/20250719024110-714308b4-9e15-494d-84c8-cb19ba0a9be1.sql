-- Safe backfill - only insert if not already exists
INSERT INTO public.user_vibe_states (user_id,vibe_tag,location,started_at,active)
SELECT DISTINCT v.user_id, v.vibe, v.location, v.updated_at, true
FROM public.vibes_now v
LEFT JOIN public.user_vibe_states uvs ON uvs.user_id = v.user_id AND uvs.started_at = v.updated_at
WHERE v.updated_at > now()-interval '30 days'
  AND v.vibe IS NOT NULL
  AND uvs.user_id IS NULL;

-- Set up nightly cron job for afterglow generation
SELECT cron.schedule(
  'generate_daily_afterglow',
  '0 2 * * *', -- Run at 2 AM daily
  $$
  SELECT public.generate_daily_afterglow_sql(id, (current_date - interval '1 day')::date)
  FROM auth.users
  WHERE last_sign_in_at > now() - interval '30 days'; -- Only active users
  $$
);