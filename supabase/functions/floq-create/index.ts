import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  try {
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const { data: auth } = await admin.auth.getUser(jwt);
    const userId = auth.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const { name, description, privacy, vibe } = await req.json();
    if (!name?.trim()) throw new Error("Name is required");

    // Create floq
    const { data: floq, error: fErr } = await admin
      .from("floqs")
      .insert({ 
        name: name.trim(),
        title: name.trim(), // Support both name and title fields
        description: description?.trim() || null,
        privacy, 
        primary_vibe: vibe,
        member_count: 1,
        live_count: 0
      })
      .select("id")
      .single();
      
    if (fErr) {
      console.error('Floq creation error:', fErr);
      throw new Error(`Failed to create floq: ${fErr.message}`);
    }

    // Add creator as admin member
    const { error: pErr } = await admin
      .from("floq_participants")
      .insert({ 
        floq_id: floq.id, 
        profile_id: userId, 
        role: "admin",
        joined_at: new Date().toISOString()
      });
      
    if (pErr) {
      console.error('Participant creation error:', pErr);
      // Try to clean up the floq if participant creation fails
      await admin.from("floqs").delete().eq("id", floq.id);
      throw new Error(`Failed to add creator as admin: ${pErr.message}`);
    }

    console.log(`Floq created successfully: ${floq.id} by user ${userId}`);

    return new Response(JSON.stringify({ id: floq.id }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error('Floq creation failed:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});