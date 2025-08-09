import haversine from 'haversine-distance';

export function applyPrivacyFilter(
  lat: number, 
  lng: number, 
  accuracy: number, 
  settings: { live_accuracy?: string }
): { lat: number; lng: number; accuracy: number } {
  const privacyLevel = settings.live_accuracy || 'exact';
  
  // Apply coordinate snapping based on privacy level
  const filtered = snapToGrid(lat, lng, privacyLevel as 'exact' | 'street' | 'area');
  
  // Ensure accuracy reflects the privacy level
  const finalAccuracy = Math.max(accuracy, filtered.accuracy);
  
  console.log(`[Privacy] Applied ${privacyLevel} filtering: ${lat.toFixed(6)},${lng.toFixed(6)} -> ${filtered.lat.toFixed(6)},${filtered.lng.toFixed(6)} (±${finalAccuracy}m)`);
  
  return {
    lat: filtered.lat,
    lng: filtered.lng,
    accuracy: finalAccuracy
  };
}

export function snapToGrid(
  lat: number, 
  lng: number, 
  privacyLevel: 'exact' | 'street' | 'area'
): { lat: number; lng: number; accuracy: number } {
  switch (privacyLevel) {
    case 'exact':
      // No filtering, return original coordinates with minimal accuracy buffer
      return { lat, lng, accuracy: 10 };
      
    case 'street':
      // Snap to ~50m grid (good for street-level privacy)
      // At equator: 1 degree ≈ 111km, so 0.0005° ≈ 55m
      const streetPrecision = 0.0005; // ~50m grid
      const streetLat = Math.round(lat / streetPrecision) * streetPrecision;
      const streetLng = Math.round(lng / streetPrecision) * streetPrecision;
      return { lat: streetLat, lng: streetLng, accuracy: 75 };
      
    case 'area':
      // Snap to ~500m grid (good for area-level privacy)
      // 0.005° ≈ 555m at equator
      const areaPrecision = 0.005; // ~500m grid
      const areaLat = Math.round(lat / areaPrecision) * areaPrecision;
      const areaLng = Math.round(lng / areaPrecision) * areaPrecision;
      return { lat: areaLat, lng: areaLng, accuracy: 750 };
      
    default:
      return { lat, lng, accuracy: 10 };
  }
}

export function applyPrivacySettings(
  lat: number,
  lng: number,
  privacyLevel: 'hide' | 'street' | 'area'
): { lat: number; lng: number } {
  switch (privacyLevel) {
    case 'hide':
      // Return coordinates that indicate hidden location
      return { lat: 0, lng: 0 };
      
    case 'street':
      // Apply deterministic street-level obfuscation (not random)
      // Use grid snapping instead of random fuzzing for consistency
      const streetResult = snapToGrid(lat, lng, 'street');
      return { lat: streetResult.lat, lng: streetResult.lng };
      
    case 'area':
      // Apply deterministic area-level obfuscation
      const areaResult = snapToGrid(lat, lng, 'area');
      return { lat: areaResult.lat, lng: areaResult.lng };
      
    default:
      return { lat, lng };
  }
}

interface GeofencingService {
  addGeofence: (id: string, lat: number, lng: number, radius: number) => void;
  removeGeofence: (id: string) => void;
  checkLocation: (lat: number, lng: number) => boolean;
}

class BasicGeofencingService implements GeofencingService {
  private geofences = new Map<string, { lat: number; lng: number; radius: number }>();

  addGeofence(id: string, lat: number, lng: number, radius: number) {
    this.geofences.set(id, { lat, lng, radius });
  }

  removeGeofence(id: string) {
    this.geofences.delete(id);
  }

  checkLocation(lat: number, lng: number): boolean {
    for (const [_, fence] of this.geofences) {
      const distance = haversine(
        { lat, lng },
        { lat: fence.lat, lng: fence.lng }
      );
      if (distance <= fence.radius) {
        return true;
      }
    }
    return false;
  }
}

export function createGeofencingService(): GeofencingService {
  return new BasicGeofencingService();
}

export function smartLocationPrivacy(
  lat: number, 
  lng: number, 
  privacyLevel: 'hide' | 'street' | 'area',
  geofenceService: GeofencingService
): { lat: number; lng: number } {
  // Check if location is within any geofence
  if (geofenceService.checkLocation(lat, lng)) {
    // Apply maximum privacy in geofenced areas
    return applyPrivacySettings(lat, lng, 'area');
  }
  
  return applyPrivacySettings(lat, lng, privacyLevel);
}
