import { useMemo } from 'react';
import { useVibe } from '@/lib/store/useVibe';
import { calculateVibeMatch, getUserVibeDistribution, getEventVibeDistribution } from '@/utils/vibeMatch';
import { useNearbyVenues } from '@/hooks/useNearbyVenues';
import { useActiveFloqs } from '@/hooks/useActiveFloqs';

interface VibeMatchData {
  crowdData: Array<{ vibe: string }>;
  eventTags: string[];
  dominantVibe?: string;
}

export const useVibeMatch = (eventId?: string, venueId?: string) => {
  const { vibe: currentVibe } = useVibe();
  
  // Get nearby venues for crowd data
  const { data: nearbyVenues = [] } = useNearbyVenues(0, 0, 0.5); // Default location, will be updated
  
  // Get active floqs for event data
  const { data: activeFloqs = [] } = useActiveFloqs();
  
  // Find specific event/venue data
  const targetEvent = useMemo(() => {
    if (eventId) {
      const flatFloqs = Array.isArray(activeFloqs) ? activeFloqs : 'pages' in activeFloqs ? activeFloqs.pages.flat() : [];
      return flatFloqs.find(floq => floq.id === eventId);
    }
    return null;
  }, [eventId, activeFloqs]);
  
  const targetVenue = useMemo(() => {
    if (venueId) {
      return nearbyVenues.find(venue => venue.id === venueId);
    }
    return null;
  }, [venueId, nearbyVenues]);
  
  // Generate crowd data from nearby venues
  const crowdData = useMemo(() => {
    const data: Array<{ vibe: string }> = [];
    
    // Add nearby venue vibes (placeholder until schema ready)
    nearbyVenues.slice(0, 5).forEach(venue => {
      // TODO: Add primary_vibe to venue schema
      const venuePrimaryVibe = 'social'; // placeholder
      data.push({ vibe: venuePrimaryVibe });
    });
    
    // Add active floq vibes
    const flatFloqs = Array.isArray(activeFloqs) ? activeFloqs : 'pages' in activeFloqs ? activeFloqs.pages.flat() : [];
    flatFloqs.slice(0, 3).forEach(floq => {
      if (floq.primary_vibe) {
        data.push({ vibe: floq.primary_vibe });
      }
    });
    
    return data;
  }, [nearbyVenues, activeFloqs]);
  
  // Generate event tags from context
  const eventTags = useMemo(() => {
    const tags: string[] = [];
    
    if (targetEvent) {
      // Add event-specific tags
      if (targetEvent.title.toLowerCase().includes('party')) tags.push('party');
      if (targetEvent.title.toLowerCase().includes('meetup')) tags.push('meetup');
      if (targetEvent.title.toLowerCase().includes('coffee')) tags.push('coffee');
      if (targetEvent.title.toLowerCase().includes('date')) tags.push('date');
    }
    
    if (targetVenue) {
      // TODO: Add venue_type and atmosphere to venue schema when ready
      // if (targetVenue.venue_type) tags.push(targetVenue.venue_type);
      // if (targetVenue.atmosphere) tags.push(targetVenue.atmosphere);
    }
    
    return tags;
  }, [targetEvent, targetVenue]);
  
  // Get dominant vibe
  const dominantVibe = useMemo(() => {
    if (targetEvent?.primary_vibe) return targetEvent.primary_vibe;
    // TODO: Add primary_vibe to venue schema when ready
    // if (targetVenue?.primary_vibe) return targetVenue.primary_vibe;
    return undefined;
  }, [targetEvent, targetVenue]);
  
  // Calculate vibe match
  const vibeMatch = useMemo(() => {
    if (!currentVibe) return null;
    
    const userVibeCounts = getUserVibeDistribution(currentVibe, []);
    const eventVibeCounts = getEventVibeDistribution(
      crowdData,
      eventTags,
      dominantVibe
    );
    
    return calculateVibeMatch(userVibeCounts, eventVibeCounts, {});
  }, [currentVibe, crowdData, eventTags, dominantVibe]);
  
  return {
    vibeMatch,
    crowdData,
    eventTags,
    dominantVibe,
    targetEvent,
    targetVenue
  };
};

export const useVibeMatchForEvent = (eventId: string) => {
  return useVibeMatch(eventId);
};

export const useVibeMatchForVenue = (venueId: string) => {
  return useVibeMatch(undefined, venueId);
}; 