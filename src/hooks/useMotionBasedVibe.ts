import { useState, useEffect, useRef } from 'react';
import { useVibe } from '@/lib/store/useVibe';
import type { Vibe } from '@/types/vibes';

interface MotionData {
  isMoving: boolean;
  speed: number; // meters per second
  activity: 'still' | 'walking' | 'running' | 'driving';
  confidence: number;
  lastUpdate: number;
}

interface VibeTransition {
  from: Vibe;
  to: Vibe;
  timestamp: number;
  reason: string;
}

export const useMotionBasedVibe = () => {
  const { vibe: currentVibe, setVibe } = useVibe();
  const [motionData, setMotionData] = useState<MotionData>({
    isMoving: false,
    speed: 0,
    activity: 'still',
    confidence: 0,
    lastUpdate: Date.now()
  });
  
  const [vibeTransitions, setVibeTransitions] = useState<VibeTransition[]>([]);
  const lastVibeChange = useRef<number>(0);
  const motionHistory = useRef<MotionData[]>([]);
  const geolocationRef = useRef<GeolocationPosition | null>(null);
  const lastPosition = useRef<GeolocationPosition | null>(null);

  // Calculate speed from GPS coordinates
  const calculateSpeed = (pos1: GeolocationPosition, pos2: GeolocationPosition): number => {
    const R = 6371e3; // Earth's radius in meters
    const lat1 = pos1.coords.latitude * Math.PI / 180;
    const lat2 = pos2.coords.latitude * Math.PI / 180;
    const deltaLat = (pos2.coords.latitude - pos1.coords.latitude) * Math.PI / 180;
    const deltaLon = (pos2.coords.longitude - pos1.coords.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in meters

    const timeDiff = (pos2.timestamp - pos1.timestamp) / 1000; // Time in seconds
    return distance / timeDiff; // Speed in m/s
  };

  // Determine activity type based on speed
  const getActivityFromSpeed = (speed: number): 'still' | 'walking' | 'running' | 'driving' => {
    if (speed < 0.5) return 'still';
    if (speed < 2.5) return 'walking';
    if (speed < 8.0) return 'running';
    return 'driving';
  };

  // Calculate confidence based on speed consistency
  const calculateConfidence = (speeds: number[]): number => {
    if (speeds.length < 2) return 0.5;
    
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const variance = speeds.reduce((sum, speed) => sum + Math.pow(speed - avgSpeed, 2), 0) / speeds.length;
    const stdDev = Math.sqrt(variance);
    
    // Higher confidence for consistent speeds
    return Math.max(0.1, Math.min(1.0, 1 - (stdDev / avgSpeed)));
  };

  // Determine vibe based on motion activity
  const getVibeFromActivity = (activity: string, speed: number, confidence: number): Vibe => {
    const now = Date.now();
    const timeSinceLastChange = now - lastVibeChange.current;
    
    // Prevent rapid vibe changes (minimum 10 seconds between changes)
    if (timeSinceLastChange < 10000) {
      return currentVibe as Vibe;
    }

    switch (activity) {
      case 'still':
        return confidence > 0.7 ? 'chill' : currentVibe as Vibe;
      case 'walking':
        if (speed > 1.5) return 'flowing';
        return 'open';
      case 'running':
        return 'hype';
      case 'driving':
        return speed > 15 ? 'hype' : 'solo';
      default:
        return currentVibe as Vibe;
    }
  };

  // Handle geolocation updates
  const handleGeolocationUpdate = (position: GeolocationPosition) => {
    const now = Date.now();
    
    if (lastPosition.current) {
      const speed = calculateSpeed(lastPosition.current, position);
      const activity = getActivityFromSpeed(speed);
      
      // Update motion history (keep last 10 readings)
      motionHistory.current.push({
        isMoving: speed > 0.5,
        speed,
        activity,
        confidence: 0.8, // Will be calculated below
        lastUpdate: now
      });
      
      if (motionHistory.current.length > 10) {
        motionHistory.current.shift();
      }
      
      // Calculate confidence from recent speeds
      const recentSpeeds = motionHistory.current.map(m => m.speed);
      const confidence = calculateConfidence(recentSpeeds);
      
      const newMotionData: MotionData = {
        isMoving: speed > 0.5,
        speed,
        activity,
        confidence,
        lastUpdate: now
      };
      
      setMotionData(newMotionData);
      
      // Determine new vibe
      const newVibe = getVibeFromActivity(activity, speed, confidence);
      
      if (newVibe !== currentVibe) {
        const transition: VibeTransition = {
          from: currentVibe as Vibe,
          to: newVibe,
          timestamp: now,
          reason: `Motion: ${activity} (${speed.toFixed(1)} m/s)`
        };
        
        setVibeTransitions(prev => [...prev.slice(-5), transition]); // Keep last 5 transitions
        setVibe(newVibe);
        lastVibeChange.current = now;
      }
    }
    
    lastPosition.current = position;
    geolocationRef.current = position;
  };

  // Start geolocation tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      handleGeolocationUpdate,
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000, // 5 seconds
        timeout: 10000 // 10 seconds
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [currentVibe]);

  return {
    motionData,
    vibeTransitions,
    currentVibe,
    isMoving: motionData.isMoving,
    activity: motionData.activity,
    speed: motionData.speed,
    confidence: motionData.confidence
  };
}; 