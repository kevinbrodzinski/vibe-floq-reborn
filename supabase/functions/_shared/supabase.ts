import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;

/**
 * Returns a Supabase client bound to the caller's JWT so RLS is enforced.
 * Use this in user-triggered HTTP functions (preview/app flows).
 * For admin/cron flows, *explicitly* opt in to service role where needed.
 */
export function userClient(req: Request) {
  const auth = req.headers.get('Authorization') ?? '';
  return createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { Authorization: auth } },
  });
}

/** Explicit admin client — only for cron/admin paths */
export function adminClient() {
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, service, { auth: { persistSession: false } });
}