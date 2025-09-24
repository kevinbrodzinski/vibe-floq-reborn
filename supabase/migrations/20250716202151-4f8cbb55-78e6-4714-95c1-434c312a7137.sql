DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_attrdef ad
    JOIN pg_class  c ON c.oid = ad.adrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'snap_suggestion_logs'
      AND pg_get_expr(ad.adbin, ad.adrelid) = 'now()'::text
      AND ad.adnum = (
        SELECT attnum FROM pg_attribute
        WHERE attrelid = c.oid AND attname = 'used_at'
      )
  ) THEN
    ALTER TABLE public.snap_suggestion_logs
      ALTER COLUMN used_at SET DEFAULT now();
  END IF;
END
$$;