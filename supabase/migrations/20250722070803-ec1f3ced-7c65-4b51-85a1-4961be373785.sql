-- Step 3: Create improved parse mentions trigger
CREATE OR REPLACE FUNCTION public.parse_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
DECLARE
  _matches text[];
  _match text;
  _start_idx integer;
  _end_idx integer;
  _tgt_type mention_target;
  _tgt_id uuid;
BEGIN
  IF NEW.body IS NULL OR NEW.body = '' THEN
    RETURN NEW;
  END IF;

  -- Extract all @mentions at once
  _matches := regexp_matches(NEW.body, '@([a-zA-Z0-9_-]{2,32})', 'g');
  
  -- Process each match
  FOR i IN 1..array_length(_matches, 1) LOOP
    _match := _matches[i];
    
    -- Find position of this match in the original text
    _start_idx := position('@' || _match in NEW.body);
    _end_idx := _start_idx + length('@' || _match);
    
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
  END LOOP;

  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_parse_mentions ON public.floq_messages;
CREATE TRIGGER trg_parse_mentions
  AFTER INSERT ON public.floq_messages
  FOR EACH ROW EXECUTE FUNCTION public.parse_mentions();

-- Create chat message view for easy querying
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