import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CrowdIntelligenceRequest {
  mode: 'get_crowd_data' | 'update_presence' | 'get_historical_patterns' | 'predict_capacity';
  venue_id?: string;
  venue_ids?: string[];
  user_id?: string;
  presence_data?: {
    vibe: string;
    duration_minutes?: number;
  };
  prediction_hours?: number;
}

interface CrowdData {
  venue_id: string;
  current_capacity: number;
  capacity_percentage: number;
  dominant_vibe: string;
  vibe_distribution: { [vibe: string]: number };
  predicted_peak: string;
  typical_crowd: string;
  wait_time_estimate: string;
  best_time_to_visit: string;
  busy_times: { [hour: string]: number };
  crowd_trends: {
    is_getting_busier: boolean;
    peak_time: string;
    quiet_time: string;
    weekday_vs_weekend: 'weekday_preferred' | 'weekend_preferred' | 'consistent';
  };
  real_time_events: any[];
  last_updated: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CrowdIntelligenceRequest = await req.json();
    const { mode } = body;

    // Get user auth from request for user-specific operations
    const authHeader = req.headers.get('Authorization');
    let authenticatedUserId: string | null = null;
    
    if (authHeader) {
      const userSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      
      const { data: { user } } = await userSupabase.auth.getUser();
      authenticatedUserId = user?.id || null;
    }

    switch (mode) {
      case 'get_crowd_data':
        if (body.venue_id) {
          return await handleGetCrowdData(body.venue_id);
        } else if (body.venue_ids) {
          return await handleGetBatchCrowdData(body.venue_ids);
        } else {
          return new Response(JSON.stringify({ error: 'venue_id or venue_ids required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      
      case 'update_presence':
        if (!authenticatedUserId) {
          return new Response(JSON.stringify({ error: 'Authentication required' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return await handleUpdatePresence(
          body.venue_id!, 
          authenticatedUserId, 
          body.presence_data!
        );
      
      case 'get_historical_patterns':
        return await handleGetHistoricalPatterns(body.venue_id!);
      
      case 'predict_capacity':
        return await handlePredictCapacity(body.venue_id!, body.prediction_hours || 24);
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid mode' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Error in crowd-intelligence:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleGetCrowdData(venueId: string): Promise<Response> {
  try {
    // Get venue details
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('name, categories, rating')
      .eq('id', venueId)
      .single();

    if (venueError || !venue) {
      return new Response(JSON.stringify({ error: 'Venue not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get current presence data
    const { data: currentPresence, error: presenceError } = await supabase
      .from('vibes_now')
      .select('user_id, vibe, updated_at')
      .eq('venue_id', venueId)
      .gte('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // Last 30 minutes

    if (presenceError) {
      console.error('Error fetching presence data:', presenceError);
      return new Response(JSON.stringify({ error: 'Failed to fetch crowd data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate crowd intelligence
    const crowdData = await calculateCrowdIntelligence(
      venueId,
      venue.categories || [],
      currentPresence || []
    );

    // Get real-time events
    const { data: events } = await supabase
      .from('venue_events')
      .select('*')
      .eq('venue_id', venueId)
      .gte('start_time', new Date().toISOString())
      .lte('start_time', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      .limit(5);

    crowdData.real_time_events = events || [];
    crowdData.last_updated = new Date().toISOString();

    return new Response(JSON.stringify({
      success: true,
      crowd_data: crowdData,
      venue_info: {
        name: venue.name,
        categories: venue.categories,
        rating: venue.rating
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handleGetCrowdData:', error);
    return new Response(JSON.stringify({ error: 'Failed to get crowd data' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetBatchCrowdData(venueIds: string[]): Promise<Response> {
  try {
    const crowdDataPromises = venueIds.map(async (venueId) => {
      try {
        // Get venue and presence data in parallel
        const [venueResult, presenceResult] = await Promise.all([
          supabase
            .from('venues')
            .select('name, categories, rating')
            .eq('id', venueId)
            .single(),
          supabase
            .from('vibes_now')
            .select('profile_id, vibe, updated_at')
            .eq('venue_id', venueId)
            .gte('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
        ]);

        if (venueResult.error || !venueResult.data) {
          return null; // Skip venues that don't exist
        }

        const crowdData = await calculateCrowdIntelligence(
          venueId,
          venueResult.data.categories || [],
          presenceResult.data || []
        );

        return {
          venue_id: venueId,
          venue_name: venueResult.data.name,
          venue_categories: venueResult.data.categories,
          venue_rating: venueResult.data.rating,
          crowd_data: crowdData
        };
      } catch (error) {
        console.error(`Error processing venue ${venueId}:`, error);
        return null;
      }
    });

    const results = await Promise.all(crowdDataPromises);
    const validResults = results.filter(result => result !== null);

    return new Response(JSON.stringify({
      success: true,
      venues: validResults,
      total_processed: validResults.length,
      last_updated: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handleGetBatchCrowdData:', error);
    return new Response(JSON.stringify({ error: 'Failed to get batch crowd data' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleUpdatePresence(
  venueId: string, 
  userId: string, 
  presenceData: { vibe: string; duration_minutes?: number }
): Promise<Response> {
  try {
    // Update or insert presence data
    const expiresAt = new Date(Date.now() + (presenceData.duration_minutes || 60) * 60 * 1000);
    
    const { error: upsertError } = await supabase
      .from('vibes_now')
      .upsert({
        user_id: userId,
        venue_id: venueId,
        vibe: presenceData.vibe,
        updated_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Error updating presence:', upsertError);
      return new Response(JSON.stringify({ error: 'Failed to update presence' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get updated crowd data
    const { data: currentPresence } = await supabase
      .from('vibes_now')
      .select('user_id, vibe, updated_at')
      .eq('venue_id', venueId)
      .gte('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

    // Get venue categories for crowd intelligence
    const { data: venue } = await supabase
      .from('venues')
      .select('categories')
      .eq('id', venueId)
      .single();

    const crowdData = await calculateCrowdIntelligence(
      venueId,
      venue?.categories || [],
      currentPresence || []
    );

    return new Response(JSON.stringify({
      success: true,
      message: 'Presence updated successfully',
      updated_crowd_data: crowdData,
      expires_at: expiresAt.toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handleUpdatePresence:', error);
    return new Response(JSON.stringify({ error: 'Failed to update presence' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetHistoricalPatterns(venueId: string): Promise<Response> {
  try {
    // Get historical presence data for the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: historicalData, error: historyError } = await supabase
      .from('vibes_now')
      .select('vibe, updated_at, expires_at')
      .eq('venue_id', venueId)
      .gte('updated_at', thirtyDaysAgo)
      .order('updated_at', { ascending: false });

    if (historyError) {
      console.error('Error fetching historical data:', historyError);
      return new Response(JSON.stringify({ error: 'Failed to fetch historical patterns' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Analyze patterns by hour and day
    const hourlyPatterns = new Map<number, number[]>();
    const dailyPatterns = new Map<number, number[]>();
    const vibePatterns = new Map<string, number>();

    (historicalData || []).forEach(record => {
      const date = new Date(record.updated_at);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      
      // Track hourly patterns
      if (!hourlyPatterns.has(hour)) {
        hourlyPatterns.set(hour, []);
      }
      hourlyPatterns.get(hour)!.push(1);
      
      // Track daily patterns
      if (!dailyPatterns.has(dayOfWeek)) {
        dailyPatterns.set(dayOfWeek, []);
      }
      dailyPatterns.get(dayOfWeek)!.push(1);
      
      // Track vibe patterns
      vibePatterns.set(record.vibe, (vibePatterns.get(record.vibe) || 0) + 1);
    });

    // Convert to average patterns
    const hourlyAverages: { [hour: string]: number } = {};
    for (let hour = 0; hour <= 23; hour++) {
      const counts = hourlyPatterns.get(hour) || [];
      hourlyAverages[hour.toString()] = counts.length;
    }

    const dailyAverages: { [day: string]: number } = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (let day = 0; day <= 6; day++) {
      const counts = dailyPatterns.get(day) || [];
      dailyAverages[dayNames[day]] = counts.length;
    }

    // Find peak patterns
    const peakHour = Object.entries(hourlyAverages)
      .sort((a, b) => b[1] - a[1])[0];
    const peakDay = Object.entries(dailyAverages)
      .sort((a, b) => b[1] - a[1])[0];

    const dominantVibe = Array.from(vibePatterns.entries())
      .sort((a, b) => b[1] - a[1])[0];

    return new Response(JSON.stringify({
      success: true,
      historical_patterns: {
        venue_id: venueId,
        data_period: '30 days',
        total_records: historicalData?.length || 0,
        hourly_patterns: hourlyAverages,
        daily_patterns: dailyAverages,
        vibe_distribution: Object.fromEntries(vibePatterns),
        insights: {
          peak_hour: peakHour ? `${peakHour[0]}:00` : 'No data',
          peak_day: peakDay ? peakDay[0] : 'No data',
          dominant_vibe: dominantVibe ? dominantVibe[0] : 'No data',
          average_daily_visitors: Math.round((historicalData?.length || 0) / 30),
          busiest_time: peakHour && peakDay ? `${peakDay[0]} at ${peakHour[0]}:00` : 'No data'
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handleGetHistoricalPatterns:', error);
    return new Response(JSON.stringify({ error: 'Failed to get historical patterns' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handlePredictCapacity(venueId: string, predictionHours: number): Promise<Response> {
  try {
    // Get venue categories for prediction modeling
    const { data: venue } = await supabase
      .from('venues')
      .select('categories')
      .eq('id', venueId)
      .single();

    if (!venue) {
      return new Response(JSON.stringify({ error: 'Venue not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate predictions based on venue type and historical patterns
    const predictions = [];
    const now = new Date();
    
    for (let i = 0; i < predictionHours; i++) {
      const predictionTime = new Date(now.getTime() + i * 60 * 60 * 1000);
      const hour = predictionTime.getHours();
      const dayOfWeek = predictionTime.getDay();
      
      const predictedCapacity = predictCapacityForHour(venue.categories, hour, dayOfWeek);
      
      predictions.push({
        timestamp: predictionTime.toISOString(),
        hour: hour,
        day_of_week: dayOfWeek,
        predicted_capacity: predictedCapacity,
        confidence_level: calculatePredictionConfidence(i), // Confidence decreases over time
        recommendation: generateRecommendation(predictedCapacity)
      });
    }

    return new Response(JSON.stringify({
      success: true,
      capacity_predictions: {
        venue_id: venueId,
        venue_categories: venue.categories,
        prediction_period_hours: predictionHours,
        predictions: predictions,
        generated_at: now.toISOString(),
        model_version: '1.0'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handlePredictCapacity:', error);
    return new Response(JSON.stringify({ error: 'Failed to predict capacity' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Helper functions
async function calculateCrowdIntelligence(
  venueId: string,
  categories: string[],
  currentPresence: any[]
): Promise<CrowdData> {
  
  const currentCapacity = Math.min(100, currentPresence.length * 15 + 20);
  const capacityPercentage = Math.round(currentCapacity);
  
  // Calculate vibe distribution
  const vibeDistribution: { [vibe: string]: number } = {};
  currentPresence.forEach(p => {
    vibeDistribution[p.vibe] = (vibeDistribution[p.vibe] || 0) + 1;
  });
  
  const dominantVibe = Object.entries(vibeDistribution)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
  
  // Generate busy times based on venue type
  const busyTimes = generateBusyTimes(categories);
  
  const currentHour = new Date().getHours();
  const peakHour = Object.entries(busyTimes)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  const quietHour = Object.entries(busyTimes)
    .sort((a, b) => a[1] - b[1])[0][0];
  
  // Determine if getting busier
  const nextHourCapacity = busyTimes[(currentHour + 1).toString()] || currentCapacity;
  const isGettingBusier = nextHourCapacity > currentCapacity;
  
  return {
    venue_id: venueId,
    current_capacity: currentCapacity,
    capacity_percentage: capacityPercentage,
    dominant_vibe: dominantVibe,
    vibe_distribution: vibeDistribution,
    predicted_peak: `${peakHour}:00 (${busyTimes[peakHour]}% capacity)`,
    typical_crowd: generateTypicalCrowd(categories, new Date().getDay(), currentHour),
    wait_time_estimate: generateWaitTimeEstimate(currentCapacity, categories),
    best_time_to_visit: findBestTimeToVisit(busyTimes),
    busy_times: busyTimes,
    crowd_trends: {
      is_getting_busier: isGettingBusier,
      peak_time: `${peakHour}:00`,
      quiet_time: `${quietHour}:00`,
      weekday_vs_weekend: determineWeekdayPreference(categories)
    },
    real_time_events: [], // Will be populated by caller
    last_updated: new Date().toISOString()
  };
}

function generateBusyTimes(categories: string[]): { [hour: string]: number } {
  const busyTimes: { [hour: string]: number } = {};
  const isBar = categories.some(cat => cat.toLowerCase().includes('bar'));
  const isCafe = categories.some(cat => cat.toLowerCase().includes('cafe'));
  const isRestaurant = categories.some(cat => cat.toLowerCase().includes('restaurant'));
  const isGym = categories.some(cat => cat.toLowerCase().includes('gym'));

  for (let hour = 0; hour <= 23; hour++) {
    let capacity = 25; // Base capacity
    
    if (isCafe) {
      if (hour >= 7 && hour <= 9) capacity = 85;
      else if (hour >= 12 && hour <= 14) capacity = 75;
      else if (hour >= 15 && hour <= 17) capacity = 65;
      else if (hour >= 10 && hour <= 18) capacity = 45;
    } else if (isBar) {
      if (hour >= 17 && hour <= 19) capacity = 70;
      else if (hour >= 20 && hour <= 23) capacity = 90;
      else if (hour >= 14 && hour <= 16) capacity = 40;
    } else if (isRestaurant) {
      if (hour >= 12 && hour <= 14) capacity = 80;
      else if (hour >= 18 && hour <= 21) capacity = 90;
      else if (hour >= 17 && hour <= 18) capacity = 65;
      else if (hour >= 21 && hour <= 22) capacity = 55;
    } else if (isGym) {
      if (hour >= 6 && hour <= 8) capacity = 85;
      else if (hour >= 17 && hour <= 20) capacity = 90;
      else if (hour >= 12 && hour <= 14) capacity = 60;
      else if (hour >= 9 && hour <= 16) capacity = 40;
    }
    
    // Weekend adjustments
    const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
    if (isWeekend) {
      if (isBar || isRestaurant) {
        capacity = Math.min(100, capacity * 1.2);
      } else if (isCafe && hour >= 9 && hour <= 12) {
        capacity = Math.min(100, capacity * 1.3);
      }
    }
    
    busyTimes[hour.toString()] = Math.max(15, Math.min(100, capacity));
  }
  
  return busyTimes;
}

function generateTypicalCrowd(categories: string[], dayOfWeek: number, hour: number): string {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isEvening = hour >= 17;
  const isMorning = hour <= 11;

  if (categories.some(cat => cat.toLowerCase().includes('bar'))) {
    if (isWeekend && isEvening) return "Young professionals, friend groups, date night couples";
    if (isEvening) return "After-work crowd, casual meetups, happy hour groups";
    return "Casual crowd, remote workers, afternoon socializers";
  } else if (categories.some(cat => cat.toLowerCase().includes('cafe'))) {
    if (isMorning) return "Commuters, early birds, coffee enthusiasts";
    if (isWeekend) return "Families, students, casual hangouts";
    return "Remote workers, students, casual meetings";
  }
  
  return "Mixed crowd of locals and visitors";
}

function generateWaitTimeEstimate(capacity: number, categories: string[]): string {
  const isRestaurant = categories.some(cat => cat.toLowerCase().includes('restaurant'));
  
  if (capacity < 40) return 'No wait currently';
  if (capacity < 60) {
    return isRestaurant ? '5-10 minute wait for tables' : 'Short wait expected';
  }
  if (capacity < 80) {
    return isRestaurant ? '15-25 minute wait for tables' : 'Moderate wait expected';
  }
  return isRestaurant ? '30+ minute wait, reservations recommended' : 'Long wait expected';
}

function findBestTimeToVisit(busyTimes: { [hour: string]: number }): string {
  const idealTimes = Object.entries(busyTimes)
    .filter(([_, capacity]) => capacity >= 35 && capacity <= 65)
    .sort((a, b) => Math.abs(a[1] - 50) - Math.abs(b[1] - 50));

  if (idealTimes.length === 0) {
    const leastBusyTime = Object.entries(busyTimes)
      .sort((a, b) => a[1] - b[1])[0];
    return `${leastBusyTime[0]}:00 for a quieter experience`;
  }
  
  const bestHour = parseInt(idealTimes[0][0]);
  const formatHour = (h: number) => h < 12 ? `${h || 12}am` : h === 12 ? '12pm' : `${h - 12}pm`;
  
  return `${formatHour(bestHour)} for optimal experience`;
}

function determineWeekdayPreference(categories: string[]): 'weekday_preferred' | 'weekend_preferred' | 'consistent' {
  if (categories.some(cat => ['bar', 'club', 'entertainment'].some(type => cat.toLowerCase().includes(type)))) {
    return 'weekend_preferred';
  }
  if (categories.some(cat => ['office', 'business', 'coworking'].some(type => cat.toLowerCase().includes(type)))) {
    return 'weekday_preferred';
  }
  return 'consistent';
}

function predictCapacityForHour(categories: string[], hour: number, dayOfWeek: number): number {
  const busyTimes = generateBusyTimes(categories);
  let baseCapacity = busyTimes[hour.toString()] || 30;
  
  // Add some randomness and day-of-week adjustments
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const randomFactor = 0.8 + Math.random() * 0.4; // ±20% variation
  
  if (isWeekend) {
    const isBar = categories.some(cat => cat.toLowerCase().includes('bar'));
    const isRestaurant = categories.some(cat => cat.toLowerCase().includes('restaurant'));
    
    if (isBar || isRestaurant) {
      baseCapacity *= 1.2; // Busier on weekends
    }
  }
  
  return Math.round(Math.max(10, Math.min(100, baseCapacity * randomFactor)));
}

function calculatePredictionConfidence(hoursAhead: number): number {
  // Confidence decreases over time
  return Math.max(0.3, 0.95 - (hoursAhead * 0.02));
}

function generateRecommendation(predictedCapacity: number): string {
  if (predictedCapacity < 40) return 'Great time to visit - not crowded';
  if (predictedCapacity < 60) return 'Good time to visit - moderate crowd';
  if (predictedCapacity < 80) return 'Busy time - expect crowds';
  return 'Very busy - consider visiting at a different time';
}