
-- 1. Enable trigram extension for fast ILIKE searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create index on username for fast search
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm
  ON public.profiles USING gin ((lower(display_name)) gin_trgm_ops);

-- 3. RPC: case-insensitive username search excluding current user and friends
CREATE OR REPLACE FUNCTION public.search_users(query text)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT p.id, p.display_name, p.avatar_url, p.created_at
  FROM public.profiles p
  WHERE lower(p.display_name) ILIKE '%' || lower(query) || '%'
    AND p.id <> auth.uid()
    AND NOT EXISTS (
      SELECT 1
      FROM public.friendships f
      WHERE (f.user_id = auth.uid() AND f.friend_id = p.id)
         OR (f.friend_id = auth.uid() AND f.user_id = p.id)
    )
  ORDER BY p.display_name
  LIMIT 20;
$$;

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.search_users TO authenticated;
