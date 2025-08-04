/**
 * Multi-Signal Venue Verification System
 * Combines GPS, WiFi, Bluetooth, and building footprint data for accurate venue detection
 */

import { GPSCoords, calculateDistance } from './standardGeo';

export interface WiFiNetwork {
  ssid: string;
  bssid: string;
  signalStrength: number; // dBm
  frequency: number; // MHz
  capabilities: string[];
}

export interface BluetoothBeacon {
  uuid: string;
  major?: number;
  minor?: number;
  rssi: number; // dBm
  distance?: number; // estimated distance in meters
  txPower?: number;
}

export interface BuildingFootprint {
  id: string;
  venueId: string;
  geometry: GPSCoords[]; // polygon vertices
  height?: number; // building height in meters
  floors?: number;
  buildingType: string;
}

export interface VenueSignature {
  venueId: string;
  name: string;
  location: GPSCoords;
  // GPS-based boundary
  radiusMeters: number;
  // WiFi signatures
  knownWiFiNetworks: WiFiNetwork[];
  // Bluetooth beacons
  bluetoothBeacons: BluetoothBeacon[];
  // Building footprints
  buildingFootprints: BuildingFootprint[];
  // Confidence factors
  gpsWeight: number;
  wifiWeight: number;
  bluetoothWeight: number;
  buildingWeight: number;
}

export interface VenueDetectionResult {
  venueId: string;
  name?: string;
  confidence: number; // 0-1
  signals: {
    gps: { detected: boolean; distance: number; confidence: number };
    wifi: { detected: boolean; matchedNetworks: number; confidence: number };
    bluetooth: { detected: boolean; matchedBeacons: number; confidence: number };
    building: { detected: boolean; insideBuilding: boolean; confidence: number };
  };
  overallConfidence: number;
  recommendedAction: 'check_in' | 'prompt_user' | 'ignore';
}

/**
 * Multi-signal venue detection service
 */
export class MultiSignalVenueDetector {
  private venueSignatures: Map<string, VenueSignature> = new Map();
  private readonly GPS_CONFIDENCE_THRESHOLD = 50; // meters
  private readonly WIFI_RSSI_THRESHOLD = -70; // dBm
  private readonly BLUETOOTH_RSSI_THRESHOLD = -60; // dBm
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.8;
  private readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.6;

  /**
   * Add or update a venue signature
   */
  addVenueSignature(signature: VenueSignature): void {
    this.venueSignatures.set(signature.venueId, signature);
  }

  /**
   * Remove a venue signature
   */
  removeVenueSignature(venueId: string): void {
    this.venueSignatures.delete(venueId);
  }

  /**
   * Detect venues using multi-signal approach
   */
  async detectVenues(
    location: GPSCoords,
    accuracy: number,
    wifiNetworks?: WiFiNetwork[],
    bluetoothBeacons?: BluetoothBeacon[]
  ): Promise<VenueDetectionResult[]> {
    const results: VenueDetectionResult[] = [];

    for (const [venueId, signature] of this.venueSignatures) {
      const result = await this.analyzeVenueSignals(
        signature,
        location,
        accuracy,
        wifiNetworks,
        bluetoothBeacons
      );

      if (result.overallConfidence > 0.1) { // Only include venues with some confidence
        results.push(result);
      }
    }

    // Sort by confidence (highest first)
    return results.sort((a, b) => b.overallConfidence - a.overallConfidence);
  }

  /**
   * Analyze all signals for a specific venue
   */
  private async analyzeVenueSignals(
    signature: VenueSignature,
    location: GPSCoords,
    accuracy: number,
    wifiNetworks?: WiFiNetwork[],
    bluetoothBeacons?: BluetoothBeacon[]
  ): Promise<VenueDetectionResult> {
    // GPS Analysis
    const gpsAnalysis = this.analyzeGPSSignal(signature, location, accuracy);
    
    // WiFi Analysis
    const wifiAnalysis = this.analyzeWiFiSignals(signature, wifiNetworks || []);
    
    // Bluetooth Analysis
    const bluetoothAnalysis = this.analyzeBluetoothSignals(signature, bluetoothBeacons || []);
    
    // Building Footprint Analysis
    const buildingAnalysis = this.analyzeBuildingFootprint(signature, location);

    // Calculate weighted overall confidence
    const totalWeight = signature.gpsWeight + signature.wifiWeight + 
                       signature.bluetoothWeight + signature.buildingWeight;
    
    const overallConfidence = (
      gpsAnalysis.confidence * signature.gpsWeight +
      wifiAnalysis.confidence * signature.wifiWeight +
      bluetoothAnalysis.confidence * signature.bluetoothWeight +
      buildingAnalysis.confidence * signature.buildingWeight
    ) / totalWeight;

    // Determine recommended action
    let recommendedAction: 'check_in' | 'prompt_user' | 'ignore';
    if (overallConfidence >= this.HIGH_CONFIDENCE_THRESHOLD) {
      recommendedAction = 'check_in';
    } else if (overallConfidence >= this.MEDIUM_CONFIDENCE_THRESHOLD) {
      recommendedAction = 'prompt_user';
    } else {
      recommendedAction = 'ignore';
    }

    return {
      venueId: signature.venueId,
      confidence: overallConfidence,
      signals: {
        gps: gpsAnalysis,
        wifi: wifiAnalysis,
        bluetooth: bluetoothAnalysis,
        building: buildingAnalysis,
      },
      overallConfidence,
      recommendedAction,
    };
  }

  /**
   * Analyze GPS signal for venue detection
   */
  private analyzeGPSSignal(
    signature: VenueSignature,
    location: GPSCoords,
    accuracy: number
  ): { detected: boolean; distance: number; confidence: number } {
    const distance = calculateDistance(location, signature.location);
    const detected = distance <= signature.radiusMeters + accuracy;
    
    let confidence = 0;
    if (detected) {
      // Higher confidence when closer to center and GPS is more accurate
      const normalizedDistance = distance / (signature.radiusMeters + accuracy);
      const accuracyFactor = Math.max(0, 1 - accuracy / this.GPS_CONFIDENCE_THRESHOLD);
      confidence = (1 - normalizedDistance) * accuracyFactor;
    }

    return { detected, distance, confidence };
  }

  /**
   * Analyze WiFi signals for venue detection
   */
  private analyzeWiFiSignals(
    signature: VenueSignature,
    detectedNetworks: WiFiNetwork[]
  ): { detected: boolean; matchedNetworks: number; confidence: number } {
    if (signature.knownWiFiNetworks.length === 0 || detectedNetworks.length === 0) {
      return { detected: false, matchedNetworks: 0, confidence: 0 };
    }

    let matchedNetworks = 0;
    let totalSignalStrength = 0;
    let maxSignalStrength = -100;

    for (const knownNetwork of signature.knownWiFiNetworks) {
      const detectedNetwork = detectedNetworks.find(
        network => network.ssid === knownNetwork.ssid || network.bssid === knownNetwork.bssid
      );

      if (detectedNetwork && detectedNetwork.signalStrength > this.WIFI_RSSI_THRESHOLD) {
        matchedNetworks++;
        totalSignalStrength += detectedNetwork.signalStrength;
        maxSignalStrength = Math.max(maxSignalStrength, detectedNetwork.signalStrength);
      }
    }

    const detected = matchedNetworks > 0;
    let confidence = 0;

    if (detected) {
      // Confidence based on number of matched networks and signal strength
      const matchRatio = matchedNetworks / signature.knownWiFiNetworks.length;
      const avgSignalStrength = totalSignalStrength / matchedNetworks;
      const signalFactor = Math.max(0, (avgSignalStrength - this.WIFI_RSSI_THRESHOLD) / 
                                       (0 - this.WIFI_RSSI_THRESHOLD));
      
      confidence = matchRatio * signalFactor;
    }

    return { detected, matchedNetworks, confidence };
  }

  /**
   * Analyze Bluetooth signals for venue detection
   */
  private analyzeBluetoothSignals(
    signature: VenueSignature,
    detectedBeacons: BluetoothBeacon[]
  ): { detected: boolean; matchedBeacons: number; confidence: number } {
    if (signature.bluetoothBeacons.length === 0 || detectedBeacons.length === 0) {
      return { detected: false, matchedBeacons: 0, confidence: 0 };
    }

    let matchedBeacons = 0;
    let totalRssi = 0;
    let maxRssi = -100;

    for (const knownBeacon of signature.bluetoothBeacons) {
      const detectedBeacon = detectedBeacons.find(beacon => {
        // Match by UUID and optionally major/minor
        if (beacon.uuid !== knownBeacon.uuid) return false;
        if (knownBeacon.major !== undefined && beacon.major !== knownBeacon.major) return false;
        if (knownBeacon.minor !== undefined && beacon.minor !== knownBeacon.minor) return false;
        return beacon.rssi > this.BLUETOOTH_RSSI_THRESHOLD;
      });

      if (detectedBeacon) {
        matchedBeacons++;
        totalRssi += detectedBeacon.rssi;
        maxRssi = Math.max(maxRssi, detectedBeacon.rssi);
      }
    }

    const detected = matchedBeacons > 0;
    let confidence = 0;

    if (detected) {
      // Confidence based on number of matched beacons and signal strength
      const matchRatio = matchedBeacons / signature.bluetoothBeacons.length;
      const avgRssi = totalRssi / matchedBeacons;
      const signalFactor = Math.max(0, (avgRssi - this.BLUETOOTH_RSSI_THRESHOLD) / 
                                       (0 - this.BLUETOOTH_RSSI_THRESHOLD));
      
      confidence = matchRatio * signalFactor;
    }

    return { detected, matchedBeacons, confidence };
  }

  /**
   * Analyze building footprint for venue detection
   */
  private analyzeBuildingFootprint(
    signature: VenueSignature,
    location: GPSCoords
  ): { detected: boolean; insideBuilding: boolean; confidence: number } {
    if (signature.buildingFootprints.length === 0) {
      return { detected: false, insideBuilding: false, confidence: 0 };
    }

    let insideAnyBuilding = false;
    let minDistanceToBuilding = Infinity;

    for (const footprint of signature.buildingFootprints) {
      const inside = this.isPointInPolygon(location, footprint.geometry);
      if (inside) {
        insideAnyBuilding = true;
        minDistanceToBuilding = 0;
        break;
      } else {
        const distance = this.distanceToPolygon(location, footprint.geometry);
        minDistanceToBuilding = Math.min(minDistanceToBuilding, distance);
      }
    }

    const detected = insideAnyBuilding || minDistanceToBuilding < 20; // Within 20m of building
    let confidence = 0;

    if (detected) {
      if (insideAnyBuilding) {
        confidence = 1.0; // High confidence if inside building
      } else {
        // Confidence decreases with distance from building
        confidence = Math.max(0, 1 - minDistanceToBuilding / 20);
      }
    }

    return { detected, insideBuilding: insideAnyBuilding, confidence };
  }

  /**
   * Check if point is inside polygon using ray casting algorithm
   */
  private isPointInPolygon(point: GPSCoords, polygon: GPSCoords[]): boolean {
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng;
      const yi = polygon[i].lat;
      const xj = polygon[j].lng;
      const yj = polygon[j].lat;
      
      if (((yi > point.lat) !== (yj > point.lat)) &&
          (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  /**
   * Calculate minimum distance from point to polygon boundary
   */
  private distanceToPolygon(point: GPSCoords, polygon: GPSCoords[]): number {
    let minDistance = Infinity;
    
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      const distance = this.distanceToLineSegment(point, polygon[i], polygon[j]);
      minDistance = Math.min(minDistance, distance);
    }
    
    return minDistance;
  }

  /**
   * Calculate distance from point to line segment
   */
  private distanceToLineSegment(point: GPSCoords, start: GPSCoords, end: GPSCoords): number {
    // Simplified distance calculation for small distances
    const dx = (end.lng - start.lng) * Math.cos(start.lat * Math.PI / 180);
    const dy = end.lat - start.lat;
    const px = (point.lng - start.lng) * Math.cos(start.lat * Math.PI / 180);
    const py = point.lat - start.lat;
    
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    if (segmentLength === 0) {
      const distance = Math.sqrt(px * px + py * py);
      return distance * 111320; // Convert to meters
    }
    
    const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (segmentLength * segmentLength)));
    const closestX = start.lng + t * (end.lng - start.lng);
    const closestY = start.lat + t * (end.lat - start.lat);
    
    const distanceX = (point.lng - closestX) * Math.cos(point.lat * Math.PI / 180);
    const distanceY = point.lat - closestY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    
    return distance * 111320; // Convert to meters
  }

  /**
   * Create a venue signature with default weights
   */
  static createVenueSignature(
    venueId: string,
    name: string,
    location: GPSCoords,
    radiusMeters: number = 100
  ): VenueSignature {
    return {
      venueId,
      name,
      location,
      radiusMeters,
      knownWiFiNetworks: [],
      bluetoothBeacons: [],
      buildingFootprints: [],
      gpsWeight: 0.3,
      wifiWeight: 0.3,
      bluetoothWeight: 0.2,
      buildingWeight: 0.2,
    };
  }

  /**
   * Get platform-specific WiFi networks (mock implementation)
   */
  static async getWiFiNetworks(): Promise<WiFiNetwork[]> {
    // This would be implemented using platform-specific APIs
    // For now, return empty array
    console.log('[MultiSignalVenue] WiFi scanning not yet implemented');
    return [];
  }

  /**
   * Get platform-specific Bluetooth beacons (mock implementation)
   */
  static async getBluetoothBeacons(): Promise<BluetoothBeacon[]> {
    // This would be implemented using platform-specific APIs
    // For now, return empty array
    console.log('[MultiSignalVenue] Bluetooth scanning not yet implemented');
    return [];
  }
}

// Singleton instance
export const multiSignalVenueDetector = new MultiSignalVenueDetector();