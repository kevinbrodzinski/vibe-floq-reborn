BEGIN;

-- Foreign-key constraint for replies
ALTER TABLE public.floq_messages
  ADD CONSTRAINT fk_floq_reply
  FOREIGN KEY (reply_to_id) REFERENCES public.floq_messages(id)
  ON DELETE SET NULL;

COMMIT;