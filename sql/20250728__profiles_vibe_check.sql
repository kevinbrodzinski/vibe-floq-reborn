BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1
      FROM   pg_constraint
      WHERE  conname  = 'profiles_vibe_valid'
      AND    conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_vibe_valid
      CHECK (
        vibe_preference IS NULL
        OR vibe_preference = ANY (
          ARRAY[
            'chill','hype','curious','social','solo',
            'romantic','weird','down','flowing','open'
          ]::text[]
        )
      );
  END IF;
END$$;
COMMIT;