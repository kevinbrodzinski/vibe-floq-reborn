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

    const { floq_id, invitee_profile_id } = await req.json();
    if (!floq_id || !invitee_profile_id) throw new Error("Missing floq_id or invitee_profile_id");

    // Confirm inviter is member with admin/member privileges
    const { data: inviter } = await admin
      .from("floq_participants")
      .select("role")
      .eq("floq_id", floq_id)
      .eq("profile_id", userId)
      .maybeSingle();
      
    if (!inviter) throw new Error("You are not a member of this floq");

    // Check if invitee is already a member
    const { data: existingMember } = await admin
      .from("floq_participants")
      .select("profile_id")
      .eq("floq_id", floq_id)
      .eq("profile_id", invitee_profile_id)
      .maybeSingle();
      
    if (existingMember) throw new Error("User is already a member of this floq");

    // Check if there's already a pending invitation
    const { data: existingInvite } = await admin
      .from("floq_invitations")
      .select("id")
      .eq("floq_id", floq_id)
      .eq("invitee_id", invitee_profile_id)
      .eq("status", "pending")
      .maybeSingle();
      
    if (existingInvite) throw new Error("Invitation already sent to this user");

    // Create the invitation
    const { error } = await admin
      .from("floq_invitations")
      .insert({ 
        floq_id, 
        inviter_id: userId, 
        invitee_id: invitee_profile_id, 
        status: "pending",
        created_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('Invitation creation error:', error);
      throw new Error(`Failed to send invitation: ${error.message}`);
    }

    console.log(`Invitation sent: floq ${floq_id}, inviter ${userId}, invitee ${invitee_profile_id}`);

    return new Response(JSON.stringify({ success: true }), { 
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (e) {
    console.error('Invitation failed:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { 
      status: 400, 
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});