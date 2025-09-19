import { serve } from "https://deno.land/std@0.181.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role for aggregation tasks
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Round to hour boundaries for consistent frames
    const frameEnd = new Date(now);
    frameEnd.setMinutes(0, 0, 0);
    const frameStart = new Date(frameEnd.getTime() - 60 * 60 * 1000);

    console.log(`Aggregating vibe frames for ${frameStart.toISOString()} to ${frameEnd.toISOString()}`);

    // Get all floqs with activity in the last hour
    const { data: activeFloqs, error: floqError } = await supabase
      .from("vibe_snapshots")
      .select("floq_id")
      .not("floq_id", "is", null)
      .gte("recorded_at", frameStart.toISOString())
      .lt("recorded_at", frameEnd.toISOString());

    if (floqError) {
      console.error("Error fetching active floqs:", floqError);
      throw floqError;
    }

    const uniqueFloqIds = [...new Set(activeFloqs?.map(s => s.floq_id).filter(Boolean) || [])];
    console.log(`Processing ${uniqueFloqIds.length} active floqs`);

    let processedCount = 0;

    for (const floqId of uniqueFloqIds) {
      try {
        // Get all vibe samples for this floq in the time frame
        const { data: samples, error: samplesError } = await supabase
          .from("vibe_snapshots")
          .select("vec, confidence")
          .eq("floq_id", floqId)
          .gte("recorded_at", frameStart.toISOString())
          .lt("recorded_at", frameEnd.toISOString());

        if (samplesError) {
          console.error(`Error fetching samples for floq ${floqId}:`, samplesError);
          continue;
        }

        if (!samples || samples.length === 0) continue;

        // Calculate aggregated metrics
        const energies = samples.map(s => s.vec?.energy || 0).filter(e => typeof e === 'number');
        const socialValues = samples.map(s => s.vec?.social || 0).filter(s => typeof s === 'number');
        
        if (energies.length === 0) continue;

        const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
        const avgSocial = socialValues.reduce((a, b) => a + b, 0) / socialValues.length;
        
        // Calculate harmony (inverse of energy variance)
        const energyVariance = energies.reduce((acc, e) => acc + Math.pow(e - avgEnergy, 2), 0) / energies.length;
        const harmony = Math.max(0, 1 - energyVariance);
        
        // Calculate tension (could be based on stress or other factors)
        const stressValues = samples.map(s => s.vec?.stress || 0).filter(s => typeof s === 'number');
        const avgStress = stressValues.length > 0 ? stressValues.reduce((a, b) => a + b, 0) / stressValues.length : 0;
        const tension = Math.min(1, avgStress);

        // Upsert the aggregated frame
        const { error: upsertError } = await supabase
          .from("vibe_frames_floq")
          .upsert({
            floq_id: floqId,
            frame_start: frameStart.toISOString(),
            frame_end: frameEnd.toISOString(),
            joint_energy: Number(avgEnergy.toFixed(2)),
            harmony: Number(harmony.toFixed(2)),
            tension: Number(tension.toFixed(2)),
            sample_n: samples.length
          }, {
            onConflict: 'floq_id,frame_start'
          });

        if (upsertError) {
          console.error(`Error upserting frame for floq ${floqId}:`, upsertError);
          continue;
        }

        processedCount++;
        console.log(`Processed floq ${floqId}: energy=${avgEnergy.toFixed(2)}, harmony=${harmony.toFixed(2)}, samples=${samples.length}`);
        
      } catch (error) {
        console.error(`Error processing floq ${floqId}:`, error);
        continue;
      }
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        processed_floqs: processedCount,
        frame_start: frameStart.toISOString(),
        frame_end: frameEnd.toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in wings-vibe-aggregate:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});