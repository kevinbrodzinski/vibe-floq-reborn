/* -------------------  Phase 5b – Final linter clean  ----------------- */
BEGIN;

/* materialized views → private schema */
CREATE SCHEMA IF NOT EXISTS private;

ALTER MATERIALIZED VIEW IF EXISTS public.mv_active_floqs
  SET SCHEMA private;
ALTER MATERIALIZED VIEW IF EXISTS public.mv_vibe_leaderboard
  SET SCHEMA private;
ALTER MATERIALIZED VIEW IF EXISTS public.mv_top_users
  SET SCHEMA private;

/* quick auth-config hardening */
select auth.set_config(
  json_build_object(
    'SITE_URL',            'https://app.yourdomain.com',
    'JWT_EXP',             '3600',
    'PASSWORD_MIN_LENGTH', '12',
    'PASSWORD_COMPLEXITY', 'true',
    'SMS_OTP_LENGTH',      6
  )::jsonb
);

COMMIT;