-- 1. Enable trigram extension for fast ILIKE searches (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create index on display_name for fast search (idempotent, unique name)
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm_search
  ON public.profiles USING gin ((lower(display_name)) gin_trgm_ops);

-- 3. RPC: case-insensitive username search excluding current user and friends
CREATE OR REPLACE FUNCTION public.search_users(search_query text)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.avatar_url, p.created_at
  FROM public.profiles p
  WHERE length(trim(search_query)) >= 2
    AND lower(p.display_name) ILIKE '%' || lower(trim(search_query)) || '%'
    AND p.id <> auth.uid()
    AND p.display_name IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.friendships f
      WHERE (f.user_id = auth.uid() AND f.friend_id = p.id)
         OR (f.friend_id = auth.uid() AND f.user_id = p.id)
    )
  ORDER BY 
    -- Exact matches first, then prefix matches, then contains
    CASE 
      WHEN lower(p.display_name) = lower(trim(search_query)) THEN 1
      WHEN lower(p.display_name) LIKE lower(trim(search_query)) || '%' THEN 2
      ELSE 3
    END,
    p.display_name
  LIMIT 20;
$$;

-- 4. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.search_users(text) TO authenticated;

-- 5. Add RLS policy for profiles read access (friends can see each other's basic info)
DROP POLICY IF EXISTS "Public profiles basic read access" ON public.profiles;
CREATE POLICY "Public profiles basic read access" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.friendships f 
    WHERE (f.user_id = auth.uid() AND f.friend_id = profiles.id)
       OR (f.friend_id = auth.uid() AND f.user_id = profiles.id)
  )
);