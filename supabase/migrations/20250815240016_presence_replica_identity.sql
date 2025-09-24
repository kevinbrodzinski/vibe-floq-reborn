-- 16A: ensure presence has a PK (id) and use it for REPLICA IDENTITY
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='presence' AND column_name='id'
  ) THEN
    ALTER TABLE public.presence ADD COLUMN id uuid DEFAULT gen_random_uuid() NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='presence' AND indexname='presence_pkey'
  ) THEN
    ALTER TABLE public.presence ADD CONSTRAINT presence_pkey PRIMARY KEY (id);
  END IF;

  -- set replica identity to PK
  IF (SELECT relreplident FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' AND c.relname='presence') <> 'p' THEN
    ALTER TABLE public.presence REPLICA IDENTITY USING INDEX presence_pkey;
  END IF;
END$$;

-- 16B: purge & cleanup helpers
CREATE OR REPLACE FUNCTION public.purge_stale_presence() RETURNS void
LANGUAGE sql AS $$
DELETE FROM public.presence
WHERE updated_at < now() - interval '2 hours';
$$;

CREATE OR REPLACE FUNCTION public.cleanup_stale_presence() RETURNS void
LANGUAGE sql AS $$
DELETE FROM public.venue_live_presence
WHERE expires_at < now();
$$;