
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

  try {
    // Use a single optimized query with proper joins instead of separate queries
    const { data: myFloqsData, error } = await supabase.rpc('get_user_floqs_optimized', {
      p_profile_id: profileId
    });

    if (error) {
      console.error('❌ Error fetching user floqs:', error);
      throw new Error(`Failed to fetch user floqs: ${error.message}`);
    }

    if (!myFloqsData || !Array.isArray(myFloqsData)) {
      console.warn('⚠️ No floqs data returned or invalid format');
      return [];
    }

    // Process and validate the results
    const validFloqs: MyFloq[] = [];
    
    for (const rawFloq of myFloqsData) {
      try {
        // Validate each floq with the schema
        const parsed = MyFloqSchema.safeParse({
          id: rawFloq.id,
          title: rawFloq.title || 'Untitled',
          name: rawFloq.name,
          description: rawFloq.description,
          primary_vibe: safeVibe(rawFloq.primary_vibe),
          creator_id: rawFloq.creator_id,
          starts_at: rawFloq.starts_at,
          ends_at: rawFloq.ends_at,
          last_activity_at: rawFloq.last_activity_at,
          created_at: rawFloq.created_at || rawFloq.starts_at,
          deleted_at: rawFloq.deleted_at,
          role: rawFloq.role || 'member',
          joined_at: rawFloq.joined_at || rawFloq.created_at,
          participant_count: parseInt(String(rawFloq.participant_count || 0), 10),
        });

        if (parsed.success) {
          validFloqs.push(parsed.data);
        } else {
          console.warn('❌ Invalid floq data:', {
            floqId: rawFloq.id,
            errors: parsed.error.errors,
            rawData: rawFloq
          });
        }
      } catch (parseError) {
        console.error('❌ Error parsing floq:', parseError, rawFloq);
      }
    }

    // Sort by activity and creation date
    validFloqs.sort((a, b) => {
      const aActivity = new Date(a.last_activity_at || a.created_at).getTime();
      const bActivity = new Date(b.last_activity_at || b.created_at).getTime();
      return bActivity - aActivity;
    });

    if (import.meta.env.DEV) {
      console.info('✅ Successfully fetched floqs:', {
        total: validFloqs.length,
        created: validFloqs.filter(f => f.role === 'creator').length,
        participated: validFloqs.filter(f => f.role !== 'creator').length
      });
    }

    return validFloqs;

  } catch (error) {
    console.error('❌ Unexpected error fetching floqs:', error);
    throw error;
  }
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
