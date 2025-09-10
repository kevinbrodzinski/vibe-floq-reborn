import React from 'react';
import { useFlow } from '@/hooks/useFlow';
import { useFlowSegments } from '@/hooks/useFlowSegments';
import { VibeArcChart } from './VibeArcChart';
import { computeFlowMetrics } from '@/lib/flow/computeFlowMetrics';
import { analyzeVibeJourney } from '@/lib/vibe/analyzeVibeJourney';
import { markersFromVibe } from '@/lib/flow/markersFromVibe';
import { generatePostcardClient } from '@/lib/share/generatePostcardClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Share2, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function FlowReflectionPage({ flowId }: { flowId: string }) {
  const { data: flow, isLoading: loadingFlow, error: flowError } = useFlow(flowId);
  const { data: segments = [], isLoading: loadingSegments, error: segmentsError } = useFlowSegments(flowId);
  const [sharing, setSharing] = React.useState(false);

  const loading = loadingFlow || loadingSegments;
  const error = flowError || segmentsError;

  // Compute metrics and vibe analysis
  const metrics = React.useMemo(() => {
    if (!flow || !segments.length) return null;
    return computeFlowMetrics(
      {
        started_at: flow.started_at,
        ended_at: flow.ended_at,
        sun_exposed_min: flow.sun_exposed_min
      },
      segments.map(seg => ({
        idx: seg.idx,
        arrived_at: seg.arrived_at,
        departed_at: seg.departed_at,
        center: seg.center ? {
          lng: (seg.center as any).coordinates[0],
          lat: (seg.center as any).coordinates[1]
        } : null,
        venue_id: seg.venue_id,
        vibe_vector: seg.vibe_vector as { energy?: number; valence?: number } | null
      })),
      { maxTopVenues: 5 }
    );
  }, [flow, segments]);

  const vibeAnalysis = React.useMemo(() => {
    if (!metrics?.energySamples.length) return null;
    return analyzeVibeJourney(metrics.energySamples, {
      smoothWindow: 3,
      minPeakProminence: 0.08,
      minTransitionDelta: 0.12
    });
  }, [metrics]);

  const chartMarkers = React.useMemo(() => {
    if (!vibeAnalysis || !metrics?.energySamples) return [];
    return markersFromVibe(vibeAnalysis as any, metrics.energySamples);
  }, [vibeAnalysis, metrics]);

  const handleDownloadPostcard = async () => {
    if (!flow || !metrics) return;
    
    try {
      const blob = await generatePostcardClient({
        title: 'My Flow Reflection',
        subtitle: new Date(flow.started_at).toLocaleDateString(),
        date: new Date(flow.started_at),
        path: metrics.path,
        stats: {
          distanceM: metrics.distanceM,
          elapsedMin: metrics.elapsedMin,
          suiPct: metrics.suiPct ?? undefined,
          venues: metrics.venues.count
        },
        energySamples: metrics.energySamples,
        branding: 'subtle'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flow-postcard-${flowId}.png`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Postcard downloaded!',
        description: 'Your flow postcard has been saved'
      });
    } catch (error) {
      console.error('Failed to download postcard:', error);
      toast({
        title: 'Failed to download postcard',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  const handleShare = async () => {
    if (!flow || !metrics) return;
    
    setSharing(true);
    try {
      const shareText = `Just completed a ${Math.round(metrics.elapsedMin)}min flow covering ${(metrics.distanceM / 1000).toFixed(1)}km! ${vibeAnalysis ? `Energy pattern: ${vibeAnalysis.patterns?.type || 'unknown'}` : ''}`;
      
      if (navigator.share) {
        await navigator.share({
          title: 'My Flow Reflection',
          text: shareText,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: 'Reflection copied to clipboard!',
          description: 'Share your flow with others'
        });
      }
    } catch (error) {
      console.error('Failed to share:', error);
      toast({
        title: 'Failed to share reflection',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2 text-white/80">
          <Loader2 className="h-5 w-5 animate-spin" />
          Preparing your reflection…
        </div>
      </div>
    );
  }

  if (error || !flow) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-300 mb-4">Failed to load flow: {error?.message || 'no data'}</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 text-center">
        <div className="text-white/60">No flow data available</div>
      </div>
    );
  }

  const elapsedMin = Math.round(metrics.elapsedMin);
  const distanceKm = metrics.distanceM / 1000;
  const suiPct = metrics.suiPct;

  return (
    <div className="p-4 text-white/90 space-y-6 max-w-4xl mx-auto">
      {/* Hero */}
      <Card className="bg-white/[0.04] border-white/[0.06]">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Your Flow Reflection</CardTitle>
          <p className="text-white/70">
            {new Date(flow.started_at).toLocaleString()} → {flow.ended_at ? new Date(flow.ended_at).toLocaleString() : 'Ongoing'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard label="Duration" value={`${elapsedMin} min`} />
            <MetricCard label="Distance" value={`${distanceKm.toFixed(2)} km`} />
            <MetricCard label="Sun Score" value={suiPct != null ? `${suiPct}%` : '—'} />
            <MetricCard label="Venues" value={`${metrics.venues.count}`} />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleDownloadPostcard}
              className="bg-white/10 hover:bg-white/15 border border-white/15"
            >
              <Download className="h-4 w-4 mr-2" />
              Download postcard
            </Button>
            
            <Button
              onClick={handleShare}
              disabled={sharing}
              variant="outline"
              size="sm"
            >
              {sharing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4 mr-2" />
              )}
              Share
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Energy Journey */}
      {metrics.energySamples.length > 1 && (
        <Card className="bg-white/[0.04] border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Energy Journey</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <VibeArcChart
                data={metrics.energySamples}
                width={Math.min(960, typeof window !== 'undefined' ? window.innerWidth - 64 : 800)}
                height={160}
                color="#fff"
                peaks={3}
                markers={chartMarkers}
              />
            </div>
            {vibeAnalysis && (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">
                  Pattern: {vibeAnalysis.patterns?.type || 'unknown'}
                </Badge>
                <Badge variant="secondary">
                  Consistency: {Math.round((vibeAnalysis.patterns?.consistency || 0) * 100)}%
                </Badge>
                <Badge variant="secondary">
                  Peaks: {vibeAnalysis.arc?.peaks?.length || 0}
                </Badge>
                <Badge variant="secondary">
                  Transitions: {vibeAnalysis.arc?.transitions?.length || 0}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Top Venues */}
      <Card className="bg-white/[0.04] border-white/[0.06]">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Top Venues</CardTitle>
        </CardHeader>
        <CardContent>
          {!metrics.venues.top.length ? (
            <div className="text-white/60">No venues detected this flow.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {metrics.venues.top.map((venue) => (
                <div key={venue.venue_id} className="rounded-lg px-4 py-3 bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">#{venue.rank} • Venue {venue.venue_id?.slice(0, 8)}</div>
                    <div className="text-white/70">{Math.round(venue.totalMin)}m</div>
                  </div>
                  <div className="text-white/60 text-sm">{venue.visits} visit{venue.visits === 1 ? '' : 's'}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flow Statistics */}
      <Card className="bg-white/[0.04] border-white/[0.06]">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Flow Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-white/60 text-sm">Avg Pace</div>
              <div className="font-semibold">
                {metrics.pace.avgMPerMin ? `${Math.round(metrics.pace.avgMPerMin)} m/min` : '—'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-white/60 text-sm">Segments</div>
              <div className="font-semibold">{metrics.segments.length}</div>
            </div>
            <div className="space-y-1">
              <div className="text-white/60 text-sm">Discovered</div>
              <div className="font-semibold">{metrics.venues.discovered}</div>
            </div>
            <div className="space-y-1">
              <div className="text-white/60 text-sm">Path Points</div>
              <div className="font-semibold">{metrics.path.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
      <div className="text-white/60 text-sm">{label}</div>
      <div className="text-white/90 text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}