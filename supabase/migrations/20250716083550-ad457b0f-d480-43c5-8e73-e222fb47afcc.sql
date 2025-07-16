/* ─────────────────────────────────────────────────────────────────────── */
/* 1. Helper function: safely insert share-link row                       */
/* ─────────────────────────────────────────────────────────────────────── */
CREATE OR REPLACE FUNCTION public.insert_share_link_safe(p_afterglow_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER                       -- executes with table owner rights
SET search_path = public, extensions
AS $$
DECLARE
  v_slug     text;
  v_attempts int := 0;
BEGIN
  -----------------------------------------------------------------------
  -- Authorisation guard (because SECURITY DEFINER bypasses RLS)       --
  -----------------------------------------------------------------------
  IF NOT EXISTS (
        SELECT 1
        FROM public.daily_afterglow da
        WHERE da.id      = p_afterglow_id
          AND da.user_id = auth.uid()
  ) THEN
     RAISE EXCEPTION 'Not authorised to create share link for this afterglow';
  END IF;

  -----------------------------------------------------------------------
  -- Retry slug generation up to 5 times in case of rare collisions    --
  -----------------------------------------------------------------------
  LOOP
    v_attempts := v_attempts + 1;
    BEGIN
      INSERT INTO public.afterglow_share_links (daily_afterglow_id)
      VALUES (p_afterglow_id)
      RETURNING slug INTO v_slug;          -- default column generates slug

      RETURN v_slug;                       -- ✅ success → exit
    EXCEPTION
      WHEN unique_violation THEN            -- collided slug
        IF v_attempts >= 5 THEN
          RAISE EXCEPTION
            'Could not generate unique slug after % attempts', v_attempts;
        END IF;
        -- otherwise loop and try again
    END;
  END LOOP;
END;
$$;

-- Allow client roles to execute the helper (but nothing else)
GRANT EXECUTE ON FUNCTION public.insert_share_link_safe(uuid) TO authenticated, anon;


/* ─────────────────────────────────────────────────────────────────────── */
/* 2. Storage bucket: og-cards                                            */
/* ─────────────────────────────────────────────────────────────────────── */

-- 2.1 Create bucket once (public read)
INSERT INTO storage.buckets (id, name, public)
SELECT 'og-cards', 'og-cards', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'og-cards'
);

-- 2.2 Make sure RLS is on for storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2.3 Clean old policies (idempotent)
DROP POLICY IF EXISTS objects_og_cards_public_read   ON storage.objects;
DROP POLICY IF EXISTS objects_og_cards_service_write ON storage.objects;

-- 2.4 Public read-only access (anon & authenticated)
CREATE POLICY objects_og_cards_public_read
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'og-cards'
);

-- 2.5 Service role (edge functions) may write
CREATE POLICY objects_og_cards_service_write
ON storage.objects
FOR ALL
USING (
  bucket_id = 'og-cards'                -- row belongs to bucket
  AND auth.role() = 'service_role'       -- Supabase helper
);

-- 2.6 Clamp write privileges for normal users
REVOKE INSERT, UPDATE, DELETE ON storage.objects FROM authenticated, anon;


/* ─────────────────────────────────────────────────────────────────────── */
/* 3. (Optional) sanity check                                             */
/* ─────────────────────────────────────────────────────────────────────── */
/*
SELECT
  bucket_id,
  policy_name
FROM pg_policies
WHERE schemaname = 'storage';
*/