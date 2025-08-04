/**
 * Proximity Event Recorder
 * Handles database recording of proximity events for analytics and history tracking
 */

import { supabase } from '@/integrations/supabase/client';
import type { ProximityEvent, ProximityAnalysis } from './proximityScoring';

export interface ProximityEventRecord {
  id?: string;
  profile_id: string;
  target_profile_id: string;
  event_type: 'enter' | 'exit' | 'sustain';
  distance: number;
  confidence: number;
  timestamp: string;
  duration?: number;
  location_lat?: number;
  location_lng?: number;
  accuracy?: number;
  metadata?: Record<string, any>;
}

export interface ProximityEventRecorderOptions {
  enableDatabaseRecording?: boolean;
  batchSize?: number;
  flushInterval?: number;
  debugMode?: boolean;
}

/**
 * Service for recording proximity events to the database
 * Batches events for efficient database writes
 */
export class ProximityEventRecorder {
  private eventQueue: ProximityEventRecord[] = [];
  private flushTimer: number | null = null;
  private options: Required<ProximityEventRecorderOptions>;

  constructor(options: ProximityEventRecorderOptions = {}) {
    this.options = {
      enableDatabaseRecording: options.enableDatabaseRecording ?? true,
      batchSize: options.batchSize ?? 10,
      flushInterval: options.flushInterval ?? 30000, // 30 seconds
      debugMode: options.debugMode ?? false
    };

    // Set up periodic flush
    if (this.options.enableDatabaseRecording) {
      this.startPeriodicFlush();
    }
  }

  /**
   * Record a proximity event
   */
  async recordEvent(
    profileId: string,
    targetProfileId: string,
    analysis: ProximityAnalysis,
    location?: { lat: number; lng: number; accuracy: number }
  ): Promise<void> {
    if (!this.options.enableDatabaseRecording) return;

    const eventRecord: ProximityEventRecord = {
      profile_id: profileId,
      target_profile_id: targetProfileId,
      event_type: analysis.eventType as 'enter' | 'exit' | 'sustain',
      distance: Math.round(analysis.distance),
      confidence: Math.round(analysis.confidence * 100) / 100,
      timestamp: new Date().toISOString(),
      duration: analysis.eventType === 'sustain' ? analysis.sustainedDuration : undefined,
      location_lat: location?.lat,
      location_lng: location?.lng,
      accuracy: location?.accuracy,
      metadata: {
        reliability: analysis.reliability,
        was_near: analysis.wasNear,
        is_near: analysis.isNear
      }
    };

    // Add to queue
    this.eventQueue.push(eventRecord);

    if (this.options.debugMode) {
      console.log(`[ProximityEventRecorder] Queued ${analysis.eventType} event: ${profileId} -> ${targetProfileId} (confidence: ${analysis.confidence})`);
    }

    // Flush if queue is full
    if (this.eventQueue.length >= this.options.batchSize) {
      await this.flush();
    }
  }

  /**
   * Record multiple proximity events from enhanced location sharing
   */
  async recordProximityEvents(
    profileId: string,
    proximityEvents: string[],
    nearbyUsers: any[],
    location?: { lat: number; lng: number; accuracy: number }
  ): Promise<void> {
    if (!this.options.enableDatabaseRecording || proximityEvents.length === 0) return;

    // Parse proximity event strings and create records
    for (const eventString of proximityEvents) {
      const eventMatch = eventString.match(/(Started|Left|Sustained) proximity with user (\w+)(?:\s*\((\d+)s\))?/);
      
      if (eventMatch) {
        const [, action, targetUserId, durationStr] = eventMatch;
        const duration = durationStr ? parseInt(durationStr) * 1000 : undefined;
        
        let eventType: 'enter' | 'exit' | 'sustain';
        if (action === 'Started') eventType = 'enter';
        else if (action === 'Left') eventType = 'exit';
        else eventType = 'sustain';

        // Find corresponding user data for confidence
        const nearbyUser = nearbyUsers.find(u => u.userId === targetUserId);
        const confidence = nearbyUser?.confidence || 0.5;
        const distance = nearbyUser?.distance || 0;

        const eventRecord: ProximityEventRecord = {
          profile_id: profileId,
          target_profile_id: targetUserId,
          event_type: eventType,
          distance: Math.round(distance),
          confidence: Math.round(confidence * 100) / 100,
          timestamp: new Date().toISOString(),
          duration,
          location_lat: location?.lat,
          location_lng: location?.lng,
          accuracy: location?.accuracy,
          metadata: {
            source: 'enhanced_location_sharing',
            event_string: eventString
          }
        };

        this.eventQueue.push(eventRecord);
      }
    }

    if (this.options.debugMode && proximityEvents.length > 0) {
      console.log(`[ProximityEventRecorder] Queued ${proximityEvents.length} proximity events for ${profileId}`);
    }

    // Flush if queue is getting full
    if (this.eventQueue.length >= this.options.batchSize) {
      await this.flush();
    }
  }

  /**
   * Flush queued events to database
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const { error } = await supabase
        .from('proximity_events')
        .insert(eventsToFlush);

      if (error) {
        console.error('[ProximityEventRecorder] Database insert error:', error);
        // Re-queue events on failure (with limit to prevent infinite growth)
        if (this.eventQueue.length < this.options.batchSize * 2) {
          this.eventQueue.unshift(...eventsToFlush);
        }
      } else if (this.options.debugMode) {
        console.log(`[ProximityEventRecorder] Successfully recorded ${eventsToFlush.length} proximity events`);
      }
    } catch (error) {
      console.error('[ProximityEventRecorder] Flush error:', error);
      // Re-queue events on failure
      if (this.eventQueue.length < this.options.batchSize * 2) {
        this.eventQueue.unshift(...eventsToFlush);
      }
    }
  }

  /**
   * Get proximity event statistics for a user
   */
  async getProximityStats(profileId: string, days: number = 7): Promise<{
    totalEvents: number;
    enterEvents: number;
    exitEvents: number;
    sustainEvents: number;
    uniqueContacts: number;
    averageConfidence: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const { data, error } = await supabase
        .from('proximity_events')
        .select('event_type, confidence, target_profile_id')
        .eq('profile_id', profileId)
        .gte('timestamp', startDate.toISOString());

      if (error) throw error;

      const events = data || [];
      const uniqueContacts = new Set(events.map(e => e.target_profile_id)).size;
      const averageConfidence = events.length > 0 
        ? events.reduce((sum, e) => sum + e.confidence, 0) / events.length 
        : 0;

      return {
        totalEvents: events.length,
        enterEvents: events.filter(e => e.event_type === 'enter').length,
        exitEvents: events.filter(e => e.event_type === 'exit').length,
        sustainEvents: events.filter(e => e.event_type === 'sustain').length,
        uniqueContacts,
        averageConfidence
      };
    } catch (error) {
      console.error('[ProximityEventRecorder] Stats query error:', error);
      return {
        totalEvents: 0,
        enterEvents: 0,
        exitEvents: 0,
        sustainEvents: 0,
        uniqueContacts: 0,
        averageConfidence: 0
      };
    }
  }

  /**
   * Start periodic flush timer
   */
  private startPeriodicFlush(): void {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush().catch(error => {
          console.error('[ProximityEventRecorder] Periodic flush error:', error);
        });
      }
    }, this.options.flushInterval);
  }

  /**
   * Stop periodic flush and flush remaining events
   */
  async cleanup(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush any remaining events
    await this.flush();
  }

  /**
   * Update recording options
   */
  updateOptions(newOptions: Partial<ProximityEventRecorderOptions>): void {
    this.options = { ...this.options, ...newOptions };

    // Restart periodic flush if recording was enabled
    if (newOptions.enableDatabaseRecording && !this.flushTimer) {
      this.startPeriodicFlush();
    } else if (newOptions.enableDatabaseRecording === false && this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

// Global instance for use across the app
export const proximityEventRecorder = new ProximityEventRecorder({
  enableDatabaseRecording: true,
  batchSize: 10,
  flushInterval: 30000,
  debugMode: process.env.NODE_ENV === 'development'
});