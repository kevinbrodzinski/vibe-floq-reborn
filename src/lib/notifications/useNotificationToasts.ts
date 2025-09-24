import * as React from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function useNotificationToasts(profileId?: string|null) {
  const { toast } = useToast()

  React.useEffect(() => {
    if (!profileId) return
    const ch = supabase.channel(`notif:${profileId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `to_profile=eq.${profileId}`
      }, (p) => {
        try {
          const payload = p.new?.payload as any
          const pt = payload?.point
          toast({
            title: 'Ping from a friend',
            description: pt ? `ETA ~${pt.etaMin}m (${Math.round(pt.prob*100)}%)` : 'New ping received',
          })
        } catch {}
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [toast, profileId])
}