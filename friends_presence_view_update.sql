BEGIN;

/* 1 ▸ remove any previous version. 
       CASCADE is safe because only dependent objects (if any)
       that *also* reference the view will be dropped.            */
DROP VIEW IF EXISTS public.v_friends_with_presence CASCADE;

/* 2 ▸ create the clean view – same definition I sent earlier */
CREATE VIEW public.v_friends_with_presence AS
SELECT
  CASE
    WHEN f.user_low = auth.uid() THEN f.user_high
    ELSE                              f.user_low
  END                                   AS friend_id,

  p.display_name,
  p.username,
  p.avatar_url,

  pr.started_at,
  pr.vibe_tag,
  (pr.profile_id IS NOT NULL)          AS online,

  f.friend_state,
  f.created_at,
  f.responded_at

FROM public.friendships  AS f
JOIN public.profiles     AS p
  ON p.id = CASE
              WHEN f.user_low = auth.uid() THEN f.user_high
              ELSE                              f.user_low
            END
LEFT JOIN public.presence AS pr
  ON pr.profile_id = p.id
WHERE auth.uid() IN (f.user_low, f.user_high);

ALTER VIEW public.v_friends_with_presence OWNER TO postgres;

COMMIT;