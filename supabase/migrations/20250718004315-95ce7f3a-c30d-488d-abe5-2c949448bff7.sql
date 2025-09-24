-- Update the function to use direct values instead of system settings
CREATE OR REPLACE FUNCTION public.call_weekly_ai_suggestion(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  svc_key   text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlenR5cnJhZnNtbHZ2bHF2c3F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjA1MjkxNywiZXhwIjoyMDY3NjI4OTE3fQ.IfgdFGrTv49WKcI90_lBLYPEWBE7C9F5aDvK_r3RZjM';
  fn_url    text := 'https://reztyrrafsmlvvlqvsqt.supabase.co/functions/v1/generate-weekly-ai-suggestion';
  resp      jsonb;
BEGIN
  resp := net.http_post(
    url     => fn_url,
    headers => jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || svc_key
               ),
    body    => jsonb_build_object(
                 'preWarm',  true,
                 'userId',   p_user_id
               )
  );

  IF (resp ->> 'status')::int >= 300 THEN
    RAISE LOG 'pre-warm for % failed -> %', p_user_id, resp;
  ELSE
    RAISE LOG 'pre-warm ok for %', p_user_id;
  END IF;
END;
$$;