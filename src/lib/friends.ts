import { supabase } from "@/integrations/supabase/client";

/* -------------------------------------------------- */
/* 1.  Send request  (you  ➜ target)                  */
/* -------------------------------------------------- */
export async function sendFriendRequest(targetUserId: string) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw authErr ?? new Error("Not authenticated");
  if (targetUserId === user.id) throw new Error("Cannot add yourself");

  const { error } = await supabase.from("friend_requests")
    .upsert(
      {
        profile_id:       user.id,        // requester
        other_profile_id: targetUserId,   // addressee
        status:           "pending",
      },
      { onConflict: "profile_id,other_profile_id", ignoreDuplicates: true }
    );

  if (error && error.code !== "23505") throw error; // ignore duplicate error if it bubbles
}

/* -------------------------------------------------- */
/* 2.  Accept request  (you  ◀ target)                */
/* -------------------------------------------------- */
export async function acceptFriendRequest(fromUserId: string) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw authErr ?? new Error("Not authenticated");

  /* 2-a  mark request accepted */
  const { error: updErr } = await supabase
    .from("friend_requests")
    .update({
      status:       "accepted",
      responded_at: new Date().toISOString(),
    })
    .eq("profile_id", fromUserId)   // requester = them
    .eq("other_profile_id", user.id) // addressee = you
    .eq("status", "pending");

  if (updErr) throw updErr;

  /* 2-b  write bidirectional friendship */
  const { error: rpcErr } = await supabase.rpc("upsert_friendship", {
    _other_user: fromUserId,
    _new_state:  "accepted",
  });
  if (rpcErr) throw rpcErr;
}

/* -------------------------------------------------- */
/* 3.  Block (or re-block) a user                     */
/* -------------------------------------------------- */
export async function blockUser(targetUserId: string) {
  const { error } = await supabase.rpc("upsert_friendship", {
    _other_user: targetUserId,
    _new_state:  "blocked",
  });
  if (error) throw error;
}