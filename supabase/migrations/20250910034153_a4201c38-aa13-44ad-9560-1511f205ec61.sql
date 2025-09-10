-- Add device tokens index for faster lookups
CREATE INDEX IF NOT EXISTS device_tokens_profile_id_idx ON device_tokens(profile_id);