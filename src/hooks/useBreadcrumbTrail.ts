import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/storage';

export interface BreadcrumbVenue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  visitedAt: number;
  departedAt?: number;
  duration?: number; // minutes
}

export interface BreadcrumbPath {
  venues: BreadcrumbVenue[];
  totalDuration: number;
  startTime: number;
  endTime: number;
}

interface BreadcrumbTrailState {
  recentVenues: BreadcrumbVenue[];
  currentPath: BreadcrumbPath | null;
  isTracking: boolean;
}

const RETENTION_TIME = 15 * 60 * 1000; // 15 minutes
const MIN_VENUES_FOR_PATH = 2;
const STORAGE_KEY = 'breadcrumb_trail';

/**
 * Hook for tracking and managing breadcrumb trails
 * Automatically captures venue visits and provides retrace functionality
 */
export function useBreadcrumbTrail() {
  const [state, setState] = useState<BreadcrumbTrailState>({
    recentVenues: [],
    currentPath: null,
    isTracking: true
  });

  // Load persisted trail on mount
  useEffect(() => {
    const loadPersistedTrail = async () => {
      try {
        const stored = await storage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Filter out old venues
          const now = Date.now();
          const recentVenues = parsed.recentVenues.filter(
            (venue: BreadcrumbVenue) => now - venue.visitedAt < RETENTION_TIME
          );
          
          setState(prev => ({
            ...prev,
            recentVenues,
            currentPath: recentVenues.length >= MIN_VENUES_FOR_PATH 
              ? generatePath(recentVenues) 
              : null
          }));
        }
      } catch (error) {
        console.warn('Failed to load breadcrumb trail:', error);
      }
    };

    loadPersistedTrail();
  }, []);

  // Persist trail changes
  const persistTrail = useCallback(async (venues: BreadcrumbVenue[]) => {
    try {
      await storage.setItem(STORAGE_KEY, JSON.stringify({ recentVenues: venues }));
    } catch (error) {
      console.warn('Failed to persist breadcrumb trail:', error);
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
          persistTrail(filtered);
          return {
            ...prev,
            recentVenues: filtered,
            currentPath: filtered.length >= MIN_VENUES_FOR_PATH 
              ? generatePath(filtered) 
              : null
          };
        }
        return prev;
      });
    };

    const interval = setInterval(cleanup, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [persistTrail]);

  /**
   * Add a venue visit to the trail
   */
  const addVenueVisit = useCallback((venue: {
    id: string;
    name: string; 
    lat: number;
    lng: number;
  }) => {
    if (!state.isTracking) return;

    const now = Date.now();
    const newVenue: BreadcrumbVenue = {
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

      // Generate path if we have enough venues
      const currentPath = recentVenues.length >= MIN_VENUES_FOR_PATH 
        ? generatePath(recentVenues) 
        : null;

      // Persist changes
      persistTrail(recentVenues);

      return {
        ...prev,
        recentVenues,
        currentPath
      };
    });
  }, [state.isTracking, persistTrail]);

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
        
        persistTrail(updatedVenues);
        
        return {
          ...prev,
          recentVenues: updatedVenues,
          currentPath: updatedVenues.length >= MIN_VENUES_FOR_PATH 
            ? generatePath(updatedVenues) 
            : null
        };
      }
      
      return prev;
    });
  }, [persistTrail]);

  /**
   * Get venues for retrace functionality
   */
  const getRetraceVenues = useCallback(() => {
    if (!state.currentPath || state.currentPath.venues.length < MIN_VENUES_FOR_PATH) {
      return [];
    }

    // Return venues in reverse chronological order for retracing
    return [...state.currentPath.venues].reverse();
  }, [state.currentPath]);

  /**
   * Clear the trail
   */
  const clearTrail = useCallback(async () => {
    setState(prev => ({
      ...prev,
      recentVenues: [],
      currentPath: null
    }));
    
    try {
      await storage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear breadcrumb trail:', error);
    }
  }, []);

  /**
   * Toggle tracking
   */
  const setTracking = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, isTracking: enabled }));
  }, []);

  /**
   * Get path statistics
   */
  const getPathStats = useCallback(() => {
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
    addVenueVisit,
    markDeparture,
    clearTrail,
    setTracking,
    
    // Utilities
    getRetraceVenues,
    getPathStats,
    
    // Computed
    hasRecentPath: state.currentPath !== null,
    canRetrace: state.recentVenues.length >= MIN_VENUES_FOR_PATH
  };
}

/**
 * Generate a path object from venues
 */
function generatePath(venues: BreadcrumbVenue[]): BreadcrumbPath {
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
