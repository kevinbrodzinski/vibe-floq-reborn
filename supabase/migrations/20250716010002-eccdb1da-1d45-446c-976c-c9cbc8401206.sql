-- Create moment type enum
CREATE TYPE afterglow_moment_type AS ENUM (
  'floq_joined', 'floq_left', 'vibe_change', 'location_arrived', 
  'location_left', 'crossed_paths', 'plan_started', 'plan_ended',
  'peak_energy', 'social_boost', 'solo_moment'
);

-- Create daily_afterglow table
CREATE TABLE public.daily_afterglow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  vibe_path TEXT[],
  emotion_journey JSONB DEFAULT '[]'::jsonb,
  peak_vibe_time TIMESTAMPTZ,
  dominant_vibe TEXT,
  total_venues INTEGER DEFAULT 0,
  total_floqs INTEGER DEFAULT 0,
  crossed_paths_count INTEGER DEFAULT 0,
  energy_score INTEGER DEFAULT 0,
  social_intensity INTEGER DEFAULT 0,
  summary_text TEXT,
  moments JSONB DEFAULT '[]'::jsonb,
  is_pinned BOOLEAN DEFAULT false,
  share_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  regenerated_at TIMESTAMPTZ,
  
  CONSTRAINT fk_daily_afterglow_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Create floq_afterglow table
CREATE TABLE public.floq_afterglow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  floq_id UUID NOT NULL,
  date DATE,
  join_time TIMESTAMPTZ,
  leave_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  vibe_at_join TEXT,
  vibe_at_leave TEXT,
  vibe_changes JSONB DEFAULT '[]'::jsonb,
  people_seen UUID[] DEFAULT '{}'::uuid[],
  chat_highlights JSONB DEFAULT '[]'::jsonb,
  location_name TEXT,
  peak_moment_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT fk_floq_afterglow_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_floq_afterglow_floq FOREIGN KEY (floq_id) REFERENCES public.floqs(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_floq_date UNIQUE (user_id, floq_id, date)
);

-- Create plan_afterglow table
CREATE TABLE public.plan_afterglow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  date DATE,
  group_vibe_arc JSONB DEFAULT '[]'::jsonb,
  shared_moments JSONB DEFAULT '[]'::jsonb,
  my_contribution TEXT,
  group_energy_peak TIMESTAMPTZ,
  ending_sentiment TEXT,
  would_repeat_score INTEGER CHECK (would_repeat_score BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT fk_plan_afterglow_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_plan_afterglow_plan FOREIGN KEY (plan_id) REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_plan_date UNIQUE (user_id, plan_id, date)
);

-- Create afterglow_moments table
CREATE TABLE public.afterglow_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_afterglow_id UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  moment_type afterglow_moment_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT CHECK (color ~* '^#?[0-9A-F]{6}$' OR color ~* '^[a-z_]+$'),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT fk_afterglow_moments_daily FOREIGN KEY (daily_afterglow_id) REFERENCES public.daily_afterglow(id) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_daily_afterglow_user_date 
  ON public.daily_afterglow(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_floq_afterglow_user_date 
  ON public.floq_afterglow(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_plan_afterglow_user_date 
  ON public.plan_afterglow(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_afterglow_moments_daily_timestamp 
  ON public.afterglow_moments(daily_afterglow_id, timestamp);

-- GIN index on JSONB for fast lookups
CREATE INDEX IF NOT EXISTS gin_moments_metadata 
  ON public.afterglow_moments USING gin (metadata jsonb_path_ops);

-- Create RLS policies
CREATE POLICY "Users can manage their own daily afterglow"
  ON public.daily_afterglow
  FOR ALL USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their own floq afterglow"
  ON public.floq_afterglow
  FOR ALL USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their own plan afterglow"
  ON public.plan_afterglow
  FOR ALL USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their own afterglow moments"
  ON public.afterglow_moments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.daily_afterglow 
      WHERE id = afterglow_moments.daily_afterglow_id 
      AND user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_afterglow 
      WHERE id = afterglow_moments.daily_afterglow_id 
      AND user_id = auth.uid()
    )
  );

-- Enable RLS after policies are defined
ALTER TABLE public.daily_afterglow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floq_afterglow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_afterglow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afterglow_moments ENABLE ROW LEVEL SECURITY;