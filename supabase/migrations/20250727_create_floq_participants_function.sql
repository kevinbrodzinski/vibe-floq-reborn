-- Create function to get floq participants with avatars
CREATE OR REPLACE FUNCTION public.get_floq_participants_with_avatars(
  p_floq_id UUID,
  p_limit INTEGER DEFAULT 6
)
RETURNS TABLE (
  user_id UUID,
  avatar_url TEXT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 
    fp.user_id,
    p.avatar_url
  FROM public.floq_participants fp
  INNER JOIN public.profiles p ON fp.user_id = p.id
  WHERE fp.floq_id = p_floq_id
  LIMIT p_limit;
$$; 