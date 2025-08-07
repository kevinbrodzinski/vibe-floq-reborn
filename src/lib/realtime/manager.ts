import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel, REALTIME_POSTGRES_CHANGES_LISTEN_EVENT } from '@supabase/supabase-js';

interface ActiveSubscription {
  channel: RealtimeChannel;
  key: string;
  channelName: string;
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
  avgLatency?: number;
}

class RealtimeManager {
  private subscriptions = new Map<string, ActiveSubscription>();
  private mountedHooks = new Set<string>();
  private connectionStats: ConnectionStats = {
    totalSubscriptions: 0,
    healthySubscriptions: 0,
    totalReconnects: 0,
  };
  private healthCheckInterval?: NodeJS.Timeout;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly SUBSCRIPTION_TIMEOUT = 300000; // 5 minutes inactive cleanup

  constructor() {
    this.startHealthMonitoring();
    // Note: Global error handling moved to individual channel subscriptions
    // as Supabase doesn't provide global realtime connection events
  }

  /**
   * Subscribe to a realtime channel with deduplication and enhanced error handling
   */
  subscribe(
    key: string,
    channelName: string,
    setup: (channel: RealtimeChannel) => RealtimeChannel,
    hookId: string
  ): () => void {
    console.log(`[RealtimeManager] Subscribe request: ${key} from ${hookId}`);
    
    // Track mounted hook
    this.mountedHooks.add(hookId);

    // If subscription already exists, add this hook to tracking
    const existingSubscription = this.subscriptions.get(key);
    if (existingSubscription) {
      existingSubscription.hookIds.add(hookId);
      existingSubscription.lastActivity = new Date();
      console.log(`[RealtimeManager] Reusing existing subscription: ${key}`);
      return () => this.unsubscribe(key, hookId);
    }

    // Create new subscription with retry logic
    this.createSubscription(key, channelName, setup, hookId);

    return () => this.unsubscribe(key, hookId);
  }

  /**
   * Create a new subscription with enhanced error handling
   */
  private async createSubscription(
    key: string,
    channelName: string,
    setup: (channel: RealtimeChannel) => RealtimeChannel,
    hookId: string,
    retryCount = 0
  ) {
    try {
      console.log(`[RealtimeManager] Creating subscription: ${key} (attempt ${retryCount + 1})`);
      
      const channel = supabase.channel(channelName);
      
      // Add connection status handlers
      const configuredChannel = setup(channel)
        .on('system', { event: 'PRESENCE_STATE' }, (payload) => {
          console.log(`[RealtimeManager] Presence state for ${key}:`, payload);
        })
        .on('system', { event: 'PRESENCE_DIFF' }, (payload) => {
          console.log(`[RealtimeManager] Presence diff for ${key}:`, payload);
        });

      // Add enhanced channel event handling
      this.handleChannelEvents(configuredChannel, channelName);

      // Subscribe with promise handling
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
            } else if (status === 'CHANNEL_ERROR' || error) {
              console.error(`[RealtimeManager] Subscription error for ${key}:`, error);
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
        console.log(`[RealtimeManager] Retrying subscription ${key} in ${this.RETRY_DELAY}ms`);
        setTimeout(() => {
          this.createSubscription(key, channelName, setup, hookId, retryCount + 1);
        }, this.RETRY_DELAY * (retryCount + 1)); // Exponential backoff
        
        this.connectionStats.totalReconnects++;
        this.connectionStats.lastReconnectAt = new Date();
      } else {
        console.error(`[RealtimeManager] Max retries exceeded for subscription ${key}`);
        // Clean up failed subscription tracking
        this.mountedHooks.delete(hookId);
      }
    }
  }

  /**
   * Unsubscribe from a channel when hook unmounts
   */
  private async unsubscribe(key: string, hookId: string) {
    console.log(`[RealtimeManager] Unsubscribe request: ${key} from ${hookId}`);
    
    // Remove hook from global tracking
    this.mountedHooks.delete(hookId);

    const subscription = this.subscriptions.get(key);
    if (!subscription) {
      console.warn(`[RealtimeManager] No subscription found for key: ${key}`);
      return;
    }

    // Remove hook from this subscription's tracking
    subscription.hookIds.delete(hookId);

    // Only cleanup if no other hooks are using this subscription
    if (subscription.hookIds.size === 0) {
      console.log(`[RealtimeManager] No more hooks using ${key}, cleaning up...`);
      this.subscriptions.delete(key);
      this.connectionStats.totalSubscriptions--;
      if (subscription.isHealthy) {
        this.connectionStats.healthySubscriptions--;
      }
      await subscription.cleanup();
    } else {
      console.log(`[RealtimeManager] ${subscription.hookIds.size} hooks still using ${key}`);
    }
  }

  /**
   * Start health monitoring for subscriptions
   */
  private startHealthMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Perform health check on all subscriptions
   */
  private performHealthCheck() {
    const now = new Date();
    let healthyCount = 0;
    const subscriptionsToCleanup: string[] = [];

    for (const [key, subscription] of this.subscriptions.entries()) {
      const timeSinceLastActivity = now.getTime() - subscription.lastActivity.getTime();
      
      // Mark as unhealthy if no activity for a while
      if (timeSinceLastActivity > this.SUBSCRIPTION_TIMEOUT) {
        console.warn(`[RealtimeManager] Subscription ${key} inactive for ${timeSinceLastActivity}ms`);
        subscription.isHealthy = false;
        
        // Clean up inactive subscriptions with no hooks
        if (subscription.hookIds.size === 0) {
          subscriptionsToCleanup.push(key);
        }
      } else {
        subscription.isHealthy = true;
        healthyCount++;
      }
    }

    // Cleanup inactive subscriptions
    for (const key of subscriptionsToCleanup) {
      console.log(`[RealtimeManager] Cleaning up inactive subscription: ${key}`);
      const subscription = this.subscriptions.get(key);
      if (subscription) {
        this.subscriptions.delete(key);
        subscription.cleanup();
      }
    }

    this.connectionStats.healthySubscriptions = healthyCount;
    
    // Log stats periodically
    if (this.subscriptions.size > 0) {
      console.log(`[RealtimeManager] Health check - Active: ${this.subscriptions.size}, Healthy: ${healthyCount}, Hooks: ${this.mountedHooks.size}`);
    }
  }

  /**
   * Enhanced channel subscription with proper error handling
   * Note: Supabase handles connection events at the channel level, not globally
   */
  private handleChannelEvents(channel: any, channelName: string) {
    // Handle channel-specific events (this is the proper way with Supabase)
    channel.on('system', { event: '*' }, (payload: any) => {
      console.log(`[RealtimeManager] Channel ${channelName} system event:`, payload);
      
      if (payload.type === 'connected') {
        console.log(`[RealtimeManager] Channel ${channelName} connected`);
      } else if (payload.type === 'disconnected') {
        console.log(`[RealtimeManager] Channel ${channelName} disconnected`);
        // Mark subscription as potentially unhealthy
        const subscription = this.subscriptions.get(channelName);
        if (subscription) {
          subscription.isHealthy = false;
        }
      }
    });
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): ConnectionStats {
    return { ...this.connectionStats };
  }

  /**
   * Get active subscription info
   */
  getActiveSubscriptions(): Array<{
    key: string;
    channelName: string;
    hookCount: number;
    isHealthy: boolean;
    age: number;
    lastActivity: Date;
  }> {
    return Array.from(this.subscriptions.entries()).map(([key, sub]) => ({
      key,
      channelName: sub.channelName,
      hookCount: sub.hookIds.size,
      isHealthy: sub.isHealthy,
      age: Date.now() - sub.createdAt.getTime(),
      lastActivity: sub.lastActivity,
    }));
  }

  /**
   * Force reconnect a specific subscription
   */
  async reconnectSubscription(key: string) {
    const subscription = this.subscriptions.get(key);
    if (!subscription) {
      console.warn(`[RealtimeManager] Cannot reconnect - subscription not found: ${key}`);
      return;
    }

    console.log(`[RealtimeManager] Force reconnecting subscription: ${key}`);
    
    // Store hook IDs before cleanup
    const hookIds = Array.from(subscription.hookIds);
    
    // Cleanup current subscription
    await subscription.cleanup();
    this.subscriptions.delete(key);

    // Recreate subscription for all hooks
    // Note: This requires storing the original setup function, which would need architectural changes
    // For now, we'll mark as unhealthy and let individual hooks handle reconnection
    subscription.isHealthy = false;
  }

  /**
   * Force cleanup of all subscriptions (for testing or emergency cleanup)
   */
  async cleanup() {
    console.log('[RealtimeManager] Force cleanup of all subscriptions');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    const cleanupPromises = Array.from(this.subscriptions.values()).map(sub => sub.cleanup());
    this.subscriptions.clear();
    this.mountedHooks.clear();
    
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
}

export const realtimeManager = new RealtimeManager();