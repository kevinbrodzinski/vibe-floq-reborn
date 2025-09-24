-- Add case-insensitive unique constraint for usernames
ALTER TABLE profiles ADD CONSTRAINT uniq_lowercase_username UNIQUE(lower(username));