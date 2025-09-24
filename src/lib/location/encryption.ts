/**
 * Location data encryption utilities for secure coordinate transmission
 */

// Simple XOR cipher for coordinate obfuscation during transmission
// Note: This is for data obfuscation, not cryptographic security
const ENCRYPTION_KEY = 'floq_coord_key_2024';

/**
 * Encrypt coordinate data for secure transmission
 */
export function encryptCoordinates(lat: number, lng: number, accuracy: number): string {
  const data = JSON.stringify({ lat, lng, accuracy, ts: Date.now() });
  return btoa(xorEncrypt(data, ENCRYPTION_KEY));
}

/**
 * Decrypt coordinate data from encrypted string
 */
export function decryptCoordinates(encrypted: string): { lat: number; lng: number; accuracy: number; ts: number } | null {
  try {
    const decoded = atob(encrypted);
    const decrypted = xorDecrypt(decoded, ENCRYPTION_KEY);
    const data = JSON.parse(decrypted);
    
    // Validate structure
    if (typeof data.lat === 'number' && typeof data.lng === 'number' && typeof data.accuracy === 'number') {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * XOR encryption/decryption utility
 */
function xorEncrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

function xorDecrypt(text: string, key: string): string {
  return xorEncrypt(text, key); // XOR is symmetric
}

/**
 * Hash coordinates for privacy-preserving location matching
 * Useful for detecting proximity without exposing exact coordinates
 */
export function hashCoordinateRegion(lat: number, lng: number, precision = 0.001): string {
  // Round to precision level (default ~100m)
  const roundedLat = Math.round(lat / precision) * precision;
  const roundedLng = Math.round(lng / precision) * precision;
  
  // Simple hash function
  const input = `${roundedLat.toFixed(6)},${roundedLng.toFixed(6)}`;
  return btoa(input).replace(/[+/=]/g, '').slice(0, 12);
}

/**
 * Generate secure location token for time-limited access
 */
export function generateLocationToken(lat: number, lng: number, validForMinutes = 10): string {
  const expiry = Date.now() + (validForMinutes * 60 * 1000);
  const payload = { lat, lng, exp: expiry };
  return btoa(JSON.stringify(payload));
}

/**
 * Validate and extract coordinates from location token
 */
export function validateLocationToken(token: string): { lat: number; lng: number } | null {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp && Date.now() < payload.exp) {
      return { lat: payload.lat, lng: payload.lng };
    }
    return null;
  } catch {
    return null;
  }
}