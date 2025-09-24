-- Fix the trigger to reference correct table name
CREATE OR REPLACE FUNCTION parse_mentions()
RETURNS TRIGGER AS $$
DECLARE
  mention_text text;
  username_part text;
  mentioned_user_id uuid;
BEGIN
  -- Clear existing mentions for this message
  DELETE FROM floq_message_mentions WHERE message_id = NEW.id;
  
  -- Extract mentions from message body using regexp_split_to_array
  FOR mention_text IN 
    SELECT unnest(regexp_split_to_array(NEW.body, '\s+'))
  LOOP
    -- Check if this word is a mention (starts with @)
    IF mention_text LIKE '@%' AND length(mention_text) > 1 THEN
      -- Extract username (remove @ prefix)
      username_part := substring(mention_text from 2);
      
      -- Find the user by username
      SELECT id INTO mentioned_user_id 
      FROM profiles 
      WHERE username = username_part;
      
      -- If user found, insert mention record
      IF mentioned_user_id IS NOT NULL THEN
        INSERT INTO floq_message_mentions (message_id, mentioned_user_id)
        VALUES (NEW.id, mentioned_user_id)
        ON CONFLICT (message_id, mentioned_user_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;