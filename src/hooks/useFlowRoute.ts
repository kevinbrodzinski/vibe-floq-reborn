import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/storage';

export interface FlowRouteVenue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  visitedAt: number;
  departedAt?: number;
  duration?: number; // minutes
}

export interface FlowRoute {
  venues: FlowRouteVenue[];
  totalDuration: number;
  startTime: number;
  endTime: number;
}

interface FlowRouteState {
  recentVenues: FlowRouteVenue[];
  currentPath: FlowRoute | null;
  isTracking: boolean;
}

const RETENTION_TIME = 15 * 60 * 1000; // 15 minutes
const MIN_VENUES_FOR_PATH = 2;
const STORAGE_KEY = 'flow_route';

/**
 * Hook for tracking and managing flow routes
 * Automatically captures venue visits and provides retrace functionality
 */
export function useFlowRoute() {
  const [state, setState] = useState<FlowRouteState>({
    recentVenues: [],
    currentPath: null,
    isTracking: true
  });

  // Load persisted route on mount
  useEffect(() => {
    const loadPersistedRoute = async () => {
      try {
        const stored = await storage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Filter out old venues
          const now = Date.now();
          const recentVenues = parsed.recentVenues.filter(
            (venue: FlowRouteVenue) => now - venue.visitedAt < RETENTION_TIME
          );
          
          setState(prev => ({
            ...prev,
            recentVenues,
            currentPath: recentVenues.length >= MIN_VENUES_FOR_PATH 
              ? generateRoute(recentVenues) 
              : null
          }));
        }
      } catch (error) {
        console.warn('Failed to load flow route:', error);
      }
    };

    loadPersistedRoute();
  }, []);

  // Persist route changes
  const persistRoute = useCallback(async (venues: FlowRouteVenue[]) => {
    try {
      await storage.setItem(STORAGE_KEY, JSON.stringify({ recentVenues: venues }));
    } catch (error) {
      console.warn('Failed to persist flow route:', error);
    }
  }, []);

  // Clean up old venues periodically
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      setState(prev => {
        const filtered = prev.recentVenues.filter(
          venue => now - venue.visitedAt < RETENTION_TIME
        );
        
        if (filtered.length !== prev.recentVenues.length) {
          persistRoute(filtered);
          return {
            ...prev,
            recentVenues: filtered,
            currentPath: filtered.length >= MIN_VENUES_FOR_PATH 
              ? generateRoute(filtered) 
              : null
          };
        }
        return prev;
      });
    };

    const interval = setInterval(cleanup, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [persistRoute]);

  /**
   * Add a venue visit to the route
   */
  const addRoutePoint = useCallback((venue: {
    id: string;
    name: string; 
    lat: number;
    lng: number;
  }) => {
    if (!state.isTracking) return;

    const now = Date.now();
    const newVenue: FlowRouteVenue = {
      ...venue,
      visitedAt: now
    };

    setState(prev => {
      // Update departure time for previous venue
      const updatedVenues = [...prev.recentVenues];
      if (updatedVenues.length > 0) {
        const lastVenue = updatedVenues[updatedVenues.length - 1];
        if (!lastVenue.departedAt) {
          lastVenue.departedAt = now;
          lastVenue.duration = Math.round((now - lastVenue.visitedAt) / 60000); // minutes
        }
      }

      // Don't add duplicate consecutive venues
      if (updatedVenues.length > 0 && updatedVenues[updatedVenues.length - 1].id === venue.id) {
        return prev;
      }

      // Add new venue
      updatedVenues.push(newVenue);

      // Keep only recent venues
      const recentVenues = updatedVenues.filter(
        v => now - v.visitedAt < RETENTION_TIME
      );

      // Generate route if we have enough venues
      const currentPath = recentVenues.length >= MIN_VENUES_FOR_PATH 
        ? generateRoute(recentVenues) 
        : null;

      // Persist changes
      persistRoute(recentVenues);

      return {
        ...prev,
        recentVenues,
        currentPath
      };
    });
  }, [state.isTracking, persistRoute]);

  /**
   * Mark departure from current venue
   */
  const markDeparture = useCallback(() => {
    const now = Date.now();
    
    setState(prev => {
      if (prev.recentVenues.length === 0) return prev;

      const updatedVenues = [...prev.recentVenues];
      const lastVenue = updatedVenues[updatedVenues.length - 1];
      
      if (!lastVenue.departedAt) {
        lastVenue.departedAt = now;
        lastVenue.duration = Math.round((now - lastVenue.visitedAt) / 60000);
        
        persistRoute(updatedVenues);
        
        return {
          ...prev,
          recentVenues: updatedVenues,
          currentPath: updatedVenues.length >= MIN_VENUES_FOR_PATH 
            ? generateRoute(updatedVenues) 
            : null
        };
      }
      
      return prev;
    });
  }, [persistRoute]);

  /**
   * Get venues for retrace functionality
   */
  const getRoutePoints = useCallback(() => {
    if (!state.currentPath || state.currentPath.venues.length < MIN_VENUES_FOR_PATH) {
      return [];
    }

    // Return venues in reverse chronological order for retracing
    return [...state.currentPath.venues].reverse();
  }, [state.currentPath]);

  /**
   * Clear the route
   */
  const clearRoute = useCallback(async () => {
    setState(prev => ({
      ...prev,
      recentVenues: [],
      currentPath: null
    }));
    
    try {
      await storage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear flow route:', error);
    }
  }, []);

  /**
   * Toggle tracking
   */
  const setTracking = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, isTracking: enabled }));
  }, []);

  /**
   * Get route statistics
   */
  const getRouteStats = useCallback(() => {
    if (!state.currentPath) return null;

    return {
      venueCount: state.currentPath.venues.length,
      totalDuration: state.currentPath.totalDuration,
      averageDuration: state.currentPath.totalDuration / state.currentPath.venues.length,
      startTime: state.currentPath.startTime,
      endTime: state.currentPath.endTime
    };
  }, [state.currentPath]);

  return {
    // State
    recentVenues: state.recentVenues,
    currentPath: state.currentPath,
    isTracking: state.isTracking,
    
    // Actions
    addRoutePoint,
    markDeparture,
    clearRoute,
    setTracking,
    
    // Utilities
    getRoutePoints,
    getRouteStats,
    
    // Computed
    hasRecentPath: state.currentPath !== null,
    canRetrace: state.recentVenues.length >= MIN_VENUES_FOR_PATH,

    // Legacy compatibility (keep these for RetracePathChip)
    getRetraceVenues: () => {
      if (!state.currentPath || state.currentPath.venues.length < MIN_VENUES_FOR_PATH) {
        return [];
      }
      return [...state.currentPath.venues].reverse();
    },
    getPathStats: () => {
      if (!state.currentPath) return null;
      return {
        venueCount: state.currentPath.venues.length,
        totalDuration: state.currentPath.totalDuration,
        averageDuration: state.currentPath.totalDuration / state.currentPath.venues.length,
        startTime: state.currentPath.startTime,
        endTime: state.currentPath.endTime
      };
    }
  };
}

/**
 * Generate a route object from venues
 */
function generateRoute(venues: FlowRouteVenue[]): FlowRoute {
  if (venues.length === 0) {
    return {
      venues: [],
      totalDuration: 0,
      startTime: 0,
      endTime: 0
    };
  }

  const sortedVenues = [...venues].sort((a, b) => a.visitedAt - b.visitedAt);
  const totalDuration = sortedVenues.reduce((sum, venue) => sum + (venue.duration || 0), 0);

  return {
    venues: sortedVenues,
    totalDuration,
    startTime: sortedVenues[0].visitedAt,
    endTime: sortedVenues[sortedVenues.length - 1].departedAt || Date.now()
  };
}
