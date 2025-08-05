import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ProximityAnalysis, VenueDetectionResult, ProximityEventRecord } from '@/types/location';

export interface EnhancedLocationState {
  isTracking: boolean;
  startSharing: () => void;
  stopSharing: () => void;
  accuracy: number;
  geofenceMatches: any[];
  privacyFiltered: boolean;
  privacyLevel: string;
  currentVenue: any;
  nearbyUsers: any[];
  lastUpdate: number | null;
  error: any;
  hasActiveGeofences: boolean;
  hasNearbyUsers: boolean;
  currentVenueConfidence: number;
  isLocationHidden: boolean;
  location?: any;
  proximityEvents?: any[];
}

interface LocationData {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export function useEnhancedLocationSharing() {
  const [proximityData, setProximityData] = useState<ProximityAnalysis[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [proximityEvents, setProximityEvents] = useState<ProximityEventRecord[]>([]);
  const [venueDetections, setVenueDetections] = useState<VenueDetectionResult[]>([]);

  const analyzeProximity = (data: ProximityAnalysis[]): ProximityAnalysis[] => {
    return data.map(item => ({
      ...item,
      // Normalize user identifiers - remove userId references
      profile_id: item.profile_id || 'unknown'
    }));
  };

  const updateProximityData = async () => {
    try {
      // Mock data since proximity_analysis table doesn't exist
      const mockData: ProximityAnalysis[] = [];
      setProximityData(analyzeProximity(mockData));
    } catch (error) {
      console.error('Error in updateProximityData:', error);
    }
  };

  const updateLocation = (newLocation: LocationData) => {
    setLocation(newLocation);
  };

  const updateProximityEvents = async () => {
    try {
      // Mock data since proximity_events table schema doesn't match
      const mockData: ProximityEventRecord[] = [];
      setProximityEvents(mockData);
    } catch (error) {
      console.error('Error in updateProximityEvents:', error);
    }
  };

  const updateVenueDetections = async () => {
    try {
      // Mock data since venue_detections table doesn't exist
      const mockData: VenueDetectionResult[] = [];
      setVenueDetections(mockData);
    } catch (error) {
      console.error('Error in updateVenueDetections:', error);
    }
  };

  useEffect(() => {
    updateProximityData();
    updateProximityEvents();
    updateVenueDetections();
  }, []);

  return {
    proximityData,
    isSharing,
    setIsSharing,
    updateProximityData,
    location,
    proximityEvents,
    venueDetections,
    updateLocation,
    updateProximityEvents,
    updateVenueDetections,
    // Additional compatibility properties
    isTracking: isSharing,
    startSharing: () => { setIsSharing(true); return Promise.resolve(); },
    stopSharing: () => { setIsSharing(false); return Promise.resolve(); },
    accuracy: location?.accuracy || 0,
    geofenceMatches: [],
    privacyFiltered: false,
    privacyLevel: 'public' as const,
    currentVenue: venueDetections[0] || null,
    nearbyUsers: proximityData,
    lastUpdate: location?.timestamp || null,
    error: null,
    hasActiveGeofences: false,
    hasNearbyUsers: proximityData.length > 0,
    currentVenueConfidence: venueDetections[0]?.confidence || 0,
    isLocationHidden: false,
    // Remove duplicate venueDetections key
  };
}