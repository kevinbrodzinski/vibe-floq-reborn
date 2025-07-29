import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { thread_id, filename, content_type } = await req.json();
    if (!thread_id || !filename) {
      return new Response(JSON.stringify({ error: "thread_id & filename required" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { data: isOK } = await supabase.rpc("is_thread_member", {
      p_thread_id: thread_id,
      p_user_id: user.id
    });
    if (!isOK) {
      return new Response(JSON.stringify({ error: "not a member of this thread" }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const objectName = `${thread_id}/${crypto.randomUUID()}.${filename.split('.').pop() || 'bin'}`;
    const { data, error: urlErr } = await supabase.storage
      .from("chat-media")
      .createSignedUploadUrl(objectName, 60);

    if (urlErr) throw urlErr;

    return new Response(JSON.stringify({
      upload_url: data.signedUrl,
      object_key: objectName,
      bucket: "chat-media",
      mime_type: content_type ?? "application/octet-stream",
      expires_in: 60
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (e) {
    console.error("[upload-chat-media]", e);
    return new Response(JSON.stringify({ error: "internal error" }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});