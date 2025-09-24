-- Update daily_afterglow table structure to match function requirements
DROP TABLE IF EXISTS public.daily_afterglow CASCADE;

CREATE TABLE IF NOT EXISTS public.daily_afterglow (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,

  "date"                  date NOT NULL,
  dominant_vibe           text,
  vibe_path               text[]                         DEFAULT '{}',
  peak_vibe_time          timestamptz,

  energy_score            int    CHECK (energy_score BETWEEN 0 AND 100),
  social_intensity        int    CHECK (social_intensity BETWEEN 0 AND 100),

  crossed_paths_count     int    DEFAULT 0,
  total_floqs             int    DEFAULT 0,
  total_venues            int    DEFAULT 0,

  emotion_journey         jsonb  DEFAULT '[]'::jsonb,
  moments                 jsonb  DEFAULT '[]'::jsonb,
  summary_text            text,
  is_pinned               bool   DEFAULT false,

  created_at              timestamptz DEFAULT now(),
  regenerated_at          timestamptz,

  CONSTRAINT uniq_user_day UNIQUE (user_id, "date")
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_afterglow_user_date
  ON public.daily_afterglow (user_id, "date" DESC);

CREATE INDEX IF NOT EXISTS idx_daily_afterglow_date
  ON public.daily_afterglow ("date" DESC);

-- RLS
ALTER TABLE public.daily_afterglow ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_afterglow_owner
  ON public.daily_afterglow
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());