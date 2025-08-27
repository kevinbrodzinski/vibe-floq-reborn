import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from '@/integrations/supabase/types';

import type { Vibe } from "@/types";

type FloqDetailsReturn = Database['public']['Functions']['get_floq_full_details']['Returns']
type FloqDetailsData = FloqDetailsReturn extends any[] ? FloqDetailsReturn[number] : FloqDetailsReturn

export interface FloqParticipant {
  profile_id: string;
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
  flock_type?: "momentary" | "persistent" | "recurring" | "template" | null;
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
  profileId?: string,
  { enabled = true }: UseFloqDetailsOptions = {}
) {
  const { session } = useAuth();
  const user = session?.user;

  const query = useQuery<FloqDetails | null>({
    queryKey: ["floq-details", floqId, profileId || user?.id],
    enabled: enabled && !!floqId && !!(profileId || user?.id), // Wait for session to load
    queryFn: async (): Promise<FloqDetails | null> => {
      if (!floqId) return null;

      // Use the database function for complete details
      const { data: fullDetails, error } = await supabase
        .rpc('get_floq_full_details', { p_floq_id: floqId })
        .returns<FloqDetailsReturn>();

      if (error) {
        console.error('[useFloqDetails] Floq details error:', error);
        throw error;
      }

      // Normalize: function may return an object or an array with one row
      const row = Array.isArray(fullDetails) ? (fullDetails[0] ?? null) : (fullDetails ?? null);
      if (!row) return null;

      const floqData = row as any;
      const currentUserId = profileId || user?.id;

      // Safely parse participants array
      const participantsData = Array.isArray(floqData.participants) ? floqData.participants : [];
      const participants: FloqParticipant[] = participantsData.map((p: any) => ({
        profile_id: p.profile_id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        role: p.role,
        joined_at: p.joined_at,
      }));

      // Safely parse pending invites
      const pendingInvitesData = Array.isArray(floqData.pending_invites) ? floqData.pending_invites : [];
      const pendingInvites: PendingInvitation[] = pendingInvitesData.map((invite: any) => ({
        invitee_id: invite.invitee_id,
        invitee_username: invite.invitee_username,
        invitee_display_name: invite.invitee_display_name,
        status: invite.status,
        sent_at: invite.sent_at,
        id: invite.id,
      }));

      const userParticipant = participants.find(p => p.profile_id === currentUserId);
      const isJoined = !!userParticipant;
      const isCreator = floqData.creator_id === currentUserId;

      console.log('🔍 Floq details debug:', {
        floqId,
        profileId: currentUserId,
        creatorId: floqData.creator_id,
        isCreator,
        participantsCount: participants.length,
        userParticipant: userParticipant ? { role: userParticipant.role, profile_id: userParticipant.profile_id } : null,
        isJoined
      });

      return {
        id: floqData.id,
        title: floqData.title,
        description: floqData.description,
        primary_vibe: floqData.primary_vibe,
        creator_id: floqData.creator_id,
        participant_count: floqData.participant_count,
        starts_at: floqData.starts_at,
        ends_at: floqData.ends_at,
        created_at: floqData.starts_at,
        visibility: floqData.visibility,
        pinned_note: typeof (floqData as any).pinned_note === 'string' ? (floqData as any).pinned_note : null,
        flock_type: (floqData as any).flock_type || null,
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
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
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
