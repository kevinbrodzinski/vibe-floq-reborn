import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

export function usePushToken() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        // Check if we're in a browser environment that supports notifications
        if (!('Notification' in window)) {
          console.log('This browser does not support notifications');
          return;
        }

        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Notification permission denied');
          return;
        }

        // For web, we'll use a simple device identifier
        const deviceId = navigator.userAgent + '_' + window.location.hostname;
        const token = 'web_' + user.id; // Simplified web token
        const platform = 'web';

        await supabase.rpc('store_push_token' as any, {
          p_device_id: deviceId,
          p_token: token,
          p_platform: platform,
        });

        console.log('Push token stored successfully');
      } catch (error) {
        console.error('Error storing push token:', error);
      }
    })();
  }, [user]);
}