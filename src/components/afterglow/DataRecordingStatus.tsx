import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface DataStats {
  venuePresence: number;
  vibeStates: number;
  floqParticipants: number;
  planParticipants: number;
  isStale: boolean;
}

/**
 * Debug component to show current data recording status for afterglow
 */
export const DataRecordingStatus = () => {
  const [stats, setStats] = useState<DataStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        });
      } catch (error) {
        console.error('Failed to fetch data stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
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
        <CardTitle>Step 2: Data Recording + Staleness Triggers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
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
          <p className="font-semibold text-primary">🔥 NEW: Triggers mark afterglow stale when data changes!</p>
        </div>
      </CardContent>
    </Card>
  );
};