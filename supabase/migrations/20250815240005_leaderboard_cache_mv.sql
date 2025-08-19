-- 05: unique index for CONCURRENTLY refresh + rank helper
-- (your MV columns: id uuid, display_name, avatar_url, checkins_30d)
CREATE UNIQUE INDEX IF NOT EXISTS ix_leaderboard_cache_pk
  ON public.leaderboard_cache (id);

CREATE INDEX IF NOT EXISTS ix_leaderboard_cache_rank
  ON public.leaderboard_cache (checkins_30d DESC, id);

-- refresh wrapper keeps CONCURRENTLY but falls back on error
CREATE OR REPLACE FUNCTION public.refresh_leaderboard_cache() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY public.leaderboard_cache';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'REFRESH MATERIALIZED VIEW public.leaderboard_cache';
  END;
END$$;