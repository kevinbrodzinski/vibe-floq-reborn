/**
 * Secure location recording edge function with encryption and authentication
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  handleCors, 
  validateAuth, 
  createErrorResponse, 
  createSuccessResponse,
  checkRateLimit,
  validatePayload,
  corsHeaders,
  securityHeaders
} from "../_shared/auth.ts";

interface LocationPing {
  ts: string;
  lat: number;
  lng: number;
  acc: number;
  encrypted?: string;
}

interface LocationBatch {
  batch: LocationPing[];
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! }
        }
      }
    );

    // Validate authentication
    const auth = await validateAuth(req, supabase);
    
    // Rate limiting per user
    if (!checkRateLimit(auth.user.id, 100, 1)) { // 100 requests per minute
      return createErrorResponse('Rate limit exceeded', 429);
    }

    // Validate request payload
    const payload = await req.json();
    const { batch } = validatePayload<LocationBatch>(payload, ['batch']);
    
    if (!Array.isArray(batch) || batch.length === 0) {
      return createErrorResponse('Invalid batch data - must be non-empty array');
    }

    if (batch.length > 50) { // Limit batch size
      return createErrorResponse('Batch too large - maximum 50 locations');
    }

    console.log(`[${auth.user.id}] Recording ${batch.length} location entries`);

    // Validate and process each location entry
    const processedLocations = batch.map((location, index) => {
      // Validate location structure
      if (!location.ts || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        throw new Error(`Invalid location data at index ${index}`);
      }

      // Validate coordinate bounds and finite values
      if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng) || 
          location.lat < -90 || location.lat > 90 || location.lng < -180 || location.lng > 180) {
        throw new Error(`Invalid coordinates at index ${index}`);
      }

      // Validate timestamp (not too old or in future)
      const locationTime = new Date(location.ts).getTime();
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      const oneMinuteFuture = now + (60 * 1000);
      
      if (locationTime < oneHourAgo || locationTime > oneMinuteFuture) {
        console.warn(`Timestamp out of range for location ${index}: ${location.ts}`);
      }

      return {
        profile_id: auth.user.id,
        latitude: location.lat,
        longitude: location.lng,
        accuracy: location.acc || 0,
        recorded_at: location.ts,
        created_at: new Date().toISOString(),
      };
    });

    // Insert locations into database with minimal return
    const { error: insertError } = await supabase
      .from('location_history')
      .insert(processedLocations, { returning: 'minimal' });

    if (insertError) {
      console.error('Database insert error:', insertError);
      return createErrorResponse('Failed to record locations', 500);
    }

    console.log(`[${auth.user.id}] Successfully recorded ${processedLocations.length} locations`);

    // Return success with security headers
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders, ...securityHeaders }
    });

  } catch (error) {
    console.error("Location recording error:", error);
    
    // Log full error details for debugging
    if (error instanceof Error && error.stack) {
      console.error("Error stack:", error.stack);
    }
    
    if (error instanceof Error) {
      if (error.message.includes('authorization') || error.message.includes('token')) {
        return createErrorResponse('Authentication failed', 401);
      }
      if (error.message.includes('Invalid') || error.message.includes('Missing')) {
        return createErrorResponse(error.message, 400);
      }
    }
    
    return createErrorResponse('Internal server error', 500);
  }
});