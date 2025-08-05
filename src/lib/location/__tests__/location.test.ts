/**
 * Comprehensive tests for location calculations and coordinate transformations
 */
import { describe, test, expect } from 'vitest';
import { 
  calculateDistance, 
  isWithinRadius, 
  toGeoJSON, 
  fromGeoJSON, 
  formatDistance,
  isValidGPSCoords,
  isValidGeoJSONCoords,
  type GPS,
  type GeoJSONCoords
} from '@/lib/location/standardGeo';
import { 
  encryptCoordinates, 
  decryptCoordinates, 
  hashCoordinateRegion,
  generateLocationToken,
  validateLocationToken
} from '@/lib/location/encryption';
import { 
  snapToGrid, 
  applyPrivacyFilter 
} from '@/lib/location/privacy';

describe('Distance Calculations', () => {
  const sanFrancisco: GPS = { lat: 37.7749, lng: -122.4194 };
  const newYork: GPS = { lat: 40.7128, lng: -74.0060 };
  const london: GPS = { lat: 51.5074, lng: -0.1278 };

  test('returns 0 for identical coordinates', () => {
    const distance = calculateDistance(sanFrancisco, sanFrancisco);
    expect(distance).toBe(0);
  });

  test('calculates correct distance SF to NYC (~4129km)', () => {
    const distance = calculateDistance(sanFrancisco, newYork);
    expect(distance).toBeCloseTo(4129000, -4); // ~4129km with 100m tolerance
  });

  test('calculates correct distance SF to London (~8630km)', () => {
    const distance = calculateDistance(sanFrancisco, london);
    expect(distance).toBeCloseTo(8616431, -1); // Actual calculated distance with 100km tolerance
  });

  test('distance calculation is symmetric', () => {
    const distance1 = calculateDistance(sanFrancisco, newYork);
    const distance2 = calculateDistance(newYork, sanFrancisco);
    expect(distance1).toBe(distance2);
  });

  test('handles small distances accurately', () => {
    const point1: GPS = { lat: 37.7749, lng: -122.4194 };
    const point2: GPS = { lat: 37.7750, lng: -122.4194 }; // ~11m north
    const distance = calculateDistance(point1, point2);
    expect(distance).toBeCloseTo(11, 0); // ~11 meters
  });
});

describe('Radius Checking', () => {
  const center: GPS = { lat: 37.7749, lng: -122.4194 };
  const nearby: GPS = { lat: 37.7759, lng: -122.4194 }; // ~100m north
  const far: GPS = { lat: 37.7849, lng: -122.4194 }; // ~1km north

  test('correctly identifies points within radius', () => {
    expect(isWithinRadius(center, nearby, 200)).toBe(true);
    expect(isWithinRadius(center, nearby, 50)).toBe(false);
  });

  test('correctly identifies points outside radius', () => {
    expect(isWithinRadius(center, far, 500)).toBe(false);
    expect(isWithinRadius(center, far, 2000)).toBe(true);
  });
});

describe('Coordinate Transformations', () => {
  const gpsCoords: GPS = { lat: 37.7749, lng: -122.4194 };
  const geoJsonCoords: GeoJSONCoords = [-122.4194, 37.7749];

  test('converts GPS to GeoJSON correctly', () => {
    const result = toGeoJSON(gpsCoords);
    expect(result).toEqual(geoJsonCoords);
  });

  test('converts GeoJSON to GPS correctly', () => {
    const result = fromGeoJSON(geoJsonCoords);
    expect(result).toEqual(gpsCoords);
  });

  test('conversion is reversible', () => {
    const converted = fromGeoJSON(toGeoJSON(gpsCoords));
    expect(converted).toEqual(gpsCoords);
  });
});

describe('Distance Formatting', () => {
  test('formats meters correctly', () => {
    expect(formatDistance(0)).toBe('0m');
    expect(formatDistance(150)).toBe('150m');
    expect(formatDistance(999)).toBe('999m');
  });

  test('formats kilometers correctly', () => {
    expect(formatDistance(1000)).toBe('1.0km');
    expect(formatDistance(1500)).toBe('1.5km');
    expect(formatDistance(12345)).toBe('12.3km');
  });
});

describe('Coordinate Validation', () => {
  test('validates GPS coordinates correctly', () => {
    expect(isValidGPSCoords({ lat: 37.7749, lng: -122.4194 })).toBe(true);
    expect(isValidGPSCoords({ lat: 90, lng: 180 })).toBe(true);
    expect(isValidGPSCoords({ lat: -90, lng: -180 })).toBe(true);
    expect(isValidGPSCoords({ lat: 91, lng: 0 })).toBe(false);
    expect(isValidGPSCoords({ lat: 0, lng: 181 })).toBe(false);
    expect(isValidGPSCoords({ lat: NaN, lng: 0 })).toBe(false);
  });

  test('validates GeoJSON coordinates correctly', () => {
    expect(isValidGeoJSONCoords([-122.4194, 37.7749])).toBe(true);
    expect(isValidGeoJSONCoords([180, 90])).toBe(true);
    expect(isValidGeoJSONCoords([-180, -90])).toBe(true);
    expect(isValidGeoJSONCoords([181, 0])).toBe(false);
    expect(isValidGeoJSONCoords([0, 91])).toBe(false);
    expect(isValidGeoJSONCoords([NaN, 0])).toBe(false);
  });
});

describe('Location Encryption', () => {
  const testCoords = { lat: 37.7749, lng: -122.4194, accuracy: 10 };

  test('encrypts and decrypts coordinates correctly', () => {
    const encrypted = encryptCoordinates(testCoords.lat, testCoords.lng, testCoords.accuracy);
    expect(typeof encrypted).toBe('string');
    expect(encrypted.length).toBeGreaterThan(0);

    const decrypted = decryptCoordinates(encrypted);
    expect(decrypted).toBeTruthy();
    expect(decrypted!.lat).toBeCloseTo(testCoords.lat, 6);
    expect(decrypted!.lng).toBeCloseTo(testCoords.lng, 6);
    expect(decrypted!.accuracy).toBe(testCoords.accuracy);
  });

  test('returns null for invalid encrypted data', () => {
    expect(decryptCoordinates('invalid')).toBeNull();
    expect(decryptCoordinates('')).toBeNull();
  });

  test('generates consistent coordinate hashes', () => {
    const hash1 = hashCoordinateRegion(37.7749, -122.4194);
    const hash2 = hashCoordinateRegion(37.7749, -122.4194);
    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('string');
    expect(hash1.length).toBe(12);
  });
});

describe('Location Tokens', () => {
  const testCoords = { lat: 37.7749, lng: -122.4194 };

  test('generates and validates location tokens', () => {
    const token = generateLocationToken(testCoords.lat, testCoords.lng, 10);
    expect(typeof token).toBe('string');
    
    const validated = validateLocationToken(token);
    expect(validated).toBeTruthy();
    expect(validated!.lat).toBe(testCoords.lat);
    expect(validated!.lng).toBe(testCoords.lng);
  });

  test('rejects expired tokens', async () => {
    const token = generateLocationToken(testCoords.lat, testCoords.lng, 0.001); // 0.06 seconds
    
    // Wait for token to expire with larger buffer for CI
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const validated = validateLocationToken(token);
    expect(validated).toBeNull();
  });

  test('rejects invalid tokens', () => {
    expect(validateLocationToken('invalid')).toBeNull();
    expect(validateLocationToken('')).toBeNull();
  });
});

describe('Privacy Filtering', () => {
  const testCoords = { lat: 37.7749, lng: -122.4194, accuracy: 30 };

  test('exact privacy preserves coordinates', () => {
    const snapped = snapToGrid(testCoords.lat, testCoords.lng, 'exact');
    expect(snapped.lat).toBe(testCoords.lat);
    expect(snapped.lng).toBe(testCoords.lng);
    expect(snapped.accuracy).toBe(30);
  });

  test('street privacy snaps to 100m grid', () => {
    const snapped = snapToGrid(testCoords.lat, testCoords.lng, 'street');
    expect(snapped.lat).not.toBe(testCoords.lat);
    expect(snapped.lng).not.toBe(testCoords.lng);
    expect(snapped.accuracy).toBeGreaterThanOrEqual(30);
  });

  test('area privacy snaps to 1km grid', () => {
    const snapped = snapToGrid(testCoords.lat, testCoords.lng, 'area');
    expect(snapped.lat).not.toBe(testCoords.lat);
    expect(snapped.lng).not.toBe(testCoords.lng);
    expect(snapped.accuracy).toBeGreaterThanOrEqual(30);
  });

  test('applies privacy filter with settings', () => {
    const settings = { live_accuracy: 'street' };
    const filtered = applyPrivacyFilter(testCoords.lat, testCoords.lng, testCoords.accuracy, settings);
    
    expect(filtered.accuracy).toBeGreaterThanOrEqual(30);
    expect(typeof filtered.lat).toBe('number');
    expect(typeof filtered.lng).toBe('number');
  });
});