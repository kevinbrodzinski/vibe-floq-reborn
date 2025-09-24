-- Create empty views only if they don't exist
-- This prevents 404 errors in the frontend while keeping the API green
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='venue_hours'
  ) THEN
    EXECUTE $v$
      CREATE VIEW public.venue_hours AS
      SELECT
        NULL::uuid  AS venue_id,
        NULL::int   AS dow,
        NULL::time  AS open,
        NULL::time  AS close
      WHERE false;
    $v$;
    GRANT SELECT ON public.venue_hours TO anon, authenticated;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='venue_deals'
  ) THEN
    EXECUTE $v$
      CREATE VIEW public.venue_deals AS
      SELECT
        NULL::uuid        AS id,
        NULL::uuid        AS venue_id,
        NULL::text        AS title,
        NULL::text        AS subtitle,
        NULL::timestamptz AS starts_at,
        NULL::timestamptz AS ends_at
      WHERE false;
    $v$;
    GRANT SELECT ON public.venue_deals TO anon, authenticated;
  END IF;
END$$;