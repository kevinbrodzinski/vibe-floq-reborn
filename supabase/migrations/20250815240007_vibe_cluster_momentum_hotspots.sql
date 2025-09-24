-- 07A: unique index so MV can be refreshed CONCURRENTLY
DO $$
BEGIN
  IF EXISTS (SELECT 1
             FROM information_schema.columns
             WHERE table_schema='public'
               AND table_name='vibe_cluster_momentum'
               AND column_name='gh6') THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS ix_vibe_cluster_momentum_pk
             ON public.vibe_cluster_momentum (gh6)';
  END IF;
END$$;

-- 07B: publish_hotspots() stays RETURNS void (your current signature)
-- maps the MV columns you reported: gh6, centroid, total_now, vibe_counts, vibe_mode
CREATE OR REPLACE FUNCTION public.publish_hotspots() RETURNS void
LANGUAGE plpgsql AS $$
DECLARE _ignored int;
BEGIN
  -- Example: write a small snapshot table (create if missing)
  CREATE TABLE IF NOT EXISTS public.hotspot_snapshots (
    captured_at timestamptz not null default now(),
    gh6 text not null,
    dom_vibe text,
    total_now int,
    centroid geometry
  );

  INSERT INTO public.hotspot_snapshots (gh6, dom_vibe, total_now, centroid)
  SELECT gh6,
         vibe_mode::text,
         total_now,
         centroid
  FROM public.vibe_cluster_momentum
  WHERE total_now > 0;

  GET DIAGNOSTICS _ignored = ROW_COUNT;
END$$;