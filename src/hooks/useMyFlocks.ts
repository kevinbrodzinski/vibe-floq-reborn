import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useEffect } from 'react';
import type { Vibe } from "@/types";

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

export const useMyFlocks = () => {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  // Set up realtime invalidation with INSERT listener (Fix B)
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('my-flocks-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'floqs',
        filter: `creator_id=eq.${userId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['my-floqs', userId] });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'floqs'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['my-floqs', userId] });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'floq_participants',
        filter: `user_id=eq.${userId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['my-floqs', userId] });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'floq_participants',
        filter: `user_id=eq.${userId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['my-floqs', userId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return useQuery({
    queryKey: ['my-floqs', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Fix C: Server-side filtering with proper predicate
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
        .eq('user_id', userId)
        .filter('floqs.deleted_at', 'is', null)
        .or('floqs.ends_at.is.null,floqs.ends_at.gt.now()');

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
        .eq('creator_id', userId)
        .filter('deleted_at', 'is', null)
        .or('ends_at.is.null,ends_at.gt.now()');

      const [participatedResult, createdResult] = await Promise.all([
        participatedQuery,
        createdQuery
      ]);

      if (participatedResult.error) throw participatedResult.error;
      if (createdResult.error) throw createdResult.error;

      // Normalize row structure before mapping (Fix from notes)
      const allFloqs = new Map();

      const addRow = (
        raw: any,
        role: 'creator' | 'member' | string,
        joined: string,
        fromParticipated = false
      ) => {
        const record = fromParticipated ? raw.floqs : raw;
        allFloqs.set(record.id, {
          floq: record,
          role,
          joined_at: joined
        });
      };

      // Add participated floqs
      participatedResult.data?.forEach(row =>
        addRow(row, row.role, row.joined_at, true)
      );

      // Add created floqs (creator overwrites same key)
      createdResult.data?.forEach(row =>
        addRow(row, 'creator', row.starts_at, false)
      );

      if (allFloqs.size === 0) return [];

      // Get participant counts for all flocks
      const floqIds = Array.from(allFloqs.keys());
      const { data: participantData } = await supabase
        .from('floq_participants')
        .select('floq_id')
        .in('floq_id', floqIds);

      const participantCounts = participantData?.reduce((acc, item) => {
        acc[item.floq_id] = (acc[item.floq_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Transform to MyFloq format with robust title fallback
      const result: MyFloq[] = Array.from(allFloqs.entries())
        .map(([id, { floq, role, joined_at }]) => ({
          id,
          title: floq.title ?? floq.name ?? 'Untitled', // Robust fallback
          name: floq.name || undefined,
          primary_vibe: floq.primary_vibe,
          participant_count: participantCounts[id] || 0,
          role,
          joined_at,
          last_activity_at: floq.last_activity_at || floq.starts_at,
          starts_at: floq.starts_at || undefined,
          ends_at: floq.ends_at || undefined,
          creator_id: floq.creator_id || undefined,
          is_creator: floq.creator_id === userId,
        }))
        .sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime());

      return result;
    },
    enabled: !!userId,
    staleTime: 5_000, // Fix A: Lower staleTime to 5 seconds
    gcTime: 300_000,
    retry: 1,
  });
};