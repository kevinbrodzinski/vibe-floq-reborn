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

COMMIT;