-- Auto-close expired rallies system

-- 1) BEFORE UPDATE trigger: clamp expired active → ended
CREATE OR REPLACE FUNCTION public.rallies_clamp_expired()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If row is already expired, never allow 'active'
  IF (NEW.expires_at <= now() AT TIME ZONE 'utc') THEN
    NEW.status := 'ended';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rallies_clamp_expired ON public.rallies;
CREATE TRIGGER trg_rallies_clamp_expired
BEFORE UPDATE ON public.rallies
FOR EACH ROW
WHEN (OLD.status <> 'ended')
EXECUTE FUNCTION public.rallies_clamp_expired();

-- 2) End all expired 'active' rallies and return the ids
CREATE OR REPLACE FUNCTION public.auto_end_expired_rallies()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.rallies
     SET status = 'ended'
   WHERE status = 'active'
     AND expires_at <= now() AT TIME ZONE 'utc'
  RETURNING id;
$$;

-- Index to scan expired actives fast
CREATE INDEX IF NOT EXISTS ix_rallies_status_expires
  ON public.rallies(status, expires_at);

-- 3) Avoid multi-insert spam: one system/author per minute per thread/kind
CREATE UNIQUE INDEX IF NOT EXISTS uq_rally_messages_minute
ON public.rally_messages (
  thread_id,
  kind,
  COALESCE(author_profile, '00000000-0000-0000-0000-000000000000'::uuid),
  date_trunc('minute', created_at)
);