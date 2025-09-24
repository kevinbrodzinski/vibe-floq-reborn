-- Create friend sharing preference table
CREATE TABLE IF NOT EXISTS public.friend_share_pref (
  user_id     uuid    NOT NULL,
  friend_id   uuid    NOT NULL,
  is_live     boolean NOT NULL DEFAULT false,
  updated_at  timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, friend_id)
);

-- Enable RLS
ALTER TABLE public.friend_share_pref ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - users can only manage their own preferences
CREATE POLICY "me_only"
  ON public.friend_share_pref
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create RPC function to update sharing preference
CREATE OR REPLACE FUNCTION public.set_live_share(
  _friend uuid,
  _on     boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.friend_share_pref(user_id, friend_id, is_live)
  VALUES (auth.uid(), _friend, _on)
  ON CONFLICT (user_id, friend_id)
  DO UPDATE SET is_live = EXCLUDED.is_live,
               updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_live_share(uuid, boolean) TO authenticated;