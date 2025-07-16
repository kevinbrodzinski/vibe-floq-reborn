/* ────────────────────────────────────────────────────────────────────────── */
/* 1.  Public read access to moments when the parent afterglow is public     */
/* ────────────────────────────────────────────────────────────────────────── */

-- Make sure RLS is ON (idempotent)
ALTER TABLE public.afterglow_moments
    ENABLE ROW LEVEL SECURITY;

-- Remove the policy if you re-run the migration
DROP POLICY IF EXISTS p_moments_public_read     ON public.afterglow_moments;
DROP POLICY IF EXISTS p_moments_owner_read      ON public.afterglow_moments;

-- (a) owner / authenticated user can still read their own moments
CREATE POLICY p_moments_owner_read
ON public.afterglow_moments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.daily_afterglow da
    WHERE da.id     = daily_afterglow_id
      AND da.user_id = auth.uid()          -- owner
  )
);

-- (b) anyone (even anon) may read moments of a public afterglow
CREATE POLICY p_moments_public_read
ON public.afterglow_moments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.daily_afterglow da
    WHERE da.id        = daily_afterglow_id
      AND da.is_public = TRUE               -- explicitly made public
  )
);

/* ────────────────────────────────────────────────────────────────────────── */
/* 2.  Tighten UPDATE on afterglow_share_links                               */
/*     – Only the owner can touch rows, and only og_image_url may change.    */
/* ────────────────────────────────────────────────────────────────────────── */

-- Ensure table has RLS
ALTER TABLE public.afterglow_share_links
    ENABLE ROW LEVEL SECURITY;

-- Drop any earlier looser policy
DROP POLICY IF EXISTS p_share_links_owner_update_img ON public.afterglow_share_links;

-- (a) UPDATE policy – only the owner of the parent afterglow
CREATE POLICY p_share_links_owner_update_img
ON public.afterglow_share_links
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.daily_afterglow da
    WHERE da.id     = daily_afterglow_id
      AND da.user_id = auth.uid()
  )
);

-- (b) Trigger to guarantee slug & FK never change and no one
--     tampers with created_at.  Portable and audit-friendly.
CREATE OR REPLACE FUNCTION public.t_share_links_restrict_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug               <> OLD.slug
     OR NEW.daily_afterglow_id <> OLD.daily_afterglow_id
     OR NEW.created_at       <> OLD.created_at THEN
       RAISE EXCEPTION
         'slug, daily_afterglow_id and created_at are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_share_links_restrict_update
ON public.afterglow_share_links;

CREATE TRIGGER trg_share_links_restrict_update
BEFORE UPDATE
ON public.afterglow_share_links
FOR EACH ROW
EXECUTE FUNCTION public.t_share_links_restrict_update();

/* ────────────────────────────────────────────────────────────────────────── */
/* 3.  (Optional) make the migration rerunnable                              */
/* ────────────────────────────────────────────────────────────────────────── */
-- All DROP … IF EXISTS guards above already make this safe to run twice.