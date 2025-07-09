-- Ensure vibes_now table is in realtime publication for real-time presence updates
-- Check if vibes_now is already in the publication
DO $$ 
BEGIN
    -- Add vibes_now to realtime publication if not already present
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'vibes_now'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.vibes_now;
        RAISE NOTICE 'Added vibes_now table to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'vibes_now table already in supabase_realtime publication';
    END IF;
END $$;