-- friend_share_pref table for tracking live location sharing preferences
CREATE TABLE IF NOT EXISTS public.friend_share_pref (
  user_id   uuid NOT NULL,
  friend_id uuid NOT NULL,
  is_live   boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, friend_id)
);

-- Enable RLS
ALTER TABLE public.friend_share_pref ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only manage their own sharing preferences
CREATE POLICY "owner_rw" ON public.friend_share_pref
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RPC function used by the toggle component
CREATE OR REPLACE FUNCTION public.set_live_share(
  _friend uuid,
  _on     boolean DEFAULT true
) 
RETURNS void
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public 
AS $$
  INSERT INTO friend_share_pref(user_id, friend_id, is_live, updated_at)
  VALUES (auth.uid(), _friend, _on, now())
  ON CONFLICT (user_id, friend_id)
  DO UPDATE SET 
    is_live = EXCLUDED.is_live, 
    updated_at = now();
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.set_live_share(uuid, boolean) TO authenticated;