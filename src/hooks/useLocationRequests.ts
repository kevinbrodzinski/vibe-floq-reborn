import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLiveSettings } from '@/hooks/useLiveSettings';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface LocationRequest {
  id: string;
  requester_id: string;
  requester_name: string;
  message?: string;
  created_at: string;
  expires_at: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
}

interface SentRequest {
  id: string;
  target_id: string;
  target_name: string;
  message?: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  created_at: string;
}

/**
 * Hook for managing location requests between friends
 */
export const useLocationRequests = () => {
  const { user } = useAuth();
  const { data: liveSettings } = useLiveSettings();
  const { toast } = useToast();
  
  const [incomingRequests, setIncomingRequests] = useState<LocationRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch incoming requests
  const fetchIncomingRequests = useCallback(async () => {
    if (!user) return;

    try {
      // TODO: Uncomment when location_requests table is created
      console.log('Fetching incoming requests - table not yet created');
      setIncomingRequests([]);
    } catch (error) {
      console.error('Error in fetchIncomingRequests:', error);
    }
  }, [user]);

  // Fetch sent requests
  const fetchSentRequests = useCallback(async () => {
    if (!user) return;

    try {
      // TODO: Uncomment when location_requests table is created
      console.log('Fetching sent requests - table not yet created');
      setSentRequests([]);
    } catch (error) {
      console.error('Error in fetchSentRequests:', error);
    }
  }, [user]);

  // Send a location request
  const sendLocationRequest = useCallback(async (
    targetId: string, 
    message?: string
  ): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('handle-location-request', {
        body: {
          action: 'send',
          target_id: targetId,
          message: message
        }
      });

      if (error) {
        console.error('Error sending location request:', error);
        toast({
          title: 'Failed to send request',
          description: 'Could not send location request. Please try again.',
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'Request sent',
        description: 'Location request sent successfully.',
      });

      // Refresh sent requests
      await fetchSentRequests();
      return true;
    } catch (error) {
      console.error('Error in sendLocationRequest:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast, fetchSentRequests]);

  // Respond to a location request
  const respondToRequest = useCallback(async (
    requestId: string, 
    response: 'approve' | 'deny'
  ): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('handle-location-request', {
        body: {
          action: 'respond',
          request_id: requestId,
          response: response
        }
      });

      if (error) {
        console.error('Error responding to request:', error);
        toast({
          title: 'Failed to respond',
          description: 'Could not respond to request. Please try again.',
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: response === 'approve' ? 'Request approved' : 'Request denied',
        description: `Location request ${response}d.`,
      });

      // Refresh incoming requests
      await fetchIncomingRequests();
      return true;
    } catch (error) {
      console.error('Error in respondToRequest:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast, fetchIncomingRequests]);

  // Set up realtime subscription for new requests
  useEffect(() => {
    if (!user) return;

    // TODO: Uncomment when location_requests table is created
    console.log('Setting up realtime subscriptions - table not yet created');

    return () => {
      // TODO: Remove channel when subscription is active
    };
  }, [user, fetchIncomingRequests, fetchSentRequests, toast]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchIncomingRequests();
      fetchSentRequests();
    }
  }, [user, fetchIncomingRequests, fetchSentRequests]);

  return {
    incomingRequests,
    sentRequests,
    loading,
    isEnabled: !!liveSettings?.live_smart_flags?.allow_location_req,
    sendLocationRequest,
    respondToRequest,
    refreshRequests: () => {
      fetchIncomingRequests();
      fetchSentRequests();
    }
  };
};