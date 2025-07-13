import { useQuery } from "@tanstack/react-query";
import { useSession } from "@supabase/auth-helpers-react";
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
  { enabled = true }: UseFloqDetailsOptions = {}
) {
  const session = useSession();
  const user = session?.user;

  return useQuery({
    queryKey: ["floq-details", floqId, user?.id],
    enabled: enabled && !!floqId,
    queryFn: async (): Promise<FloqDetails | null> => {
      if (!floqId) return null;
      
      // Get the floq details
      const { data: floqData, error: floqError } = await supabase
        .from('floqs')
        .select(`
          id,
          title,
          name,
          primary_vibe,
          vibe_tag,
          creator_id,
          max_participants,
          starts_at,
          ends_at,
          created_at,
          last_activity_at,
          activity_score,
          radius_m,
          location,
          flock_tags,
          visibility
        `)
        .eq('id', floqId)
        .single();

      if (floqError) {
        console.error("Floq details error:", floqError);
        throw floqError;
      }

      if (!floqData) return null;

      // Get participants with profile data
      const { data: participantsData, error: participantsError } = await supabase
        .from('floq_participants')
        .select(`
          user_id,
          role,
          joined_at,
          profiles!inner (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('floq_id', floqId)
        .order('joined_at', { ascending: true });

      if (participantsError) {
        console.error("Participants error:", participantsError);
        throw participantsError;
      }

      const participants: FloqParticipant[] = participantsData?.map(p => ({
        user_id: p.user_id,
        username: p.profiles.username || undefined,
        display_name: p.profiles.display_name,
        avatar_url: p.profiles.avatar_url || undefined,
        role: p.role,
        joined_at: p.joined_at,
      })) || [];

      // Check if current user is joined and their role
      const userParticipant = participants.find(p => p.user_id === user?.id);
      const isJoined = !!userParticipant;
      const isCreator = floqData.creator_id === user?.id;

      // Extract location coordinates
      const locationCoords = floqData.location as any;
      const location = {
        lat: locationCoords?.coordinates?.[1] || 0,
        lng: locationCoords?.coordinates?.[0] || 0,
      };

      return {
        id: floqData.id,
        title: floqData.title,
        name: floqData.name || undefined,
        primary_vibe: floqData.primary_vibe,
        vibe_tag: floqData.vibe_tag || undefined,
        creator_id: floqData.creator_id || undefined,
        participant_count: participants.length,
        max_participants: floqData.max_participants || undefined,
        starts_at: floqData.starts_at || undefined,
        ends_at: floqData.ends_at || undefined,
        created_at: floqData.created_at,
        last_activity_at: floqData.last_activity_at || undefined,
        activity_score: floqData.activity_score || undefined,
        radius_m: floqData.radius_m || undefined,
        location,
        participants,
        is_joined: isJoined,
        is_creator: isCreator,
        user_role: userParticipant?.role,
        flock_tags: floqData.flock_tags || undefined,
        visibility: floqData.visibility,
      };
    },
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}