// Venue impact heatmap visualization
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCachedVenueImpacts } from '@/core/patterns/service';
import { vibeEmoji } from '@/utils/vibe';
import type { VenueImpacts } from '@/core/patterns/store';

interface VenueImpactData {
  venueType: string;
  sampleCount: number;
  energyImpact: number;
  confidence: number;
  topVibes: Array<{ vibe: string; weight: number }>;
  dwellTime: number;
}

export function VenueImpactHeatmap() {
  const [venueData, setVenueData] = useState<VenueImpactData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVenueData();
  }, []);

  const loadVenueData = async () => {
    try {
      const venueStore = await getCachedVenueImpacts();
      const processed = processVenueData(venueStore.data);
      setVenueData(processed);
    } catch (error) {
      console.warn('Failed to load venue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processVenueData = (venues: VenueImpacts): VenueImpactData[] => {
    return Object.entries(venues)
      .map(([venueType, impact]) => ({
        venueType,
        sampleCount: impact.sampleN,
        energyImpact: impact.energyDelta,
        confidence: Math.min(1, impact.sampleN / 10),
        topVibes: Object.entries(impact.preferredVibes)
          .sort(([, a], [, b]) => (b || 0) - (a || 0))
          .slice(0, 3)
          .map(([vibe, weight]) => ({ vibe, weight: weight || 0 })),
        dwellTime: impact.optimalDwellMin
      }))
      .filter(v => v.sampleCount >= 3)
      .sort((a, b) => b.confidence - a.confidence);
  };

  const getEnergyColor = (impact: number): string => {
    if (impact > 0.3) return 'text-green-600 bg-green-50';
    if (impact > 0.1) return 'text-green-500 bg-green-25';
    if (impact < -0.3) return 'text-red-600 bg-red-50';
    if (impact < -0.1) return 'text-red-500 bg-red-25';
    return 'text-gray-600 bg-gray-50';
  };

  const getEnergyLabel = (impact: number): string => {
    if (impact > 0.3) return 'High Boost';
    if (impact > 0.1) return 'Mild Boost';
    if (impact < -0.3) return 'Energy Drain';
    if (impact < -0.1) return 'Mild Drain';
    return 'Neutral';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🏢 Venue Impact Analysis</CardTitle>
          <CardDescription>Loading venue patterns...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (venueData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🏢 Venue Impact Analysis</CardTitle>
          <CardDescription>Not enough venue data yet. Visit different places to see patterns!</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🏢 Venue Impact Analysis</CardTitle>
        <CardDescription>
          How different venue types affect your energy and vibe preferences
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="energy" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="energy">Energy Impact</TabsTrigger>
            <TabsTrigger value="vibes">Vibe Preferences</TabsTrigger>
          </TabsList>
          
          <TabsContent value="energy" className="space-y-4">
            <div className="space-y-3">
              {venueData.map((venue) => (
                <div key={venue.venueType} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium capitalize">{venue.venueType.replace(/_/g, ' ')}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {venue.sampleCount} visits
                      </Badge>
                    </div>
                    <Badge className={getEnergyColor(venue.energyImpact)}>
                      {getEnergyLabel(venue.energyImpact)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Energy Impact</span>
                      <span className="font-mono">
                        {venue.energyImpact > 0 ? '+' : ''}
                        {(venue.energyImpact * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.abs(venue.energyImpact) * 100} 
                      className="h-2"
                    />
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Confidence: {(venue.confidence * 100).toFixed(0)}%</span>
                      <span>Avg dwell: {Math.round(venue.dwellTime)}min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="vibes" className="space-y-4">
            <div className="space-y-3">
              {venueData.map((venue) => (
                <div key={venue.venueType} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium capitalize">{venue.venueType.replace(/_/g, ' ')}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {venue.sampleCount} visits
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground mb-2">Preferred Vibes</div>
                    {venue.topVibes.length > 0 ? (
                      <div className="space-y-1">
                        {venue.topVibes.map((vibe) => (
                          <div key={vibe.vibe} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span>{vibeEmoji(vibe.vibe)}</span>
                              <span className="text-sm capitalize">{vibe.vibe}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={vibe.weight * 100} 
                                className="w-20 h-2"
                              />
                              <span className="text-xs font-mono w-8">
                                {(vibe.weight * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Not enough data for vibe preferences
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}