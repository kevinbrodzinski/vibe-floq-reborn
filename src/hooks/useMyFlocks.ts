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
      
      // Use JavaScript date with 5-minute buffer to ensure recently created/joined floqs appear
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Get both created floqs and participated floqs using UNION
      const participatedQuery = supabase
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
            last_activity_at
          )
        `)
        .eq('user_id', user.id)
        .gt('floqs.ends_at', fiveMinutesFromNow)
        .is('floqs.deleted_at', null);

      const createdQuery = supabase
        .from('floqs')
        .select(`
          id,
          title,
          name,
          primary_vibe,
          creator_id,
          starts_at,
          ends_at,
          last_activity_at
        `)
        .eq('creator_id', user.id)
        .gt('ends_at', fiveMinutesFromNow)
        .is('deleted_at', null);

      const [participatedResult, createdResult] = await Promise.all([
        participatedQuery,
        createdQuery
      ]);

      if (participatedResult.error) {
        console.error("Participated flocks error:", participatedResult.error);
        throw participatedResult.error;
      }

      if (createdResult.error) {
        console.error("Created flocks error:", createdResult.error);
        throw createdResult.error;
      }

      // Combine and deduplicate floqs
      const allFloqs = new Map<string, any>();

      // Add participated floqs
      participatedResult.data?.forEach(item => {
        allFloqs.set(item.floq_id, {
          floq: item.floqs,
          role: item.role,
          joined_at: item.joined_at
        });
      });

      // Add created floqs (overwrite if already exists to ensure creator role)
      createdResult.data?.forEach(floq => {
        allFloqs.set(floq.id, {
          floq: floq,
          role: 'creator',
          joined_at: floq.starts_at // Use starts_at as joined_at for creators
        });
      });

      const floqIds = Array.from(allFloqs.keys());
      
      if (floqIds.length === 0) return [];

      // Get participant counts for all flocks
      const { data: participantData } = await supabase
        .from('floq_participants')
        .select('floq_id, count(*)')
        .in('floq_id', floqIds)
        .group('floq_id');

      const participantCounts = participantData?.reduce((acc, item) => {
        acc[item.floq_id] = Number(item.count) || 0;
        return acc;
      }, {} as Record<string, number>) || {};

      // Transform to MyFloq format
      const result = Array.from(allFloqs.entries())
        .map(([floqId, { floq, role, joined_at }]) => ({
          id: floq.id,
          title: floq.title,
          name: floq.name || undefined,
          primary_vibe: floq.primary_vibe,
          participant_count: participantCounts[floqId] || 0,
          role: role,
          joined_at: joined_at,
          last_activity_at: floq.last_activity_at || floq.starts_at,
          starts_at: floq.starts_at || undefined,
          ends_at: floq.ends_at || undefined,
          creator_id: floq.creator_id || undefined,
          is_creator: floq.creator_id === user.id,
        }))
        .sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime())
        .slice(0, limit);

      return result;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: true,
  });
}