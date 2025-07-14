-- Create enum type for welcome message templates
CREATE TYPE welcome_template_enum AS ENUM (
  'casual-hangout',
  'professional-meetup',
  'event-based',
  'study-group',
  'creative-collab',
  'support-group'
);

-- Add preferred_welcome_template column to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN preferred_welcome_template welcome_template_enum DEFAULT 'casual-hangout';

-- Add comment explaining the column
COMMENT ON COLUMN public.user_settings.preferred_welcome_template IS 'User''s preferred welcome message template for new floqs';