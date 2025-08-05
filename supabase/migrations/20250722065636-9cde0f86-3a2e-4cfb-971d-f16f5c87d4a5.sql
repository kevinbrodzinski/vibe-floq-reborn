-- Rich mentions system for floq chat - Fixed version
-- Phase 0: Core schema + automatic parsing

-- 1. First, add slug column to venues table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'venues' AND column_name = 'slug'
  ) THEN
    ALTER TABLE public.venues ADD COLUMN slug TEXT UNIQUE;
    -- Generate slugs from existing venue names if any exist
    UPDATE public.venues SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) WHERE name IS NOT NULL;
  END IF;
END
$$;

-- 2. Create mention target enum
CREATE TYPE public.mention_target AS ENUM ('user', 'venue', 'plan');

-- 3. Helper function for slug-to-id lookup (now that slug column exists)
CREATE OR REPLACE FUNCTION public.slug_to_id(tag TEXT, t mention_target)
RETURNS UUID 
LANGUAGE SQL 
STABLE 
AS $$
  SELECT CASE t
    WHEN 'user'  THEN (SELECT id FROM public.profiles WHERE username = tag)
    WHEN 'venue' THEN (SELECT id FROM public.venues WHERE slug = tag)
    WHEN 'plan'  THEN (SELECT id FROM public.floq_plans WHERE id::text = tag) -- Use ID for plans since no slug yet
  END;
$$;

-- 4. Create floq_message_mentions table
CREATE TABLE IF NOT EXISTS public.floq_message_mentions (
  id          BIGSERIAL PRIMARY KEY,
  message_id  UUID        NOT NULL REFERENCES public.floq_messages(id) ON DELETE CASCADE,
  target_type mention_target NOT NULL,
  target_id   UUID        NOT NULL,
  start_idx   INTEGER     NOT NULL,
  end_idx     INTEGER     NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS and inherit from floq_messages permissions
ALTER TABLE public.floq_message_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "floq_message_mentions_member_read"
ON public.floq_message_mentions
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.floq_messages m
    JOIN public.floq_participants fp ON fp.floq_id = m.floq_id
    WHERE m.id = floq_message_mentions.message_id
      AND fp.user_id = auth.uid()
  )
);

-- 6. Mention parsing trigger function
CREATE OR REPLACE FUNCTION public.parse_mentions()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
DECLARE
  m TEXT := NEW.body;
  mention_pattern CONSTANT TEXT := '@([a-zA-Z0-9_-]+)';
  match_result TEXT[];
  tag TEXT;
  tgt_uuid UUID;
  tgt_type mention_target;
  start_pos INTEGER;
  end_pos INTEGER;
  search_pos INTEGER := 1;
BEGIN
  -- Skip if body is null or empty
  IF m IS NULL OR LENGTH(m) = 0 THEN
    RETURN NEW;
  END IF;

  -- Loop over all @mentions in the message
  LOOP
    -- Find next @mention
    SELECT INTO match_result, start_pos 
      regexp_match(m, mention_pattern), 
      regexp_instr(m, mention_pattern, search_pos);
    
    -- Exit if no more matches
    EXIT WHEN match_result IS NULL OR start_pos = 0;
    
    tag := match_result[1]; -- Extract the tag without @
    end_pos := start_pos + LENGTH('@' || tag) - 1;
    
    -- Try to resolve the mention (user -> venue -> plan priority)
    tgt_uuid := slug_to_id(tag, 'user');
    tgt_type := 'user';
    
    IF tgt_uuid IS NULL THEN
      tgt_uuid := slug_to_id(tag, 'venue');
      tgt_type := 'venue';
    END IF;
    
    IF tgt_uuid IS NULL THEN
      tgt_uuid := slug_to_id(tag, 'plan');
      tgt_type := 'plan';
    END IF;

    -- Store the mention if we found a valid target
    IF tgt_uuid IS NOT NULL THEN
      INSERT INTO public.floq_message_mentions
        (message_id, target_type, target_id, start_idx, end_idx)
      VALUES
        (NEW.id, tgt_type, tgt_uuid, start_pos, end_pos);
    END IF;

    -- Move search position forward
    search_pos := end_pos + 1;
  END LOOP;

  RETURN NEW;
END;
$$;

-- 7. Create the trigger
DROP TRIGGER IF EXISTS trg_parse_mentions ON public.floq_messages;
CREATE TRIGGER trg_parse_mentions
  AFTER INSERT ON public.floq_messages
  FOR EACH ROW 
  EXECUTE FUNCTION public.parse_mentions();

-- 8. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_floq_message_mentions_message_id 
ON public.floq_message_mentions(message_id);

CREATE INDEX IF NOT EXISTS idx_floq_message_mentions_target 
ON public.floq_message_mentions(target_type, target_id);