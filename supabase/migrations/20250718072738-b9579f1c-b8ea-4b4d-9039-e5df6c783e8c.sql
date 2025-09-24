-- Create friend trails table for safe-restart buffer
CREATE TABLE IF NOT EXISTS public.friend_trails (
  user_id UUID NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (user_id, ts)
);

-- Enable RLS
ALTER TABLE public.friend_trails ENABLE ROW LEVEL SECURITY;

-- Users can only access their own trails and their friends' trails
CREATE POLICY "Users can access own and friends trails" 
ON public.friend_trails 
FOR ALL 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.friendships f 
    WHERE (f.user_id = auth.uid() AND f.friend_id = friend_trails.user_id) OR
          (f.friend_id = auth.uid() AND f.user_id = friend_trails.user_id)
  )
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_friend_trails_user_ts ON public.friend_trails (user_id, ts DESC);