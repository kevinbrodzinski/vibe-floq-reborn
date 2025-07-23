-- Since user_vibe_states references auth.users, let's just seed a simpler approach
-- Add sample data to vibe_clusters table with more realistic vibe counts that match actual enum values

UPDATE public.vibe_clusters 
SET vibe_counts = jsonb_build_object(
    'chill', (random() * 10 + 5)::integer,
    'hype', (random() * 8 + 2)::integer,
    'social', (random() * 12 + 3)::integer,
    'curious', (random() * 6 + 1)::integer,
    'flowing', (random() * 9 + 2)::integer
)
WHERE gh6 LIKE '%';