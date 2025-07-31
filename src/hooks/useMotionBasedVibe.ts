import { useState, useEffect, useRef } from 'react';
import { Vibe } from '@/types/enums';

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

export const useMotionBasedVibe = (enabled: boolean = false) => {
  const [motionData, setMotionData] = useState<MotionData>({
    isMoving: false,
    speed: 0,
    activity: 'still',
    confidence: 0,
    lastUpdate: 0
  });

  const [vibeTransitions, setVibeTransitions] = useState<VibeTransition[]>([]);
  const [currentVibe, setVibe] = useState<Vibe>('solo' as Vibe);
  const [geolocationError, setGeolocationError] = useState<GeolocationPositionError | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(false);

  const lastPosition = useRef<GeolocationPosition | null>(null);
  const geolocationRef = useRef<GeolocationPosition | null>(null);
  const motionHistory = useRef<MotionData[]>([]);
  const lastVibeChange = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);

  // Calculate speed between two positions
  const calculateSpeed = (pos1: GeolocationPosition, pos2: GeolocationPosition): number => {
    const timeDiff = (pos2.timestamp - pos1.timestamp) / 1000; // seconds
    if (timeDiff <= 0) return 0;

    const lat1 = pos1.coords.latitude;
    const lng1 = pos1.coords.longitude;
    const lat2 = pos2.coords.latitude;
    const lng2 = pos2.coords.longitude;

    // Haversine formula for distance
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // meters
    return distance / timeDiff; // m/s
  };

  // Determine activity from speed
  const getActivityFromSpeed = (speed: number): 'still' | 'walking' | 'running' | 'driving' => {
    if (speed < 0.5) return 'still';
    if (speed < 2.5) return 'walking';
    if (speed < 8.0) return 'running';
    return 'driving';
  };

  // Calculate confidence based on speed consistency
  const calculateConfidence = (speeds: number[]): number => {
    if (speeds.length < 2) return 0.5;

    const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const variance = speeds.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / speeds.length;
    const stdDev = Math.sqrt(variance);

    // Higher confidence for consistent speeds
    return Math.max(0.1, 1 - (stdDev / mean));
  };

  // Map activity to vibe
  const getVibeFromActivity = (activity: string, speed: number, confidence: number): Vibe => {
    switch (activity) {
      case 'still':
        return 'solo' as Vibe;
      case 'walking':
        return 'open' as Vibe;
      case 'running':
        return 'hype' as Vibe;
      case 'driving':
        return speed > 15 ? ('hype' as Vibe) : ('solo' as Vibe);
      default:
        return currentVibe as Vibe;
    }
  };

  // Handle geolocation updates
  const handleGeolocationUpdate = (position: GeolocationPosition) => {
    const now = Date.now();
    
    // Clear any previous error state
    setGeolocationError(null);
    setIsTracking(true);

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
        setVibe(newVibe as any);
        lastVibeChange.current = now;
      }
    }

    lastPosition.current = position;
    geolocationRef.current = position;
  };

  // Handle geolocation errors
  const handleGeolocationError = (error: GeolocationPositionError) => {
    console.error('[MOTION_VIBE] Geolocation error:', error);
    setGeolocationError(error);
    setIsTracking(false);
    
    // Provide user-friendly error messages
    switch (error.code) {
      case error.PERMISSION_DENIED:
        console.warn('[MOTION_VIBE] Location permission denied');
        break;
      case error.POSITION_UNAVAILABLE:
        console.warn('[MOTION_VIBE] Location unavailable');
        break;
      case error.TIMEOUT:
        console.warn('[MOTION_VIBE] Location request timeout - will retry');
        break;
    }
  };

  // Start geolocation tracking only when enabled
  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      // Clean up any existing watcher
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    console.log('[MOTION_VIBE] Starting motion-based vibe detection');

    const watchId = navigator.geolocation.watchPosition(
      handleGeolocationUpdate,
      handleGeolocationError,
      {
        enableHighAccuracy: false, // Less battery intensive
        maximumAge: 30000, // 30 seconds - more lenient
        timeout: 20000 // 20 seconds - longer timeout
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled]); // ✅ Removed currentVibe to prevent loops

  return {
    motionData,
    vibeTransitions,
    currentVibe,
    isMoving: motionData.isMoving,
    activity: motionData.activity,
    speed: motionData.speed,
    confidence: motionData.confidence,
    geolocationError,
    isTracking
  };
}; 