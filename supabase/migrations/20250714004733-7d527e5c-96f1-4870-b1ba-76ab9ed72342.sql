-- Add length constraint for description field
ALTER TABLE public.floqs 
ADD CONSTRAINT chk_description_len 
CHECK (char_length(description) <= 140);