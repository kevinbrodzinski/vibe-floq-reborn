-- Ensure 'draft' value exists in plan_status_enum
ALTER TYPE plan_status_enum ADD VALUE IF NOT EXISTS 'draft';