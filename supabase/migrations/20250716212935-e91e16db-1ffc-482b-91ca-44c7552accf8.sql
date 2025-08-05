-- ▒▒▒ 0. PREP  ▒▒▒ ----------------------------------------------------------
BEGIN;

-- 1️⃣ ensure required columns exist
ALTER TABLE public.plan_stops
    ADD COLUMN IF NOT EXISTS stop_order        INTEGER,
    ADD COLUMN IF NOT EXISTS created_by        UUID;

-- 2️⃣ guarantee uniqueness of ordering inside each plan
CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_stops_plan_order
    ON public.plan_stops (plan_id, stop_order);

-- 3️⃣ Row-level security: creators / participants may insert
ALTER TABLE public.plan_stops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS insert_own_stop ON public.plan_stops;
CREATE POLICY insert_own_stop
    ON public.plan_stops
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM plan_participants pp
            WHERE pp.plan_id = plan_stops.plan_id
              AND pp.user_id = auth.uid()
        )
    );

-- ▒▒▒ 1. FUNCTION ▒▒▒ -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.add_plan_stop_with_order(
    p_plan_id           UUID,
    p_title             TEXT,
    p_description       TEXT DEFAULT NULL,
    p_start_time        TIME DEFAULT NULL,
    p_end_time          TIME DEFAULT NULL,
    p_duration_minutes  INTEGER DEFAULT 60,
    p_venue_id          UUID DEFAULT NULL,
    p_estimated_cost    NUMERIC DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_stop_id UUID;
    new_order   INTEGER;
BEGIN
    --------------------------------------------------------------------------
    --  A U T H
    --------------------------------------------------------------------------
    IF NOT EXISTS (
        SELECT 1
        FROM plan_participants
        WHERE plan_id = p_plan_id
          AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Not authorised to add stops to this plan';
    END IF;

    --------------------------------------------------------------------------
    --  C O N C U R R E N C Y   L O C K
    --------------------------------------------------------------------------
    -- One advisory lock per plan_id for the lifespan of the transaction.
    -- hashtext(..) → bigint fits pg_advisory_xact_lock(bigint)
    PERFORM pg_advisory_xact_lock(
        ('x' || substr(md5(p_plan_id::text), 1, 16))::bit(64)::bigint
    );

    --------------------------------------------------------------------------
    --  N E X T   O R D E R
    --------------------------------------------------------------------------
    SELECT COALESCE(MAX(stop_order), 0) + 1
      INTO new_order
      FROM public.plan_stops
     WHERE plan_id = p_plan_id;

    --------------------------------------------------------------------------
    --  I N S E R T
    --------------------------------------------------------------------------
    INSERT INTO public.plan_stops (
        id,
        plan_id,
        title,
        description,
        start_time,
        end_time,
        duration_minutes,
        venue_id,
        estimated_cost_per_person,
        stop_order,
        created_by
    ) VALUES (
        gen_random_uuid(),
        p_plan_id,
        p_title,
        p_description,
        p_start_time,
        p_end_time,
        p_duration_minutes,
        p_venue_id,
        p_estimated_cost,
        new_order,
        auth.uid()
    )
    RETURNING id INTO new_stop_id;

    RETURN new_stop_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_plan_stop_with_order TO authenticated;

COMMIT;