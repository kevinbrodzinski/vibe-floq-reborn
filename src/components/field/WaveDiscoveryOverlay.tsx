import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Waves, Users, MapPin, Plus, Loader2 } from 'lucide-react';
import { useWavesNear } from '@/hooks/useWavesNear';
import { useWaveRippleOverview } from '@/hooks/useWaveRippleOverview';
import { useRipplesNear } from '@/hooks/useRipplesNear';
import { useCreateMomentaryFromWave } from '@/hooks/useCreateMomentaryFromWave';
import { cn } from '@/lib/utils';

interface WaveDiscoveryOverlayProps {
  lat: number;
  lng: number;
  isVisible: boolean;
  onCreateFloq?: (waveId: string) => void;
  className?: string;
}

export const WaveDiscoveryOverlay: React.FC<WaveDiscoveryOverlayProps> = ({
  lat,
  lng,
  isVisible,
  onCreateFloq,
  className
}) => {
  const [expanded, setExpanded] = useState(false);
  const { createFromWave, isCreating } = useCreateMomentaryFromWave();
  
  const { data: overview } = useWaveRippleOverview({ lat, lng, pollMs: 10000 });
  const { data: waves, loading: wavesLoading } = useWavesNear({ 
    lat, 
    lng, 
    friendsOnly: true,
    pollMs: 10000 
  });
  const { data: ripples, loading: ripplesLoading } = useRipplesNear({ 
    lat, 
    lng,
    pollMs: 15000 
  });

  const handleCreateFromWave = async (wave: any) => {
    const floqId = await createFromWave({
      waveId: wave.cluster_id,
      lat: wave.centroid_lat,
      lng: wave.centroid_lng,
      title: `Wave Floq (${wave.size} people)`,
      vibe: 'hype'
    });
    
    if (floqId) {
      onCreateFloq?.(wave.cluster_id);
      setExpanded(false); // Close overlay after successful creation
    }
  };

  if (!isVisible) return null;

  const hasWaves = (waves?.length ?? 0) > 0;
  const hasRipples = (ripples?.length ?? 0) > 0;
  const hasActivity = hasWaves || hasRipples;

  return (
    <div className={cn(
      "absolute bottom-20 right-4 max-w-sm pointer-events-auto",
      className
    )}>
      {/* Compact summary when collapsed */}
      {!expanded && hasActivity && (
        <Card className="bg-background/95 backdrop-blur border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Waves className="w-4 h-4 text-primary" />
                <div className="text-sm">
                  {overview?.waves_with_friends ?? 0} waves nearby
                </div>
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setExpanded(true)}
              >
                View
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expanded discovery panel */}
      {expanded && (
        <Card className="bg-background/95 backdrop-blur border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Waves className="w-4 h-4" />
                Wave Discovery
              </CardTitle>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setExpanded(false)}
              >
                ×
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* Overview Stats */}
            {overview && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center p-2 bg-muted rounded">
                  <div className="font-semibold">{overview.waves_total}</div>
                  <div className="text-muted-foreground">Waves</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="font-semibold">{overview.ripples_total}</div>
                  <div className="text-muted-foreground">Ripples</div>
                </div>
              </div>
            )}

            {/* Waves List */}
            {hasWaves && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-medium">Waves with Friends</div>
                  {waves?.slice(0, 3).map((wave) => (
                    <div 
                      key={wave.cluster_id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => handleCreateFromWave(wave)}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        <span className="text-sm">Size {wave.size}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {wave.friends_in_cluster} friends
                        </Badge>
                        <span>{Math.round(wave.distance_m)}m</span>
                      </div>
                    </div>
                  ))}
                  {(waves?.length ?? 0) > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{(waves?.length ?? 0) - 3} more waves
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Ripples List */}
            {hasRipples && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-medium">Ripples</div>
                  {ripples?.slice(0, 2).map((ripple) => (
                    <div 
                      key={ripple.ripple_id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded"
                    >
                      <div className="text-sm">
                        {ripple.includes_friend ? (ripple.both_friends ? 'Both friends' : 'Friend + 1') : 'Nearby pair'}
                      </div>
                      <span className="text-xs text-muted-foreground">{Math.round(ripple.distance_m)}m</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Create Floq Button */}
            {hasWaves && (
              <>
                <Separator />
                <Button 
                  className="w-full" 
                  size="sm"
                  onClick={() => {
                    // Create floq from the first wave with friends
                    const firstWave = waves?.find(w => w.friends_in_cluster > 0);
                    if (firstWave) {
                      handleCreateFromWave(firstWave);
                    }
                  }}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  {isCreating ? 'Creating...' : 'Start Momentary Floq'}
                </Button>
              </>
            )}

            {/* No Activity State */}
            {!hasActivity && !wavesLoading && !ripplesLoading && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                <Waves className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div>No waves or ripples nearby</div>
                <div className="text-xs mt-1">Check back in a few minutes</div>
              </div>
            )}

            {/* Loading State */}
            {(wavesLoading || ripplesLoading) && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                Scanning for activity...
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};