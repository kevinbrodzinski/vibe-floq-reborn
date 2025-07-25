export const metersToPixelsAtLat = (lat: number, zoom: number) =>
  (Math.cos((lat * Math.PI) / 180) * 2 ** zoom) / 156_543.03392;  // Mapbox formula

/**
 * Reverse geocoding to get address from coordinates
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */
export const getAddressFromCoordinates = async (
  lat: number,
  lng: number
): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'FloqApp/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.display_name) {
      // Extract the most relevant part of the address
      const parts = data.display_name.split(', ');
      if (parts.length >= 3) {
        // Return street + city + state
        return parts.slice(0, 3).join(', ');
      }
      return data.display_name;
    }
    
    return null;
  } catch (error) {
    console.warn('Reverse geocoding failed:', error);
    return null;
  }
};

/**
 * Cache for geocoding results to avoid repeated API calls
 */
const geocodingCache = new Map<string, string | null>();

export const getCachedAddress = async (
  lat: number,
  lng: number
): Promise<string | null> => {
  const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  
  if (geocodingCache.has(key)) {
    return geocodingCache.get(key);
  }
  
  const address = await getAddressFromCoordinates(lat, lng);
  geocodingCache.set(key, address);
  
  return address;
};