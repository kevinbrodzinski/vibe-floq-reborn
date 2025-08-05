/* ================================================================
   🔒  Phase 5 – Close out remaining security findings (PG ≥ 13)
   ================================================================ */
BEGIN;

/* ----------------------------------------------------------------
   1️⃣  Fix the last SECURITY DEFINER function's search_path
   ----------------------------------------------------------------*/
DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT n.nspname      AS schema_name,
           p.proname      AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
      AND  p.prosecdef                      -- SECURITY DEFINER
      AND  p.proowner = (SELECT oid FROM pg_roles WHERE rolname = current_user)
      AND  (p.proconfig IS NULL
            OR NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) AS c(val)
                           WHERE  val ILIKE 'search_path=%'))
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_catalog',
      f.schema_name, f.func_name, f.args
    );
    RAISE NOTICE '✅  search_path pinned: %.%(%)',
                 f.schema_name, f.func_name, f.args;
  END LOOP;
END $$;

/* ----------------------------------------------------------------
   2️⃣  Enable RLS on any remaining application tables we own
   ----------------------------------------------------------------*/
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT format('%I.%I', n.nspname, c.relname) AS fqtn
    FROM   pg_class      c
    JOIN   pg_namespace  n ON n.oid = c.relnamespace
    WHERE  n.nspname   = 'public'
      AND  c.relkind   = 'r'          -- ordinary tables
      AND  c.relrowsecurity = FALSE   -- RLS off
      AND  c.relowner = (SELECT oid FROM pg_roles WHERE rolname = current_user)
      AND  c.relname  NOT IN ('spatial_ref_sys','geometry_columns','geography_columns')
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t.fqtn);
    RAISE NOTICE '✅  RLS enabled on %', t.fqtn;
  END LOOP;
END $$;

/* ----------------------------------------------------------------
   3️⃣  Re-create any remaining SECURITY DEFINER views as safe views
   ----------------------------------------------------------------*/
DO $$
DECLARE
  v        record;
  view_sql text;
BEGIN
  FOR v IN
    SELECT c.oid,
           n.nspname AS schemaname,
           c.relname AS viewname,
           pg_catalog.pg_get_userbyid(c.relowner) AS owner
    FROM   pg_class      c
    JOIN   pg_namespace  n ON n.oid = c.relnamespace
    WHERE  c.relkind   = 'v'                 -- views
      AND  c.relrowsecurity IS TRUE          -- flagged by linter as SECURITY DEFINER
      AND  n.nspname = 'public'
  LOOP
    /* pull the SELECT body */
    view_sql :=
      regexp_replace(
        pg_get_viewdef(v.oid, true)  -- returns the query only
      ,'^\s*SELECT','SELECT', 'i');

    -- Drop & recreate without SECURITY DEFINER; keep security_barrier
    EXECUTE format(
      E'DROP VIEW IF EXISTS %I.%I CASCADE;\n' ||
      E'CREATE OR REPLACE VIEW %I.%I\n' ||
      E'  WITH (security_barrier = TRUE)\nAS %s;',
      v.schemaname, v.viewname,
      v.schemaname, v.viewname,
      view_sql
    );

    /* (optional) hand back to original owner if different */
    IF v.owner IS NOT NULL AND v.owner <> current_user THEN
      EXECUTE format('ALTER VIEW %I.%I OWNER TO %I;', v.schemaname, v.viewname, v.owner);
    END IF;

    RAISE NOTICE '✅  View %.% secured', v.schemaname, v.viewname;
  END LOOP;
END $$;

COMMIT;