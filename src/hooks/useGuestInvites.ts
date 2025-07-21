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
          invited_at: null, // Will be set when actually sent
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
    mutationFn: async ({ participantId, planId }: { participantId: string; planId: string }) => {
      const { error } = await supabase
        .from('plan_participants')
        .delete()
        .eq('id', participantId)
        .eq('is_guest', true)

      if (error) throw error
    },
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: ['plan-participants', planId] })
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
      // Get all pending guests for this plan
      const { data: guests, error: fetchError } = await supabase
        .from('plan_participants')
        .select('id, guest_name, guest_email, guest_phone')
        .eq('plan_id', planId)
        .eq('is_guest', true)
        .is('invited_at', null)

      if (fetchError) throw fetchError
      
      if (!guests || guests.length === 0) {
        return { sent: 0, details: [] }
      }

      // Call the edge function to send actual invites
      const { data, error } = await supabase.functions.invoke('send-guest-invites', {
        body: {
          planId,
          guests: guests.map(g => ({
            id: g.id,
            name: g.guest_name,
            email: g.guest_email,
            phone: g.guest_phone
          })),
          customMessage
        }
      })

      if (error) throw error

      // Update the database to mark guests as invited
      const { error: updateError } = await supabase
        .from('plan_participants')
        .update({ invited_at: new Date().toISOString() })
        .eq('plan_id', planId)
        .eq('is_guest', true)
        .is('invited_at', null)

      if (updateError) throw updateError

      return { sent: guests.length, details: data }
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