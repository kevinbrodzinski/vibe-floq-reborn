import { supabase } from '@/integrations/supabase/client';

export async function waitForAuthReady(setAuthReady: (v: boolean) => void) {
  let resolved = false;
  const finish = () => { 
    if (!resolved) { 
      resolved = true; 
      setAuthReady(true); 
    }
  };

  // 1) resolve on any auth change
  const { data: sub } = supabase.auth.onAuthStateChange((_e, _sess) => finish());

  // 2) try immediate session (non-blocking)
  supabase.auth.getSession().finally(finish);

  // 3) hard timeout fail-open
  setTimeout(finish, 2500);

  // cleanup
  return () => sub.subscription.unsubscribe();
}