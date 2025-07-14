import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { useEffect } from "react";
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
  location: {
    lat: number;
    lng: number;
  };
  participants: FloqParticipant[];
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

      // Use the database function for complete details
      const { data: fullDetails, error } = await supabase.rpc('get_floq_full_details', {
        p_floq_id: floqId
      });

      if (error) {
        console.error("Floq details error:", error);
        throw error;
      }

      if (!fullDetails || fullDetails.length === 0) return null;

      const floqData = fullDetails[0];
      const currentUserId = userId || user?.id;
      
      // Map participants from the full details
      const participants: FloqParticipant[] = floqData.participants?.map((p: any) => ({
        user_id: p.user_id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        role: p.role,
        joined_at: p.joined_at,
      })) || [];

      const userParticipant = participants.find(p => p.user_id === currentUserId);
      const isJoined = !!userParticipant;
      const isCreator = floqData.creator_id === currentUserId;

      console.log('🔍 Floq details debug:', {
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
        participant_count: floqData.participant_count,
        starts_at: floqData.starts_at,
        ends_at: floqData.ends_at,
        created_at: floqData.starts_at, // Using starts_at as created_at fallback
        visibility: floqData.visibility,
        location: { lat: 0, lng: 0 }, // Will be enhanced when needed
        participants,
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

  // Set up real-time subscription for floq participant changes
  useEffect(() => {
    if (!floqId || !enabled) return;

    const channel = supabase
      .channel(`floq_${floqId}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'floq_participants',
          filter: `floq_id=eq.${floqId}`
        },
        () => {
          // Refetch floq details when participants change
          query.refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'floq_invitations',
          filter: `floq_id=eq.${floqId}`
        },
        () => {
          // Refetch when invitations change
          query.refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'floqs',
          filter: `id=eq.${floqId}`
        },
        () => {
          // Refetch when floq details change
          query.refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'floq_settings',
          filter: `floq_id=eq.${floqId}`
        },
        () => {
          // Refetch when settings change
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [floqId, enabled, query]);

  return query;
}