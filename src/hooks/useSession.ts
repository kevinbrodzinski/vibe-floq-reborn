import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export function useSession() {
  const [session, setSession] = useState(() => supabase.auth.getSession().data.session)

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return session
}