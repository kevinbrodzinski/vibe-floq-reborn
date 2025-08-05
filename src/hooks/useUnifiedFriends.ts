/* ------------------------------------------------------------------
   useUnifiedFriends  –  one hook for friends, requests & presence
   ------------------------------------------------------------------ */
import { useEffect, useMemo }  from 'react';
import { useQueryClient,
         useQuery,
         useMutation }         from '@tanstack/react-query';
import { supabase }            from '@/integrations/supabase/client';
import { useAuth }             from '@/hooks/useAuth';
import { useToast }            from '@/hooks/use-toast';
import { useInvalidateDiscover } from '@/hooks/useInvalidateDiscover';

/* ---------- shape returned by view -------------------------------- */
interface ViewRow {
  friend_id      : string;                 // other user's id
  display_name   : string | null;
  username       : string | null;
  avatar_url     : string | null;

  online         : boolean;                // presence flag
  started_at     : string | null;          // presence.started_at
  vibe_tag       : string | null;          // presence.vibe_tag

  friend_state   : 'pending' | 'accepted' | 'blocked';
  created_at     : string | null;
  responded_at   : string | null;
  
  // Direction flags for pending requests
  is_outgoing_request : boolean;
  is_incoming_request : boolean;
}

/* ---------- shape exposed to components --------------------------- */
export interface UnifiedRow {
  id             : string;                 // mapped from friend_id
  display_name   : string | null;
  username       : string | null;
  avatar_url     : string | null;

  online         : boolean;                // presence flag
  started_at     : string | null;          // presence.started_at
  vibe_tag       : string | null;          // presence.vibe_tag

  friend_state   : 'pending' | 'accepted' | 'blocked';
  created_at     : string | null;
  responded_at   : string | null;
  
  // Direction flags for pending requests
  is_outgoing_request : boolean;
  is_incoming_request : boolean;
}

/* ---------- mutation helpers ---------------------------------------- */
const sendFriendRequest = async (targetUserId: string) => {
  const { error } = await supabase
    .from('friend_requests')
    .insert({
      profile_id: (await supabase.auth.getUser()).data.user?.id,
      other_profile_id: targetUserId,
      status: 'pending'
    });
  
  if (error) throw error;
};

const acceptFriendRequest = async (fromUserId: string) => {
  // Get the current user ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Update the friend request to accepted
  const { error: updateError } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('profile_id', fromUserId)
    .eq('other_profile_id', user.id)
    .eq('status', 'pending');

  if (updateError) throw updateError;

  // Create the bidirectional friendship
  const { error: friendshipError } = await supabase.rpc('upsert_friendship', {
    _other_user: fromUserId,
    _new_state: 'accepted'
  });

  if (friendshipError) throw friendshipError;
};

const blockUser = async (targetUserId: string) => {
  const { error } = await supabase.rpc('upsert_friendship', {
    _other_user: targetUserId,
    _new_state: 'blocked'
  });
  
  if (error) throw error;
};

/* ------------------------------------------------------------------ */
export function useUnifiedFriends() {
  const { user } = useAuth();
  const uid      = user?.id;
  const qc       = useQueryClient();
  const { toast }= useToast();
  const invalidateDiscover = useInvalidateDiscover();

  /* ── 1. main list (view) ────────────────────────────────────────── */
  const { data = [], isLoading } = useQuery({
    queryKey : ['friends', uid],
    enabled  : !!uid,
    staleTime: 15_000,
    queryFn  : async (): Promise<UnifiedRow[]> => {
      const { data, error } = await supabase
        .from('v_friends_with_presence' as any)
        .select('*')
        .order('display_name', { ascending: true });

      if (error) throw error;
      
      // Map friend_id to id for component consumption
      return (data as unknown as ViewRow[])?.map(row => ({
        id: row.friend_id,
        display_name: row.display_name,
        username: row.username,
        avatar_url: row.avatar_url,
        online: row.online,
        started_at: row.started_at,
        vibe_tag: row.vibe_tag,
        friend_state: row.friend_state,
        created_at: row.created_at,
        responded_at: row.responded_at,
        is_outgoing_request: row.is_outgoing_request,
        is_incoming_request: row.is_incoming_request,
      })) ?? [];
    },
  });

  /* ── 2. realtime invalidation (friends + presence) ─────────────── */
  useEffect(() => {
    if (!uid) return;

    const invalidate = () =>
      qc.invalidateQueries({ queryKey: ['friends', uid] });

    const ch = supabase.channel(`friends+presence:${uid}`)
      .on(
        'postgres_changes',
        { event:'*', schema:'public', table:'friendships',
          filter:`or(user_low.eq.${uid},user_high.eq.${uid})` },
        invalidate
      )
      .on(
        'postgres_changes',
        { event:'*', schema:'public', table:'friend_requests',
          filter:`or(profile_id.eq.${uid},other_profile_id.eq.${uid})` },
        invalidate
      )
      .on(
        'postgres_changes',
        { event:'*', schema:'public', table:'presence' },
        invalidate         // we filter in JS: only friends' presence rows are in the view
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [uid, qc]);

  /* ── 3. mutate helper ------------------------------------------------ */
  const mutation = useMutation({
    mutationFn : ({ other, state }: { other:string; state:'pending'|'accepted'|'blocked' }) => {
      switch (state) {
        case 'pending':
          return sendFriendRequest(other);
        case 'accepted':
          return acceptFriendRequest(other);
        case 'blocked':
          return blockUser(other);
        default:
          throw new Error(`Unknown state: ${state}`);
      }
    },

    onSuccess  : (_, vars) => {
      qc.invalidateQueries({ queryKey:['friends', uid] });
      invalidateDiscover(); // Invalidate discovery cache
      toast({ title:
        vars.state==='pending'  ? 'Request sent 🎉' :
        vars.state==='accepted' ? 'Friend added ✅' :
        vars.state==='blocked'  ? 'User blocked'   :
        'Updated' });
    },
    onError    : (e:any) =>
      toast({ title:'Error', description:e.message, variant:'destructive' })
  });

  /* ── 4. derived helpers -------------------------------------------- */
  const acceptedIds = data
    .filter(r => r.friend_state === 'accepted')
    .map   (r => r.id);

  // Use the direction flags from the updated view
  const pendingIn  = data
    .filter(r => r.friend_state === 'pending' && r.is_incoming_request);

  const pendingOut = data
    .filter(r => r.friend_state === 'pending' && r.is_outgoing_request);

  // Memoized helper functions
  const isFriend = useMemo(() => 
    (id: string): boolean => acceptedIds.includes(id), 
    [acceptedIds]
  );
  
  const isPending = useMemo(() => 
    (id: string): boolean => data.some(r => r.id === id && r.friend_state === 'pending'),
    [data]
  );

  /* ── 5. public API --------------------------------------------------- */
  return {
    isLoading,
    rows        : data,

    friendIds   : acceptedIds,
    pendingIn,
    pendingOut,

    /* actions */
    sendRequest : (id:string) => mutation.mutate({ other:id, state:'pending' }),
    accept      : (id:string) => mutation.mutate({ other:id, state:'accepted' }),
    block       : (id:string) => mutation.mutate({ other:id, state:'blocked' }),

    isFriend,
    isPending,
    updating    : mutation.isPending,
  };
}