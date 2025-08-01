import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { debounce } from 'lodash-es';

interface DataStats {
  venuePresence: number;
  vibeStates: number;
  floqParticipants: number;
  planParticipants: number;
  isStale: boolean;
  realtimeActive: boolean;
}

/**
 * Debug component to show current data recording status for afterglow
 */
export const DataRecordingStatus = () => {
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [realtimeChannels, setRealtimeChannels] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');

  // Debounced stats fetching to prevent excessive API calls
  const debouncedFetchStats = useMemo(
    () => debounce(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;

        const [venueResult, vibeResult, floqResult, planResult, stalenessResult] = await Promise.all([
          supabase
            .from('venue_live_presence')
            .select('profile_id', { count: 'exact' })
            .eq('profile_id', user.id),
          supabase
            .from('user_vibe_states')
            .select('profile_id', { count: 'exact' })
            .eq('profile_id', user.id),
          supabase
            .from('floq_participants')
            .select('floq_id', { count: 'exact' })
            .eq('profile_id', user.id),
          supabase
            .from('plan_participants')
            .select('plan_id', { count: 'exact' })
            .eq('profile_id', user.id),
          supabase
            .from('daily_afterglow')
            .select('is_stale')
            .eq('profile_id', user.id)
            .eq('date', new Date().toISOString().split('T')[0])
            .maybeSingle()
        ]);

        setStats({
          venuePresence: venueResult.count || 0,
          vibeStates: vibeResult.count || 0,
          floqParticipants: floqResult.count || 0,
          planParticipants: planResult.count || 0,
          isStale: stalenessResult.data?.is_stale || false,
          realtimeActive: realtimeChannels > 0 && connectionStatus === 'connected',
        });
      } catch (error) {
        console.error('Failed to fetch data stats:', error);
      } finally {
        setLoading(false);
      }
    }, 1500, { leading: true, trailing: true }),
    [realtimeChannels, connectionStatus]
  );

  // Initial fetch
  useEffect(() => {
    debouncedFetchStats();
  }, [debouncedFetchStats]);

  // 🔄 Real-time subscriptions with proper async cleanup pattern
  useEffect(() => {
    let mounted = true;
    let cleanup = () => {};

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted || !user?.id) return;

      const createChannelWithStatus = (name: string, table: string) => {
        return supabase
          .channel(name)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table,
            filter: `profile_id=eq.${user.id}`
          }, () => {
            console.log(`🔄 ${table} changed`);
            debouncedFetchStats();
            setConnectionStatus('connected'); // Mark as connected on activity
          });
      };

      const activeChannels = [
        createChannelWithStatus('afterglow-venue-presence', 'venue_live_presence'),
        createChannelWithStatus('afterglow-vibe-states', 'user_vibe_states'),
        createChannelWithStatus('afterglow-floq-participants', 'floq_participants'),
        createChannelWithStatus('afterglow-plan-participants', 'plan_participants'),
        createChannelWithStatus('afterglow-staleness', 'daily_afterglow')
      ];

      // Subscribe to all channels and track successful subscriptions
      if (mounted) {
        const subscriptionResults = await Promise.allSettled(
          activeChannels.map(async (channel, index) => {
            const tableName = ['venue_live_presence', 'user_vibe_states', 'floq_participants', 'plan_participants', 'daily_afterglow'][index];
            try {
              await channel.subscribe();
              console.log(`✅ Channel ${tableName} subscribed successfully`);
              return true;
            } catch (error) {
              console.warn(`⚠️ Channel ${tableName} failed to subscribe:`, error);
              return false;
            }
          })
        );
        
        const successfulSubs = subscriptionResults.filter(result => 
          result.status === 'fulfilled' && result.value === true
        ).length;
        
        setRealtimeChannels(successfulSubs);
        console.log(`✅ Step 3: ${successfulSubs} of ${activeChannels.length} real-time channels active`);
        
        cleanup = () => {
          activeChannels.forEach(channel => supabase.removeChannel(channel));
          setRealtimeChannels(0);
          setConnectionStatus('disconnected');
          debouncedFetchStats.cancel();
        };
      }
    })();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [debouncedFetchStats]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Recording Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle>Step 3: Real-time Updates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Real-time Channels:</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant={stats?.realtimeActive ? "default" : "secondary"}>
                  {realtimeChannels} active
                  {stats?.realtimeActive ? <Zap className="ml-1 h-3 w-3" /> : <AlertCircle className="ml-1 h-3 w-3" />}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{stats?.realtimeActive ? "Live data streams connected" : "Real-time updates disconnected"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center justify-between">
            <span>Venue Presence Records:</span>
            <Badge variant={stats?.venuePresence ? "default" : "secondary"}>
              {stats?.venuePresence || 0}
              {stats?.venuePresence ? <CheckCircle className="ml-1 h-3 w-3" /> : <AlertCircle className="ml-1 h-3 w-3" />}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Vibe State Records:</span>
            <Badge variant={stats?.vibeStates ? "default" : "secondary"}>
              {stats?.vibeStates || 0}
              {stats?.vibeStates ? <CheckCircle className="ml-1 h-3 w-3" /> : <AlertCircle className="ml-1 h-3 w-3" />}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Floq Participation Records:</span>
            <Badge variant={stats?.floqParticipants ? "default" : "secondary"}>
              {stats?.floqParticipants || 0}
              {stats?.floqParticipants ? <CheckCircle className="ml-1 h-3 w-3" /> : <AlertCircle className="ml-1 h-3 w-3" />}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Plan Participation Records:</span>
            <Badge variant={stats?.planParticipants ? "default" : "secondary"}>
              {stats?.planParticipants || 0}
              {stats?.planParticipants ? <CheckCircle className="ml-1 h-3 w-3" /> : <AlertCircle className="ml-1 h-3 w-3" />}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Today's Afterglow Status:</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant={stats?.isStale ? "destructive" : "default"}>
                  {stats?.isStale ? "Stale (Needs Update)" : "Current"}
                  {stats?.isStale ? <AlertCircle className="ml-1 h-3 w-3" /> : <CheckCircle className="ml-1 h-3 w-3" />}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{stats?.isStale ? "Afterglow needs regeneration due to new data" : "Afterglow is up to date"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>✅ Venue check-ins now record to venue_live_presence</p>
            <p>✅ Vibe changes record to user_vibe_states</p>
            <p>✅ Floq joins record to floq_participants</p>
            <p>✅ Plan participation records to plan_participants</p>
            <p>✅ Triggers mark afterglow stale when data changes</p>
            <p className="font-semibold text-primary">⚡ NEW: Real-time subscriptions active for instant updates!</p>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};