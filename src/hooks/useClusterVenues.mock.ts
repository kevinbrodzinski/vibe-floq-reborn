import { useState, useEffect } from 'react';
import { ClusterVenue } from './useClusterVenues';

// Mock venue data for different cities
const mockVenuesByCity = {
  sf: [
    {
      id: '1',
      name: 'Blue Bottle Coffee',
      category: 'cafe',
      lat: 37.7749,
      lng: -122.4194,
      vibe_score: 85,
      live_count: 3,
      popularity: 75
    },
    {
      id: '2',
      name: 'The Fillmore',
      category: 'music venue', 
      lat: 37.7849,
      lng: -122.4294,
      vibe_score: 92,
      live_count: 0,
      popularity: 88
    },
    {
      id: '3',
      name: 'Mission Dolores Park',
      category: 'park',
      lat: 37.7599,
      lng: -122.4269,
      vibe_score: 78,
      live_count: 12,
      popularity: 95
    },
    {
      id: '4',
      name: 'Tartine Bakery',
      category: 'bakery',
      lat: 37.7609,
      lng: -122.4204,
      vibe_score: 89,
      live_count: 7,
      popularity: 82
    }
  ],
  nyc: [
    {
      id: '5',
      name: 'Central Park',
      category: 'park',
      lat: 40.7829,
      lng: -73.9654,
      vibe_score: 91,
      live_count: 25,
      popularity: 98
    },
    {
      id: '6', 
      name: 'Brooklyn Bridge',
      category: 'landmark',
      lat: 40.7061,
      lng: -73.9969,
      vibe_score: 87,
      live_count: 15,
      popularity: 94
    },
    {
      id: '7',
      name: 'Joe Coffee',
      category: 'cafe',
      lat: 40.7328,
      lng: -74.0059,
      vibe_score: 83,
      live_count: 4,
      popularity: 76
    },
    {
      id: '8',
      name: 'Madison Square Garden',
      category: 'venue',
      lat: 40.7505,
      lng: -73.9934,
      vibe_score: 95,
      live_count: 0,
      popularity: 99
    }
  ],
  la: [
    {
      id: '9',
      name: 'Venice Beach',
      category: 'beach',
      lat: 34.0195,
      lng: -118.4912,
      vibe_score: 88,
      live_count: 18,
      popularity: 92
    },
    {
      id: '10',
      name: 'Hollywood Sign',
      category: 'landmark', 
      lat: 34.1341,
      lng: -118.3215,
      vibe_score: 85,
      live_count: 8,
      popularity: 89
    },
    {
      id: '11',
      name: 'Santa Monica Pier',
      category: 'attraction',
      lat: 34.0089,
      lng: -118.4973,
      vibe_score: 90,
      live_count: 22,
      popularity: 96
    },
    {
      id: '12',
      name: 'Griffith Observatory',
      category: 'museum',
      lat: 34.1184,
      lng: -118.3004,
      vibe_score: 86,
      live_count: 6,
      popularity: 84
    }
  ]
};

function getCityFromBounds(bounds: [number, number, number, number] | null): string {
  if (!bounds) return 'sf';
  
  const [west, south, east, north] = bounds;
  const centerLat = (south + north) / 2;
  const centerLng = (west + east) / 2;
  
  // Rough city detection based on coordinates
  if (centerLat > 40 && centerLat < 41 && centerLng > -75 && centerLng < -73) {
    return 'nyc';
  } else if (centerLat > 33 && centerLat < 35 && centerLng > -119 && centerLng < -117) {
    return 'la';
  } else {
    return 'sf';
  }
}

export function useClusterVenuesMock(
  bounds: [number, number, number, number] | null
): {
  data: ClusterVenue[];
  isLoading: boolean;
  error: any;
  refetch: () => void;
} {
  const [data, setData] = useState<ClusterVenue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!bounds) {
      setData([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Simulate API delay
    const timeout = setTimeout(() => {
      try {
        const city = getCityFromBounds(bounds);
        const cityVenues = mockVenuesByCity[city as keyof typeof mockVenuesByCity] || mockVenuesByCity.sf;
        
        // Filter venues within bounds
        const filteredVenues = cityVenues.filter(venue => {
          const [west, south, east, north] = bounds;
          return venue.lat >= south && venue.lat <= north && 
                 venue.lng >= west && venue.lng <= east;
        });

        setData(filteredVenues);
        setIsLoading(false);
      } catch (err) {
        setError(err);
        setIsLoading(false);
      }
    }, 800); // Simulate network delay

    return () => clearTimeout(timeout);
  }, [bounds]);

  const refetch = () => {
    if (bounds) {
      setIsLoading(true);
      setTimeout(() => {
        const city = getCityFromBounds(bounds);
        const cityVenues = mockVenuesByCity[city as keyof typeof mockVenuesByCity] || mockVenuesByCity.sf;
        setData(cityVenues);
        setIsLoading(false);
      }, 500);
    }
  };

  return {
    data,
    isLoading,
    error,
    refetch
  };
}