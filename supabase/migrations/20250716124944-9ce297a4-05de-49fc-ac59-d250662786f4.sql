-- Create user_preferences table for vibe personalization and behavior tracking
CREATE TABLE public.user_preferences (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_vibe TEXT DEFAULT 'chill',
  vibe_color TEXT DEFAULT '#cfe8f5',
  vibe_strength INTEGER DEFAULT 50 CHECK (vibe_strength >= 0 AND vibe_strength <= 100),
  checkin_streak INTEGER DEFAULT 0,
  favorite_locations TEXT[] DEFAULT '{}',
  feedback_sentiment JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function: update_user_preferences_from_feedback
CREATE OR REPLACE FUNCTION public.update_user_preferences_from_feedback(
  p_user_id UUID,
  p_vibe TEXT,
  p_moment TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id, preferred_vibe, vibe_color)
  VALUES (
    p_user_id,
    p_vibe,
    CASE p_vibe
      WHEN 'chill' THEN '#cfe8f5'
      WHEN 'energetic' THEN '#fef08a'
      WHEN 'romantic' THEN '#fce7f3'
      WHEN 'wild' THEN '#e9d5ff'
      WHEN 'cozy' THEN '#fed7d7'
      WHEN 'deep' THEN '#ccfbf1'
      ELSE '#e5e7eb'
    END
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    preferred_vibe = EXCLUDED.preferred_vibe,
    vibe_color = EXCLUDED.vibe_color,
    feedback_sentiment = user_preferences.feedback_sentiment || jsonb_build_object('latest_moment', p_moment),
    updated_at = now();
END;
$$;

-- Function: get_plan_summary
CREATE OR REPLACE FUNCTION public.get_plan_summary(p_plan_id UUID)
RETURNS TABLE (
  plan_id UUID,
  summary TEXT,
  summary_mode TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.plan_id,
    s.summary,
    s.mode::text AS summary_mode,
    s.created_at
  FROM public.plan_summaries s
  WHERE s.plan_id = p_plan_id
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_user_preferences_from_feedback(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_plan_summary(UUID) TO authenticated;