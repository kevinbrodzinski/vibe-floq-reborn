-- Add missing price_tier column to venues table
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS price_tier price_enum DEFAULT '$'::price_enum;