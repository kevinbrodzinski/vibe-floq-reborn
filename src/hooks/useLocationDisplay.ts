import { useReverseGeocode } from './useReverseGeocode';

interface LocationDisplayResult {
  displayText: string;
  isLoading: boolean;
  isReady: boolean;
}

export const useLocationDisplay = (lat?: number, lng?: number, hasLocationPermission?: boolean, locationError?: string) => {
  const { address, loading: geocodeLoading } = useReverseGeocode(lat, lng);
  
  const isLocationAvailable = !!(lat && lng);
  const isGeocodeReady = !geocodeLoading && !!address;
  
  let displayText = "Locating...";
  let isLoading = true;
  let isReady = false;

  if (locationError) {
    displayText = "Location unavailable";
    isLoading = false;
    isReady = false;
  } else if (hasLocationPermission === false) {
    displayText = "Location disabled";
    isLoading = false;
    isReady = false;
  } else if (!isLocationAvailable) {
    displayText = "Locating...";
    isLoading = true;
    isReady = false;
  } else if (geocodeLoading) {
    displayText = "Getting address...";
    isLoading = true;
    isReady = true; // We have coordinates, getting address
  } else if (address) {
    displayText = address;
    isLoading = false;
    isReady = true;
  } else {
    // Fallback to coordinates if geocoding fails
    displayText = `${lat?.toFixed(4)}, ${lng?.toFixed(4)}`;
    isLoading = false;
    isReady = true;
  }

  return {
    displayText,
    isLoading,
    isReady,
  };
};