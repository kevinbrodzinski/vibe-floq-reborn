-- Fix sync_log schema: add created_at column that aliases existing ts column
-- This ensures backward compatibility and schema consistency

ALTER TABLE public.sync_log
ADD COLUMN IF NOT EXISTS created_at timestamptz
GENERATED ALWAYS AS (ts) STORED;

-- Ensure proper permissions for the generated column
GRANT SELECT ON public.sync_log TO anon, authenticated;