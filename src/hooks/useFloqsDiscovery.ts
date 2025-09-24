import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useFloqsDiscovery() {
  return useQuery({
    queryKey: ["floqs-discovery"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;
      
      // Get discoverable floqs (simplified query for now)
      const { data, error } = await supabase
        .from("floqs")
        .select(`
          id,
          name,
          title,
          description,
          primary_vibe,
          created_at
        `)
        .limit(50);
        
      if (error) throw error;
      
      if (!userId) {
        return (data ?? []).map(floq => ({
          ...floq,
          member_count: 1,
          live_count: 0,
          privacy: 'request'
        }));
      }
      
      // Filter out floqs the user is already a member of
      const { data: userFloqs } = await supabase
        .from("floq_participants")
        .select("floq_id")
        .eq("profile_id", userId);
        
      const userFloqIds = new Set((userFloqs ?? []).map(p => p.floq_id));
      
      return (data ?? [])
        .filter(floq => !userFloqIds.has(floq.id))
        .map(floq => ({
          ...floq,
          member_count: 1,
          live_count: 0,
          privacy: 'request'
        }));
    }
  });
}