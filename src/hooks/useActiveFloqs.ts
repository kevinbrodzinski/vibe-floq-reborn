import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FloqRow {
  id: string;
  title: string;
  name: string | null;
  primary_vibe: string;
  vibe_tag: string;
  type: string;
  starts_at: string;
  ends_at: string;
  participant_count: number;
  starts_in_min: number;
  members: {
    avatar_url: string | null;
    id: string;
    username: string | null;
    display_name: string | null;
  }[];
}

export const useActiveFloqs = () => {
  return useQuery<FloqRow[]>({
    queryKey: ['active-floqs'],
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_floqs_with_members');
      if (error) throw error;
      
      // Transform the data to match our interface
      return (data || []).map((floq: any) => ({
        ...floq,
        vibe_tag: floq.primary_vibe, // Map primary_vibe to vibe_tag for consistency
        members: Array.isArray(floq.members) ? floq.members : []
      }));
    },
  });
};