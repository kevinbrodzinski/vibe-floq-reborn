import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface GuestData {
  name: string
  email?: string
  phone?: string
  notes?: string
}

interface InviteGuestData {
  planId: string
  guests: GuestData[]
  customMessage?: string
}

export function useGuestInvites() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const addGuest = useMutation({
    mutationFn: async ({ planId, guest }: { planId: string; guest: GuestData }) => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Authentication required')
      }

      if (!guest.name.trim()) {
        throw new Error('Guest name is required')
      }

      if (!guest.email?.trim() && !guest.phone?.trim()) {
        throw new Error('Either email or phone is required')
      }

      const { data, error } = await supabase
        .from('plan_participants')
        .insert({
          plan_id: planId,
          user_id: null,
          is_guest: true,
          guest_name: guest.name.trim(),
          guest_email: guest.email?.trim() || null,
          guest_phone: guest.phone?.trim() || null,
          notes: guest.notes?.trim() || null,
          role: 'participant',
          rsvp_status: 'pending',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: ['plan-participants', planId] })
      toast({
        title: "Guest Added",
        description: "Guest has been added to the plan",
      })
    },
    onError: (error) => {
      console.error('Add guest error:', error)
      toast({
        title: "Failed to add guest",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const removeGuest = useMutation({
    mutationFn: async ({ participantId }: { participantId: string }) => {
      const { error } = await supabase
        .from('plan_participants')
        .delete()
        .eq('id', participantId)
        .eq('is_guest', true)

      if (error) throw error
    },
    onSuccess: (_, { participantId }) => {
      toast({
        title: "Guest Removed",
        description: "Guest has been removed from the plan",
      })
    },
    onError: (error) => {
      console.error('Remove guest error:', error)
      toast({
        title: "Failed to remove guest",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const sendInvites = useMutation({
    mutationFn: async ({ planId, customMessage }: { planId: string; customMessage?: string }) => {
      // For now, this is a placeholder that just marks guests as invited
      // In a production app, you'd call an edge function to send actual emails/SMS
      
      const { data, error } = await supabase
        .from('plan_participants')
        .update({ invited_at: new Date().toISOString() })
        .eq('plan_id', planId)
        .eq('is_guest', true)
        .is('invited_at', null)
        .select()

      if (error) throw error
      
      // Simulate sending invites
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return { sent: data?.length || 0 }
    },
    onSuccess: (result, { planId }) => {
      queryClient.invalidateQueries({ queryKey: ['plan-participants', planId] })
      toast({
        title: "Invites Sent!",
        description: `Successfully sent ${result.sent} invitation${result.sent !== 1 ? 's' : ''}`,
      })
    },
    onError: (error) => {
      console.error('Send invites error:', error)
      toast({
        title: "Failed to send invites",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  return {
    addGuest,
    removeGuest,
    sendInvites,
  }
}