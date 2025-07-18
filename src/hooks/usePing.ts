import { useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export const usePing = () => {
  return useCallback(async (targetId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Not authenticated')
      
      const { error } = await supabase
        .from('ping_requests')
        .insert({ 
          target_id: targetId,
          requester_id: user.user.id,
          status: 'pending'
        })

      if (error) throw error
      
      toast.success('Wave sent! 👋', {
        description: 'Your friend will be notified'
      })
    } catch (error) {
      console.error('Failed to send ping:', error)
      toast.error('Failed to send wave', {
        description: 'Please try again'
      })
    }
  }, [])
}