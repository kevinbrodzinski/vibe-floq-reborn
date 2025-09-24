-- 11e: optional ANN index
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='venues' AND column_name='embedding'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_venues_embedding_ivfflat
             ON public.venues USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)';
  END IF;
END$$;