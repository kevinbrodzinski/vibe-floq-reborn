import haversine from 'haversine-distance';

export function applyPrivacyFilter(
  lat: number, 
  lng: number, 
  accuracy: number, 
  settings: { live_accuracy?: string }
): { lat: number; lng: number; accuracy: number } {
  // TODO(real-impl): Implement proper privacy filtering
  const privacyLevel = settings.live_accuracy || 'exact';
  const snapped = snapToGrid(lat, lng, privacyLevel as 'exact' | 'street' | 'area');
  return {
    lat: snapped.lat,
    lng: snapped.lng,
    accuracy: snapped.accuracy
  };
}

export function snapToGrid(
  lat: number, 
  lng: number, 
  privacyLevel: 'exact' | 'street' | 'area'
): { lat: number; lng: number; accuracy: number } {
  // TODO(real-impl): Implement proper grid snapping
  switch (privacyLevel) {
    case 'exact':
      return { lat, lng, accuracy: 30 };
    case 'street':
      // Snap to 100m grid
      const streetLat = Math.round(lat * 1000) / 1000; // ~100m precision
      const streetLng = Math.round(lng * 1000) / 1000;
      return { lat: streetLat, lng: streetLng, accuracy: 100 };
    case 'area':
      // Snap to 1km grid
      const areaLat = Math.round(lat * 100) / 100; // ~1km precision
      const areaLng = Math.round(lng * 100) / 100;
      return { lat: areaLat, lng: areaLng, accuracy: 1000 };
    default:
      return { lat, lng, accuracy: 30 };
  }
}

export function applyPrivacySettings(
  lat: number,
  lng: number,
  privacyLevel: 'hide' | 'street' | 'area'
): { lat: number; lng: number } {
  switch (privacyLevel) {
    case 'hide':
      return { lat: 0, lng: 0 }; // or null, depending on your needs
    case 'street':
      // Simple street-level fuzzing (adjust as needed)
      const latFuzz = (Math.random() - 0.5) * 0.001;
      const lngFuzz = (Math.random() - 0.5) * 0.001;
      return { lat: lat + latFuzz, lng: lng + lngFuzz };
    case 'area':
      // Area-level fuzzing (adjust as needed)
      const latAreaFuzz = (Math.random() - 0.5) * 0.01;
      const lngAreaFuzz = (Math.random() - 0.5) * 0.01;
      return { lat: lat + latAreaFuzz, lng: lng + lngAreaFuzz };
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
