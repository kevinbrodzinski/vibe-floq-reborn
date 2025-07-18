import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

import type { Vibe } from "@/types";

export interface FloqParticipant {
  user_id: string;
  username?: string;
  display_name: string;
  avatar_url?: string;
  role: string;
  joined_at: string;
}

export interface PendingInvitation {
  invitee_id: string;
  invitee_username?: string;
  invitee_display_name: string;
  status: string;
  sent_at: string;
  id?: string;
}

export interface FloqDetails {
  id: string;
  title: string;
  name?: string;
  primary_vibe: Vibe;
  vibe_tag?: Vibe;
  description?: string;
  creator_id?: string;
  participant_count: number;
  max_participants?: number;
  starts_at?: string;
  ends_at?: string;
  created_at: string;
  last_activity_at?: string;
  activity_score?: number;
  radius_m?: number;
  pinned_note?: string | null;
  location: {
    lat: number;
    lng: number;
  };
  participants: FloqParticipant[];
  pending_invites?: PendingInvitation[];
  is_joined: boolean;
  is_creator: boolean;
  user_role?: string;
  flock_tags?: string[];
  visibility: string;
}

interface UseFloqDetailsOptions {
  enabled?: boolean;
}

export function useFloqDetails(
  floqId: string | null, 
  userId?: string,
  { enabled = true }: UseFloqDetailsOptions = {}
) {
  const { session } = useAuth();
  const user = session?.user;

  const query = useQuery({
    queryKey: ["floq-details", floqId, userId || user?.id],
    enabled: enabled && !!floqId && !!(userId || user?.id), // Wait for session to load
    queryFn: async (): Promise<FloqDetails | null> => {
      if (!floqId) return null;

      // Use direct table query instead of RPC to ensure auth context is preserved
      const { data: floqData, error } = await supabase
        .from('floqs')
        .select(`
          id,
          title,
          description,
          primary_vibe,
          creator_id,
          starts_at,
          ends_at,
          visibility,
          pinned_note
        `)
        .eq('id', floqId)
        .single();

      if (error) {
        console.error('[useFloqDetails] Floq query error:', error);
        throw error;
      }

      if (!floqData) return null;

      // Get participants separately
      const { data: participantsData, error: participantsError } = await supabase
        .from('floq_participants')
        .select(`
          user_id,
          role,
          joined_at,
          profiles!inner(
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('floq_id', floqId);

      if (participantsError) {
        console.error('[useFloqDetails] Participants query error:', participantsError);
        throw participantsError;
      }

      // Get pending invitations for creators/admins
      const currentUserId = userId || user?.id;
      let pendingInvites: PendingInvitation[] = [];
      
      const userParticipant = participantsData?.find(p => p.user_id === currentUserId);
      const isCreatorOrAdmin = floqData.creator_id === currentUserId || 
                              userParticipant?.role === 'co-admin';

      if (isCreatorOrAdmin) {
        const { data: invitesData } = await supabase
          .from('floq_invitations')
          .select(`
            invitee_id,
            status,
            created_at,
            profiles!inner(
              username,
              display_name
            )
          `)
          .eq('floq_id', floqId)
          .eq('status', 'pending');

        pendingInvites = (invitesData || []).map((invite: any) => ({
          invitee_id: invite.invitee_id,
          invitee_username: invite.profiles?.username,
          invitee_display_name: invite.profiles?.display_name,
          status: invite.status,
          sent_at: invite.created_at,
        }));
      }

      // Transform participants data
      const participants: FloqParticipant[] = (participantsData || []).map((p: any) => ({
        user_id: p.user_id,
        username: p.profiles?.username,
        display_name: p.profiles?.display_name,
        avatar_url: p.profiles?.avatar_url,
        role: p.role,
        joined_at: p.joined_at,
      }));

      const isJoined = !!userParticipant;
      const isCreator = floqData.creator_id === currentUserId;

      console.log('🔍 Floq details debug (fixed):', {
        floqId,
        userId: currentUserId,
        creatorId: floqData.creator_id,
        isCreator,
        participantsCount: participants.length,
        userParticipant: userParticipant ? { role: userParticipant.role, user_id: userParticipant.user_id } : null,
        isJoined
      });

      return {
        id: floqData.id,
        title: floqData.title,
        description: floqData.description,
        primary_vibe: floqData.primary_vibe,
        creator_id: floqData.creator_id,
        participant_count: participants.length,
        starts_at: floqData.starts_at,
        ends_at: floqData.ends_at,
        created_at: floqData.starts_at,
        visibility: floqData.visibility,
        pinned_note: floqData.pinned_note,
        location: { lat: 0, lng: 0 },
        participants,
        pending_invites: pendingInvites,
        is_joined: isJoined,
        is_creator: isCreator,
        user_role: userParticipant?.role,
      };
    },
    staleTime: 15000, // Hot for 15 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: 'always', // Ensures fresh data after navigation
    retry: 1,
  });

  // Debounced refetch to prevent too many rapid updates
  const debouncedRefetchRef = useRef<() => void>();
  
  if (!debouncedRefetchRef.current) {
    let timeoutId: NodeJS.Timeout | null = null;
    debouncedRefetchRef.current = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => query.refetch(), 100);
    };
  }
  
  const debouncedRefetch = debouncedRefetchRef.current;

  // Set up real-time subscription for floq changes with optimized filters
  useEffect(() => {
    if (!floqId || !enabled) return;

    const channel = supabase
      .channel(`floq_${floqId}_${user?.id}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'floq_participants',
          filter: `floq_id=eq.${floqId}`
        },
        () => debouncedRefetch()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'floq_invitations',
          filter: `floq_id=eq.${floqId}`
        },
        () => debouncedRefetch()
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'floq_invitations',
          filter: `floq_id=eq.${floqId}`
        },
        () => debouncedRefetch()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'floqs',
          filter: `id=eq.${floqId}`
        },
        () => debouncedRefetch()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'floq_settings',
          filter: `floq_id=eq.${floqId}`
        },
        () => debouncedRefetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [floqId, enabled, debouncedRefetch]); // Use debounced refetch

  return query;
}
