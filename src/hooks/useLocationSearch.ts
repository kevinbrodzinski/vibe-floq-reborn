import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface CityLocation {
  id: string;
  name: string; // "San Francisco, CA"
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
}

// Mock city data - in production this would come from a geocoding service
const MOCK_CITIES: CityLocation[] = [
  { id: '1', name: 'San Francisco, CA', city: 'San Francisco', state: 'CA', country: 'US', lat: 37.7749, lng: -122.4194 },
  { id: '2', name: 'New York, NY', city: 'New York', state: 'NY', country: 'US', lat: 40.7128, lng: -74.0060 },
  { id: '3', name: 'Los Angeles, CA', city: 'Los Angeles', state: 'CA', country: 'US', lat: 34.0522, lng: -118.2437 },
  { id: '4', name: 'Chicago, IL', city: 'Chicago', state: 'IL', country: 'US', lat: 41.8781, lng: -87.6298 },
  { id: '5', name: 'Austin, TX', city: 'Austin', state: 'TX', country: 'US', lat: 30.2672, lng: -97.7431 },
  { id: '6', name: 'Seattle, WA', city: 'Seattle', state: 'WA', country: 'US', lat: 47.6062, lng: -122.3321 },
  { id: '7', name: 'Miami, FL', city: 'Miami', state: 'FL', country: 'US', lat: 25.7617, lng: -80.1918 },
  { id: '8', name: 'Denver, CO', city: 'Denver', state: 'CO', country: 'US', lat: 39.7392, lng: -104.9903 },
  { id: '9', name: 'Boston, MA', city: 'Boston', state: 'MA', country: 'US', lat: 42.3601, lng: -71.0589 },
  { id: '10', name: 'Portland, OR', city: 'Portland', state: 'OR', country: 'US', lat: 45.5152, lng: -122.6784 },
  { id: '11', name: 'Nashville, TN', city: 'Nashville', state: 'TN', country: 'US', lat: 36.1627, lng: -86.7816 },
  { id: '12', name: 'Atlanta, GA', city: 'Atlanta', state: 'GA', country: 'US', lat: 33.7490, lng: -84.3880 },
  { id: '13', name: 'Phoenix, AZ', city: 'Phoenix', state: 'AZ', country: 'US', lat: 33.4484, lng: -112.0740 },
  { id: '14', name: 'Philadelphia, PA', city: 'Philadelphia', state: 'PA', country: 'US', lat: 39.9526, lng: -75.1652 },
  { id: '15', name: 'San Diego, CA', city: 'San Diego', state: 'CA', country: 'US', lat: 32.7157, lng: -117.1611 },
];

/**
 * Hook to reverse geocode coordinates to city/state
 */
export const useReverseGeocode = (lat?: number, lng?: number) => {
  return useQuery({
    queryKey: ['reverse-geocode', lat, lng],
    queryFn: async (): Promise<CityLocation | null> => {
      if (!lat || !lng) return null;
      
      // Mock implementation - find closest city
      // In production, use a real geocoding service like Google Maps or Mapbox
      let closestCity = MOCK_CITIES[0];
      let minDistance = Infinity;
      
      for (const city of MOCK_CITIES) {
        const distance = Math.sqrt(
          Math.pow(city.lat - lat, 2) + Math.pow(city.lng - lng, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestCity = city;
        }
      }
      
      return closestCity;
    },
    enabled: !!lat && !!lng,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to search cities by name
 */
export const useCitySearch = (query: string) => {
  const [searchResults, setSearchResults] = useState<CityLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedQuery = useMemo(() => {
    // Simple debouncing logic
    const timer = setTimeout(() => query, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    // Mock search implementation
    // In production, this would call a geocoding API
    const searchTerm = query.toLowerCase();
    const results = MOCK_CITIES.filter(city => 
      city.name.toLowerCase().includes(searchTerm) ||
      city.city.toLowerCase().includes(searchTerm) ||
      city.state.toLowerCase().includes(searchTerm)
    ).slice(0, 10); // Limit to 10 results

    // Simulate API delay
    setTimeout(() => {
      setSearchResults(results);
      setIsSearching(false);
    }, 200);

  }, [query]);

  return {
    results: searchResults,
    isSearching,
  };
};

/**
 * Get popular cities for quick selection
 */
export const getPopularCities = (): CityLocation[] => {
  return MOCK_CITIES.slice(0, 6); // Top 6 cities
};