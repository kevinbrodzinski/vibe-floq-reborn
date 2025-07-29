-- Enable required extensions for local Supabase instance
-- Run this before the batch function updates

-- Enable citext extension (case-insensitive text)
CREATE EXTENSION IF NOT EXISTS citext;

-- Enable PostGIS extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable uuid-ossp for uuid functions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify extensions are enabled
SELECT extname, extversion FROM pg_extension WHERE extname IN ('citext', 'postgis', 'pgcrypto', 'uuid-ossp'); 