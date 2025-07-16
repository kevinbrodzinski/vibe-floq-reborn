import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AfterglowMoment {
  timestamp: string
  moment_type: string
  title: string
  description?: string
  color: string
  metadata: Record<string, any>
}

interface DailyAfterglowData {
  user_id: string
  date: string
  vibe_path: string[]
  emotion_journey: any[]
  peak_vibe_time?: string
  dominant_vibe?: string
  total_venues: number
  total_floqs: number
  crossed_paths_count: number
  energy_score: number
  social_intensity: number
  summary_text: string
  moments: AfterglowMoment[]
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id, date, batch_mode } = await req.json()

    if (batch_mode) {
      // Generate for all active users from yesterday
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const targetDate = yesterday.toISOString().split('T')[0]

      const { data: activeUsers } = await supabase
        .from('user_vibe_states')
        .select('user_id')
        .gte('started_at', `${targetDate}T00:00:00`)
        .lt('started_at', `${targetDate}T23:59:59`)

      if (activeUsers) {
        const results = await Promise.allSettled(
          activeUsers.map(({ user_id }) => 
            generateAfterglowForUser(supabase, user_id, targetDate)
          )
        )
        
        const successful = results.filter(r => r.status === 'fulfilled').length
        console.log(`Batch generation: ${successful}/${activeUsers.length} successful`)
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Batch generation completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate for specific user and date
    if (!user_id || !date) {
      return new Response(
        JSON.stringify({ error: 'user_id and date are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const afterglowData = await generateAfterglowForUser(supabase, user_id, date)

    return new Response(
      JSON.stringify({ success: true, data: afterglowData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating afterglow:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function generateAfterglowForUser(
  supabase: any, 
  userId: string, 
  date: string
): Promise<DailyAfterglowData> {
  console.log(`Generating afterglow for user ${userId} on ${date}`)
  
  const startOfDay = `${date}T00:00:00`
  const endOfDay = `${date}T23:59:59`

  // 1. Get vibe state changes throughout the day
  const { data: vibeStates } = await supabase
    .from('user_vibe_states')
    .select('*')
    .eq('user_id', userId)
    .gte('started_at', startOfDay)
    .lte('started_at', endOfDay)
    .order('started_at')

  // 2. Get venue presence data
  const { data: venuePresence } = await supabase
    .from('venue_live_presence')
    .select('*, venues(name)')
    .eq('user_id', userId)
    .gte('checked_in_at', startOfDay)
    .lte('checked_in_at', endOfDay)
    .order('checked_in_at')

  // 3. Get floq participation
  const { data: floqParticipation } = await supabase
    .from('floq_participants')
    .select('*, floqs(title, primary_vibe, starts_at, ends_at)')
    .eq('user_id', userId)
    .gte('joined_at', startOfDay)
    .lte('joined_at', endOfDay)
    .order('joined_at')

  // 4. Get plan participation
  const { data: planParticipation } = await supabase
    .from('plan_participants')
    .select('*, floq_plans(title, planned_at, end_at)')
    .eq('user_id', userId)
    .gte('joined_at', startOfDay)
    .lte('joined_at', endOfDay)
    .order('joined_at')

  // 5. Process data into moments and metrics
  const moments: AfterglowMoment[] = []
  const vibePath: string[] = []
  const emotionJourney: any[] = []
  
  let totalVenues = new Set()
  let totalFloqs = new Set()
  let crossedPathsCount = 0
  let energyScore = 0
  let socialIntensity = 0

  // Process vibe states
  if (vibeStates) {
    vibeStates.forEach((state, index) => {
      vibePath.push(state.vibe_tag)
      emotionJourney.push({
        timestamp: state.started_at,
        vibe: state.vibe_tag,
        intensity: Math.random() * 100 // TODO: Calculate based on actual data
      })

      moments.push({
        timestamp: state.started_at,
        moment_type: 'vibe_change',
        title: `Feeling ${state.vibe_tag}`,
        description: index === 0 ? 'Started the day' : 'Vibe shifted',
        color: getVibeColor(state.vibe_tag),
        metadata: { vibe: state.vibe_tag, location: state.location }
      })
    })
  }

  // Process venue visits
  if (venuePresence) {
    venuePresence.forEach(visit => {
      totalVenues.add(visit.venue_id)
      
      moments.push({
        timestamp: visit.checked_in_at,
        moment_type: 'location_arrived',
        title: `Arrived at ${visit.venues?.name || 'venue'}`,
        description: `Checked in feeling ${visit.vibe}`,
        color: getVibeColor(visit.vibe),
        metadata: { venue_id: visit.venue_id, vibe: visit.vibe }
      })
    })
  }

  // Process floq participation
  if (floqParticipation) {
    floqParticipation.forEach(participation => {
      totalFloqs.add(participation.floq_id)
      socialIntensity += 20 // Boost social intensity for each floq
      
      moments.push({
        timestamp: participation.joined_at,
        moment_type: 'floq_joined',
        title: `Joined ${participation.floqs?.title || 'floq'}`,
        description: `Connected with the ${participation.floqs?.primary_vibe} energy`,
        color: getVibeColor(participation.floqs?.primary_vibe),
        metadata: { floq_id: participation.floq_id, vibe: participation.floqs?.primary_vibe }
      })
    })
  }

  // Process plan participation
  if (planParticipation) {
    planParticipation.forEach(participation => {
      socialIntensity += 30 // Plans have higher social intensity
      
      moments.push({
        timestamp: participation.joined_at,
        moment_type: 'plan_started',
        title: `Started ${participation.floq_plans?.title || 'plan'}`,
        description: 'Joined a planned gathering',
        color: 'primary',
        metadata: { plan_id: participation.plan_id }
      })
    })
  }

  // Calculate metrics
  energyScore = Math.min(100, (moments.length * 10) + (totalFloqs.size * 15) + (totalVenues.size * 5))
  socialIntensity = Math.min(100, socialIntensity + (crossedPathsCount * 10))

  // Find peak vibe time (time with most activity)
  const hourCounts: Record<string, number> = {}
  moments.forEach(moment => {
    const hour = new Date(moment.timestamp).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  })
  
  const peakHour = Object.keys(hourCounts).reduce((a, b) => 
    hourCounts[a] > hourCounts[b] ? a : b, '12'
  )
  const peakVibeTime = `${date}T${peakHour.padStart(2, '0')}:00:00`

  // Find dominant vibe
  const vibeCount: Record<string, number> = {}
  vibePath.forEach(vibe => {
    vibeCount[vibe] = (vibeCount[vibe] || 0) + 1
  })
  const dominantVibe = Object.keys(vibeCount).reduce((a, b) => 
    vibeCount[a] > vibeCount[b] ? a : b, 'chill'
  )

  // Generate summary
  const summaryText = generateSummaryText({
    totalVenues: totalVenues.size,
    totalFloqs: totalFloqs.size,
    dominantVibe,
    energyScore,
    socialIntensity,
    momentCount: moments.length
  })

  // Sort moments by timestamp
  moments.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const afterglowData: DailyAfterglowData = {
    user_id: userId,
    date,
    vibe_path: vibePath,
    emotion_journey: emotionJourney,
    peak_vibe_time: peakVibeTime,
    dominant_vibe: dominantVibe,
    total_venues: totalVenues.size,
    total_floqs: totalFloqs.size,
    crossed_paths_count: crossedPathsCount,
    energy_score: energyScore,
    social_intensity: socialIntensity,
    summary_text: summaryText,
    moments
  }

  // Upsert into database
  const { error } = await supabase
    .from('daily_afterglow')
    .upsert({
      ...afterglowData,
      regenerated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,date'
    })

  if (error) {
    console.error('Error upserting afterglow:', error)
    throw error
  }

  console.log(`Generated afterglow for ${userId} on ${date}: ${moments.length} moments, ${energyScore} energy`)
  return afterglowData
}

function getVibeColor(vibe?: string): string {
  const vibeColors: Record<string, string> = {
    'excited': '#ff6b6b',
    'chill': '#4ecdc4',
    'focused': '#45b7d1',
    'creative': '#96ceb4',
    'social': '#ffeaa7',
    'adventurous': '#fd79a8',
    'contemplative': '#a29bfe'
  }
  return vibeColors[vibe || ''] || 'primary'
}

function generateSummaryText(metrics: {
  totalVenues: number
  totalFloqs: number
  dominantVibe: string
  energyScore: number
  socialIntensity: number
  momentCount: number
}): string {
  const { totalVenues, totalFloqs, dominantVibe, energyScore, socialIntensity, momentCount } = metrics
  
  if (momentCount === 0) {
    return "A quiet day of reflection and inner peace."
  }
  
  let summary = `A ${dominantVibe} day with ${momentCount} memorable moments. `
  
  if (totalFloqs > 0) {
    summary += `Connected with ${totalFloqs} floq${totalFloqs > 1 ? 's' : ''} `
  }
  
  if (totalVenues > 0) {
    summary += `and explored ${totalVenues} venue${totalVenues > 1 ? 's' : ''}. `
  }
  
  if (energyScore > 70) {
    summary += "High energy throughout the day!"
  } else if (energyScore > 40) {
    summary += "Balanced energy and good vibes."
  } else {
    summary += "A more laid-back, peaceful day."
  }
  
  return summary
}