import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Enhanced hotspot detection with advanced clustering
interface EnhancedHotspot {
  gh6: string;
  centroid: { lat: number; lng: number };
  dom_vibe: string;
  delta: number;
  total_now: number;
  user_cnt: number;
  // Enhanced metrics
  momentum_score: number;
  stability_index: number;
  diversity_score: number;
  prediction_confidence: number;
  temporal_trend: 'rising' | 'falling' | 'stable';
  social_density: number;
  vibe_coherence: number;
}

interface ClusterAnalysisConfig {
  spatialRadius: number; // meters
  temporalWindow: number; // minutes
  minClusterSize: number;
  momentumThreshold: number;
  diversityWeight: number;
  stabilityWeight: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    let lat: number, lng: number, vibe: string, radius: number, config: ClusterAnalysisConfig
    
    if (req.method === 'POST') {
      const body = await req.json()
      lat = body.lat
      lng = body.lng
      vibe = body.vibe ?? ''
      radius = body.radius ?? 1000
      config = body.config ?? getDefaultConfig()
    } else {
      const url = new URL(req.url)
      lat = parseFloat(url.searchParams.get('lat') ?? '0')
      lng = parseFloat(url.searchParams.get('lng') ?? '0')
      vibe = url.searchParams.get('vibe') ?? ''
      radius = parseFloat(url.searchParams.get('radius') ?? '1000')
      config = getDefaultConfig()
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !vibe) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: lat, lng, vibe' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[get_hotspots] Enhanced hotspot analysis near ${lat},${lng} vibe:${vibe} radius:${radius}m`)

    // Step 1: Get raw hotspot data with temporal history
    const { data: rawHotspots, error: hotspotsError } = await supabase
      .rpc('get_enhanced_vibe_clusters', {
        p_lat: lat,
        p_lng: lng,
        p_vibe: vibe,
        p_radius: radius,
        p_temporal_window: config.temporalWindow
      });

    if (hotspotsError) {
      console.error('[get_hotspots] Enhanced query error:', hotspotsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch enhanced hotspots' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Step 2: Apply advanced clustering analysis
    const enhancedHotspots = await analyzeHotspotsWithAdvancedClustering(
      rawHotspots || [],
      config,
      supabase
    );

    // Step 3: Apply multi-scale filtering and ranking
    const filteredHotspots = applyMultiScaleFiltering(enhancedHotspots, config);
    
    // Step 4: Calculate prediction confidence and temporal trends
    const finalHotspots = await calculatePredictiveMetrics(filteredHotspots, supabase);

    console.log(`[get_hotspots] Returning ${finalHotspots.length} enhanced hotspots`)

    return new Response(
      JSON.stringify(finalHotspots),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[get_hotspots] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Get default clustering configuration
 */
function getDefaultConfig(): ClusterAnalysisConfig {
  return {
    spatialRadius: 500, // 500m clustering radius
    temporalWindow: 30, // 30 minute temporal window
    minClusterSize: 3, // Minimum 3 users for a cluster
    momentumThreshold: 0.1, // Minimum momentum for trending
    diversityWeight: 0.3, // Weight for vibe diversity
    stabilityWeight: 0.4 // Weight for temporal stability
  };
}

/**
 * Enhanced clustering analysis with advanced algorithms
 */
async function analyzeHotspotsWithAdvancedClustering(
  rawHotspots: any[],
  config: ClusterAnalysisConfig,
  supabase: any
): Promise<EnhancedHotspot[]> {
  const enhancedHotspots: EnhancedHotspot[] = [];

  for (const hotspot of rawHotspots) {
    // Calculate momentum score using temporal derivatives
    const momentumScore = calculateMomentumScore(hotspot, config);
    
    // Calculate stability index using variance analysis
    const stabilityIndex = calculateStabilityIndex(hotspot, config);
    
    // Calculate diversity score using Shannon entropy
    const diversityScore = calculateDiversityScore(hotspot);
    
    // Calculate social density using spatial analysis
    const socialDensity = calculateSocialDensity(hotspot, rawHotspots, config);
    
    // Calculate vibe coherence using correlation analysis
    const vibeCoherence = calculateVibeCoherence(hotspot);
    
    // Determine temporal trend using time series analysis
    const temporalTrend = determineTemporalTrend(hotspot, config);

    const enhanced: EnhancedHotspot = {
      gh6: hotspot.gh6,
      centroid: hotspot.centroid,
      dom_vibe: hotspot.dom_vibe,
      delta: hotspot.delta_5m || 0,
      total_now: hotspot.total_now || 0,
      user_cnt: hotspot.dom_count || 0,
      momentum_score: momentumScore,
      stability_index: stabilityIndex,
      diversity_score: diversityScore,
      prediction_confidence: 0, // Will be calculated later
      temporal_trend: temporalTrend,
      social_density: socialDensity,
      vibe_coherence: vibeCoherence
    };

    enhancedHotspots.push(enhanced);
  }

  return enhancedHotspots;
}

/**
 * Calculate momentum score using temporal derivatives
 */
function calculateMomentumScore(hotspot: any, config: ClusterAnalysisConfig): number {
  const currentActivity = hotspot.total_now || 0;
  const previousActivity = hotspot.total_prev || 0;
  const delta = hotspot.delta_5m || 0;
  
  // Normalized momentum based on activity change
  const activityMomentum = currentActivity > 0 ? delta / currentActivity : 0;
  
  // Apply exponential smoothing for stability
  const smoothedMomentum = Math.tanh(activityMomentum * 2); // Bounded between -1 and 1
  
  return Math.max(0, Math.min(1, (smoothedMomentum + 1) / 2)); // Normalize to 0-1
}

/**
 * Calculate stability index using variance analysis
 */
function calculateStabilityIndex(hotspot: any, config: ClusterAnalysisConfig): number {
  const currentActivity = hotspot.total_now || 0;
  const historicalData = hotspot.historical_activity || [];
  
  if (historicalData.length < 3) {
    return 0.5; // Default stability for insufficient data
  }
  
  // Calculate coefficient of variation
  const mean = historicalData.reduce((sum: number, val: number) => sum + val, 0) / historicalData.length;
  const variance = historicalData.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / historicalData.length;
  const stdDev = Math.sqrt(variance);
  
  const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
  
  // Stability is inverse of variability
  return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
}

/**
 * Calculate diversity score using Shannon entropy
 */
function calculateDiversityScore(hotspot: any): number {
  const vibeDistribution = hotspot.vibe_distribution || {};
  const totalUsers = Object.values(vibeDistribution).reduce((sum: number, count: any) => sum + (count || 0), 0);
  
  if (totalUsers === 0) return 0;
  
  let entropy = 0;
  Object.values(vibeDistribution).forEach((count: any) => {
    if (count > 0) {
      const probability = count / totalUsers;
      entropy -= probability * Math.log2(probability);
    }
  });
  
  // Normalize entropy by maximum possible entropy
  const maxEntropy = Math.log2(Object.keys(vibeDistribution).length);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

/**
 * Calculate social density using spatial analysis
 */
function calculateSocialDensity(
  hotspot: any,
  allHotspots: any[],
  config: ClusterAnalysisConfig
): number {
  const hotspotLat = hotspot.centroid?.lat || 0;
  const hotspotLng = hotspot.centroid?.lng || 0;
  
  let nearbyActivity = 0;
  let nearbyCount = 0;
  
  allHotspots.forEach(other => {
    if (other.gh6 === hotspot.gh6) return;
    
    const otherLat = other.centroid?.lat || 0;
    const otherLng = other.centroid?.lng || 0;
    
    const distance = calculateHaversineDistance(
      hotspotLat, hotspotLng,
      otherLat, otherLng
    );
    
    if (distance <= config.spatialRadius) {
      nearbyActivity += other.total_now || 0;
      nearbyCount++;
    }
  });
  
  // Density as activity per unit area
  const area = Math.PI * Math.pow(config.spatialRadius / 1000, 2); // km²
  return nearbyActivity / area;
}

/**
 * Calculate vibe coherence using correlation analysis
 */
function calculateVibeCoherence(hotspot: any): number {
  const vibeDistribution = hotspot.vibe_distribution || {};
  const dominantVibe = hotspot.dom_vibe;
  const totalUsers = Object.values(vibeDistribution).reduce((sum: number, count: any) => sum + (count || 0), 0);
  
  if (totalUsers === 0) return 0;
  
  const dominantCount = vibeDistribution[dominantVibe] || 0;
  const coherence = dominantCount / totalUsers;
  
  return coherence;
}

/**
 * Determine temporal trend using time series analysis
 */
function determineTemporalTrend(
  hotspot: any,
  config: ClusterAnalysisConfig
): 'rising' | 'falling' | 'stable' {
  const delta = hotspot.delta_5m || 0;
  const threshold = config.momentumThreshold;
  
  if (delta > threshold) return 'rising';
  if (delta < -threshold) return 'falling';
  return 'stable';
}

/**
 * Apply multi-scale filtering and ranking
 */
function applyMultiScaleFiltering(
  hotspots: EnhancedHotspot[],
  config: ClusterAnalysisConfig
): EnhancedHotspot[] {
  // Filter by minimum cluster size
  const filtered = hotspots.filter(h => h.user_cnt >= config.minClusterSize);
  
  // Calculate composite scores for ranking
  filtered.forEach(hotspot => {
    const compositeScore = 
      hotspot.momentum_score * 0.25 +
      hotspot.stability_index * config.stabilityWeight +
      hotspot.diversity_score * config.diversityWeight +
      hotspot.vibe_coherence * 0.25 +
      (hotspot.social_density / 100) * 0.1; // Normalize social density
    
    hotspot.prediction_confidence = Math.min(1, compositeScore);
  });
  
  // Sort by composite score and return top results
  return filtered
    .sort((a, b) => b.prediction_confidence - a.prediction_confidence)
    .slice(0, 20); // Limit to top 20 hotspots
}

/**
 * Calculate prediction confidence and temporal trends
 */
async function calculatePredictiveMetrics(
  hotspots: EnhancedHotspot[],
  supabase: any
): Promise<EnhancedHotspot[]> {
  // For each hotspot, get additional temporal data for prediction
  for (const hotspot of hotspots) {
    try {
      const { data: timeSeriesData } = await supabase
        .rpc('get_hotspot_time_series', {
          p_gh6: hotspot.gh6,
          p_hours_back: 24
        });
      
      if (timeSeriesData && timeSeriesData.length > 0) {
        // Apply time series forecasting for prediction confidence
        hotspot.prediction_confidence = calculateTimeSeriesPredictionConfidence(timeSeriesData);
      }
    } catch (error) {
      console.warn(`Failed to get time series data for ${hotspot.gh6}:`, error);
    }
  }
  
  return hotspots;
}

/**
 * Calculate prediction confidence using time series analysis
 */
function calculateTimeSeriesPredictionConfidence(timeSeriesData: any[]): number {
  if (timeSeriesData.length < 3) return 0.5;
  
  // Simple linear regression for trend prediction
  const n = timeSeriesData.length;
  const x = timeSeriesData.map((_, i) => i);
  const y = timeSeriesData.map(d => d.activity || 0);
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R-squared for prediction confidence
  const yMean = sumY / n;
  const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const ssRes = y.reduce((sum, yi, i) => {
    const predicted = slope * x[i] + intercept;
    return sum + Math.pow(yi - predicted, 2);
  }, 0);
  
  const rSquared = 1 - (ssRes / ssTotal);
  return Math.max(0, Math.min(1, rSquared));
}

/**
 * Calculate Haversine distance between two points
 */
function calculateHaversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}