import React from 'react';
import { useFlowReflection } from '@/lib/flow/useFlowReflection';
import { generatePostcardClient } from '@/lib/flow/postcard';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Share2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function FlowReflectionPage({ flowId }: { flowId: string }) {
  const { summary, insights, postcardUrl, loading, error, generate, refresh } = useFlowReflection(flowId);
  const [generating, setGenerating] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generate();
      toast.success('Insights and postcard generated successfully!');
    } catch (error) {
      console.error('Failed to generate:', error);
      toast.error('Failed to generate insights');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPostcard = async () => {
    if (!summary) return;
    
    try {
      // Get flow segments for path data
      const { data: segments } = await supabase
        .from('flow_segments')
        .select('center')
        .eq('flow_id', flowId)
        .order('idx');

      const path = segments?.map(seg => {
        const coords = (seg.center as any)?.coordinates;
        return coords ? {
          lng: coords[0],
          lat: coords[1]
        } : null;
      }).filter(Boolean) || [];

      const blob = await generatePostcardClient({
        path,
        stats: {
          distanceM: summary.distanceM || 0,
          elapsedMin: summary.elapsedMin || 0,
          suiPct: summary.suiPct,
          venues: summary.topVenues?.length || 0
        },
        title: 'My Flow Reflection'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flow-postcard-${flowId}.png`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Postcard downloaded!');
    } catch (error) {
      console.error('Failed to download postcard:', error);
      toast.error('Failed to download postcard');
    }
  };

  const handleShare = async () => {
    if (!summary || !insights) return;
    
    setSharing(true);
    try {
      const shareText = `${insights.headline}\n\nJust completed a ${Math.round(summary.elapsedMin || 0)}min flow covering ${((summary.distanceM || 0) / 1000).toFixed(1)}km!`;
      
      if (navigator.share) {
        await navigator.share({
          title: 'My Flow Reflection',
          text: shareText,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success('Reflection copied to clipboard!');
      }
    } catch (error) {
      console.error('Failed to share:', error);
      toast.error('Failed to share reflection');
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

  if (error || !summary) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-300 mb-4">Failed to load reflection: {error || 'no data'}</div>
        <Button onClick={refresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const elapsedMin = Math.round(summary.elapsedMin ?? 0);
  const distanceKm = (summary.distanceM ?? 0) / 1000;
  const suiPct = summary.suiPct ?? null;

  return (
    <div className="p-4 text-white/90 space-y-6 max-w-4xl mx-auto">
      {/* Hero */}
      <Card className="bg-white/[0.04] border-white/[0.06]">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Your Flow Reflection</CardTitle>
          <p className="text-white/70">
            {new Date(summary.startedAt).toLocaleString()} → {new Date(summary.endedAt).toLocaleString()}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard label="Duration" value={`${elapsedMin} min`} />
            <MetricCard label="Distance" value={`${distanceKm.toFixed(2)} km`} />
            <MetricCard label="Sun Score" value={suiPct != null ? `${suiPct}%` : '—'} />
            <MetricCard label="Energy" value={summary.energyMedian != null ? `${(summary.energyMedian * 100 | 0)}%` : '—'} />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-white/10 hover:bg-white/15 border border-white/15"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Generate insights & postcard
            </Button>
            
            {insights && (
              <>
                <Button
                  onClick={handleDownloadPostcard}
                  variant="outline"
                  size="sm"
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
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="bg-white/[0.04] border-white/[0.06]">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">AI Insights</CardTitle>
        </CardHeader>
        <CardContent>
          {!insights ? (
            <div className="text-white/60">Click "Generate insights" to create your summary.</div>
          ) : (
            <div className="space-y-4">
              <div className="text-white/90 text-lg font-medium">{insights.headline}</div>
              
              {insights.highlights?.length ? (
                <div>
                  <div className="text-white/70 text-sm mb-2">Highlights</div>
                  <div className="flex flex-wrap gap-2">
                    {insights.highlights.map((highlight: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              
              {insights.patterns?.length ? (
                <div>
                  <div className="text-white/70 text-sm mb-2">Patterns</div>
                  <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                    {insights.patterns.map((pattern: string, i: number) => (
                      <li key={i}>{pattern}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              
              {insights.suggestions?.length ? (
                <div>
                  <div className="text-white/70 text-sm mb-2">Suggestions</div>
                  <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                    {insights.suggestions.map((suggestion: string, i: number) => (
                      <li key={i}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top venues */}
      <Card className="bg-white/[0.04] border-white/[0.06]">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Top Venues</CardTitle>
        </CardHeader>
        <CardContent>
          {!summary.topVenues?.length ? (
            <div className="text-white/60">No venues detected this flow.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {summary.topVenues.map((venue: any) => (
                <div key={venue.id} className="rounded-lg px-4 py-3 bg-white/[0.03] border border-white/[0.05]">
                  <div className="font-medium">{venue.name}</div>
                  <div className="text-white/60 text-sm">{venue.hits} segments</div>
                </div>
              ))}
            </div>
          )}
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