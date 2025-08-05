import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth/EnhancedAuthProvider'
import { toast } from 'sonner'

export function usePlanInviteListener() {
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('plan_invite_listener')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'plan_invites',
          filter: `profile_id=eq.${user.id}`,
        },
        (payload) => {
          const planId = payload.new.plan_id as string
          
          toast.success('You were invited to a plan!', {
            action: {
              label: 'View Plan',
              onClick: () => navigate(`/plan/${planId}`),
            },
            duration: 5000,
          })
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe().catch(console.error)
    }
  }, [user, navigate])
}