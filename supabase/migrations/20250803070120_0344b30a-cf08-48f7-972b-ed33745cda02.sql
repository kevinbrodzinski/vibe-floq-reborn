-- Create trigram extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for fuzzy search on friend names
CREATE INDEX IF NOT EXISTS idx_profiles_search_trgm
ON profiles
USING gin ((display_name || ' ' || COALESCE(username, '')) gin_trgm_ops);