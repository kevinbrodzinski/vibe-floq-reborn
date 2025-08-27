import useSWR from 'swr'
import { supabase } from '@/integrations/supabase/client'
import { useEffect } from 'react'

interface PingRequest {
  id: string
  requester_id: string
  target_id: string  
  status: string
  requested_at: string
  responded_at?: string
}

const fetchPingRequests = async (): Promise<PingRequest[]> => {
  const { data, error } = await supabase
    .from('ping_requests')
    .select('*')
    .eq('target_id', (await supabase.auth.getUser()).data.user?.id as any)
    .eq('status', 'pending' as any)
    .order('requested_at', { ascending: false })
  
  if (error) throw error
  return (data as any) || []
}

export const usePingRequests = () => {
  const { data, error, mutate } = useSWR('ping-requests', fetchPingRequests, {
    refreshInterval: 15000,
  })
  
  // Listen for realtime ping updates
  useEffect(() => {
    const channel = supabase
      .channel('ping-requests')
      .on('postgres_changes', {
        event: '*',
        schema: 'public', 
        table: 'ping_requests'
      }, () => {
        mutate()
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [mutate])
  
  return {
    requests: data ?? [],
    pending: data?.length ?? 0,
    loading: !data && !error,
    error,
    mutate
  }
}