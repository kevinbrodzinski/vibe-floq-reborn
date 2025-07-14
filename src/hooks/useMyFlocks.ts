import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useEffect, useRef, useCallback } from 'react';
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

interface CountRow {
  floq_id: string;
  count: string;
}

interface UseMyFlocksOptions {
  limit?: number;
  enabled?: boolean;
}

export const useMyFlocks = () => {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);

  // Early return while auth is still loading to maintain hook order
  if (!userId) {
    return {
      data: [] as MyFloq[],
      isLoading: true,
      isPlaceholderData: false,
      error: null,
      refetch: () => Promise.resolve(),
    } as const;
  }

  useEffect(() => {
    if (!userId) return;

    // Clean up existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const invalidate = useCallback(() => {
      // Add a small delay to prevent race conditions
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['my-floqs', userId] });
      }, 100);
    }, [queryClient, userId]);

    const channel = supabase
      .channel(`my-flocks-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'floqs',
        filter: `creator_id=eq.${userId}`
      }, invalidate)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'floqs'
      }, invalidate)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'floq_participants',
        filter: `user_id=eq.${userId}`
      }, invalidate)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'floq_participants',
        filter: `user_id=eq.${userId}`
      }, invalidate)
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, queryClient]);

  return useQuery({
    queryKey: ['my-floqs', userId],
    queryFn: async () => {

      if (import.meta.env.DEV) console.info('🚀 Fetching my floqs from DB');

      // Query for floqs I'm participating in (not creator)
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
        .neq('role', 'creator')
        .filter('deleted_at', 'is', null, { foreignTable: 'floqs' })
        .or('ends_at.is.null,ends_at.gt.now()', { foreignTable: 'floqs' });

      // Query for floqs I created
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
          last_activity_at,
          created_at
        `)
        .eq('creator_id', userId)
        .is('deleted_at', null)
        .or('ends_at.is.null,ends_at.gt.now()');

      const [participatedResult, createdResult] = await Promise.all([
        participatedQuery,
        createdQuery
      ]);

      if (participatedResult.error) {
        if (import.meta.env.DEV) {
          console.error('❌ Error fetching participated floqs:', participatedResult.error);
        }
        throw participatedResult.error;
      }
      if (createdResult.error) {
        if (import.meta.env.DEV) {
          console.error('❌ Error fetching created floqs:', createdResult.error);
        }
        throw createdResult.error;
      }

      // Combine and normalize results
      const allFloqs: MyFloq[] = [];

      // Add participated floqs
      participatedResult.data?.forEach(row => {
        const floq = row.floqs;
        // Debug log to check for undefined IDs
        if (!floq?.id) {
          if (import.meta.env.DEV) {
            console.warn('⚠️ Participated floq missing ID:', { row, floq });
          }
          return;
        }

        allFloqs.push({
          id: floq.id,
          title: floq.title || floq.name || 'Untitled',
          name: floq.name,
          primary_vibe: floq.primary_vibe,
          participant_count: 0, // Will be filled below
          role: row.role,
          joined_at: row.joined_at,
          last_activity_at: floq.last_activity_at || floq.starts_at,
          starts_at: floq.starts_at,
          ends_at: floq.ends_at,
          creator_id: floq.creator_id,
          is_creator: false,
        });
      });

      // Add created floqs
      createdResult.data?.forEach(floq => {
        // Debug log to check for undefined IDs
        if (!floq?.id) {
          if (import.meta.env.DEV) {
            console.warn('⚠️ Created floq missing ID:', floq);
          }
          return;
        }

        allFloqs.push({
          id: floq.id,
          title: floq.title || floq.name || 'Untitled',
          name: floq.name,
          primary_vibe: floq.primary_vibe,
          participant_count: 0, // Will be filled below
          role: 'creator',
          joined_at: floq.created_at || floq.starts_at,
          last_activity_at: floq.last_activity_at || floq.starts_at,
          starts_at: floq.starts_at,
          ends_at: floq.ends_at,
          creator_id: floq.creator_id,
          is_creator: true,
        });
      });

      if (allFloqs.length === 0) {
        console.info('✅ No active floqs found');
        return [];
      }

      // Get participant counts for all floqs using Postgres aggregation
      const floqIds = allFloqs.map(f => f.id);
      
      let participantCounts: CountRow[] = [];
      try {
        const { data, error } = await supabase
          .from('floq_participants')
          .select('floq_id, count(*)', { group: 'floq_id' })
          .in('floq_id', floqIds);
        
        if (error) {
          if (import.meta.env.DEV) {
            console.warn('⚠️ Error fetching participant counts:', error);
          }
        } else {
          participantCounts = data || [];
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('⚠️ Failed to fetch participant counts:', error);
        }
      }

      // Create count lookup map with safe casting
      const countMap = (participantCounts ?? []).reduce<Record<string, number>>((acc, item) => {
        acc[item.floq_id] = Number(item.count) || 0;
        return acc;
      }, {});

      // Update participant counts
      allFloqs.forEach(floq => {
        floq.participant_count = countMap[floq.id] || 0;
      });

      const result = allFloqs.sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime());
      
      console.info(`✅ Returning ${result.length} my floqs`);
      return result;
    },
    enabled: !!userId,
    staleTime: 30_000, // Raised to 30s to work better with realtime
    gcTime: 300_000,
    retry: 1,
  });
};