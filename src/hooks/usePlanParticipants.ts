import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

// Match your exact database enums
export type RSVPStatus = 'pending' | 'accepted' | 'declined' | 'maybe'
export type PlanRole = 'creator' | 'co_admin' | 'participant'
export type InviteType = 'floq_member' | 'external_friend' | 'creator'

export interface PlanParticipant {
  id: string
  plan_id: string
  profile_id?: string | null
  role: PlanRole
  rsvp_status: RSVPStatus
  invite_type: InviteType
  is_guest: boolean
  guest_name?: string | null
  guest_email?: string | null
  guest_phone?: string | null
  notes?: string | null
  joined_at: string
  invited_at: string
  responded_at?: string | null
  reminded_at?: string | null
  // Joined profile data
  profile?: {
    id: string
    username: string
    display_name: string
    avatar_url?: string | null
  } | null
}

export interface InviteParticipantData {
  planId: string
  profileId?: string
  role?: PlanRole
  isGuest?: boolean
  guestName?: string
  guestEmail?: string
  guestPhone?: string
  notes?: string
}

export function usePlanParticipants(planId: string) {
  return useQuery<PlanParticipant[]>({
    queryKey: ['plan-participants', planId],
    queryFn: async (): Promise<PlanParticipant[]> => {
      const { data, error } = await supabase
        .from('plan_participants')
        .select(`
          id,
          plan_id,
          profile_id,
          role,
          rsvp_status,
          invite_type,
          is_guest,
          guest_name,
          guest_email,
          guest_phone,
          notes,
          joined_at,
          invited_at,
          responded_at,
          reminded_at,
          profile:profiles(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('plan_id', planId)
        .order('invited_at', { ascending: true })

      if (error) {
        console.error('Failed to fetch plan participants:', error)
        throw error
      }

      return (data || []) as PlanParticipant[]
    },
    enabled: !!planId,
    staleTime: 30000, // 30 seconds
    suspense: false,
    throwOnError: false
  })
}

export function useInviteParticipant() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (inviteData: InviteParticipantData) => {
      // Validate constraints before sending to database
      if (inviteData.isGuest) {
        if (!inviteData.guestName) {
          throw new Error('Guest name is required for guest invitations')
        }
        if (inviteData.profileId) {
          throw new Error('Profile ID must be null for guest invitations')
        }
      } else {
        if (!inviteData.profileId) {
          throw new Error('Profile ID is required for member invitations')
        }
        if (inviteData.guestName || inviteData.guestEmail || inviteData.guestPhone) {
          throw new Error('Guest fields must be null for member invitations')
        }
      }

      // Check if participant already exists (duplicate prevention)
      const existingQuery = supabase
        .from('plan_participants')
        .select('id')
        .eq('plan_id', inviteData.planId)

      if (inviteData.isGuest && inviteData.guestEmail) {
        existingQuery.eq('guest_email', inviteData.guestEmail)
      } else if (!inviteData.isGuest && inviteData.profileId) {
        existingQuery.eq('profile_id', inviteData.profileId)
      }

      const { data: existing } = await existingQuery.maybeSingle()

      if (existing) {
        throw new Error('This person is already invited to the plan')
      }

      // Prepare participant data according to schema
      const participantData = {
        plan_id: inviteData.planId,
        profile_id: inviteData.isGuest ? null : inviteData.profileId,
        role: inviteData.role || 'participant',
        is_guest: inviteData.isGuest || false,
        guest_name: inviteData.isGuest ? inviteData.guestName : null,
        guest_email: inviteData.isGuest ? inviteData.guestEmail : null,
        guest_phone: inviteData.isGuest ? inviteData.guestPhone : null,
        notes: inviteData.notes || null,
        invite_type: inviteData.isGuest ? 'external_friend' : 'floq_member',
        rsvp_status: 'pending',
        invited_at: new Date().toISOString(),
        joined_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('plan_participants')
        .insert(participantData)
        .select(`
          id,
          plan_id,
          profile_id,
          role,
          rsvp_status,
          invite_type,
          is_guest,
          guest_name,
          guest_email,
          guest_phone,
          notes,
          joined_at,
          invited_at,
          responded_at,
          reminded_at,
          profile:profiles(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single()

      if (error) {
        console.error('Failed to invite participant:', error)
        throw new Error(`Failed to invite participant: ${error.message}`)
      }

      // Send notification if it's a Floq member
      if (!inviteData.isGuest && inviteData.profileId) {
        try {
          await supabase.functions.invoke('send-plan-invite', {
            body: {
              planId: inviteData.planId,
              invitedProfileId: inviteData.profileId,
              inviterProfileId: user?.id,
              participantId: data.id
            }
          })
        } catch (notificationError) {
          console.error('Failed to send invite notification:', notificationError)
          // Don't fail the whole operation if notification fails
        }
      }

      return data as PlanParticipant
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan-participants', variables.planId] })
      queryClient.invalidateQueries({ queryKey: ['plan-details', variables.planId] })
      
      const participantName = data.is_guest ? data.guest_name : data.profile?.display_name
      toast({
        title: 'Participant Invited',
        description: `${participantName} has been invited to the plan`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Invitation Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateRSVP() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ 
      participantId, 
      planId, 
      status, 
      notes 
    }: { 
      participantId: string
      planId: string
      status: RSVPStatus
      notes?: string 
    }) => {
      const updateData: any = {
        rsvp_status: status,
        responded_at: new Date().toISOString()
      }

      if (notes !== undefined) {
        updateData.notes = notes
      }

      const { data, error } = await supabase
        .from('plan_participants')
        .update(updateData)
        .eq('id', participantId)
        .select(`
          id,
          plan_id,
          profile_id,
          role,
          rsvp_status,
          invite_type,
          is_guest,
          guest_name,
          guest_email,
          guest_phone,
          notes,
          joined_at,
          invited_at,
          responded_at,
          reminded_at,
          profile:profiles(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single()

      if (error) {
        console.error('Failed to update RSVP:', error)
        throw new Error(`Failed to update RSVP: ${error.message}`)
      }

      return data as PlanParticipant
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plan-participants', variables.planId] })
      queryClient.invalidateQueries({ queryKey: ['plan-details', variables.planId] })
      
      const statusText = variables.status === 'accepted' ? 'accepted' : 
                        variables.status === 'declined' ? 'declined' : 
                        variables.status === 'maybe' ? 'marked as maybe' : 'updated'
      
      toast({
        title: 'RSVP Updated',
        description: `You have ${statusText} the invitation`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'RSVP Update Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useRemoveParticipant() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ participantId, planId }: { participantId: string, planId: string }) => {
      const { error } = await supabase
        .from('plan_participants')
        .delete()
        .eq('id', participantId)

      if (error) {
        console.error('Failed to remove participant:', error)
        throw new Error(`Failed to remove participant: ${error.message}`)
      }

      return { participantId, planId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plan-participants', data.planId] })
      queryClient.invalidateQueries({ queryKey: ['plan-details', data.planId] })
      
      toast({
        title: 'Participant Removed',
        description: 'The participant has been removed from the plan',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Removal Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useParticipantStats(planId: string) {
  const { data: participants = [] } = usePlanParticipants(planId)
  
  return {
    total: participants.length,
    accepted: participants.filter(p => p.rsvp_status === 'accepted').length,
    declined: participants.filter(p => p.rsvp_status === 'declined').length,
    pending: participants.filter(p => p.rsvp_status === 'pending').length,
    maybe: participants.filter(p => p.rsvp_status === 'maybe').length,
    guests: participants.filter(p => p.is_guest).length,
    members: participants.filter(p => !p.is_guest).length,
    creators: participants.filter(p => p.role === 'creator').length,
    coAdmins: participants.filter(p => p.role === 'co_admin').length,
    acceptanceRate: participants.length > 0 
      ? Math.round((participants.filter(p => p.rsvp_status === 'accepted').length / participants.length) * 100)
      : 0,
    responseRate: participants.length > 0
      ? Math.round((participants.filter(p => p.responded_at !== null).length / participants.length) * 100)
      : 0
  }
}

// Real-time subscription hook for participant updates
export function useRealtimePlanParticipants(planId: string) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['realtime-plan-participants', planId],
    queryFn: () => null, // This is just for the subscription
    enabled: false, // We don't actually fetch, just subscribe
    suspense: false,
    throwOnError: false,
    meta: {
      subscription: () => {
        const channel = supabase
          .channel(`plan-participants-${planId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'plan_participants',
              filter: `plan_id=eq.${planId}`
            },
            (payload) => {
              console.log('Plan participants update:', payload)
              queryClient.invalidateQueries({ queryKey: ['plan-participants', planId] })
              queryClient.invalidateQueries({ queryKey: ['plan-details', planId] })
            }
          )
          .subscribe()

        return () => {
          supabase.removeChannel(channel)
        }
      }
    }
  })
}

// Helper function to validate participant data against constraints
export function validateParticipantData(data: Partial<InviteParticipantData>): string[] {
  const errors: string[] = []

  if (data.isGuest) {
    // Guest constraints
    if (!data.guestName?.trim()) {
      errors.push('Guest name is required for guest invitations')
    }
    if (data.profileId) {
      errors.push('Profile ID must not be provided for guest invitations')
    }
  } else {
    // Member constraints  
    if (!data.profileId?.trim()) {
      errors.push('Profile ID is required for member invitations')
    }
    if (data.guestName || data.guestEmail || data.guestPhone) {
      errors.push('Guest information must not be provided for member invitations')
    }
  }

  // Role validation
  if (data.role && !['creator', 'co_admin', 'participant'].includes(data.role)) {
    errors.push('Invalid role specified')
  }

  return errors
}