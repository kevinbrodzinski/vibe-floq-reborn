
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useEffect, useRef, useCallback } from 'react';
import type { Vibe } from "@/types";
import { safeVibe } from '@/types/enums/vibes';
import { z } from 'zod';
import { VibeEnum } from '@/types/vibes';
import { MyFloqSchema, ParticipantRowSchema, type MyFloq } from '@/types/schemas/MyFloqSchema';

export type { MyFloq };

interface CountRow {
  floq_id: string;
  count: string;
}

const CountRowSchema = z.object({
  floq_id: z.string(),
  count: z.string(),
});

// Extract the query function for better organization
const fetchMyFloqs = async (profileId: string): Promise<MyFloq[]> => {
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
        description,
        primary_vibe,
        creator_id,
        starts_at,
        ends_at,
        last_activity_at,
        deleted_at
      )
    `)
    .eq('profile_id', profileId)
    .neq('role', 'creator');

  // Query for floqs I created
  const createdQuery = supabase
    .from('floqs')
    .select(`
      id,
      title,
      name,
      description,
      primary_vibe,
      creator_id,
      starts_at,
      ends_at,
      last_activity_at,
      created_at,
      deleted_at
    `)
    .eq('creator_id', profileId);

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

  // Add participated floqs with validation
  if (participatedResult.data) {
    for (const row of participatedResult.data) {
      const parsed = ParticipantRowSchema.safeParse(row);
      if (!parsed.success) {
        if (import.meta.env.DEV) {
          console.warn('❌ Invalid participant row:', parsed.error);
        }
        continue;
      }

      const { floqs: floq, role, joined_at } = parsed.data;
      
      if (!floq || floq.deleted_at || (floq.ends_at && new Date(floq.ends_at) <= new Date())) {
        continue;
      }

      allFloqs.push({
        id: floq.id,
        title: floq.title || floq.name || 'Untitled',
        name: floq.name || undefined,
        description: floq.description || undefined,
        primary_vibe: safeVibe(floq.primary_vibe),
        participant_count: 0, // Will be filled below
        role,
        joined_at,
        last_activity_at: floq.last_activity_at || floq.starts_at || joined_at,
        starts_at: floq.starts_at || undefined,
        ends_at: floq.ends_at || undefined,
        creator_id: floq.creator_id || undefined,
        is_creator: false,
      });
    }
  }

  // Add created floqs with validation
  if (createdResult.data) {
    for (const raw of createdResult.data) {
      const parsed = MyFloqSchema.safeParse(raw);
      if (!parsed.success) {
        if (import.meta.env.DEV) {
          console.warn('❌ Invalid created floq:', parsed.error);
        }
        continue;
      }

      const floq = parsed.data;
      
      if (floq.deleted_at || (floq.ends_at && new Date(floq.ends_at) <= new Date())) {
        continue;
      }

      allFloqs.push({
        id: floq.id,
        title: floq.title || floq.name || 'Untitled',
        name: floq.name || undefined,
        description: floq.description || undefined,
        primary_vibe: safeVibe(floq.primary_vibe),
        participant_count: 0, // Will be filled below
        role: 'creator',
        joined_at: floq.created_at || floq.starts_at || new Date().toISOString(),
        last_activity_at: floq.last_activity_at || floq.starts_at || floq.created_at || '',
        starts_at: floq.starts_at || undefined,
        ends_at: floq.ends_at || undefined,
        creator_id: floq.creator_id || undefined,
        is_creator: true,
      });
    }
  }

  if (allFloqs.length === 0) {
    console.info('✅ No active floqs found');
    return [];
  }

  // Get participant counts for all floqs using the new RPC function
  const floqIds = allFloqs.map(f => f.id);
  
  let participantCounts: { floq_id: string; participant_count: number }[] = [];
  try {
    const { data, error } = await supabase.rpc('get_floq_participant_counts', {
      floq_ids: floqIds
    });
    
    if (error) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ Error fetching participant counts:', error);
      }
    } else if (data) {
      // Validate and transform the count data
      const validCounts = (data as unknown[])
        .map((row) => CountRowSchema.safeParse(row))
        .filter((res): res is { success: true; data: z.infer<typeof CountRowSchema> } => res.success)
        .map(res => ({
          floq_id: res.data.floq_id,
          participant_count: parseInt(res.data.count, 10) || 0
        }));
      
      participantCounts = validCounts;
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ Failed to fetch participant counts:', error);
    }
  }

  // Create count lookup map
  const countMap = participantCounts
    .reduce<Record<string, number>>((acc, { floq_id, participant_count }) => {
      acc[floq_id] = participant_count || 0;
      return acc;
    }, {});

  // Update participant counts
  allFloqs.forEach(floq => {
    floq.participant_count = countMap[floq.id] || 0;
  });

  const result = allFloqs.sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime());
  
  console.info(`✅ Returning ${result.length} my floqs`);
  return result;
};

export const useMyFlocks = () => {
  const { session } = useAuth();
  const profileId = session?.user?.id;
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);

  const invalidate = useCallback(() => {
    // Add a small delay to prevent race conditions
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['my-floqs', profileId] });
    }, 100);
  }, [queryClient, profileId]);

  useEffect(() => {
    if (!profileId) return;

    // Clean up existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`my-flocks-${profileId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'floqs',
        filter: `creator_id=eq.${profileId}`
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
        filter: `profile_id=eq.${profileId}`
      }, invalidate)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'floq_participants',
        filter: `profile_id=eq.${profileId}`
      }, invalidate)
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profileId, invalidate]);

  return useQuery({
    queryKey: ['my-floqs', profileId],
    queryFn: () => fetchMyFloqs(profileId!),
    enabled: !!profileId,
    placeholderData: [],
    staleTime: 30_000, // Raised to 30s to work better with realtime
    gcTime: 300_000,
    retry: 1,
  });
};
