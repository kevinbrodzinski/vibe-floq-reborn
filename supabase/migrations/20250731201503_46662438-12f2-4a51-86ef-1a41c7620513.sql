-- 2025-08-01 · Messaging patch 1 (fix FK + enable RLS)

------------------------------------------------------------
-- 0 ▸ Correct wrong FK on dm_message_reactions.profile_id
------------------------------------------------------------
-- Drop wrong FK
ALTER TABLE public.dm_message_reactions
  DROP CONSTRAINT IF EXISTS fk_dm_reactions_profile;

-- Ensure profiles FK
ALTER TABLE public.dm_message_reactions
  ADD CONSTRAINT fk_dm_reactions_profile
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

------------------------------------------------------------
-- 1 ▸ Enable RLS where missing
------------------------------------------------------------
ALTER TABLE public.dm_message_reactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_reactions     ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- 2 ▸ Required helper: user_in_floq_or_creator
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_in_floq_or_creator(p_plan_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.floq_plans fp
    LEFT JOIN public.floqs f ON f.id = fp.floq_id
    WHERE fp.id = p_plan_id
      AND (
        fp.creator_profile_id = p_user_id OR      -- plan creator
        EXISTS (SELECT 1 FROM public.floq_participants
                 WHERE floq_id = f.id AND profile_id = p_user_id)
      )
  );
$$;

------------------------------------------------------------
-- 3 ▸ Remove duplicate member index
------------------------------------------------------------
DROP INDEX IF EXISTS idx_direct_threads_members;