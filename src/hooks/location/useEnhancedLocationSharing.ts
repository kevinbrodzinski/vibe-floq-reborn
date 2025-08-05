
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ProximityAnalysis, ProximityEventRecord, VenueDetectionResult } from '@/types/location';

interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
}

export function useEnhancedLocationSharing() {
  const [proximityData, setProximityData] = useState<ProximityAnalysis[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [proximityEvents, setProximityEvents] = useState<ProximityEventRecord[]>([]);
  const [venueDetections, setVenueDetections] = useState<VenueDetectionResult[]>([]);

  const analyzeProximity = useCallback((data: ProximityAnalysis[]) => {
    return data.map(analysis => ({
      ...analysis,
      // Handle both profile_id and legacy userId fields
      profileId: analysis.profile_id || analysis.userId || '',
      userId: analysis.userId || analysis.profile_id || '',
    }));
  }, []);

  const updateProximityData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('proximity_analysis')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const analyzedData = analyzeProximity(data || []);
      setProximityData(analyzedData);
    } catch (error) {
      console.error('Error updating proximity data:', error);
    }
  }, [analyzeProximity]);

  const updateLocation = useCallback((newLocation: LocationData) => {
    setLocation(newLocation);
  }, []);

  const updateProximityEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('proximity_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setProximityEvents(data || []);
    } catch (error) {
      console.error('Error updating proximity events:', error);
    }
  }, []);

  const updateVenueDetections = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('venue_detections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setVenueDetections(data || []);
    } catch (error) {
      console.error('Error updating venue detections:', error);
    }
  }, []);

  useEffect(() => {
    updateProximityData();
    updateProximityEvents();
    updateVenueDetections();
  }, [updateProximityData, updateProximityEvents, updateVenueDetections]);

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
  };
}
