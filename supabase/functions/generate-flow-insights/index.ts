import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
} as const;

const ok = (b: unknown) => new Response(JSON.stringify(b), {
  headers: { ...CORS, 'content-type': 'application/json' }
});

const bad = (m: string, c = 400) => new Response(JSON.stringify({ error: m }), {
  status: c,
  headers: { ...CORS, 'content-type': 'application/json' }
});

type Body = { flowId: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return bad('POST required', 405);

  let body: Body;
  try { 
    body = await req.json();
  } catch { 
    return bad('invalid JSON', 422);
  }
  
  if (!body.flowId) return bad('flowId required', 422);

  console.log(`[generate-flow-insights] Processing flow: ${body.flowId}`);

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!, 
    Deno.env.get('SUPABASE_ANON_KEY')!, 
    {
      global: { 
        headers: { Authorization: req.headers.get('Authorization') || '' } 
      }
    }
  );

  try {
    // Pull summary to seed the insights
    const { data: summary, error: sumErr } = await supa.rpc('flow_summary', { 
      _flow_id: body.flowId 
    });
    
    if (sumErr) {
      console.error('[generate-flow-insights] Summary error:', sumErr);
      return bad(sumErr.message, 500);
    }

    console.log('[generate-flow-insights] Flow summary:', summary);

    // Generate insights based on the summary data
    const insights = {
      headline: generateHeadline(summary),
      highlights: generateHighlights(summary),
      patterns: generatePatterns(summary),
      suggestions: generateSuggestions(summary)
    };

    console.log('[generate-flow-insights] Generated insights:', insights);

    // Update the flow with insights
    const { error: updateErr } = await supa
      .from('flows')
      .update({ 
        insights, 
        reflection_generated_at: new Date().toISOString() 
      })
      .eq('id', body.flowId);

    if (updateErr) {
      console.error('[generate-flow-insights] Update error:', updateErr);
      return bad(updateErr.message, 500);
    }

    console.log('[generate-flow-insights] Successfully updated flow with insights');

    return ok({ summary, insights });
  } catch (error) {
    console.error('[generate-flow-insights] Unexpected error:', error);
    return bad('Internal server error', 500);
  }
});

function generateHeadline(summary: any): string {
  const elapsedMin = Math.round(summary.elapsedMin || 0);
  const distanceKm = ((summary.distanceM || 0) / 1000).toFixed(1);
  const suiPct = summary.suiPct;

  if (suiPct && suiPct > 80) {
    return `Your Golden Hour Flow — ${elapsedMin}min of pure sunshine ☀️`;
  } else if (suiPct && suiPct > 60) {
    return `Your Balanced Flow — ${elapsedMin}min perfectly paced`;
  } else if (distanceKm > '2.0') {
    return `Your Explorer Flow — ${distanceKm}km of discovery`;
  } else {
    return `Your Focused Flow — ${elapsedMin}min of intentional movement`;
  }
}

function generateHighlights(summary: any): string[] {
  const highlights: string[] = [];
  const elapsedMin = Math.round(summary.elapsedMin || 0);
  const distanceKm = ((summary.distanceM || 0) / 1000).toFixed(1);
  const suiPct = summary.suiPct;
  const energy = summary.energyMedian;
  const venues = summary.topVenues || [];

  // Time-based highlights
  if (elapsedMin > 120) {
    highlights.push('🕐 Extended flow session - great endurance!');
  } else if (elapsedMin > 60) {
    highlights.push('⏰ Perfect flow duration for exploration');
  }

  // Distance highlights
  if (distanceKm > '3.0') {
    highlights.push(`🚶 Covered ${distanceKm}km - excellent range`);
  } else if (distanceKm > '1.0') {
    highlights.push(`📍 ${distanceKm}km of mindful movement`);
  }

  // Sun exposure highlights
  if (suiPct && suiPct > 70) {
    highlights.push(`☀️ ${suiPct}% sun exposure - vitamin D boost!`);
  } else if (suiPct && suiPct > 40) {
    highlights.push(`🌤️ Balanced indoor/outdoor time`);
  }

  // Energy highlights
  if (energy && energy > 0.7) {
    highlights.push('⚡ High energy flow - you were in the zone');
  } else if (energy && energy > 0.5) {
    highlights.push('💫 Steady energy throughout');
  }

  // Venue highlights
  if (venues.length >= 3) {
    highlights.push(`🗺️ Explored ${venues.length} unique locations`);
  } else if (venues.length === 2) {
    highlights.push('🎯 Focused on quality over quantity');
  }

  return highlights.slice(0, 3); // Return top 3 highlights
}

function generatePatterns(summary: any): string[] {
  const patterns: string[] = [];
  const hour = new Date(summary.startedAt).getHours();
  const energy = summary.energyMedian;
  const suiPct = summary.suiPct;

  // Time-based patterns
  if (hour >= 6 && hour <= 9) {
    patterns.push('Early riser - morning flows tend to be more energetic');
  } else if (hour >= 17 && hour <= 19) {
    patterns.push('Golden hour explorer - sunset flows boost mood');
  } else if (hour >= 12 && hour <= 14) {
    patterns.push('Midday mover - avoiding peak productivity hours');
  }

  // Energy patterns
  if (energy && energy > 0.6) {
    patterns.push('High-energy personality - you thrive in active environments');
  }

  // Sun exposure patterns
  if (suiPct && suiPct > 60) {
    patterns.push('Sunshine seeker - you naturally gravitate outdoors');
  }

  return patterns.slice(0, 2); // Return top 2 patterns
}

function generateSuggestions(summary: any): string[] {
  const suggestions: string[] = [];
  const suiPct = summary.suiPct;
  const energy = summary.energyMedian;
  const venues = summary.topVenues || [];
  const elapsedMin = Math.round(summary.elapsedMin || 0);

  // Sun exposure suggestions
  if (suiPct && suiPct < 30) {
    suggestions.push('Try starting 30min earlier for more natural light');
  } else if (suiPct && suiPct < 60) {
    suggestions.push('Consider more outdoor segments for vitamin D');
  }

  // Energy optimization
  if (energy && energy < 0.4) {
    suggestions.push('Try visiting more energetic venues to boost your vibe');
  }

  // Exploration suggestions
  if (venues.length <= 1) {
    suggestions.push('Explore 2-3 locations for a more dynamic flow');
  }

  // Duration suggestions
  if (elapsedMin < 30) {
    suggestions.push('Extend your flow to 45-60 minutes for deeper immersion');
  } else if (elapsedMin > 180) {
    suggestions.push('Consider shorter, more focused flows for sustainability');
  }

  // Social suggestions
  suggestions.push('Invite friends with similar energy patterns next time');

  return suggestions.slice(0, 3); // Return top 3 suggestions
}