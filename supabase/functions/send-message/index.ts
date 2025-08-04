
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimitV2, createErrorResponse } from "../_shared/helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* -------------------------------------------------- */
/*  Shared Supabase client (service-role)             */
/* -------------------------------------------------- */
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/* -------------------------------------------------- */
/*  Helper: basic UUID regex                          */
/* -------------------------------------------------- */
const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/* -------------------------------------------------- */
serve(async (req) => {
  /* ---------- CORS pre-flight ---------- */
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    /* ---------- Parse & validate body ---------- */
    const input = await req.json();
    const payload = {
      surface:    (input.surface ?? "dm") as "dm" | "floq" | "plan",
      thread_id:  input.thread_id  ?? input.p_thread_id,
      sender_id:  input.sender_id  ?? input.p_sender_id,
      content:    input.content    ?? input.p_body ?? input.body,
      reply_to_id: input.reply_to_id ?? input.p_reply_to_id ?? null,
      message_type: input.message_type ?? input.p_message_type ?? "text",
      metadata:   input.metadata   ?? input.p_media_meta   ?? {},
      client_id:  input.client_id  ?? null,
    };

    if (!payload.thread_id || !payload.sender_id) {
      throw new Error("Missing thread_id or sender_id");
    }
    if (!uuidRe.test(payload.thread_id)) {
      throw new Error("Invalid thread_id UUID");
    }
    if (!uuidRe.test(payload.sender_id)) {
      throw new Error("Invalid sender_id UUID");
    }
    if (!payload.content || typeof payload.content !== "string") {
      throw new Error("content must be non-empty string");
    }

    /* ---------- Enhanced Rate limiting for messaging ---------- */
    // Create a temporary supabase client with user JWT for rate limiting
    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    
    const rateLimitResult = await checkRateLimitV2(userSupabase, payload.sender_id, 'send_message');
    if (!rateLimitResult.allowed) {
      return createErrorResponse(rateLimitResult.error || "Rate limit exceeded", 429);
    }

    /* ---------- Authorisation checks ---------- */
    if (payload.surface === "dm") {
      const { data, error } = await supabase
        .from("direct_threads")
        .select("member_a, member_b")
        .eq("id", payload.thread_id)
        .single();
      if (error || !data) throw new Error("Thread not found");
      const isMember =
        data.member_a === payload.sender_id || data.member_b === payload.sender_id;
      if (!isMember) throw new Error("User not member of DM");
    } else {
      const table = payload.surface === "floq"
        ? "floq_participants"
        : "plan_participants";
      const key   = payload.surface === "floq" ? "floq_id" : "plan_id";
      const { data, error } = await supabase
        .from(table)
        .select("profile_id")
        .eq(key, payload.thread_id)
        .eq("profile_id", payload.sender_id)
        .single();
      if (error || !data) throw new Error("User not a participant");
    }

    /* ---------- Build row & table ---------- */
    const base = {
      sender_id:  payload.sender_id,
      profile_id: payload.sender_id,
      reply_to_id: payload.reply_to_id,
      message_type: payload.message_type,
      metadata:  payload.client_id
        ? { ...payload.metadata, client_id: payload.client_id }
        : payload.metadata,
      status: "sent",
    };

    let table = "direct_messages";
    let row: Record<string, unknown>;

    if (payload.surface === "dm") {
      table = "direct_messages";
      row = { ...base, thread_id: payload.thread_id, content: payload.content };
    } else {
      table = "chat_messages";
      row = {
        ...base,
        thread_id: payload.thread_id,
        surface:   payload.surface,
        body:      payload.content,
      };
    }

    /* ---------- Insert ---------- */
    const { data: message, error: insertErr } = await supabase
      .from(table)
      .insert(row)
      .select()
      .single();
    if (insertErr) throw insertErr;

    /* ---------- Update DM thread unread count ---------- */
    if (payload.surface === "dm") {
      const { data } = await supabase
        .from("direct_threads")
        .select("member_a, member_b")
        .eq("id", payload.thread_id)
        .single();
      if (data) {
        const unreadCol =
          data.member_a === payload.sender_id ? "unread_b" : "unread_a";
        await supabase
          .from("direct_threads")
          .update({
            last_message_at: new Date().toISOString(),
            [unreadCol]: supabase.raw(`COALESCE(${unreadCol},0)+1`),
          })
          .eq("id", payload.thread_id);
      }
    }

    /* ---------- Realtime broadcast ---------- */
    await supabase.channel(`${payload.surface}:${payload.thread_id}`).send({
      type: "broadcast",
      event: "message_sent",
      payload: { message },
    });

    /* ---------- Success ---------- */
    return new Response(
      JSON.stringify({ success: true, message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[send-message] error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});