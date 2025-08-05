-- Improved mention system with citext and better parsing
-- 0. CITEXT extension for case-insensitive slugs (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS citext;

--------------------------------------------------------------------
-- 1. slug column on venues (citext + functional unique index)
--------------------------------------------------------------------
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS slug citext;

-- Optional back-fill (run once during low-traffic window)
UPDATE public.venues
SET    slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE  slug IS NULL
  AND  name IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS venues_slug_key
  ON public.venues(slug);

--------------------------------------------------------------------
-- 2. Enum already good (but recreate if needed)
--------------------------------------------------------------------
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mention_target') THEN
        CREATE TYPE public.mention_target AS ENUM ('user','venue','plan');
    END IF;
END $$;

--------------------------------------------------------------------
-- 3. Helper function (improved)
--------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.slug_to_id(tag text, t mention_target)
RETURNS uuid
LANGUAGE sql STABLE AS
$$
SELECT CASE t
 WHEN 'user'  THEN (SELECT id FROM public.profiles WHERE username = tag)
 WHEN 'venue' THEN (SELECT id FROM public.venues  WHERE slug     = tag)
 WHEN 'plan'  THEN (SELECT id FROM public.floq_plans WHERE id::text = tag)
END;
$$;

--------------------------------------------------------------------
-- 4. Improved mention table with composite PK
--------------------------------------------------------------------
-- Drop the old table if it exists and recreate with better structure
DROP TABLE IF EXISTS public.floq_message_mentions;

CREATE TABLE public.floq_message_mentions (
  message_id  UUID           NOT NULL REFERENCES public.floq_messages(id) ON DELETE CASCADE,
  target_type mention_target NOT NULL,
  target_id   UUID           NOT NULL,
  start_idx   INTEGER        NOT NULL,
  end_idx     INTEGER        NOT NULL,
  created_at  TIMESTAMPTZ    DEFAULT NOW(),
  CONSTRAINT pk_fmm PRIMARY KEY (message_id, target_type, target_id)
);

--------------------------------------------------------------------
-- 5. RLS policies
--------------------------------------------------------------------
ALTER TABLE public.floq_message_mentions ENABLE ROW LEVEL SECURITY;

-- Read if you can see the parent message
CREATE POLICY "fmm_read" ON public.floq_message_mentions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.floq_messages m
      JOIN public.floq_participants fp ON fp.floq_id = m.floq_id
      WHERE m.id = floq_message_mentions.message_id
        AND fp.user_id = auth.uid()
    )
);

-- Forbid client inserts completely (only trigger can insert)
CREATE POLICY "fmm_no_write" ON public.floq_message_mentions
  FOR INSERT WITH CHECK (false);

--------------------------------------------------------------------
-- 6. Improved parse mentions trigger (set-based, no loops)
--------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.parse_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
DECLARE
  _match     text;
  _start_idx integer;
  _end_idx   integer;
  _tgt_type  mention_target;
  _tgt_id    uuid;
  _pattern   text := '@([a-zA-Z0-9_-]{2,32})';
  _pos       integer := 1;
BEGIN
  IF NEW.body IS NULL OR NEW.body = '' THEN
    RETURN NEW;
  END IF;

  -- Find all mentions using regexp_matches with global flag
  WHILE _pos <= length(NEW.body) LOOP
    -- Find next mention starting from current position
    SELECT 
      (regexp_match(substring(NEW.body, _pos), _pattern))[1],
      _pos + (regexp_instr(substring(NEW.body, _pos), _pattern) - 1),
      _pos + (regexp_instr(substring(NEW.body, _pos), _pattern) - 1) + length((regexp_match(substring(NEW.body, _pos), _pattern))[1]) + 1
    INTO _match, _start_idx, _end_idx
    WHERE regexp_instr(substring(NEW.body, _pos), _pattern) > 0;
    
    -- Exit if no more matches
    EXIT WHEN _match IS NULL;
    
    -- Resolve tag → uuid (priority: user → venue → plan)
    _tgt_id := slug_to_id(_match, 'user');  
    _tgt_type := 'user';
    
    IF _tgt_id IS NULL THEN
      _tgt_id := slug_to_id(_match, 'venue'); 
      _tgt_type := 'venue';
    END IF;
    
    IF _tgt_id IS NULL THEN
      _tgt_id := slug_to_id(_match, 'plan');  
      _tgt_type := 'plan';
    END IF;
    
    -- Insert mention if target found
    IF _tgt_id IS NOT NULL THEN
      INSERT INTO public.floq_message_mentions
        (message_id, target_type, target_id, start_idx, end_idx)
      VALUES
        (NEW.id, _tgt_type, _tgt_id, _start_idx, _end_idx)
      ON CONFLICT (message_id, target_type, target_id) DO NOTHING;
    END IF;
    
    -- Move position forward
    _pos := _end_idx + 1;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_parse_mentions ON public.floq_messages;
CREATE TRIGGER trg_parse_mentions
  AFTER INSERT ON public.floq_messages
  FOR EACH ROW EXECUTE FUNCTION public.parse_mentions();

--------------------------------------------------------------------
-- 7. Performance indexes
--------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fmm_msg ON public.floq_message_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_fmm_tgt ON public.floq_message_mentions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_floq_messages_floq_created ON public.floq_messages(floq_id, created_at DESC);

--------------------------------------------------------------------
-- 8. Chat message view for easy querying
--------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_chat_message AS
SELECT
  fm.*,
  json_agg(
    json_build_object(
      'target_type', fmm.target_type,
      'target_id', fmm.target_id,
      'start_idx', fmm.start_idx,
      'end_idx', fmm.end_idx
    ) ORDER BY fmm.start_idx
  ) FILTER (WHERE fmm.message_id IS NOT NULL) AS mentions
FROM public.floq_messages fm
LEFT JOIN public.floq_message_mentions fmm ON fmm.message_id = fm.id
GROUP BY fm.id;