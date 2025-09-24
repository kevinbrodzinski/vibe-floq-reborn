-- Drop and recreate functions to fix citext compatibility issues

-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_friends_with_profile();

-- Recreate function with correct citext return type
CREATE OR REPLACE FUNCTION public.get_friends_with_profile()
RETURNS TABLE(
    friendship_id text, 
    friend_id uuid, 
    username citext, 
    display_name text, 
    avatar_url text, 
    bio text, 
    friend_since timestamp with time zone, 
    friendship_created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
    return query
    select  
            f.user_id || '_' || f.friend_id   as friendship_id,
            case
              when f.user_id = auth.uid() then f.friend_id
              else f.user_id
            end                              as friend_id,
            p.username,
            p.display_name,
            p.avatar_url,
            p.bio,
            p.created_at                     as friend_since,
            f.created_at                     as friendship_created_at
    from    friendships f
    join    profiles p
          on p.id = case
                     when f.user_id = auth.uid() then f.friend_id
                     else f.user_id
                   end
    where   (f.user_id = auth.uid() OR f.friend_id = auth.uid());
end;
$function$;