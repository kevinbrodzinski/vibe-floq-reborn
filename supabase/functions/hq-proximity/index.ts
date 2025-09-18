import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface MemberLocation {
  profile_id: string;
  display_name: string;
  avatar_url?: string;
  lat: number;
  lng: number;
  vibe: string;
  updated_at: string;
  distance_to_center?: number;
  status: 'online' | 'offline' | 'away';
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { floq_id } = await req.json();
    
    if (!floq_id) {
      throw new Error('floq_id is required');
    }

    console.log(`[hq-proximity] Processing floq: ${floq_id}`);

    // Get floq participants
    const { data: participants, error: participantsError } = await supabase
      .from('floq_participants')
      .select(`
        profile_id,
        profiles!inner(
          display_name,
          avatar_url
        )
      `)
      .eq('floq_id', floq_id);

    if (participantsError) throw participantsError;

    if (!participants || participants.length === 0) {
      console.log(`[hq-proximity] No participants found for floq: ${floq_id}`);
      return new Response(JSON.stringify({
        members: [],
        center_lat: 0,
        center_lng: 0,
        convergence_score: 0,
        meet_halfway: null,
        receipt: { policy_fingerprint: "hq-proximity-v1", floq_id }
      }), { headers: { "Content-Type": "application/json", ...corsHeaders }});
    }

    const profileIds = participants.map(p => p.profile_id);
    console.log(`[hq-proximity] Found ${participants.length} participants`);

    // Get current presence/location data for members
    const { data: presenceData, error: presenceError } = await supabase
      .from('vibes_now')
      .select('*')
      .in('profile_id', profileIds)
      .not('location', 'is', null);

    if (presenceError) throw presenceError;

    // Get online status for members
    const { data: onlineStatus, error: onlineError } = await supabase
      .from('user_online_status')
      .select('profile_id, is_online, last_seen')
      .in('profile_id', profileIds);

    if (onlineError) throw onlineError;

    // Process member locations
    const members: MemberLocation[] = participants
      .map(participant => {
        const profile = participant.profiles as any;
        const presence = presenceData?.find(p => p.profile_id === participant.profile_id);
        const status = onlineStatus?.find(s => s.profile_id === participant.profile_id);

        if (!presence || !presence.location) return null;

        // Extract lat/lng from PostGIS point
        const coords = extractCoordinates(presence.location);
        if (!coords) return null;

        return {
          profile_id: participant.profile_id,
          display_name: profile?.display_name || 'Unknown',
          avatar_url: profile?.avatar_url,
          lat: coords.lat,
          lng: coords.lng,
          vibe: presence.vibe || 'neutral',
          updated_at: presence.updated_at,
          status: determineStatus(status?.is_online, status?.last_seen)
        };
      })
      .filter(Boolean) as MemberLocation[];

    console.log(`[hq-proximity] Found ${members.length} members with location data`);

    if (members.length === 0) {
      return new Response(JSON.stringify({
        members: [],
        center_lat: 0,
        center_lng: 0,
        convergence_score: 0,
        meet_halfway: null,
        receipt: { policy_fingerprint: "hq-proximity-v1", floq_id }
      }), { headers: { "Content-Type": "application/json", ...corsHeaders }});
    }

    // Calculate center point
    const center = calculateCenter(members);
    
    // Calculate distances and convergence
    const membersWithDistances = members.map(member => ({
      ...member,
      distance_to_center: calculateDistance(
        member.lat, member.lng, 
        center.lat, center.lng
      )
    }));

    // Calculate convergence score (0-1, higher = more converged)
    const avgDistanceToCenter = membersWithDistances.reduce(
      (sum, m) => sum + (m.distance_to_center || 0), 0
    ) / membersWithDistances.length;
    
    const convergenceScore = Math.max(0, Math.min(1, 
      1 - (avgDistanceToCenter / 5000) // 5km max distance for full convergence
    ));

    // Find optimal meeting point (simple centroid for now)
    const meetHalfway = members.length >= 2 ? {
      lat: center.lat,
      lng: center.lng,
      name: "Optimal Meeting Point"
    } : null;

    const result = {
      members: membersWithDistances,
      center_lat: center.lat,
      center_lng: center.lng,
      convergence_score: convergenceScore,
      meet_halfway: meetHalfway,
      receipt: { 
        policy_fingerprint: "hq-proximity-v1", 
        floq_id,
        processed_at: new Date().toISOString(),
        member_count: members.length
      }
    };

    console.log(`[hq-proximity] Returning data for ${members.length} members, convergence: ${convergenceScore.toFixed(2)}`);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error) {
    console.error(`[hq-proximity] Error:`, error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message,
      receipt: { policy_fingerprint: "hq-proximity-v1-error" }
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});

// Helper functions
function extractCoordinates(postgisPoint: any): { lat: number; lng: number } | null {
  if (!postgisPoint) return null;
  
  // Handle different PostGIS point formats
  if (typeof postgisPoint === 'string') {
    // Parse "POINT(lng lat)" format
    const match = postgisPoint.match(/POINT\(([^)]+)\)/);
    if (match) {
      const [lng, lat] = match[1].split(' ').map(Number);
      return { lat, lng };
    }
  } else if (postgisPoint && typeof postgisPoint === 'object') {
    // Handle GeoJSON format
    if (postgisPoint.coordinates && Array.isArray(postgisPoint.coordinates)) {
      const [lng, lat] = postgisPoint.coordinates;
      return { lat, lng };
    }
  }
  
  return null;
}

function calculateCenter(members: MemberLocation[]): { lat: number; lng: number } {
  if (members.length === 0) return { lat: 0, lng: 0 };
  
  const avgLat = members.reduce((sum, m) => sum + m.lat, 0) / members.length;
  const avgLng = members.reduce((sum, m) => sum + m.lng, 0) / members.length;
  
  return { lat: avgLat, lng: avgLng };
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

function determineStatus(isOnline?: boolean, lastSeen?: string): 'online' | 'offline' | 'away' {
  if (isOnline === true) return 'online';
  if (isOnline === false && lastSeen) {
    const lastSeenTime = new Date(lastSeen).getTime();
    const now = Date.now();
    const minutesAgo = (now - lastSeenTime) / (1000 * 60);
    
    if (minutesAgo < 15) return 'away';
  }
  return 'offline';
}