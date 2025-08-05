-- Add 'invited' status to plan_status_enum if it doesn't exist
ALTER TYPE plan_status_enum ADD VALUE IF NOT EXISTS 'invited';