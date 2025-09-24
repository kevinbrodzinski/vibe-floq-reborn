-- Favorites table (per user)
CREATE TABLE IF NOT EXISTS public.venue_favorites (
  profile_id UUID NOT NULL DEFAULT auth.uid(),
  venue_id   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, venue_id)
);

-- RLS
ALTER TABLE public.venue_favorites ENABLE ROW LEVEL SECURITY;

-- Owners can read their favorites
CREATE POLICY "fav_select_own" ON public.venue_favorites
  FOR SELECT USING (auth.uid() = profile_id);

-- Owners can insert their favorites
CREATE POLICY "fav_insert_own" ON public.venue_favorites
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Owners can delete their favorites
CREATE POLICY "fav_delete_own" ON public.venue_favorites
  FOR DELETE USING (auth.uid() = profile_id);