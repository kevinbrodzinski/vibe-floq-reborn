/*─────────────────────────────────────────────────────────────
  Re-create get_friends_with_presence() for the new schema
─────────────────────────────────────────────────────────────*/
DROP FUNCTION IF EXISTS public.get_friends_with_presence CASCADE;

/*  Return one row per accepted friend, plus their latest vibe-
    presence snapshot (if any).                                  */
CREATE OR REPLACE FUNCTION public.get_friends_with_presence()
RETURNS TABLE (
  friend_profile_id  uuid,
  username           text,
  display_name       text,
  avatar_url         text,
  last_seen          timestamptz,
  vibe               vibe_enum,      -- same enum used in vibes_now
  location           geography,
  is_live            boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  /* 1.  Figure out every "other profile" for the caller. */
  RETURN QUERY
  SELECT
      /* which column of friendships points at "the other side"? */
      (CASE WHEN f.user_low = auth.uid() THEN f.user_high
            ELSE                      f.user_low  END)              AS friend_profile_id,

      p.username,
      p.display_name,
      p.avatar_url,

      vn.updated_at                                                AS last_seen,
      vn.vibe,            -- enum already, no ::text cast needed
      vn.location,        -- geography(Point,4326)
      (vn.expires_at > now())                                      AS is_live

  FROM public.friendships f
  JOIN public.profiles      p  ON p.id = (
                                   CASE WHEN f.user_low = auth.uid()
                                        THEN f.user_high ELSE f.user_low END )
  LEFT JOIN public.vibes_now vn ON vn.profile_id = p.id

  WHERE f.friend_state = 'accepted'
    AND (f.user_low = auth.uid() OR f.user_high = auth.uid())

  /* Always surface live friends first, newest-updated at top.  */
  ORDER BY (vn.expires_at > now()) DESC, vn.updated_at DESC NULLS LAST;
END;
$$;

/* Allow normal signed-in users to call it. */
GRANT EXECUTE ON FUNCTION public.get_friends_with_presence() TO authenticated;