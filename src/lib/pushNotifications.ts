import { supabase } from '@/integrations/supabase/client';

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}

class PushNotificationService {
  private isSupported: boolean;
  private permission: NotificationPermission = 'default';

  constructor() {
    this.isSupported = 'Notification' in window;
    if (this.isSupported) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      console.warn('Push notifications denied by user');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      this.permission = result;
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async showNotification(payload: PushNotificationPayload): Promise<void> {
    if (!this.isSupported || this.permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/favicon.ico',
        badge: payload.badge || '/favicon.ico',
        tag: payload.tag,
        data: payload.data,
        requireInteraction: false,
        silent: false,
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle click
      notification.onclick = (event) => {
        event.preventDefault();
        notification.close();
        
        // Focus the window
        if (window.focus) {
          window.focus();
        }

        // Handle navigation based on notification data
        if (payload.data?.action) {
          this.handleNotificationAction(payload.data.action, payload.data);
        }
      };
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  private handleNotificationAction(action: string, data: any): void {
    // This can be expanded to handle different notification actions
    switch (action) {
      case 'open_dm':
        // Navigate to DM thread
        window.location.href = `/messages/${data.thread_id}`;
        break;
      case 'open_friend_requests':
        // Navigate to friend requests
        window.location.href = '/friends/requests';
        break;
      case 'open_plan':
        // Navigate to plan
        window.location.href = `/plans/${data.plan_id}`;
        break;
      case 'open_floq':
        // Navigate to floq
        window.location.href = `/floqs/${data.floq_id}`;
        break;
      default:
        // Default action - just focus the window
        break;
    }
  }

  async storePushToken(token: string, deviceId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('store_push_token', {
        p_device_id: deviceId,
        p_token: token,
        p_platform: 'web'
      });

      if (error) {
        console.error('Error storing push token:', error);
      }
    } catch (error) {
      console.error('Error storing push token:', error);
    }
  }

  isPermissionGranted(): boolean {
    return this.permission === 'granted';
  }

  getSupported(): boolean {
    return this.isSupported;
  }
}

export const pushNotificationService = new PushNotificationService();