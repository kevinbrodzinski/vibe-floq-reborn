import { createClient } from '@/integrations/supabase/client';

interface ProximityEventData {
  profileId: string;
  friendId: string;
  eventType: 'enter' | 'exit' | 'sustain' | 'interaction';
  location: {
    latitude: number;
    longitude: number;
  };
  confidence: number;
  metadata?: {
    vibeContext?: any;
    venueContext?: string;
    accuracy_score?: number;
    ml_features?: any;
  };
}

/**
 * ProximityEventRecorder - Records proximity events to the database
 * Handles batched writes for performance optimization
 */
export class ProximityEventRecorder {
  private eventQueue: ProximityEventData[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL_MS = 30000; // 30 seconds
  private supabase = createClient();

  constructor() {
    this.startBatchProcessor();
  }

  /**
   * Record a proximity event (queued for batch processing)
   */
  async recordProximityEvent(eventData: ProximityEventData): Promise<void> {
    this.eventQueue.push(eventData);

    // Flush immediately if queue is full
    if (this.eventQueue.length >= this.BATCH_SIZE) {
      await this.flushQueue();
    }
  }

  /**
   * Start the batch processor
   */
  private startBatchProcessor(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = setInterval(() => {
      this.flushQueue().catch(console.error);
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Flush queued events to database
   */
  private async flushQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Transform events for database insertion
      const dbEvents = eventsToFlush.map(event => ({
        user_id: event.profileId,
        other_user_id: event.friendId,
        event_type: event.eventType,
        latitude: event.location.latitude,
        longitude: event.location.longitude,
        distance: 0, // Would be calculated based on location
        confidence_score: event.confidence,
        vibe_context: event.metadata?.vibeContext || {},
        venue_context: event.metadata?.venueContext,
        accuracy_score: event.metadata?.accuracy_score || event.confidence,
        ml_features: event.metadata?.ml_features || {},
        created_at: new Date().toISOString()
      }));

      const { error } = await this.supabase
        .from('proximity_events')
        .insert(dbEvents);

      if (error) {
        console.error('Failed to flush proximity events:', error);
        // Re-queue events for retry
        this.eventQueue.unshift(...eventsToFlush);
      }
    } catch (error) {
      console.error('Error flushing proximity events:', error);
      // Re-queue events for retry
      this.eventQueue.unshift(...eventsToFlush);
    }
  }

  /**
   * Force flush all queued events
   */
  async flush(): Promise<void> {
    await this.flushQueue();
  }

  /**
   * Stop the batch processor and flush remaining events
   */
  async stop(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flushQueue();
  }

  /**
   * Get queue status for monitoring
   */
  getQueueStatus(): { queueLength: number; isProcessing: boolean } {
    return {
      queueLength: this.eventQueue.length,
      isProcessing: this.flushInterval !== null
    };
  }
}