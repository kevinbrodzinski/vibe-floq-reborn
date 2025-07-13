-- Set default activity score for floqs
ALTER TABLE floqs ALTER COLUMN activity_score SET DEFAULT 1;

-- Backfill existing floqs with 0 activity_score
UPDATE floqs 
SET activity_score = 1 
WHERE activity_score = 0 OR activity_score IS NULL;