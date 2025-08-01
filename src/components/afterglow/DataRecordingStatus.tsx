import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Zap } from 'lucide-react';

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

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      const [venueResult, vibeResult, floqResult, planResult, stalenessResult] = await Promise.all([
        supabase
          .from('venue_live_presence')
          .select('id', { count: 'exact' })
          .eq('profile_id', user.id),
        supabase
          .from('user_vibe_states')
          .select('id', { count: 'exact' })
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
          .single()
      ]);

      setStats({
        venuePresence: venueResult.count || 0,
        vibeStates: vibeResult.count || 0,
        floqParticipants: floqResult.count || 0,
        planParticipants: planResult.count || 0,
        isStale: stalenessResult.data?.is_stale || false,
        realtimeActive: realtimeChannels > 0,
      });
    } catch (error) {
      console.error('Failed to fetch data stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [realtimeChannels]);

  // 🔄 Real-time subscriptions for all data sources
  useEffect(() => {
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      const channels = [
        supabase
          .channel('afterglow-venue-presence')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'venue_live_presence',
            filter: `profile_id=eq.${user.id}`
          }, () => {
            console.log('🔄 Venue presence changed');
            fetchStats();
          }),
        
        supabase
          .channel('afterglow-vibe-states')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'user_vibe_states',
            filter: `profile_id=eq.${user.id}`
          }, () => {
            console.log('🔄 Vibe state changed');
            fetchStats();
          }),
        
        supabase
          .channel('afterglow-floq-participants')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'floq_participants',
            filter: `profile_id=eq.${user.id}`
          }, () => {
            console.log('🔄 Floq participation changed');
            fetchStats();
          }),
        
        supabase
          .channel('afterglow-plan-participants')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'plan_participants',
            filter: `profile_id=eq.${user.id}`
          }, () => {
            console.log('🔄 Plan participation changed');
            fetchStats();
          }),
        
        supabase
          .channel('afterglow-staleness')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'daily_afterglow',
            filter: `profile_id=eq.${user.id}`
          }, () => {
            console.log('🔄 Afterglow staleness changed');
            fetchStats();
          })
      ];

      // Subscribe to all channels
      await Promise.all(channels.map(channel => channel.subscribe()));
      setRealtimeChannels(channels.length);
      console.log(`✅ Step 3: ${channels.length} real-time channels active`);

      return () => {
        channels.forEach(channel => supabase.removeChannel(channel));
        setRealtimeChannels(0);
      };
    };

    setupRealtime();
  }, []);

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
    <Card>
      <CardHeader>
        <CardTitle>Step 3: Real-time Updates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span>Real-time Channels:</span>
          <Badge variant={stats?.realtimeActive ? "default" : "secondary"}>
            {realtimeChannels} active
            {stats?.realtimeActive ? <Zap className="ml-1 h-3 w-3" /> : <AlertCircle className="ml-1 h-3 w-3" />}
          </Badge>
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
          <Badge variant={stats?.isStale ? "destructive" : "default"}>
            {stats?.isStale ? "Stale (Needs Update)" : "Current"}
            {stats?.isStale ? <AlertCircle className="ml-1 h-3 w-3" /> : <CheckCircle className="ml-1 h-3 w-3" />}
          </Badge>
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
  );
};