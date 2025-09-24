BEGIN;

/* ─────────────────────────────────────────────
   1.  HSL columns the clustering system expects
   ───────────────────────────────────────────── */
ALTER TABLE public.user_vibe_states
  ADD COLUMN IF NOT EXISTS vibe_h real,
  ADD COLUMN IF NOT EXISTS vibe_s real,
  ADD COLUMN IF NOT EXISTS vibe_l real;

ALTER TABLE public.vibes_now
  ADD COLUMN IF NOT EXISTS vibe_h real,
  ADD COLUMN IF NOT EXISTS vibe_s real,
  ADD COLUMN IF NOT EXISTS vibe_l real;

/* colour map helper – adjust / extend any time */
CREATE OR REPLACE FUNCTION public.vibe_default_hsl(p_tag text)
RETURNS TABLE(h real, s real, l real) LANGUAGE sql IMMUTABLE AS $$
VALUES
  ('chill',      200.0, 0.60, 0.70),
  ('energetic',   60.0, 0.80, 0.80),
  ('romantic',   330.0, 0.70, 0.80),
  ('wild',       280.0, 0.90, 0.60),
  ('cozy',        20.0, 0.50, 0.80),
  ('deep',       180.0, 0.80, 0.50)
$$;

/* back-fill only the NULLs */
UPDATE public.user_vibe_states u
SET (vibe_h, vibe_s, vibe_l) = (sel.h, sel.s, sel.l)
FROM LATERAL vibe_default_hsl(u.vibe_tag) sel
WHERE u.vibe_h IS NULL;

UPDATE public.vibes_now v
SET (vibe_h, vibe_s, vibe_l) = (sel.h, sel.s, sel.l)
FROM LATERAL vibe_default_hsl(v.vibe) sel
WHERE v.vibe_h IS NULL;

/* ─────────────────────────────────────────────
   2.  Expression-based dedup logic = UNIQUE INDEX
   ───────────────────────────────────────────── */
DROP INDEX IF EXISTS uniq_prox_daily_idx;      -- in case you half-applied earlier

CREATE UNIQUE INDEX IF NOT EXISTS uniq_prox_daily_idx
  ON public.user_proximity_events (
       LEAST(user_a_id, user_b_id),
       GREATEST(user_a_id, user_b_id),
       date_trunc('day', started_at)
  );

/* ─────────────────────────────────────────────
   3.  First-time refresh of vibe_clusters
   ───────────────────────────────────────────── */
-- do it once without CONCURRENTLY so Postgres doesn't complain that the
-- materialised view was never populated.
REFRESH MATERIALIZED VIEW public.vibe_clusters;

-- if you have a cron that runs CONCURRENTLY, leave it as-is; the next run will
-- succeed now that the view is fully populated.

COMMIT;