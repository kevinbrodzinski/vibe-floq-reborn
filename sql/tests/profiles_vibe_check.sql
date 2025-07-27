SELECT plan(2);

SELECT ok(
  EXISTS (SELECT 1 FROM pg_constraint
          WHERE conname = 'profiles_vibe_valid'),
  'vibe CHECK exists');

-- Insert bad row should fail
BEGIN;
SELECT throws_ok(
  $$ INSERT INTO public.profiles(id,username,profile_created,vibe_preference)
     VALUES (gen_random_uuid(),'baduser',true,'chaotic'); $$,
  'check constraint',
  'invalid vibe rejected');
ROLLBACK;

SELECT * FROM finish();