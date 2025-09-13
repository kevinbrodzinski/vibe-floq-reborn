import { useCallback, useEffect, useState } from 'react';
import { socialCache, type FriendHead, type PathPoint } from '@/lib/social/socialCache';
import { eventBridge, Events, type EventPayloads } from '@/services/eventBridge';

interface VelocityData {
  velocity: [number, number]; // [lng/s, lat/s]
  speed: number; // m/s
  heading: number; // degrees
  confidence: number; // 0-1
  lastUpdate: number;
}

interface EnhancedFriendHead extends FriendHead {
  id: string;
  name?: string;
  velocity?: VelocityData;
  lastSeen: number;
  isMoving: boolean;
}

interface TrajectoryPrediction {
  futurePosition: [number, number];
  timeHorizon: number; // seconds
  confidence: number;
}

// Cache for velocity calculations
const velocityCache = new Map<string, Array<{ position: [number, number]; timestamp: number }>>();
const VELOCITY_WINDOW = 30000; // 30 seconds for velocity calculation
const MIN_MOVEMENT_THRESHOLD = 0.5; // m/s minimum to consider "moving"

export function useSocialCache() {
  const [friendHeads, setFriendHeads] = useState<EnhancedFriendHead[]>([]);
  const [myPath, setMyPath] = useState<PathPoint[]>([]);
  const [convergenceProb, setConvergenceProb] = useState<number | undefined>();

  // Calculate velocity from recent position history
  const calculateVelocity = useCallback((friendId: string, currentPos: [number, number]): VelocityData | null => {
    const history = velocityCache.get(friendId) || [];
    const now = Date.now();
    
    // Add current position
    history.push({ position: currentPos, timestamp: now });
    
    // Remove old entries
    const recentHistory = history.filter(h => now - h.timestamp < VELOCITY_WINDOW);
    velocityCache.set(friendId, recentHistory);
    
    if (recentHistory.length < 2) return null;
    
    // Calculate velocity using most recent points
    const recent = recentHistory.slice(-3); // Use last 3 points for stability
    if (recent.length < 2) return null;
    
    const dt = (recent[recent.length - 1].timestamp - recent[0].timestamp) / 1000; // seconds
    if (dt < 5) return null; // Need at least 5 seconds of data
    
    const [lng1, lat1] = recent[0].position;
    const [lng2, lat2] = recent[recent.length - 1].position;
    
    // Convert to m/s using rough approximation
    const dlng = lng2 - lng1;
    const dlat = lat2 - lat1;
    const avgLat = (lat1 + lat2) / 2;
    
    // Approximate meters per degree at this latitude
    const metersPerDegreeLng = 111320 * Math.cos(avgLat * Math.PI / 180);
    const metersPerDegreeLat = 110540;
    
    const dx = dlng * metersPerDegreeLng;
    const dy = dlat * metersPerDegreeLat;
    
    const speed = Math.sqrt(dx * dx + dy * dy) / dt;
    const heading = Math.atan2(dx, dy) * 180 / Math.PI;
    
    // Confidence based on consistency of recent measurements
    let confidence = 1.0;
    if (recent.length >= 3) {
      // Check if velocity is consistent
      const midPoint = recent[Math.floor(recent.length / 2)];
      const midDt = (midPoint.timestamp - recent[0].timestamp) / 1000;
      const expectedPos = [
        lng1 + (dlng / dt) * midDt,
        lat1 + (dlat / dt) * midDt
      ];
      const actualPos = midPoint.position;
      const error = Math.sqrt(
        Math.pow(expectedPos[0] - actualPos[0], 2) + 
        Math.pow(expectedPos[1] - actualPos[1], 2)
      ) * metersPerDegreeLng;
      
      confidence = Math.max(0.1, 1 - error / 50); // Reduce confidence if > 50m error
    }
    
    return {
      velocity: [dlng / dt, dlat / dt],
      speed,
      heading: heading < 0 ? heading + 360 : heading,
      confidence,
      lastUpdate: now
    };
  }, []);

  // Enhanced friend head processing
  const enhanceFriendHead = useCallback((head: FriendHead, index: number): EnhancedFriendHead => {
    const friendId = `friend-${index}`; // In real app, would use actual friend ID
    const velocity = calculateVelocity(friendId, [head.lng, head.lat]);
    
    return {
      ...head,
      id: friendId,
      velocity: velocity || undefined,
      lastSeen: Date.now(),
      isMoving: velocity ? velocity.speed > MIN_MOVEMENT_THRESHOLD : false
    };
  }, [calculateVelocity]);

  // Update friend heads with velocity data
  const updateFriendHeads = useCallback((heads: FriendHead[]) => {
    const enhanced = heads.map(enhanceFriendHead);
    setFriendHeads(enhanced);
    socialCache.setFriendHeads(heads);
    
    // Emit movement events for convergence detection
    enhanced.forEach(friend => {
      if (friend.velocity && friend.isMoving) {
        eventBridge.emit(Events.FLOQ_FRIEND_MOVE, {
          friendId: friend.id,
          position: [friend.lng, friend.lat],
          velocity: friend.velocity.velocity
        });
      }
    });
  }, [enhanceFriendHead]);

  // Predict future position based on current velocity
  const predictPosition = useCallback((
    friendId: string,
    timeHorizon: number // seconds
  ): TrajectoryPrediction | null => {
    const friend = friendHeads.find(f => f.id === friendId);
    if (!friend?.velocity) return null;
    
    const { velocity, confidence, lastUpdate } = friend.velocity;
    const age = (Date.now() - lastUpdate) / 1000;
    
    // Reduce confidence for stale data
    const adjustedConfidence = confidence * Math.exp(-age / 30); // Decay over 30s
    
    const futurePosition: [number, number] = [
      friend.lng + velocity[0] * timeHorizon,
      friend.lat + velocity[1] * timeHorizon
    ];
    
    return {
      futurePosition,
      timeHorizon,
      confidence: adjustedConfidence
    };
  }, [friendHeads]);

  // Get all friends who are currently moving
  const getMovingFriends = useCallback(() => {
    return friendHeads.filter(f => f.isMoving && f.velocity);
  }, [friendHeads]);

  // Get friend by ID
  const getFriendById = useCallback((friendId: string): EnhancedFriendHead | null => {
    return friendHeads.find(f => f.id === friendId) || null;
  }, [friendHeads]);

  // Estimate convergence probability between two friends
  const estimateConvergence = useCallback((
    friend1Id: string,
    friend2Id: string,
    timeWindow: number = 180 // 3 minutes
  ): { probability: number; timeToMeet?: number; meetingPoint?: [number, number] } => {
    const f1 = getFriendById(friend1Id);
    const f2 = getFriendById(friend2Id);
    
    if (!f1?.velocity || !f2?.velocity) {
      return { probability: 0 };
    }
    
    // Simple trajectory intersection calculation
    // In a full implementation, this would be more sophisticated
    const v1 = f1.velocity;
    const v2 = f2.velocity;
    
    // Check if velocities are convergent (heading toward each other)
    const dx = f2.lng - f1.lng;
    const dy = f2.lat - f1.lat;
    const distance = Math.sqrt(dx * dx + dy * dy) * 111320; // rough distance in meters
    
    // Relative velocity
    const relVel = [v2.velocity[0] - v1.velocity[0], v2.velocity[1] - v1.velocity[1]];
    const relSpeed = Math.sqrt(relVel[0] * relVel[0] + relVel[1] * relVel[1]) * 111320;
    
    if (relSpeed < 0.1) return { probability: 0 }; // No relative movement
    
    const timeToClose = distance / relSpeed;
    
    if (timeToClose > timeWindow) return { probability: 0 };
    
    // Calculate probability based on time and confidence
    const baseProbability = Math.exp(-timeToClose / 60); // Decay over 1 minute
    const confidenceMultiplier = v1.confidence * v2.confidence;
    const probability = baseProbability * confidenceMultiplier;
    
    // Rough meeting point calculation
    const meetingTime = timeToClose / 2; // Assume they meet halfway in time
    const meetingPoint: [number, number] = [
      f1.lng + v1.velocity[0] * meetingTime,
      f1.lat + v1.velocity[1] * meetingTime
    ];
    
    return {
      probability: Math.min(probability, 1),
      timeToMeet: timeToClose,
      meetingPoint
    };
  }, [getFriendById]);

  // Sync with existing social cache
  useEffect(() => {
    const interval = setInterval(() => {
      const currentHeads = socialCache.getFriendHeads();
      const currentPath = socialCache.getMyPath();
      const currentProb = socialCache.getConvergenceProb();
      
      // Only update if data has changed to avoid unnecessary re-renders
      if (currentHeads !== friendHeads.slice(0, currentHeads.length).map(f => ({ lng: f.lng, lat: f.lat, t_head: f.t_head }))) {
        updateFriendHeads(currentHeads);
      }
      
      if (currentPath !== myPath) {
        setMyPath(currentPath);
      }
      
      if (currentProb !== convergenceProb) {
        setConvergenceProb(currentProb);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [updateFriendHeads, friendHeads, myPath, convergenceProb]);

  return {
    // Enhanced data
    friendHeads,
    myPath,
    convergenceProb,
    
    // Setters that sync with cache
    setFriendHeads: updateFriendHeads,
    setMyPath: (path: PathPoint[]) => {
      setMyPath(path);
      socialCache.setMyPath(path);
    },
    setConvergenceProb: (prob?: number) => {
      setConvergenceProb(prob);
      socialCache.setConvergenceProb(prob);
    },
    
    // Velocity and prediction methods
    calculateVelocity,
    predictPosition,
    getMovingFriends,
    getFriendById,
    estimateConvergence,
    
    // Getters for compatibility
    getFriendHeads: () => friendHeads,
    getMyPath: () => myPath,
    getConvergenceProb: () => convergenceProb,
  };
}