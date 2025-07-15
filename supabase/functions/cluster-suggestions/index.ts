import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ClusterSuggestion {
  cluster_id: string
  top_vibes: Array<{ vibe: string; count: number; score: number }>
  is_hot: boolean
  people_estimate: number
  centroid: { coordinates: [number, number] }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Extract cluster ID from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const clusterId = pathParts[pathParts.length - 1]

    if (!clusterId) {
      return new Response(
        JSON.stringify({ error: 'Cluster ID required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch cluster data
    const { data: cluster, error } = await supabase
      .from('vibe_clusters')
      .select('gh6, centroid, vibe_counts, vibe_popularity, vibe_momentum, total')
      .eq('gh6', clusterId)
      .single()

    if (error || !cluster) {
      console.error('Cluster fetch error:', error)
      return new Response(
        JSON.stringify({ error: 'Cluster not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Process vibe counts and calculate scores
    const vibeEntries = Object.entries(cluster.vibe_counts || {})
    const totalVibes = vibeEntries.reduce((sum, [, count]) => sum + (count as number), 0)

    const topVibes = vibeEntries
      .map(([vibe, count]) => {
        const vibeCount = count as number
        const popularity = vibeCount / totalVibes
        const momentum = cluster.vibe_momentum || 0
        const score = popularity * 0.7 + (momentum > 0 ? 0.3 : 0)
        
        return {
          vibe,
          count: vibeCount,
          score: Number(score.toFixed(3))
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    const suggestion: ClusterSuggestion = {
      cluster_id: clusterId,
      top_vibes: topVibes,
      is_hot: (cluster.vibe_momentum || 0) > 5,
      people_estimate: Math.round(cluster.vibe_popularity || cluster.total || 0),
      centroid: cluster.centroid
    }

    return new Response(
      JSON.stringify(suggestion),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=15, stale-while-revalidate=30'
        }
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})