import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MyFloq = {
  id: string;
  name: string;
  title: string;
  description: string;
  primary_vibe: string;
  created_at: string;
  user_role: string;
  member_count: number;
  live_count: number;
  privacy: string;
  // Legacy compatibility fields
  participant_count?: number;
  is_creator?: boolean;
  last_activity_at?: string;
  creator_id?: string;
  starts_at?: string;
  ends_at?: string;
  status?: string;
};

export function useMyFloqs() {
  return useQuery<MyFloq[]>({
    queryKey: ["my-floqs"],
    queryFn: async () => {
      // Join floq_participants with floqs to get user's floqs
      const { data, error } = await supabase
        .from("floq_participants")
        .select(`
          floq_id,
          role,
          floqs (
            id,
            name,
            title,
            description,
            primary_vibe,
            created_at
          )
        `)
        .eq("profile_id", (await supabase.auth.getUser()).data.user?.id);
        
      if (error) throw error;
      
      // Flatten the structure to return floq objects with role info
      return (data ?? []).map(participant => ({
        id: participant.floqs?.id || '',
        name: participant.floqs?.name || participant.floqs?.title || 'Untitled',
        title: participant.floqs?.title || participant.floqs?.name || 'Untitled',
        description: participant.floqs?.description || '',
        primary_vibe: participant.floqs?.primary_vibe || 'social',
        created_at: participant.floqs?.created_at || new Date().toISOString(),
        user_role: participant.role,
        member_count: 1,
        live_count: 0,
        privacy: 'request',
        // Legacy compatibility
        participant_count: 1,
        is_creator: participant.role === 'admin',
        last_activity_at: participant.floqs?.created_at,
        creator_id: participant.role === 'admin' ? participant.floqs?.id : undefined,
        status: 'active'
      })).filter(floq => floq.id);
    }
  });
}