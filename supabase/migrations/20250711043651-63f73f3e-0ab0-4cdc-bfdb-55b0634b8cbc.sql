-- Update existing users to have always_immersive_venues enabled by default
UPDATE user_settings 
SET privacy_settings = jsonb_set(
  COALESCE(privacy_settings, '{}'),
  '{always_immersive_venues}',
  'true'
)
WHERE privacy_settings->>'always_immersive_venues' IS NULL;