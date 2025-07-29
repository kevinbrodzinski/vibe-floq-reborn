import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import '@/types/supabase-rpc'; // Import RPC type extensions

export function usePushToken() {
  const { user } = useAuth();

  useEffect(() => {
    // SSR guard – Notification API undefined on Node
    if (typeof window === 'undefined') return;
    if (!user) return;

    let cancelled = false;
    
    (async () => {
      try {
        // Check if we're in a browser environment that supports notifications
        if (!('Notification' in window)) {
          console.log('This browser does not support notifications');
          return;
        }

        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted' || cancelled) {
          console.log('Notification permission denied or cancelled');
          return;
        }

        // Better device ID using crypto.randomUUID (stable for browser profile)
        let deviceId = localStorage.getItem('push_device_id');
        if (!deviceId) {
          deviceId = crypto.randomUUID();
          localStorage.setItem('push_device_id', deviceId);
        }
        
        const token = `web:${deviceId}`;
        const platform = 'web';

        const { data, error } = await supabase.rpc('store_push_token', {
          p_device_id: deviceId,
          p_token: token,
          p_platform: platform,
        });

        if (error) {
          console.error('[push] store token failed:', error);
        } else {
          console.log('[push] token stored successfully:', data);
        }
      } catch (err) {
        console.error('[push] store token failed', err);
      }
    })();

    return () => { 
      cancelled = true; 
    };
  }, [user?.id]);
}

export async function resetBadge() {
  try {
    const { data, error } = await supabase.rpc('reset_badge');
    if (error) {
      console.error('[push] reset badge error:', error);
    } else {
      console.log('[push] badge reset successfully:', data);
    }
  } catch (e) {
    console.error('[push] reset badge failed:', e);
  }
}