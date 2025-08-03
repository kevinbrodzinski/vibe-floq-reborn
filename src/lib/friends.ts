import { supabase } from "@/integrations/supabase/client";

/* -------------------------------------------------- */
/* 1.  Send request  (you  ➜ target)                  */
/* -------------------------------------------------- */
export async function sendFriendRequest(targetUserId: string) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw authErr ?? new Error("Not authenticated");
  if (targetUserId === user.id) throw new Error("Cannot add yourself");

  // Use rate-limited friend request function
  const { data, error } = await supabase.rpc("send_friend_request_with_rate_limit", {
    p_target_user_id: targetUserId
  });

  if (error) throw error;
  
  // Handle rate limiting responses
  if (data && !data.success) {
    const errorMessage = data.message || "Failed to send friend request";
    if (data.error === 'rate_limit_exceeded') {
      throw new Error(`Rate limit exceeded: ${errorMessage}`);
    } else if (data.error === 'user_rate_limit_exceeded') {
      throw new Error(`Already sent request: ${errorMessage}`);
    } else if (data.error === 'duplicate_request') {
      throw new Error("Friend request already exists");
    } else {
      throw new Error(errorMessage);
    }
  }
  
  return data;
}

/* -------------------------------------------------- */
/* 2.  Accept request  (you  ◀ target)                */
/* -------------------------------------------------- */
export async function acceptFriendRequest(fromUserId: string) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw authErr ?? new Error("Not authenticated");

  // Use atomic function to prevent race conditions
  const { data, error } = await supabase.rpc("accept_friend_request_atomic", {
    requester_id: fromUserId
  });
  
  if (error) throw error;
  return data;
}

/* -------------------------------------------------- */
/* 3.  Block (or re-block) a user                     */
/* -------------------------------------------------- */
export async function blockUser(targetUserId: string) {
  const { data, error } = await supabase.rpc("upsert_friendship", {
    _other_user: targetUserId,
    _new_state:  "blocked",
  });
  if (error) throw error;
  return data;
}