/**
 * Background Location Processor
 * Handles geofence monitoring, venue detection, and proximity analysis
 * in a background-friendly way for better performance and battery life
 */

import { geofencingService, type GeofenceMatch } from './geofencing';
import { multiSignalVenueDetector, type VenueDetectionResult } from './multiSignalVenue';
import { proximityScorer, type ProximityUser, type ProximityAnalysis } from './proximityScoring';
import { proximityEventRecorder } from './proximityEventRecorder';
import { GPSCoords } from './standardGeo';

export interface LocationUpdate {
  location: GPSCoords;
  accuracy: number;
  timestamp: number;
  profileId: string;
}

export interface BackgroundProcessingResult {
  geofenceMatches: GeofenceMatch[];
  venueDetections: VenueDetectionResult[];
  proximityAnalyses: ProximityAnalysis[];
  privacyFiltered: boolean;
  privacyLevel: 'exact' | 'street' | 'area' | 'hidden';
  processingTime: number;
  error?: string;
}

export interface BackgroundProcessorOptions {
  enableGeofencing?: boolean;
  enableVenueDetection?: boolean;
  enableProximityTracking?: boolean;
  batchProcessing?: boolean;
  processingInterval?: number;
  maxBatchSize?: number;
  debugMode?: boolean;
}

/**
 * Background processor for location intelligence
 * Optimized for efficient processing and minimal main thread blocking
 */
export class BackgroundLocationProcessor {
  private processingQueue: LocationUpdate[] = [];
  private processingTimer: ReturnType<typeof setInterval> | null = null;
  private nearbyUsers: Map<string, ProximityUser> = new Map();
  private lastProcessedLocation: GPSCoords | null = null;
  private options: Required<BackgroundProcessorOptions>;

  constructor(options: BackgroundProcessorOptions = {}) {
    this.options = {
      enableGeofencing: options.enableGeofencing ?? true,
      enableVenueDetection: options.enableVenueDetection ?? true,
      enableProximityTracking: options.enableProximityTracking ?? true,
      batchProcessing: options.batchProcessing ?? true,
      processingInterval: options.processingInterval ?? 5000, // 5 seconds
      maxBatchSize: options.maxBatchSize ?? 10,
      debugMode: options.debugMode ?? false
    };

    if (this.options.batchProcessing) {
      this.startBatchProcessing();
    }
  }

  /**
   * Add location update to processing queue
   */
  queueLocationUpdate(update: LocationUpdate): void {
    this.processingQueue.push(update);

    if (this.options.debugMode) {
      console.log(`[BackgroundProcessor] Queued location update for ${update.profileId}`);
    }

    // Process immediately if not using batch processing
    if (!this.options.batchProcessing) {
      this.processLocationUpdate(update);
    }

    // Process if queue is full
    if (this.processingQueue.length >= this.options.maxBatchSize) {
      this.processBatch();
    }
  }

  /**
   * Process a single location update
   */
  async processLocationUpdate(update: LocationUpdate): Promise<BackgroundProcessingResult> {
    const startTime = performance.now();
    const result: BackgroundProcessingResult = {
      geofenceMatches: [],
      venueDetections: [],
      proximityAnalyses: [],
      privacyFiltered: false,
      privacyLevel: 'exact',
      processingTime: 0
    };

    try {
      // 1. Geofencing and Privacy Processing
      if (this.options.enableGeofencing) {
        result.geofenceMatches = geofencingService.checkGeofences(update.location, update.accuracy);
        
        if (result.geofenceMatches.length > 0) {
          const privacyResult = geofencingService.applyPrivacyFiltering(
            update.location,
            update.accuracy,
            result.geofenceMatches
          );
          
          if (privacyResult.hidden) {
            result.privacyLevel = 'hidden';
            result.privacyFiltered = true;
            // Don't process further if location is hidden
            result.processingTime = performance.now() - startTime;
            return result;
          } else if (privacyResult.accuracy > update.accuracy) {
            result.privacyFiltered = true;
            result.privacyLevel = privacyResult.accuracy >= 1000 ? 'area' : 'street';
          }
        }
      }

      // 2. Venue Detection (async, can be slow)
      if (this.options.enableVenueDetection) {
        try {
          // Only run venue detection if location has changed significantly
          const shouldDetectVenues = !this.lastProcessedLocation ||
            this.calculateDistance(update.location, this.lastProcessedLocation) > 25; // 25 meters

          if (shouldDetectVenues) {
            // Get WiFi and Bluetooth data (platform-specific)
            const wifiNetworks = await this.getWiFiNetworks();
            const bluetoothBeacons = await this.getBluetoothBeacons();

            result.venueDetections = await multiSignalVenueDetector.detectVenues(
              update.location,
              update.accuracy,
              wifiNetworks,
              bluetoothBeacons
            );

            this.lastProcessedLocation = update.location;
          }
        } catch (venueError) {
          console.warn('[BackgroundProcessor] Venue detection error:', venueError);
        }
      }

      // 3. Proximity Analysis
      if (this.options.enableProximityTracking) {
        const currentUser: ProximityUser = {
          profileId: update.profileId,
          location: update.location,
          accuracy: update.accuracy,
          timestamp: update.timestamp
        };

        // Analyze proximity with all nearby users
        for (const [profileId, nearbyUser] of this.nearbyUsers) {
          if (profileId !== update.profileId) {
            try {
              const analysis = proximityScorer.analyzeProximity(currentUser, nearbyUser);
              
              if (analysis.confidence > 0.1) {
                result.proximityAnalyses.push(analysis);
                
                // Record significant proximity events
                if (analysis.eventType !== 'none') {
                  await proximityEventRecorder.recordEvent(
                    update.profileId,
                    profileId,
                    analysis,
                    { 
                      lat: update.location.lat, 
                      lng: update.location.lng, 
                      accuracy: update.accuracy 
                    }
                  );
                }
              }
            } catch (proximityError) {
              console.warn('[BackgroundProcessor] Proximity analysis error:', proximityError);
            }
          }
        }

        // Update nearby users map
        this.nearbyUsers.set(update.profileId, currentUser);
        
        // Clean up old proximity data (older than 10 minutes)
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        for (const [profileId, user] of this.nearbyUsers) {
          if (user.timestamp < tenMinutesAgo) {
            this.nearbyUsers.delete(profileId);
          }
        }
      }

      result.processingTime = performance.now() - startTime;

      if (this.options.debugMode) {
        console.log(`[BackgroundProcessor] Processed location for ${update.profileId} in ${result.processingTime.toFixed(2)}ms`);
      }

      return result;

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown processing error';
      result.processingTime = performance.now() - startTime;
      console.error('[BackgroundProcessor] Processing error:', error);
      return result;
    }
  }

  /**
   * Process queued location updates in batch
   */
  private async processBatch(): Promise<void> {
    if (this.processingQueue.length === 0) return;

    const batch = [...this.processingQueue];
    this.processingQueue = [];

    if (this.options.debugMode) {
      console.log(`[BackgroundProcessor] Processing batch of ${batch.length} location updates`);
    }

    // Process each update in the batch
    const results = await Promise.allSettled(
      batch.map(update => this.processLocationUpdate(update))
    );

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`[BackgroundProcessor] Batch processing failed for update ${index}:`, result.reason);
      }
    });
  }

  /**
   * Start batch processing timer
   */
  private startBatchProcessing(): void {
    if (this.processingTimer) return;

    this.processingTimer = setInterval(() => {
      if (this.processingQueue.length > 0) {
        this.processBatch();
      }
    }, this.options.processingInterval);
  }

  /**
   * Update nearby user data from external source
   */
  updateNearbyUser(profileId: string, user: ProximityUser): void {
    this.nearbyUsers.set(profileId, user);
  }

  /**
   * Get current processing statistics
   */
  getStats(): {
    queueSize: number;
    nearbyUsersCount: number;
    lastProcessedLocation: GPSCoords | null;
    isProcessing: boolean;
  } {
    return {
      queueSize: this.processingQueue.length,
      nearbyUsersCount: this.nearbyUsers.size,
      lastProcessedLocation: this.lastProcessedLocation,
      isProcessing: this.processingTimer !== null
    };
  }

  /**
   * Update processor options
   */
  updateOptions(newOptions: Partial<BackgroundProcessorOptions>): void {
    this.options = { ...this.options, ...newOptions };

    // Restart batch processing if needed
    if (newOptions.batchProcessing !== undefined) {
      if (this.processingTimer) {
        clearInterval(this.processingTimer);
        this.processingTimer = null;
      }

      if (newOptions.batchProcessing) {
        this.startBatchProcessing();
      }
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }

    // Process any remaining updates
    if (this.processingQueue.length > 0) {
      this.processBatch();
    }

    this.nearbyUsers.clear();
    proximityScorer.cleanupOldHistory();
  }

  /**
   * Calculate distance between two coordinates
   */
  private calculateDistance(from: GPSCoords, to: GPSCoords): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (from.lat * Math.PI) / 180;
    const φ2 = (to.lat * Math.PI) / 180;
    const Δφ = ((to.lat - from.lat) * Math.PI) / 180;
    const Δλ = ((to.lng - from.lng) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Get WiFi networks (platform-specific implementation needed)
   */
  private async getWiFiNetworks(): Promise<any[]> {
    // TODO: Implement platform-specific WiFi scanning
    // For now, return empty array
    return [];
  }

  /**
   * Get Bluetooth beacons (platform-specific implementation needed)
   */
  private async getBluetoothBeacons(): Promise<any[]> {
    // TODO: Implement platform-specific Bluetooth scanning
    // For now, return empty array
    return [];
  }
}

// Global instance for use across the app
export const backgroundLocationProcessor = new BackgroundLocationProcessor({
  enableGeofencing: true,
  enableVenueDetection: true,
  enableProximityTracking: true,
  batchProcessing: true,
  processingInterval: 5000,
  maxBatchSize: 10,
  debugMode: process.env.NODE_ENV === 'development'
});