import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';

type ThreadRow = {
  id: string;
  member_a_profile_id: string;
  member_b_profile_id: string;
  last_message_at: string | null;

  // aliased profile joins (names must match your constraints)
  member_a_profile: { id: string; display_name: string | null; username: string | null; avatar_url: string | null } | null;
  member_b_profile: { id: string; display_name: string | null; username: string | null; avatar_url: string | null } | null;
};

export function useThreads() {
  const currentProfileId = useCurrentUserId(); // returns profile_id (same as user.id in your app)
  const enabled = !!currentProfileId;

  return useQuery({
    queryKey: ['dm-threads', currentProfileId],                 // ✅ stable key
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      // ✅ Only fetch threads where I'm a member (by profile_id)
      const { data, error } = await supabase
        .from('direct_threads')
        .select(`
          id,
          member_a_profile_id,
          member_b_profile_id,
          last_message_at,
          member_a_profile:profiles!fk_member_a (
            id, display_name, username, avatar_url
          ),
          member_b_profile:profiles!fk_member_b (
            id, display_name, username, avatar_url
          )
        `)
        .or(`member_a_profile_id.eq.${currentProfileId},member_b_profile_id.eq.${currentProfileId}`)
        .order('last_message_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // ✅ map the "friend" side for the UI
      const rows = (data ?? []) as unknown as ThreadRow[];
      return rows.map((t) => {
        const amA = t.member_a_profile_id === currentProfileId;
        const friend =
          amA ? t.member_b_profile : t.member_a_profile;

        return {
          id: t.id,
          friend_profile_id: amA ? t.member_b_profile_id : t.member_a_profile_id,
          friend_display_name: friend?.display_name ?? '',
          friend_username: friend?.username ?? '',
          friend_avatar_url: friend?.avatar_url ?? '',
          last_message_at: t.last_message_at,
        };
      });
    },
  });
}