import { useCallback, useEffect, useRef, useState } from 'react';
import { MMKV } from 'react-native-mmkv';
import { emitEvent, Events } from '@/services/eventBridge';
import { useGeo } from '@/hooks/useGeo';
import { useSelectedVenue } from '@/store/useSelectedVenue';
import { useSocialCache } from '@/hooks/useSocialCache';
import { setVenueVibeForRoute } from '@/lib/flow/setVenueVibe';

// Initialize MMKV storage
const storage = new MMKV({ id: 'flow-route-storage' });

// Types
interface RoutePoint {
  id: string;
  timestamp: number;
  position: [number, number]; // [lng, lat]
  venueId?: string;
  venueName?: string;
  venueType?: string;
  duration?: number; // Time spent at venue in seconds
  pathToNext?: Array<[number, number]>; // GPS path to next point
}

interface FlowPattern {
  id: string;
  points: string[]; // Venue IDs in order
  frequency: number;
  lastSeen: number;
  timeOfDay: 'morning' | 'lunch' | 'evening' | 'night';
  confidence: number;
}

interface FlowRouteStats {
  points: number;
  uniqueVenues: number;
  totalDistance: number; // meters
  totalDuration: number; // seconds
  oldestPoint: number;
  newestPoint: number;
}

// Constants
const RETENTION_WINDOW = 15 * 60 * 1000; // 15 minutes
const MIN_VENUE_DURATION = 30000; // 30 seconds to register venue visit
const DEDUPLICATION_RADIUS = 20; // meters
const CLEANUP_INTERVAL = 60000; // 1 minute
const PATH_SIMPLIFICATION_TOLERANCE = 0.00001; // ~1 meter

export function useFlowRoute() {
  const userLocation = useGeo();
  const { myPath } = useSocialCache();
  const { selectedVenueId } = useSelectedVenue();
  
  // Get selected venue details (placeholder for now)
  const selectedVenue = selectedVenueId ? { id: selectedVenueId, name: `Venue ${selectedVenueId}`, type: 'unknown' } : null;
  
  const [flowRoute, setFlowRoute] = useState<RoutePoint[]>([]);
  const [patterns, setPatterns] = useState<FlowPattern[]>([]);
  const [isRetracing, setIsRetracing] = useState(false);
  const [currentRetraceIndex, setCurrentRetraceIndex] = useState<number>(-1);
  
  const lastVenueRef = useRef<string | null>(null);
  const venueEntryTime = useRef<number>(0);
  const pathBuffer = useRef<Array<[number, number]>>([]);
  const cleanupTimer = useRef<NodeJS.Timeout>();

  // Load existing route from storage
  useEffect(() => {
    try {
      const storedRoute = storage.getString('current-flow-route');
      if (storedRoute) {
        const parsed = JSON.parse(storedRoute) as RoutePoint[];
        const now = Date.now();
        const valid = parsed.filter(p => now - p.timestamp < RETENTION_WINDOW);
        setFlowRoute(valid);
      }

      const storedPatterns = storage.getString('flow-patterns');
      if (storedPatterns) {
        setPatterns(JSON.parse(storedPatterns));
      }
    } catch (error) {
      console.error('Failed to load flow route:', error);
    }
  }, []);

  // Save route to storage
  useEffect(() => {
    if (flowRoute.length > 0) {
      storage.set('current-flow-route', JSON.stringify(flowRoute));
    }
  }, [flowRoute]);

  // Save patterns to storage
  useEffect(() => {
    if (patterns.length > 0) {
      storage.set('flow-patterns', JSON.stringify(patterns));
    }
  }, [patterns]);

  const getLngLat = () => {
    const c = userLocation?.coords as any;
    if (!c) return null;
    if ('lng' in c && 'lat' in c) return [c.lng, c.lat] as [number, number];
    if ('longitude' in c && 'latitude' in c) return [c.longitude, c.latitude] as [number, number];
    return null;
  };

  // Track venue visits
  useEffect(() => {
    if (selectedVenue) {
      if (selectedVenue.id !== lastVenueRef.current) {
        // Entered new venue
        lastVenueRef.current = selectedVenue.id;
        venueEntryTime.current = Date.now();
        
        // Save path buffer as connection to previous point
        if (flowRoute.length > 0 && pathBuffer.current.length > 0) {
          const simplified = simplifyPath(pathBuffer.current);
          setFlowRoute(prev => {
            const updated = [...prev];
            const lastPoint = updated[updated.length - 1];
            if (lastPoint) {
              lastPoint.pathToNext = simplified;
            }
            return updated;
          });
        }
        
        pathBuffer.current = [];
      }
    } else if (lastVenueRef.current) {
      // Left venue
      const duration = Date.now() - venueEntryTime.current;
      
      const pos = getLngLat();
      if (duration >= MIN_VENUE_DURATION && pos) {
        let routePoint: RoutePoint = {
          id: `rp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          position: pos,
          venueId: lastVenueRef.current,
          venueName: selectedVenue?.name,
          venueType: selectedVenue?.type,
          duration: Math.round(duration / 1000),
        };
        
        // 🔹 stamp vibe color on the point (future-proof; resolver handles unknowns)
        routePoint = setVenueVibeForRoute(routePoint, {
          vibeKey: (selectedVenue as any)?.vibeKey,
          vibeHex: (selectedVenue as any)?.vibeHex,
        });
        
        addRoutePoint(routePoint);
      }
      
      lastVenueRef.current = null;
      venueEntryTime.current = 0;
    }
  }, [selectedVenue, userLocation?.coords, flowRoute]);

  // Track movement between venues
  useEffect(() => {
    if (!selectedVenue) {
      const p = getLngLat();
      if (!p) return;
      const point = p;
      
      // Add to path buffer with deduplication
      if (pathBuffer.current.length === 0 || 
          getDistance(point, pathBuffer.current[pathBuffer.current.length - 1]) > DEDUPLICATION_RADIUS) {
        pathBuffer.current.push(point);
        
        // Limit buffer size and simplify if needed
        if (pathBuffer.current.length > 100) {
          pathBuffer.current = simplifyPath(pathBuffer.current);
        }
      }
    }
  }, [userLocation?.coords, selectedVenue]);

  // Cleanup old route points
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      setFlowRoute(prev => {
        const filtered = prev.filter(p => now - p.timestamp < RETENTION_WINDOW);
        if (filtered.length !== prev.length) {
          storage.set('current-flow-route', JSON.stringify(filtered));
        }
        return filtered;
      });
    };

    cleanupTimer.current = setInterval(cleanup, CLEANUP_INTERVAL);
    return () => {
      if (cleanupTimer.current) {
        clearInterval(cleanupTimer.current);
      }
    };
  }, []);

  // Add a route point to the flow route
  const addRoutePoint = useCallback((routePoint: RoutePoint) => {
    setFlowRoute(prev => {
      // Check for duplicate venue within deduplication time
      const lastPoint = prev[prev.length - 1];
      if (lastPoint && 
          lastPoint.venueId === routePoint.venueId &&
          routePoint.timestamp - lastPoint.timestamp < 60000) {
        // Update duration instead of adding duplicate
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...lastPoint,
          duration: (lastPoint.duration || 0) + (routePoint.duration || 0)
        };
        return updated;
      }

      const updated = [...prev, routePoint];
      
      // Detect patterns if this is a venue visit
      if (routePoint.venueId) {
        detectPattern(updated);
      }
      
      // Keep route size manageable
      if (updated.length > 50) {
        return updated.slice(-50);
      }
      
      return updated;
    });
  }, []);

  // Detect recurring patterns
  const detectPattern = useCallback((currentRoute: RoutePoint[]) => {
    const venueSequence = currentRoute
      .filter(p => p.venueId)
      .map(p => p.venueId!)
      .slice(-5); // Look at last 5 venues

    if (venueSequence.length < 3) return;

    const timeOfDay = getTimeOfDay();
    const sequenceKey = venueSequence.join('->');

    setPatterns(prev => {
      const existing = prev.find(p => 
        p.points.join('->') === sequenceKey && 
        p.timeOfDay === timeOfDay
      );

      if (existing) {
        // Update existing pattern
        existing.frequency++;
        existing.lastSeen = Date.now();
        existing.confidence = Math.min(0.9, existing.frequency * 0.1);
        return [...prev];
      } else {
        // New pattern detected
        const newPattern: FlowPattern = {
          id: `pattern-${Date.now()}`,
          points: venueSequence,
          frequency: 1,
          lastSeen: Date.now(),
          timeOfDay,
          confidence: 0.1
        };
        
        // Keep only recent patterns (last 30 days)
        const filtered = prev.filter(p => 
          Date.now() - p.lastSeen < 30 * 24 * 60 * 60 * 1000
        );
        
        return [...filtered, newPattern].slice(-20); // Max 20 patterns
      }
    });
  }, []);

  // Start retracing the flow route
  const startRetrace = useCallback((fromIndex?: number) => {
    if (flowRoute.length === 0) return;

    setIsRetracing(true);
    const startIdx = fromIndex ?? flowRoute.length - 1;
    setCurrentRetraceIndex(startIdx);

    // Navigate to first retrace point
    const point = flowRoute[startIdx];
    if (point?.position) {
      emitEvent(Events.UI_MAP_FLY_TO, {
        lng: point.position[0],
        lat: point.position[1],
        zoom: 17,
        duration: 1000
      });

      // Show flow route on map (use new Flow events)
      emitEvent(Events.FLOQ_FLOW_SHOW, {
        path: flowRoute.slice(0, startIdx + 1).reverse().map(p => ({
          id: p.id,
          position: p.position,
          venueName: p.venueName,
          // Future: add vibe data when available
          // vibeKey: p.vibeKey,
          // vibeHex: p.vibeHex
        })),
        mode: 'retrace'
      });
    }
  }, [flowRoute]);

  // Stop retracing
  const stopRetrace = useCallback(() => {
    setIsRetracing(false);
    setCurrentRetraceIndex(-1);
    emitEvent(Events.FLOQ_FLOW_HIDE, {});
  }, []);

  // Navigate to next/previous point in retrace
  const navigateRetrace = useCallback((direction: 'next' | 'previous') => {
    if (!isRetracing || flowRoute.length === 0) return;

    let newIndex = currentRetraceIndex;
    if (direction === 'next') {
      newIndex = Math.max(0, currentRetraceIndex - 1);
    } else {
      newIndex = Math.min(flowRoute.length - 1, currentRetraceIndex + 1);
    }

    if (newIndex !== currentRetraceIndex) {
      setCurrentRetraceIndex(newIndex);
      const point = flowRoute[newIndex];
      
      if (point?.position) {
        emitEvent(Events.UI_MAP_FLY_TO, {
          lng: point.position[0],
          lat: point.position[1],
          zoom: 18,
          duration: 800
        });

        emitEvent(Events.UI_MAP_PULSE, {
          lng: point.position[0],
          lat: point.position[1],
          color: '#EC4899'
        });
      }
    }
  }, [isRetracing, currentRetraceIndex, flowRoute]);

  // Get suggested next venue based on patterns
  const getSuggestedNext = useCallback((): {
    venueId: string;
    confidence: number;
    pattern: FlowPattern;
  } | null => {
    if (flowRoute.length === 0) return null;

    const recentVenues = flowRoute
      .filter(p => p.venueId)
      .map(p => p.venueId!)
      .slice(-4);

    if (recentVenues.length < 2) return null;

    const timeOfDay = getTimeOfDay();

    // Find matching patterns
    const matches = patterns
      .filter(p => p.timeOfDay === timeOfDay && p.confidence > 0.3)
      .map(pattern => {
        // Check if recent venues match the beginning of this pattern
        for (let i = 0; i <= pattern.points.length - recentVenues.length; i++) {
          const patternSlice = pattern.points.slice(i, i + recentVenues.length);
          if (patternSlice.join('->') === recentVenues.join('->')) {
            // Found a match, predict next venue
            if (i + recentVenues.length < pattern.points.length) {
              return {
                venueId: pattern.points[i + recentVenues.length],
                confidence: pattern.confidence,
                pattern
              };
            }
          }
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => b!.confidence - a!.confidence);

    return matches[0] || null;
  }, [flowRoute, patterns]);

  // Navigate to specific flow route point
  const navigateToRoutePoint = useCallback((routePointId: string) => {
    const point = flowRoute.find(p => p.id === routePointId);
    if (point?.position) {
      emitEvent(Events.UI_MAP_FLY_TO, {
        lng: point.position[0],
        lat: point.position[1],
        zoom: 18,
        duration: 800
      });

      emitEvent(Events.UI_MAP_PULSE, {
        lng: point.position[0],
        lat: point.position[1],
        color: '#EC4899'
      });
    }
  }, [flowRoute]);

  // Get flow route statistics
  const getFlowRouteStats = useCallback((): FlowRouteStats => {
    let totalDistance = 0;
    let totalDuration = 0;

    for (let i = 0; i < flowRoute.length; i++) {
      const point = flowRoute[i];
      
      // Add duration
      if (point.duration) {
        totalDuration += point.duration;
      }

      // Calculate distance to next point
      if (i < flowRoute.length - 1) {
        const nextPoint = flowRoute[i + 1];
        if (point.pathToNext && point.pathToNext.length > 0) {
          // Calculate path distance
          for (let j = 0; j < point.pathToNext.length - 1; j++) {
            totalDistance += getDistance(point.pathToNext[j], point.pathToNext[j + 1]);
          }
        } else {
          // Direct distance
          totalDistance += getDistance(point.position, nextPoint.position);
        }
      }
    }

    const uniqueVenues = new Set(flowRoute.map(p => p.venueId).filter(Boolean)).size;

    return {
      points: flowRoute.length,
      uniqueVenues,
      totalDistance: Math.round(totalDistance),
      totalDuration,
      oldestPoint: flowRoute[0]?.timestamp || Date.now(),
      newestPoint: flowRoute[flowRoute.length - 1]?.timestamp || Date.now()
    };
  }, [flowRoute]);

  // Legacy compatibility methods
  const getRetraceVenues = useCallback(() => {
    return flowRoute
      .filter(p => p.venueId)
      .slice(-10) // Last 10 venues
      .reverse()
      .map((point, index) => ({
        id: point.venueId!,
        name: point.venueName || `Venue ${index + 1}`,
        lat: point.position[1],
        lng: point.position[0],
        visitedAt: point.timestamp,
        duration: point.duration
      }));
  }, [flowRoute]);

  const getPathStats = useCallback(() => {
    const stats = getFlowRouteStats();
    return {
      venueCount: stats.uniqueVenues,
      totalDuration: Math.round(stats.totalDuration / 60), // Convert to minutes
    };
  }, [getFlowRouteStats]);

  // Clear flow route
  const clearRoute = useCallback(() => {
    setFlowRoute([]);
    pathBuffer.current = [];
    storage.delete('current-flow-route');
    if (isRetracing) {
      stopRetrace();
    }
  }, [isRetracing, stopRetrace]);

  // Clear patterns
  const clearPatterns = useCallback(() => {
    setPatterns([]);
    storage.delete('flow-patterns');
  }, []);

  return {
    // State
    flowRoute,
    patterns,
    isRetracing,
    currentRetraceIndex,
    
    // Actions
    addRoutePoint,
    startRetrace,
    stopRetrace,
    navigateRetrace,
    navigateToRoutePoint,
    clearRoute,
    clearPatterns,
    
    // Computed
    getSuggestedNext,
    getFlowRouteStats,
    hasRecentActivity: flowRoute.length >= 2,
    canRetrace: flowRoute.length > 0 && !isRetracing,
    retraceProgress: isRetracing ? 
      `${flowRoute.length - currentRetraceIndex} / ${flowRoute.length}` : null,
    
    // Legacy compatibility
    getRetraceVenues,
    getPathStats,
    currentPath: flowRoute.length > 0 ? flowRoute : null,
    trail: flowRoute, // Alias for legacy code
  };
}

// Helper functions
function getDistance(p1: [number, number], p2: [number, number]): number {
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

function simplifyPath(path: Array<[number, number]>): Array<[number, number]> {
  if (path.length <= 2) return path;
  
  // Simple Douglas-Peucker implementation
  const tolerance = PATH_SIMPLIFICATION_TOLERANCE;
  
  // Find point with maximum distance from line between first and last
  let maxDist = 0;
  let maxIndex = 0;
  
  for (let i = 1; i < path.length - 1; i++) {
    const dist = pointToLineDistance(path[i], path[0], path[path.length - 1]);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }
  
  // If max distance is greater than tolerance, recursively simplify
  if (maxDist > tolerance) {
    const left = simplifyPath(path.slice(0, maxIndex + 1));
    const right = simplifyPath(path.slice(maxIndex));
    return [...left.slice(0, -1), ...right];
  }
  
  // Otherwise, return just the endpoints
  return [path[0], path[path.length - 1]];
}

function pointToLineDistance(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number {
  const A = point[0] - lineStart[0];
  const B = point[1] - lineStart[1];
  const C = lineEnd[0] - lineStart[0];
  const D = lineEnd[1] - lineStart[1];

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = lineStart[0];
    yy = lineStart[1];
  } else if (param > 1) {
    xx = lineEnd[0];
    yy = lineEnd[1];
  } else {
    xx = lineStart[0] + param * C;
    yy = lineStart[1] + param * D;
  }

  const dx = point[0] - xx;
  const dy = point[1] - yy;

  return Math.sqrt(dx * dx + dy * dy);
}

function getTimeOfDay(): 'morning' | 'lunch' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 14) return 'lunch';
  if (hour < 20) return 'evening';
  return 'night';
}
