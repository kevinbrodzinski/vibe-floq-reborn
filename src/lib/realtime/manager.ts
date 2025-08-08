import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ActiveSubscription {
  channel: RealtimeChannel;
  key: string;
  channelName: string;
  setup: (channel: RealtimeChannel) => RealtimeChannel; // Store setup for reconnection
  cleanup: () => Promise<void>;
  hookIds: Set<string>;
  createdAt: Date;
  lastActivity: Date;
  retryCount: number;
  isHealthy: boolean;
}

interface ConnectionStats {
  totalSubscriptions: number;
  healthySubscriptions: number;
  totalReconnects: number;
  lastReconnectAt?: Date;
}

class RealtimeManager {
  private subscriptions = new Map<string, ActiveSubscription>();
  private connectionStats: ConnectionStats = {
    totalSubscriptions: 0,
    healthySubscriptions: 0,
    totalReconnects: 0,
  };
  private mountedHooks = new Set<string>();
  private healthCheckInterval?: ReturnType<typeof setInterval>; // Fixed typing
  private creating = new Set<string>(); // Prevent double subscribe race conditions
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly INACTIVE_THRESHOLD = 300000; // 5 minutes

  constructor() {
    this.startHealthMonitoring();
  }

  /**
   * Subscribe to a realtime channel with automatic retry and health monitoring
   */
  subscribe(
    key: string,
    channelName: string,
    setup: (channel: RealtimeChannel) => RealtimeChannel,
    hookId: string
  ): () => void {
    // Track this hook
    this.mountedHooks.add(hookId);

    // If subscription already exists, just add this hook to it
    const existingSubscription = this.subscriptions.get(key);
    if (existingSubscription) {
      existingSubscription.hookIds.add(hookId);
      console.log(`[RealtimeManager] Added hook ${hookId} to existing subscription ${key}`);
      return () => this.unsubscribe(key, hookId);
    }

    // Create new subscription (with race condition protection)
    this.createSubscription(key, channelName, setup, hookId, 0);

    return () => this.unsubscribe(key, hookId);
  }

  /**
   * Create a new subscription with enhanced error handling and race protection
   */
  private async createSubscription(
    key: string,
    channelName: string,
    setup: (channel: RealtimeChannel) => RealtimeChannel,
    hookId: string,
    retryCount: number
  ) {
    // Prevent double subscription race conditions (React Strict Mode)
    if (this.creating.has(key)) {
      console.log(`[RealtimeManager] Subscription ${key} already being created, skipping`);
      return;
    }

    this.creating.add(key);

    try {
      console.log(`[RealtimeManager] Creating subscription: ${key} (attempt ${retryCount + 1})`);
      
      const channel = supabase.channel(channelName);
      
      // Configure the channel with the provided setup function
      const configuredChannel = setup(channel);

      // Only add presence handlers if this is actually a presence channel
      // For postgres_changes channels, skip presence entirely to avoid phantom errors
      const isPresenceChannel = channelName.includes('presence') || channelName.includes('typing');
      if (isPresenceChannel) {
        configuredChannel
          .on('presence', { event: 'sync' }, (state) => {
            console.log(`[RealtimeManager] Presence sync for ${key}:`, state);
            this.updateActivity(key);
          })
          .on('presence', { event: 'join' }, (payload) => {
            console.log(`[RealtimeManager] Presence join for ${key}:`, payload);
            this.updateActivity(key);
          })
          .on('presence', { event: 'leave' }, (payload) => {
            console.log(`[RealtimeManager] Presence leave for ${key}:`, payload);
            this.updateActivity(key);
          });
      }

      // Add minimal channel event handling for health tracking
      this.handleChannelEvents(configuredChannel, key);

      // Subscribe with comprehensive status handling
      const subscriptionPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Subscription timeout for ${key}`));
        }, 10000); // 10 second timeout

        configuredChannel
          .subscribe((status, error) => {
            clearTimeout(timeout);
            if (status === 'SUBSCRIBED') {
              console.log(`[RealtimeManager] Successfully subscribed to ${key}`);
              resolve();
            } else if (['CHANNEL_ERROR', 'CLOSED', 'TIMED_OUT'].includes(status) || error) {
              console.error(`[RealtimeManager] Subscription error for ${key}:`, error || status);
              reject(error || new Error(`Subscription failed with status: ${status}`));
            }
          });
      });

      await subscriptionPromise;

      const cleanup = async () => {
        try {
          console.log(`[RealtimeManager] Cleaning up channel: ${key}`);
          await supabase.removeChannel(configuredChannel);
        } catch (error) {
          console.error(`[RealtimeManager] Error cleaning up channel ${channelName}:`, error);
        }
      };

      const subscription: ActiveSubscription = {
        channel: configuredChannel,
        key,
        channelName,
        setup, // Store setup function for reconnection
        cleanup,
        hookIds: new Set([hookId]),
        createdAt: new Date(),
        lastActivity: new Date(),
        retryCount,
        isHealthy: true,
      };

      this.subscriptions.set(key, subscription);
      this.connectionStats.totalSubscriptions++;
      this.connectionStats.healthySubscriptions++;

      console.log(`[RealtimeManager] Subscription created successfully: ${key}`);

    } catch (error) {
      console.error(`[RealtimeManager] Failed to create subscription ${key}:`, error);
      
      if (retryCount < this.MAX_RETRIES) {
        const backoffDelay = this.RETRY_DELAY * (1 << retryCount) + Math.random() * 250; // Exponential backoff with jitter
        console.log(`[RealtimeManager] Retrying subscription ${key} in ${backoffDelay}ms`);
        setTimeout(() => {
          this.createSubscription(key, channelName, setup, hookId, retryCount + 1);
        }, backoffDelay);
        
        this.connectionStats.totalReconnects++;
        this.connectionStats.lastReconnectAt = new Date();
      } else {
        console.error(`[RealtimeManager] Max retries exceeded for subscription ${key}`);
        // Clean up failed subscription tracking
        this.mountedHooks.delete(hookId);
      }
    } finally {
      // Always remove from creating set
      this.creating.delete(key);
    }
  }

  /**
   * Minimal channel event handling for health tracking
   */
  private handleChannelEvents(channel: RealtimeChannel, key: string) {
    // Use broadcast events for health tracking (works on all channel types)
    channel.on('broadcast', { event: '*' }, () => {
      const sub = this.subscriptions.get(key);
      if (sub) {
        sub.isHealthy = true;
        sub.lastActivity = new Date();
      }
    });
  }

  /**
   * Unsubscribe from a channel when hook unmounts
   */
  private async unsubscribe(key: string, hookId: string) {
    const subscription = this.subscriptions.get(key);
    if (!subscription) {
      console.warn(`[RealtimeManager] No subscription found for key: ${key}`);
      return;
    }

    // Remove this hook from the subscription
    subscription.hookIds.delete(hookId);
    this.mountedHooks.delete(hookId);

    // If no more hooks are using this subscription, clean it up
    if (subscription.hookIds.size === 0) {
      console.log(`[RealtimeManager] Cleaning up unused subscription: ${key}`);
      this.subscriptions.delete(key);
      
      // Update stats properly
      this.connectionStats.totalSubscriptions = Math.max(0, this.connectionStats.totalSubscriptions - 1);
      if (subscription.isHealthy) {
        this.connectionStats.healthySubscriptions = Math.max(0, this.connectionStats.healthySubscriptions - 1);
      }
      
      try {
        await subscription.cleanup();
      } catch (error) {
        console.error(`[RealtimeManager] Error during cleanup for ${key}:`, error);
      }
    } else {
      console.log(`[RealtimeManager] Keeping subscription ${key} (${subscription.hookIds.size} hooks still using it)`);
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Perform health check and cleanup inactive subscriptions
   */
  private async performHealthCheck() {
    const now = new Date();
    const subscriptionsToCleanup: string[] = [];

    for (const [key, subscription] of this.subscriptions) {
      const timeSinceActivity = now.getTime() - subscription.lastActivity.getTime();
      
      if (timeSinceActivity > this.INACTIVE_THRESHOLD) {
        console.warn(`[RealtimeManager] Subscription ${key} inactive for ${Math.round(timeSinceActivity / 1000)}s, marking for cleanup`);
        subscriptionsToCleanup.push(key);
      }
    }

    // Clean up inactive subscriptions with proper stats tracking
    await Promise.all(subscriptionsToCleanup.map(async (key) => {
      const subscription = this.subscriptions.get(key);
      if (!subscription) return;
      
      this.subscriptions.delete(key);
      
      // Update stats properly
      this.connectionStats.totalSubscriptions = Math.max(0, this.connectionStats.totalSubscriptions - 1);
      if (subscription.isHealthy) {
        this.connectionStats.healthySubscriptions = Math.max(0, this.connectionStats.healthySubscriptions - 1);
      }
      
      try {
        await subscription.cleanup();
      } catch (error) {
        console.error(`[RealtimeManager] Error cleaning up inactive subscription ${key}:`, error);
      }
    }));

    console.log(`[RealtimeManager] Health check complete. Active: ${this.subscriptions.size}, Cleaned: ${subscriptionsToCleanup.length}`);
  }

  /**
   * Reconnect a subscription (now properly implemented)
   */
  async reconnectSubscription(key: string) {
    const subscription = this.subscriptions.get(key);
    if (!subscription) {
      console.warn(`[RealtimeManager] Cannot reconnect: subscription ${key} not found`);
      return;
    }

    console.log(`[RealtimeManager] Reconnecting subscription: ${key}`);
    
    // Store the hook IDs and setup function
    const hookIds = Array.from(subscription.hookIds);
    const { channelName, setup } = subscription;
    
    // Clean up the old subscription
    await subscription.cleanup();
    this.subscriptions.delete(key);
    
    // Update stats
    this.connectionStats.totalSubscriptions = Math.max(0, this.connectionStats.totalSubscriptions - 1);
    if (subscription.isHealthy) {
      this.connectionStats.healthySubscriptions = Math.max(0, this.connectionStats.healthySubscriptions - 1);
    }
    
    // Recreate the subscription for each hook
    for (const hookId of hookIds) {
      this.createSubscription(key, channelName, setup, hookId, 0);
    }
  }

  /**
   * Get active subscriptions
   */
  getActiveSubscriptions(): Array<{ key: string; channelName: string; hookCount: number; isHealthy: boolean }> {
    return Array.from(this.subscriptions.entries()).map(([key, sub]) => ({
      key,
      channelName: sub.channelName,
      hookCount: sub.hookIds.size,
      isHealthy: sub.isHealthy,
    }));
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): ConnectionStats {
    return { ...this.connectionStats };
  }

  /**
   * Clean up all subscriptions and stop health monitoring
   */
  async cleanup() {
    console.log('[RealtimeManager] Starting cleanup...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    const cleanupPromises = Array.from(this.subscriptions.values()).map(sub => sub.cleanup());
    
    this.subscriptions.clear();
    this.mountedHooks.clear();
    this.creating.clear(); // Clear creation tracking
    
    this.connectionStats = {
      totalSubscriptions: 0,
      healthySubscriptions: 0,
      totalReconnects: 0,
    };

    await Promise.all(cleanupPromises);
    console.log('[RealtimeManager] Cleanup complete');
  }

  /**
   * Update activity timestamp for a subscription (call when receiving data)
   */
  updateActivity(key: string) {
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      subscription.lastActivity = new Date();
      subscription.isHealthy = true;
    }
  }

  /**
   * Destroy the manager (for cleanup on app teardown)
   */
  destroy() {
    this.cleanup();
  }
}

export const realtimeManager = new RealtimeManager();