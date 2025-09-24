-- ❶ Make sure every profile id always equals an auth.user id
ALTER TABLE public.profiles
    ALTER COLUMN id SET NOT NULL;

-- Add primary key if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_pkey') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
    END IF;
END $$;

-- ❂ Point floq_plans.creator_id at profiles.id  
--   (ON DELETE SET NULL is friendliest for the UI)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'floq_plans_creator_fkey') THEN
        ALTER TABLE public.floq_plans
            ADD CONSTRAINT floq_plans_creator_fkey
                FOREIGN KEY (creator_id) REFERENCES public.profiles(id)
                ON DELETE SET NULL;
    END IF;
END $$;