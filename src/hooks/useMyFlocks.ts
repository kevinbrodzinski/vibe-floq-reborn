import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@supabase/auth-helpers-react";
import { supabase } from "@/integrations/supabase/client";
import type { Vibe } from "@/types";
import { useEffect } from "react";

export interface MyFloq {
  id: string;
  title: string;
  name?: string;
  primary_vibe: Vibe;
  participant_count: number;
  role: string;
  joined_at: string;
  last_activity_at: string;
  starts_at?: string;
  ends_at?: string;
  creator_id?: string;
  distance_meters?: number;
  is_creator: boolean;
}

interface UseMyFlocksOptions {
  limit?: number;
  enabled?: boolean;
}

export function useMyFlocks({ 
  limit = 20, 
  enabled = true 
}: UseMyFlocksOptions = {}) {
  const session = useSession();
  const user = session?.user;
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('flocks')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'floqs' }, () => {
        queryClient.invalidateQueries({ queryKey: ["my-flocks"] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'floq_participants' }, (payload) => {
        if (payload.new.user_id === user.id) {
          queryClient.invalidateQueries({ queryKey: ["my-flocks"] });
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'floq_participants' }, (payload) => {
        if (payload.old.user_id === user.id) {
          queryClient.invalidateQueries({ queryKey: ["my-flocks"] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ["my-flocks", user?.id, limit],
    enabled: enabled && !!user,
    queryFn: async (): Promise<MyFloq[]> => {
      if (!user) return [];
      
      // Get flocks where user is a participant
      const { data, error } = await supabase
        .from('floq_participants')
        .select(`
          floq_id,
          role,
          joined_at,
          floqs!inner (
            id,
            title,
            name,
            primary_vibe,
            creator_id,
            starts_at,
            ends_at,
            last_activity_at,
            ends_at
          )
        `)
        .eq('user_id', user.id)
        .gt('floqs.ends_at', new Date().toISOString())
        .order('joined_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error("My flocks error:", error);
        throw error;
      }

      // Transform the data and get participant counts
      const floqIds = data.map(item => item.floq_id);
      
      if (floqIds.length === 0) return [];

      // Get participant counts for all flocks using aggregation
      const { data: participantData } = await supabase
        .from('floq_participants')
        .select('floq_id, count(*)')
        .in('floq_id', floqIds)
        .group('floq_id');

      const participantCounts = participantData?.reduce((acc, item) => {
        acc[item.floq_id] = Number(item.count) || 0;
        return acc;
      }, {} as Record<string, number>) || {};

      return data.map(item => ({
        id: item.floqs.id,
        title: item.floqs.title,
        name: item.floqs.name || undefined,
        primary_vibe: item.floqs.primary_vibe,
        participant_count: participantCounts[item.floq_id] || 0,
        role: item.role,
        joined_at: item.joined_at,
        last_activity_at: item.floqs.last_activity_at || item.floqs.starts_at,
        starts_at: item.floqs.starts_at || undefined,
        ends_at: item.floqs.ends_at || undefined,
        creator_id: item.floqs.creator_id || undefined,
        is_creator: item.floqs.creator_id === user.id,
      }));
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: true,
  });
}