
import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { globalLocationManager } from '@/lib/location/GlobalLocationManager';
import { trackError } from '@/lib/trackError';
import { useAuth } from '@/hooks/useAuth';
import { evaluatePolicyLadder } from '@/lib/policy/ladder';

type Vibe = 'social' | 'chill' | 'focused' | 'energetic' | 'open' | 'curious';

interface UsePresencePublisherOptions {
  interval?: number;
  accuracy?: 'high' | 'medium' | 'low';
  enableBackground?: boolean;
}

export function usePresencePublisher(
  vibe: Vibe,
  isActive: boolean = true,
  options: UsePresencePublisherOptions = {}
) {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const { user } = useAuth();

  const updatePosition = useCallback(async (lat: number, lng: number) => {
    if (!user || !isActive) return;

    try {
      setIsPublishing(true);
      setError(null);

      // Apply policy ladder before publishing presence
      const policyDecision = evaluatePolicyLadder({
        kind: 'raw',
        value: vibe,
        confidence: 0.8, // High confidence for user-initiated vibe
        theta: 0.7, // Confidence threshold
        omega: 0.3, // Uncertainty threshold
        class: 'presence',
        lastChangeAt: lastUpdate || undefined,
        venueSafety: 'safe', // TODO: detect from venue context
        userId: user.id,
      } as any);

      if (!policyDecision.allowed) {
        console.log('[PresencePublisher] Policy ladder blocked publication:', policyDecision.reason);
        
        // Show user-friendly message for cooldown
        if (policyDecision.observability.min_interval_enforced) {
          setError('Presence update rate limited - please wait before updating again');
        } else if (policyDecision.observability.hysteresis_applied) {
          setError('Presence change too frequent - waiting for stability');
        } else {
          setError(policyDecision.reason || 'Presence update blocked by policy');
        }
        
        return;
      }

      const { error: presenceError } = await supabase.rpc('upsert_presence', {
        p_lat: lat,
        p_lng: lng,
        p_vibe: vibe,
        p_visibility: 'public',
      });

      if (presenceError) {
        console.error('Error publishing presence:', presenceError);
        throw presenceError;
      }

      setLastUpdate(new Date());
      
    } catch (err: any) {
      console.error('Error publishing presence:', err);
      setError(err.message);
      trackError(err, { context: 'presence_publisher' });
    } finally {
      setIsPublishing(false);
    }
  }, [user, isActive, vibe, lastUpdate]);

  useEffect(() => {
    if (!user || !isActive) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    try {
      // Use global location manager to prevent infinite loops
      unsubscribeRef.current = globalLocationManager.subscribe(
        `presence-publisher-${user.id}`,
        (coords) => {
          // Call updatePosition with lat and lng directly
          requestAnimationFrame(() => {
            updatePosition(coords.lat, coords.lng);
          });
        },
        (error) => {
          console.error('Location error:', error);
          setError(error);
        }
      );

    } catch (err: any) {
      console.error('Error setting up location subscription:', err);
      setError(err.message);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [isActive, user?.id, updatePosition]);

  // Set user vibe state
  useEffect(() => {
    if (!user || !vibe) return;

    const setUserVibe = async () => {
      try {
        const { error: vibeError } = await supabase.rpc('set_user_vibe', {
          new_vibe: vibe,
          lat: null,
          lng: null
        });
        
        if (vibeError) {
          console.error('Error setting user vibe:', vibeError);
        }
      } catch (err) {
        console.error('Error calling set_user_vibe:', err);
      }
    };

    setUserVibe();
  }, [user?.id, vibe]);

  const forceUpdate = useCallback(() => {
    if (!user) return;
    
    const currentLocation = globalLocationManager.getCurrentLocation();
    if (currentLocation) {
      updatePosition(currentLocation.lat, currentLocation.lng);
    }
  }, [updatePosition, user]);

  return {
    isPublishing,
    lastUpdate,
    error,
    forceUpdate,
    isActive
  };
}
