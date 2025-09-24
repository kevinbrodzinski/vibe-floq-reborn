-- Enable required extensions for location pipeline
-- idempotent: only installs once

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- pg_cron is already enabled in the dashboard, but keep guard:
CREATE EXTENSION IF NOT EXISTS pg_cron;