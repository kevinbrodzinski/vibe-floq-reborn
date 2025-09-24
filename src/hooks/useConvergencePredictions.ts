import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocialCache } from './useSocialCache';
import { eventBridge, Events, type EventPayloads } from '@/services/eventBridge';
import { useClusterVenues } from './useClusterVenues';
import { useUnifiedLocation } from './location/useUnifiedLocation';

interface ConvergencePrediction {
  id: string;
  friendId: string;
  friendName: string;
  probability: number;
  timeToMeet: number; // seconds
  predictedLocation: {
    lat: number;
    lng: number;
    venueName?: string;
  };
  confidence: number;
  timestamp: number;
  type: 'pair' | 'group';
  participants?: string[]; // For group convergences
}

interface VenueInfluence {
  venueId: string;
  position: [number, number];
  type: string;
  popularity: number;
  magnetism: number;
}

interface PredictionOptions {
  minProbability?: number;
  maxTimeHorizon?: number;
  includeGroups?: boolean;
  venueInfluence?: boolean;
}

const DEFAULT_OPTIONS: PredictionOptions = {
  minProbability: 0.5,
  maxTimeHorizon: 300, // 5 minutes
  includeGroups: true,
  venueInfluence: true,
};

// Time-of-day venue magnetism factors
const TIME_PATTERNS = {
  morning: { coffee: 1.5, transit: 1.3, gym: 1.2 },
  lunch: { food: 1.8, park: 1.2, cafe: 1.4 },
  evening: { bar: 1.4, restaurant: 1.6, entertainment: 1.3 },
  night: { club: 1.5, bar: 1.3, food: 1.2 },
} as const;

export function useConvergencePredictions(options: PredictionOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { 
    friendHeads, 
    getMovingFriends, 
    estimateConvergence,
    predictPosition,
    getFriendById 
  } = useSocialCache();
  
  // Get current map bounds for venue data
  const { coords: currentLocation } = useUnifiedLocation({
    enableTracking: false,
    enablePresence: false,
    hookId: 'convergence-predictions'
  });
  
  // Mock bounds for venue data - in real app this would come from map state
  const bounds = currentLocation ? [
    currentLocation.lng - 0.01, // west
    currentLocation.lat - 0.01, // south
    currentLocation.lng + 0.01, // east
    currentLocation.lat + 0.01  // north
  ] as [number, number, number, number] : null;
  
  const { data: nearbyVenues = [] } = useClusterVenues(bounds);
  
  const [predictions, setPredictions] = useState<ConvergencePrediction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const predictionCache = useRef<Map<string, ConvergencePrediction>>(new Map());
  const lastCalculation = useRef<number>(0);
  const subscribers = useRef<Set<(prediction: ConvergencePrediction) => void>>(new Set());

  // Get current time period for venue magnetism
  const getTimePeriod = useCallback((): keyof typeof TIME_PATTERNS => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 14) return 'lunch';
    if (hour < 20) return 'evening';
    return 'night';
  }, []);

  // Calculate venue influence on convergence
  const calculateVenueInfluence = useCallback((
    position: [number, number],
    venues: VenueInfluence[]
  ): { adjustedPosition: [number, number]; nearestVenue?: string; magnetism: number } => {
    if (!opts.venueInfluence || venues.length === 0) {
      return { adjustedPosition: position, magnetism: 1 };
    }

    const timePeriod = getTimePeriod();
    const patterns = TIME_PATTERNS[timePeriod];

    // Find venues within influence radius (100m)
    const influenceRadius = 100; // meters
    const nearbyInfluences = venues
      .map(venue => {
        const distance = calculateDistance(position, venue.position);
        if (distance > influenceRadius) return null;

        const typeBonus = patterns[venue.type as keyof typeof patterns] || 1;
        const influence = (1 - distance / influenceRadius) * 
                         venue.popularity * 
                         typeBonus * 
                         venue.magnetism;

        return { venue, distance, influence };
      })
      .filter(Boolean)
      .sort((a, b) => b!.influence - a!.influence);

    if (nearbyInfluences.length === 0) {
      return { adjustedPosition: position, magnetism: 1 };
    }

    // Weighted average position based on venue influence
    const strongest = nearbyInfluences[0]!;
    const weight = Math.min(strongest.influence * 0.3, 0.5); // Max 50% pull

    const adjustedPosition: [number, number] = [
      position[0] * (1 - weight) + strongest.venue.position[0] * weight,
      position[1] * (1 - weight) + strongest.venue.position[1] * weight,
    ];

    return {
      adjustedPosition,
      nearestVenue: strongest.venue.venueId,
      magnetism: 1 + strongest.influence * 0.2, // Up to 20% probability boost
    };
  }, [opts.venueInfluence, getTimePeriod]);

  // Calculate pairwise convergence with enhancements
  const calculateEnhancedConvergence = useCallback((
    friend1Id: string,
    friend2Id: string
  ): ConvergencePrediction | null => {
    const friend1 = getFriendById(friend1Id);
    const friend2 = getFriendById(friend2Id);

    if (!friend1 || !friend2) return null;

    // Basic convergence from social cache
    const basic = estimateConvergence(friend1Id, friend2Id, opts.maxTimeHorizon);
    
    if (basic.probability < opts.minProbability || !basic.meetingPoint) {
      return null;
    }

    // Enhance with venue influence
    const venueInfluences: VenueInfluence[] = nearbyVenues.map(v => ({
      venueId: v.id,
      position: [v.lng, v.lat],
      type: v.category.toLowerCase(),
      popularity: v.vibe_score || 0.5,
      magnetism: v.live_count > 5 ? 1.5 : 1,
    }));

    const { 
      adjustedPosition, 
      nearestVenue, 
      magnetism 
    } = calculateVenueInfluence(basic.meetingPoint, venueInfluences);

    // Find venue name if near one
    const venueName = nearestVenue ? 
      nearbyVenues.find(v => v.id === nearestVenue)?.name : 
      undefined;

    // Adjust probability with venue magnetism
    const adjustedProbability = Math.min(basic.probability * magnetism, 1);

    // Calculate confidence based on multiple factors
    const velocityConfidence = (friend1.velocity?.confidence || 0.5) * 
                               (friend2.velocity?.confidence || 0.5);
    const dataFreshness = Math.exp(
      -(Date.now() - friend1.lastSeen) / 60000 - 
      (Date.now() - friend2.lastSeen) / 60000
    );
    const confidence = velocityConfidence * dataFreshness;

    return {
      id: `conv-${friend1Id}-${friend2Id}-${Date.now()}`,
      friendId: friend2Id,
      friendName: friend2.name || `Friend ${friend2Id}`,
      probability: adjustedProbability,
      timeToMeet: basic.timeToMeet || 0,
      predictedLocation: {
        lat: adjustedPosition[1],
        lng: adjustedPosition[0],
        venueName,
      },
      confidence,
      timestamp: Date.now(),
      type: 'pair',
    };
  }, [
    getFriendById, 
    estimateConvergence, 
    nearbyVenues, 
    calculateVenueInfluence,
    opts.minProbability,
    opts.maxTimeHorizon
  ]);

  // Calculate group convergence (3+ people)
  const calculateGroupConvergence = useCallback((
    friendIds: string[]
  ): ConvergencePrediction | null => {
    if (friendIds.length < 3 || !opts.includeGroups) return null;

    const friends = friendIds.map(id => getFriendById(id)).filter(Boolean);
    if (friends.length < 3) return null;

    // Predict positions for all friends at various time horizons
    const timeHorizons = [60, 120, 180, 240]; // 1-4 minutes
    let bestConvergence: any = null;
    let bestScore = 0;

    for (const horizon of timeHorizons) {
      const predictions = friends.map(f => 
        f?.velocity ? predictPosition(f.id, horizon) : null
      ).filter(Boolean);

      if (predictions.length < friends.length * 0.7) continue; // Need 70% with velocity

      // Calculate centroid of predicted positions
      const centroid: [number, number] = predictions.reduce(
        (acc, pred) => [
          acc[0] + pred!.futurePosition[0] / predictions.length,
          acc[1] + pred!.futurePosition[1] / predictions.length,
        ],
        [0, 0]
      );

      // Calculate dispersion (how spread out they are)
      const dispersion = predictions.reduce((sum, pred) => {
        const dist = calculateDistance(pred!.futurePosition, centroid);
        return sum + dist;
      }, 0) / predictions.length;

      // Score based on low dispersion and high confidence
      const avgConfidence = predictions.reduce(
        (sum, pred) => sum + pred!.confidence, 0
      ) / predictions.length;
      
      const score = avgConfidence * Math.exp(-dispersion / 50); // 50m characteristic distance

      if (score > bestScore && dispersion < 100) { // Max 100m dispersion
        bestScore = score;
        bestConvergence = {
          centroid,
          horizon,
          dispersion,
          confidence: avgConfidence,
        };
      }
    }

    if (!bestConvergence || bestScore < opts.minProbability) return null;

    // Apply venue influence to group centroid
    const venueInfluences: VenueInfluence[] = nearbyVenues.map(v => ({
      venueId: v.id,
      position: [v.lng, v.lat],
      type: v.category.toLowerCase(),
      popularity: v.vibe_score || 0.5,
      magnetism: v.live_count > 5 ? 1.5 : 1,
    }));

    const { 
      adjustedPosition, 
      nearestVenue, 
      magnetism 
    } = calculateVenueInfluence(bestConvergence.centroid, venueInfluences);

    const venueName = nearestVenue ? 
      nearbyVenues.find(v => v.id === nearestVenue)?.name : 
      undefined;

    return {
      id: `conv-group-${friendIds.join('-')}-${Date.now()}`,
      friendId: friendIds[0], // Primary friend for notification
      friendName: `${friends.length} friends`,
      probability: Math.min(bestScore * magnetism * 0.8, 1), // Group convergences are less likely
      timeToMeet: bestConvergence.horizon,
      predictedLocation: {
        lat: adjustedPosition[1],
        lng: adjustedPosition[0],
        venueName,
      },
      confidence: bestConvergence.confidence,
      timestamp: Date.now(),
      type: 'group',
      participants: friendIds,
    };
  }, [
    getFriendById,
    predictPosition,
    nearbyVenues,
    calculateVenueInfluence,
    opts.includeGroups,
    opts.minProbability
  ]);

  // Main prediction calculation
  const calculatePredictions = useCallback(() => {
    const now = Date.now();
    
    // Throttle calculations
    if (now - lastCalculation.current < 5000) return; // Max once per 5 seconds
    lastCalculation.current = now;

    setIsProcessing(true);
    const newPredictions: ConvergencePrediction[] = [];
    const movingFriends = getMovingFriends();

    // Calculate pairwise convergences
    for (let i = 0; i < movingFriends.length; i++) {
      for (let j = i + 1; j < movingFriends.length; j++) {
        const prediction = calculateEnhancedConvergence(
          movingFriends[i].id,
          movingFriends[j].id
        );
        
        if (prediction) {
          // Check cache to avoid duplicate notifications
          const cacheKey = `${prediction.friendId}-${Math.floor(prediction.timeToMeet / 30)}`;
          const cached = predictionCache.current.get(cacheKey);
          
          if (!cached || now - cached.timestamp > 30000) { // 30 second cooldown
            newPredictions.push(prediction);
            predictionCache.current.set(cacheKey, prediction);
            
            // Notify subscribers
            subscribers.current.forEach(callback => callback(prediction));
            
            // Emit event
            eventBridge.emit(Events.FLOQ_CONVERGENCE_DETECTED, {
              friendId: prediction.friendId,
              friendName: prediction.friendName,
              probability: prediction.probability,
              timeToMeet: prediction.timeToMeet,
              predictedLocation: prediction.predictedLocation,
              confidence: prediction.confidence,
            });
          }
        }
      }
    }

    // Calculate group convergences if enabled
    if (opts.includeGroups && movingFriends.length >= 3) {
      // Try different group combinations (limit to prevent combinatorial explosion)
      const maxGroups = 5;
      let groupsChecked = 0;

      for (let size = 3; size <= Math.min(5, movingFriends.length); size++) {
        const combinations = getCombinations(
          movingFriends.map(f => f.id), 
          size
        );
        
        for (const combo of combinations) {
          if (groupsChecked >= maxGroups) break;
          
          const prediction = calculateGroupConvergence(combo);
          if (prediction) {
            newPredictions.push(prediction);
            groupsChecked++;
            
            // Notify subscribers
            subscribers.current.forEach(callback => callback(prediction));
            
            // Emit event for group convergence
            eventBridge.emit(Events.FLOQ_CONVERGENCE_DETECTED, {
              friendId: prediction.friendId,
              friendName: prediction.friendName,
              probability: prediction.probability,
              timeToMeet: prediction.timeToMeet,
              predictedLocation: prediction.predictedLocation,
              confidence: prediction.confidence,
            });
          }
        }
        
        if (groupsChecked >= maxGroups) break;
      }
    }

    // Update predictions, keeping recent ones
    setPredictions(prev => {
      const recent = prev.filter(p => now - p.timestamp < 60000); // Keep last minute
      return [...recent, ...newPredictions].slice(-10); // Max 10 predictions
    });

    setIsProcessing(false);
  }, [
    getMovingFriends,
    calculateEnhancedConvergence,
    calculateGroupConvergence,
    opts.includeGroups
  ]);

  // Subscribe to friend movement events
  useEffect(() => {
    const handleFriendMove = () => {
      calculatePredictions();
    };

    eventBridge.on(Events.FLOQ_FRIEND_MOVE, handleFriendMove);
    
    // Initial calculation
    calculatePredictions();

    // Periodic recalculation
    const interval = setInterval(calculatePredictions, 10000); // Every 10 seconds

    return () => {
      eventBridge.off(Events.FLOQ_FRIEND_MOVE, handleFriendMove);
      clearInterval(interval);
    };
  }, [calculatePredictions]);

  // Subscribe function for components to get notified
  const subscribe = useCallback((callback: (prediction: ConvergencePrediction) => void) => {
    subscribers.current.add(callback);
    return () => subscribers.current.delete(callback);
  }, []);

  // Get predictions for specific friend
  const getPredictionsForFriend = useCallback((friendId: string) => {
    return predictions.filter(p => 
      p.friendId === friendId || p.participants?.includes(friendId)
    );
  }, [predictions]);

  // Get high-confidence predictions
  const getHighConfidencePredictions = useCallback((minConfidence = 0.7) => {
    return predictions.filter(p => p.confidence >= minConfidence);
  }, [predictions]);

  // Clear old predictions
  const clearOldPredictions = useCallback(() => {
    const now = Date.now();
    setPredictions(prev => prev.filter(p => now - p.timestamp < 60000));
    
    // Clear old cache entries
    predictionCache.current.forEach((value, key) => {
      if (now - value.timestamp > 60000) {
        predictionCache.current.delete(key);
      }
    });
  }, []);

  // Get imminent predictions (within next 2 minutes)
  const getImminentPredictions = useCallback(() => {
    return predictions.filter(p => p.timeToMeet <= 120); // 2 minutes
  }, [predictions]);

  return {
    predictions,
    isProcessing,
    subscribe,
    getPredictionsForFriend,
    getHighConfidencePredictions,
    getImminentPredictions,
    clearOldPredictions,
    
    // Stats
    stats: {
      totalPredictions: predictions.length,
      pairPredictions: predictions.filter(p => p.type === 'pair').length,
      groupPredictions: predictions.filter(p => p.type === 'group').length,
      averageConfidence: predictions.reduce((sum, p) => sum + p.confidence, 0) / 
                        (predictions.length || 1),
    },
  };
}

// Helper function to calculate distance between two points
function calculateDistance(p1: [number, number], p2: [number, number]): number {
  const R = 6371000; // Earth radius in meters
  const lat1 = p1[1] * Math.PI / 180;
  const lat2 = p2[1] * Math.PI / 180;
  const deltaLat = (p2[1] - p1[1]) * Math.PI / 180;
  const deltaLng = (p2[0] - p1[0]) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Helper function to generate combinations
function getCombinations<T>(arr: T[], size: number): T[][] {
  if (size === 1) return arr.map(el => [el]);
  
  const combinations: T[][] = [];
  for (let i = 0; i <= arr.length - size; i++) {
    const head = arr.slice(i, i + 1);
    const tailCombinations = getCombinations(arr.slice(i + 1), size - 1);
    for (const tail of tailCombinations) {
      combinations.push([...head, ...tail]);
    }
  }
  
  return combinations;
}
