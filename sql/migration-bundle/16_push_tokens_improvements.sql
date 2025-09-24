-- 1. Verify and improve user_push_tokens table
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  user_id      uuid            not null references auth.users(id) on delete cascade,
  device_id    text            not null,
  token        text            not null,
  platform     text            not null check (platform in ('ios','android','web')),
  last_seen_at timestamptz     not null default now(),
  badge_count  int             not null default 0,
  primary key  (user_id, device_id)
);

-- Add unique constraint on token (Expo re-uses tokens across apps)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_push_tokens_token_unique 
  ON public.user_push_tokens(token);

-- Ensure RLS is enabled
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Improved RLS policies
DROP POLICY IF EXISTS push_token_owner_all ON public.user_push_tokens;
CREATE POLICY push_token_owner_select
  ON public.user_push_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY push_token_owner_insert
  ON public.user_push_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY push_token_owner_update
  ON public.user_push_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Improved store_push_token RPC
CREATE OR REPLACE FUNCTION public.store_push_token(
  p_device_id text,
  p_token     text,
  p_platform  text
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  INSERT INTO public.user_push_tokens
         (user_id, device_id, token, platform, last_seen_at)
  VALUES (auth.uid(), p_device_id, p_token, p_platform, now())
  ON CONFLICT (user_id, device_id)
       DO UPDATE SET token        = excluded.token,
                     platform     = excluded.platform,
                     last_seen_at = now()
  RETURNING jsonb_build_object('ok', true);
$$;

-- 3. Improved reset_badge RPC
CREATE OR REPLACE FUNCTION public.reset_badge() 
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  UPDATE public.user_push_tokens
     SET badge_count = 0
   WHERE user_id = auth.uid()
  RETURNING jsonb_build_object('ok', true);
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.store_push_token TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.reset_badge TO authenticated;