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
  ('chill',      200.0::real, 0.60::real, 0.70::real),
  ('energetic',   60.0::real, 0.80::real, 0.80::real),
  ('romantic',   330.0::real, 0.70::real, 0.80::real),
  ('wild',       280.0::real, 0.90::real, 0.60::real),
  ('cozy',        20.0::real, 0.50::real, 0.80::real),
  ('deep',       180.0::real, 0.80::real, 0.50::real)
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
DROP INDEX IF EXISTS uniq_prox_daily_idx;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_prox_daily_idx
  ON public.user_proximity_events (
       LEAST(user_a_id, user_b_id),
       GREATEST(user_a_id, user_b_id),
       date_trunc('day', started_at)
  );

/* ─────────────────────────────────────────────
   3.  First-time refresh of vibe_clusters
   ───────────────────────────────────────────── */
REFRESH MATERIALIZED VIEW public.vibe_clusters;

COMMIT;