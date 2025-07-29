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
      const { data, error } = await supabase
        .from('location_requests')
        .select(`
          id,
          requester_id,
          message,
          created_at,
          expires_at,
          status,
          requester:profiles!requester_id(display_name)
        `)
        .eq('target_id', user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching incoming requests:', error);
        return;
      }

      const requests = data?.map(req => ({
        id: req.id,
        requester_id: req.requester_id,
        requester_name: req.requester?.display_name || 'Unknown',
        message: req.message,
        created_at: req.created_at,
        expires_at: req.expires_at,
        status: req.status as LocationRequest['status']
      })) || [];

      setIncomingRequests(requests);
    } catch (error) {
      console.error('Error in fetchIncomingRequests:', error);
    }
  }, [user]);

  // Fetch sent requests
  const fetchSentRequests = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('location_requests')
        .select(`
          id,
          target_id,
          message,
          created_at,
          status,
          target:profiles!target_id(display_name)
        `)
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching sent requests:', error);
        return;
      }

      const requests = data?.map(req => ({
        id: req.id,
        target_id: req.target_id,
        target_name: req.target?.display_name || 'Unknown',
        message: req.message,
        status: req.status as SentRequest['status'],
        created_at: req.created_at
      })) || [];

      setSentRequests(requests);
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

    const channel = supabase
      .channel('location_requests')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'location_requests',
        filter: `target_id=eq.${user.id}`
      }, (payload) => {
        // New incoming request
        fetchIncomingRequests();
        
        // Show notification
        toast({
          title: 'Location request received',
          description: 'Someone requested your location.',
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'location_requests',
        filter: `requester_id=eq.${user.id}`
      }, (payload) => {
        // Update to our sent request
        fetchSentRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
    isEnabled: !!liveSettings?.live_smart_flags?.allow_location_requests,
    sendLocationRequest,
    respondToRequest,
    refreshRequests: () => {
      fetchIncomingRequests();
      fetchSentRequests();
    }
  };
};