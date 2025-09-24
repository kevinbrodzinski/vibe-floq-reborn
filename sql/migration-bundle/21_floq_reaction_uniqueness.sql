BEGIN;

-- one reaction per user per emoji per message
ALTER TABLE public.floq_message_reactions
ADD CONSTRAINT uniq_reaction_once
UNIQUE (message_id, user_id, emoji);

COMMIT;