-- Create Rally system tables and functions

-- Main rallies table
CREATE TABLE IF NOT EXISTS public.rallies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  center GEOMETRY(Point, 4326) NOT NULL,
  venue_id UUID NULL REFERENCES public.venues(id),
  note TEXT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended','expired'))
);

-- Rally invitations table
CREATE TABLE IF NOT EXISTS public.rally_invites (
  rally_id UUID NOT NULL REFERENCES public.rallies(id) ON DELETE CASCADE,
  to_profile UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','joined','declined')),
  responded_at TIMESTAMPTZ NULL,
  PRIMARY KEY (rally_id, to_profile)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rallies_creator_time ON public.rallies(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rallies_expires ON public.rallies(expires_at);
CREATE INDEX IF NOT EXISTS idx_rally_invites_to ON public.rally_invites(to_profile);
CREATE INDEX IF NOT EXISTS idx_rallies_status ON public.rallies(status);

-- Enable RLS
ALTER TABLE public.rallies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rally_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rallies
CREATE POLICY "rallies_creator_full_access" ON public.rallies
  FOR ALL USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "rallies_invited_read" ON public.rallies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rally_invites ri 
      WHERE ri.rally_id = rallies.id AND ri.to_profile = auth.uid()
    )
  );

-- RLS Policies for rally_invites  
CREATE POLICY "rally_invites_creator_read" ON public.rally_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rallies r 
      WHERE r.id = rally_invites.rally_id AND r.creator_id = auth.uid()
    )
  );

CREATE POLICY "rally_invites_invitee_manage" ON public.rally_invites
  FOR ALL USING (to_profile = auth.uid())
  WITH CHECK (to_profile = auth.uid());

-- Secure function for rally inbox
CREATE OR REPLACE FUNCTION public.rally_inbox_secure()
RETURNS TABLE (
  rally_id UUID,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  center_lng DOUBLE PRECISION,
  center_lat DOUBLE PRECISION,
  venue_id UUID,
  note TEXT,
  creator_id UUID,
  creator_name TEXT,
  creator_avatar TEXT,
  invite_status TEXT,
  responded_at TIMESTAMPTZ,
  joined_count INTEGER
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH me AS (
    SELECT auth.uid() AS uid
  ),
  my_invites AS (
    SELECT ri.rally_id, ri.status AS invite_status, ri.responded_at
    FROM public.rally_invites ri 
    JOIN me ON ri.to_profile = me.uid
  ),
  joined AS (
    SELECT rally_id, COUNT(*)::INT AS joined_count
    FROM public.rally_invites
    WHERE status = 'joined'
    GROUP BY rally_id
  )
  SELECT
    r.id AS rally_id,
    r.created_at,
    r.expires_at,
    ST_X(r.center::geometry) AS center_lng,
    ST_Y(r.center::geometry) AS center_lat,
    r.venue_id,
    r.note,
    r.creator_id,
    p.display_name AS creator_name,
    p.avatar_url AS creator_avatar,
    mi.invite_status,
    mi.responded_at,
    COALESCE(j.joined_count, 0) AS joined_count
  FROM public.rallies r
  JOIN my_invites mi ON mi.rally_id = r.id
  LEFT JOIN joined j ON j.rally_id = r.id
  LEFT JOIN public.profiles p ON p.id = r.creator_id
  WHERE (r.expires_at IS NULL OR r.expires_at > NOW())
    AND r.status = 'active'
  ORDER BY r.created_at DESC;
$$;