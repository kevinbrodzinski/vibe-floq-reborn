-- Enhanced Location System Database Schema - TEST VERSION
-- This is a minimal version to test where the error occurs

-- Test 1: Create the geofences table
CREATE TABLE IF NOT EXISTS public.geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('circular', 'polygon')),
    privacy_level TEXT NOT NULL CHECK (privacy_level IN ('hide', 'street', 'area')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Test 2: Create an index
CREATE INDEX IF NOT EXISTS idx_geofences_profile_id ON public.geofences(profile_id);

-- Test 3: Enable RLS
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;

-- Test 4: Create RLS policy (this is likely where the error occurs)
CREATE POLICY "Users can manage their own geofences"
ON public.geofences
FOR ALL
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);