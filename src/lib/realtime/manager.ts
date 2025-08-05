import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ActiveSubscription {
  channel: RealtimeChannel;
  key: string;
  cleanup: () => Promise<void>;
}

class RealtimeManager {
  private subscriptions = new Map<string, ActiveSubscription>();
  private mountedHooks = new Set<string>();

  /**
   * Subscribe to a realtime channel with deduplication
   */
  subscribe(
    key: string,
    channelName: string,
    setup: (channel: RealtimeChannel) => RealtimeChannel,
    hookId: string
  ): () => void {
    // Track mounted hook
    this.mountedHooks.add(hookId);

    // If subscription already exists, just add this hook to tracking
    if (this.subscriptions.has(key)) {
      return () => this.unsubscribe(key, hookId);
    }

    // Create new subscription
    const channel = supabase.channel(channelName);
    const configuredChannel = setup(channel);
    configuredChannel.subscribe();

    const cleanup = async () => {
      try {
        await supabase.removeChannel(configuredChannel);
      } catch (error) {
        console.error(`[RealtimeManager] Error cleaning up channel ${channelName}:`, error);
      }
    };

    this.subscriptions.set(key, {
      channel: configuredChannel,
      key,
      cleanup
    });

    return () => this.unsubscribe(key, hookId);
  }

  /**
   * Unsubscribe from a channel when hook unmounts
   */
  private async unsubscribe(key: string, hookId: string) {
    // Remove hook from tracking
    this.mountedHooks.delete(hookId);

    const subscription = this.subscriptions.get(key);
    if (!subscription) return;

    // Only cleanup if no other hooks are using this subscription
    const otherHooksUsingThis = Array.from(this.mountedHooks).some(id => 
      id.startsWith(key.split(':')[0])
    );

    if (!otherHooksUsingThis) {
      this.subscriptions.delete(key);
      await subscription.cleanup();
    }
  }

  /**
   * Force cleanup of all subscriptions (for testing or emergency cleanup)
   */
  async cleanup() {
    const cleanupPromises = Array.from(this.subscriptions.values()).map(sub => sub.cleanup());
    this.subscriptions.clear();
    this.mountedHooks.clear();
    await Promise.all(cleanupPromises);
  }
}

export const realtimeManager = new RealtimeManager();