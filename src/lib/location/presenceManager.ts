/**
 * Optimized presence broadcasting with batching and throttling
 */
import { supabase } from '@/integrations/supabase/client';
import { encryptCoordinates } from './encryption';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceBroadcast {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  userId: string;
}

interface PresenceBatch {
  broadcasts: PresenceBroadcast[];
  channelId: string;
}

/**
 * Optimized presence manager with batching and encryption
 */
export class OptimizedPresenceManager {
  private batchBuffer = new Map<string, PresenceBroadcast[]>();
  private channels = new Map<string, RealtimeChannel>();
  private batchTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly BATCH_SIZE = 5;
  private readonly BATCH_TIMEOUT_MS = 2000;
  private readonly MAX_BROADCASTS_PER_MINUTE = 30;
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  
  private rateLimiter = new Map<string, number[]>();
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.startCleanupTimer(); // Start the sweeper
  }

  /**
   * Subscribe to a presence channel with optimized management
   */
  async subscribeToPresence(channelId: string, onPresenceUpdate: (data: any) => void): Promise<void> {
    if (this.channels.has(channelId)) {
      return; // Already subscribed
    }

    const channel = supabase
      .channel(channelId)
      .on('broadcast', { event: 'presence_batch' }, ({ payload }) => {
        this.handlePresenceBatch(payload, onPresenceUpdate);
      })
      .on('broadcast', { event: 'presence_update' }, ({ payload }) => {
        onPresenceUpdate(payload);
      });

    await channel.subscribe();
    this.channels.set(channelId, channel);
    console.log(`[PresenceManager] Subscribed to ${channelId}`);
  }

  /**
   * Broadcast presence with batching and rate limiting
   */
  async broadcastPresence(
    channelId: string,
    lat: number,
    lng: number,
    accuracy: number,
    userId: string
  ): Promise<boolean> {
    // Ensure cleanup timer is running
    this.startCleanupTimer();
    
    // Rate limiting check
    if (!this.checkRateLimit(userId)) {
      console.warn(`[PresenceManager] Rate limit exceeded for user ${userId}`);
      return false;
    }

    const broadcast: PresenceBroadcast = {
      lat,
      lng,
      accuracy,
      timestamp: Date.now(),
      userId
    };

    // Add to batch buffer
    if (!this.batchBuffer.has(channelId)) {
      this.batchBuffer.set(channelId, []);
    }
    
    this.batchBuffer.get(channelId)!.push(broadcast);

    // Check if we should flush immediately
    if (this.batchBuffer.get(channelId)!.length >= this.BATCH_SIZE) {
      await this.flushBatch(channelId);
    } else if (!this.batchTimers.has(channelId)) {
      // Set timer for this specific channel
      const timer = setTimeout(() => {
        this.flushBatch(channelId);
        this.batchTimers.delete(channelId);
      }, this.BATCH_TIMEOUT_MS);
      this.batchTimers.set(channelId, timer);
    }

    return true;
  }

  /**
   * Unsubscribe from presence channel
   */
  async unsubscribeFromPresence(channelId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (channel) {
      try {
        await channel.unsubscribe();
        supabase.removeChannel(channel);
      } catch (error) {
        console.warn(`[PresenceManager] Error unsubscribing from ${channelId}:`, error);
      }
      
      this.channels.delete(channelId);
      
      // Clean up any pending batches and timers
      this.batchBuffer.delete(channelId);
      const timer = this.batchTimers.get(channelId);
      if (timer) {
        clearTimeout(timer); // Clear timer before deleting map entry
        this.batchTimers.delete(channelId);
      }
      
      console.log(`[PresenceManager] Unsubscribed from ${channelId}`);
    }
  }

  /**
   * Clean up all channels and timers
   */
  async cleanup(): Promise<void> {
    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Clear all batch timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();

    // Flush any remaining batches
    await this.flushAllBatches();

    // Unsubscribe from all channels
    const unsubscribePromises = Array.from(this.channels.keys()).map(
      channelId => this.unsubscribeFromPresence(channelId)
    );
    
    await Promise.allSettled(unsubscribePromises);
    
    this.batchBuffer.clear();
    this.channels.clear();
    this.rateLimiter.clear();
  }

  /**
   * Check rate limit for user
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    if (!this.rateLimiter.has(userId)) {
      this.rateLimiter.set(userId, []);
    }
    
    const userBroadcasts = this.rateLimiter.get(userId)!;
    
    // Remove old broadcasts
    const recentBroadcasts = userBroadcasts.filter(timestamp => timestamp > oneMinuteAgo);
    this.rateLimiter.set(userId, recentBroadcasts);
    
    // Check if under limit
    if (recentBroadcasts.length >= this.MAX_BROADCASTS_PER_MINUTE) {
      return false;
    }
    
    // Add current broadcast
    recentBroadcasts.push(now);
    return true;
  }

  /**
   * Flush batch for specific channel
   */
  private async flushBatch(channelId: string): Promise<void> {
    const broadcasts = this.batchBuffer.get(channelId);
    if (!broadcasts || broadcasts.length === 0) {
      return;
    }

    const channel = this.channels.get(channelId);
    if (!channel) {
      console.warn(`[PresenceManager] No channel found for ${channelId}`);
      return;
    }

    try {
      // Encrypt sensitive coordinates
      const encryptedBroadcasts = broadcasts.map(broadcast => {
        const { lat, lng, accuracy, ...rest } = broadcast;
        return {
          ...rest,
          encrypted: encryptCoordinates(lat, lng, accuracy)
        };
      });

      await channel.send({
        type: 'broadcast',
        event: 'presence_batch',
        payload: {
          broadcasts: encryptedBroadcasts,
          count: broadcasts.length,
          timestamp: Date.now()
        }
      });

      console.log(`[PresenceManager] Flushed batch of ${broadcasts.length} broadcasts to ${channelId}`);
    } catch (error) {
      console.error(`[PresenceManager] Failed to flush batch for ${channelId}:`, error);
    } finally {
      // Clear the batch
      this.batchBuffer.set(channelId, []);
    }
  }

  /**
   * Flush all pending batches
   */
  private async flushAllBatches(): Promise<void> {
    const flushPromises = Array.from(this.batchBuffer.keys()).map(
      channelId => this.flushBatch(channelId)
    );
    
    await Promise.allSettled(flushPromises);
  }

  /**
   * Start periodic cleanup of old rate limit entries
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) return;
    
    this.cleanupTimer = setTimeout(() => {
      this.cleanupOldEntries();
      this.cleanupTimer = null;
      this.startCleanupTimer(); // Restart timer
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Clean up old rate limiter entries to prevent memory growth
   */
  private cleanupOldEntries(): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    for (const [userId, timestamps] of this.rateLimiter.entries()) {
      const recentTimestamps = timestamps.filter(ts => ts > oneHourAgo);
      if (recentTimestamps.length === 0) {
        this.rateLimiter.delete(userId);
      } else {
        this.rateLimiter.set(userId, recentTimestamps);
      }
    }
    
    console.log(`[PresenceManager] Cleaned up rate limiter, ${this.rateLimiter.size} users remaining`);
  }

  /**
   * Handle incoming presence batch
   */
  private handlePresenceBatch(payload: any, onPresenceUpdate: (data: any) => void): void {
    if (payload.broadcasts && Array.isArray(payload.broadcasts)) {
      payload.broadcasts.forEach((broadcast: any) => {
        if (broadcast.encrypted) {
          // Decrypt coordinates
          const decrypted = this.decryptBroadcast(broadcast);
          if (decrypted) {
            onPresenceUpdate(decrypted);
          }
        } else {
          onPresenceUpdate(broadcast);
        }
      });
    }
  }

  /**
   * Decrypt broadcast data
   */
  private async decryptBroadcast(broadcast: any): Promise<any | null> {
    try {
      const { decryptCoordinates } = await import('./encryption');
      const coords = decryptCoordinates(broadcast.encrypted);
      
      if (coords) {
        const { encrypted, ...rest } = broadcast;
        return {
          ...rest,
          lat: coords.lat,
          lng: coords.lng,
          accuracy: coords.accuracy
        };
      }
      return null;
    } catch (error) {
      console.error('[PresenceManager] Failed to decrypt broadcast:', error);
      return null;
    }
  }
}

// Singleton instance for global use
export const presenceManager = new OptimizedPresenceManager();