// supabase/functions/send-message/index.ts
// POST  { thread_id, sender_id, content, … }

import { serve }       from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkRateLimitV2,
  createErrorResponse,
} from "../_shared/helpers.ts";

/*───────────────────────────────────────────────────────────────────────────*/
const CORS = {
  "Access-Control-Allow-Origin" : "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, range-unit",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/*───────────────────────────────────────────────────────────────────────────*/

serve(async req => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: CORS });

  try {
    /*── body → payload ──────────────────────────────────────────────────*/
    const body = await req.json();
    const payload = {
      surface      : (body.surface ?? "dm") as "dm" | "floq" | "plan",
      thread_id    : body.thread_id    ?? body.p_thread_id,
      sender_id    : body.sender_id    ?? body.p_sender_id,
      content      : body.content      ?? body.p_body,
      reply_to_id  : body.reply_to_id  ?? body.p_reply_to_id ?? null,
      message_type : body.message_type ?? body.p_message_type ?? "text",
      metadata     : body.metadata     ?? body.p_media_meta   ?? {},
      client_id    : body.client_id    ?? null,
    };

    if (!payload.thread_id || !uuidRe.test(payload.thread_id))
      throw new Error("Invalid thread_id");
    if (!payload.sender_id || !uuidRe.test(payload.sender_id))
      throw new Error("Invalid sender_id");
    if (typeof payload.content !== "string" || !payload.content.trim())
      throw new Error("content must be a non-empty string");

    /*── rate-limit per user ─────────────────────────────────────────────*/
    const jwtSb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: req.headers.get("Authorization")! } }
      });
    const rl = await checkRateLimitV2(jwtSb, payload.sender_id, "send_message");
    if (!rl.allowed) return createErrorResponse(rl.error!, 429);

    /*── auth: verify membership ─────────────────────────────────────────*/
    if (payload.surface === "dm") {
      const { data } = await sb
        .from("direct_threads")
        .select("member_a, member_b")
        .eq("id", payload.thread_id)
        .single();
      if (!data) throw new Error("Thread not found");
      const isMember =
        data.member_a === payload.sender_id || data.member_b === payload.sender_id;
      if (!isMember) throw new Error("User not member of DM");
    } else {
      const table = payload.surface === "floq" ? "floq_participants"
                                               : "plan_participants";
      const key   = payload.surface === "floq" ? "floq_id" : "plan_id";
      const { data } = await sb
        .from(table)
        .select("profile_id")
        .eq(key, payload.thread_id)
        .eq("profile_id", payload.sender_id)
        .single();
      if (!data) throw new Error("User not a participant");
    }

    /*── insert row  (★ no bogus sender_id column) ───────────────────────*/
    const base = {
      profile_id  : payload.sender_id,          // drives “mine/theirs” in UI
      reply_to_id : payload.reply_to_id,
      message_type: payload.message_type,
      metadata    : payload.client_id
        ? { ...payload.metadata, client_id: payload.client_id }
        : payload.metadata,
      status      : "sent",
    };

    const { data: message, error } = await sb
      .from(payload.surface === "dm" ? "direct_messages" : "chat_messages")
      .insert(payload.surface === "dm"
        ? { ...base, thread_id: payload.thread_id, content: payload.content }
        : { ...base, thread_id: payload.thread_id,
            surface: payload.surface, body: payload.content })
      .select()
      .single();
    if (error) throw error;

    /*── unread counters + last_message_at (DM only) ─────────────────────*/
    if (payload.surface === "dm") {
      const { data } = await sb
        .from("direct_threads")
        .select("member_a, member_b")
        .eq("id", payload.thread_id)
        .single();

      if (data) {
        const unreadCol =
          data.member_a === payload.sender_id ? "unread_b" : "unread_a";
        await sb.from("direct_threads")
          .update({
            last_message_at: new Date().toISOString(),
            [unreadCol]: sb.raw(`COALESCE(${unreadCol},0)+1`)
          })
          .eq("id", payload.thread_id);
      }
    }

    /*── realtime broadcast ─────────────────────────────────────────────*/
    await sb.channel(`${payload.surface}:${payload.thread_id}`)
      .send({ type: "broadcast", event: "message_sent", payload: { message } });

    return new Response(JSON.stringify({ success: true, message }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[send-message] error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});