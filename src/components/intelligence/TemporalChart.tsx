// Temporal preference chart - 24-hour vibe patterns and chronotype analysis
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCachedTemporalPrefs } from '@/core/patterns/service';
import { usePatternEnrichedPersonality } from '@/hooks/usePatternEnrichedPersonality';
import { vibeEmoji } from '@/utils/vibe';
import type { TemporalPrefs } from '@/core/patterns/store';
import type { Vibe } from '@/lib/vibes';

interface HourData {
  hour: number;
  topVibe: string | null;
  vibeWeight: number;
  confidence: number;
  hasData: boolean;
}

interface ChronotypeInsight {
  type: 'lark' | 'owl' | 'balanced';
  confidence: number;
  peakHours: number[];
  lowEnergyHours: number[];
  explanation: string;
}

export function TemporalChart() {
  const { insights, patternMetadata } = usePatternEnrichedPersonality();
  const [hourlyData, setHourlyData] = useState<HourData[]>([]);
  const [chronotype, setChronotype] = useState<ChronotypeInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemporalData();
  }, []);

  const loadTemporalData = async () => {
    try {
      const temporalStore = await getCachedTemporalPrefs();
      const processed = processTemporalData(temporalStore.data);
      setHourlyData(processed);
      setChronotype(analyzeChronotype(temporalStore.data, insights.chronotype));
    } catch (error) {
      console.warn('Failed to load temporal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processTemporalData = (temporal: TemporalPrefs): HourData[] => {
    return Array.from({ length: 24 }, (_, hour) => {
      const prefs = temporal[hour];
      
      if (!prefs || Object.keys(prefs).length === 0) {
        return {
          hour,
          topVibe: null,
          vibeWeight: 0,
          confidence: 0,
          hasData: false
        };
      }

      const sortedVibes = Object.entries(prefs)
        .sort(([, a], [, b]) => (b || 0) - (a || 0));
      
      const topVibe = sortedVibes[0];
      const sampleEstimate = Math.min(10, Object.values(prefs).reduce((sum, w) => sum + (w || 0), 0) * 20);
      
      return {
        hour,
        topVibe: topVibe ? topVibe[0] : null,
        vibeWeight: topVibe ? topVibe[1] || 0 : 0,
        confidence: Math.min(1, sampleEstimate / 10),
        hasData: topVibe ? (topVibe[1] || 0) > 0.2 : false
      };
    });
  };

  const analyzeChronotype = (temporal: TemporalPrefs, detectedType: string): ChronotypeInsight => {
    const energyVibes = new Set(['hype', 'flowing', 'social', 'curious']);
    const energyByHour = Array.from({ length: 24 }, (_, hour) => {
      const prefs = temporal[hour] || {};
      return Object.entries(prefs)
        .filter(([vibe]) => energyVibes.has(vibe))
        .reduce((sum, [, weight]) => sum + (weight || 0), 0);
    });

    // Find peak energy hours
    const avgEnergy = energyByHour.reduce((a, b) => a + b, 0) / 24;
    const peakHours = energyByHour
      .map((energy, hour) => ({ hour, energy }))
      .filter(({ energy }) => energy > avgEnergy * 1.5)
      .map(({ hour }) => hour);

    const lowEnergyHours = energyByHour
      .map((energy, hour) => ({ hour, energy }))
      .filter(({ energy }) => energy < avgEnergy * 0.5)
      .map(({ hour }) => hour);

    // Determine chronotype based on peak hours
    let type: 'lark' | 'owl' | 'balanced' = 'balanced';
    let explanation = 'Consistent energy throughout the day';

    if (peakHours.some(h => h < 10)) {
      type = 'lark';
      explanation = 'Peak energy in the morning hours';
    } else if (peakHours.some(h => h > 18)) {
      type = 'owl';
      explanation = 'Peak energy in the evening/night';
    }

    // Use detected chronotype if we have enough data
    if (patternMetadata.sampleCount > 20) {
      type = detectedType as 'lark' | 'owl' | 'balanced';
    }

    const confidence = Math.min(1, patternMetadata.sampleCount / 30);

    return {
      type,
      confidence,
      peakHours,
      lowEnergyHours,
      explanation
    };
  };

  const getHourColor = (hour: number, hasData: boolean, confidence: number): string => {
    if (!hasData) return 'bg-gray-100';
    
    const intensity = Math.round(confidence * 3);
    if (hour < 6 || hour > 22) return `bg-blue-${100 + intensity * 100}`;
    if (hour >= 6 && hour < 12) return `bg-yellow-${100 + intensity * 100}`;
    if (hour >= 12 && hour < 18) return `bg-green-${100 + intensity * 100}`;
    return `bg-orange-${100 + intensity * 100}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🕐 Temporal Patterns</CardTitle>
          <CardDescription>Loading temporal patterns...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🕐 Temporal Patterns</CardTitle>
        <CardDescription>
          Your vibe preferences throughout the day and chronotype analysis
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="wheel" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="wheel">24-Hour Wheel</TabsTrigger>
            <TabsTrigger value="chronotype">Chronotype</TabsTrigger>
          </TabsList>
          
          <TabsContent value="wheel" className="space-y-4">
            <div className="grid grid-cols-6 gap-2">
              {hourlyData.map((data) => (
                <div
                  key={data.hour}
                  className={`
                    aspect-square rounded-lg p-2 text-center transition-colors
                    ${data.hasData ? 'border-2 border-primary/20' : 'border border-gray-200'}
                    ${getHourColor(data.hour, data.hasData, data.confidence)}
                  `}
                >
                  <div className="text-xs font-mono text-gray-600">
                    {data.hour.toString().padStart(2, '0')}
                  </div>
                  {data.topVibe && (
                    <div className="text-lg mt-1" title={`${data.topVibe} (${(data.vibeWeight * 100).toFixed(0)}%)`}>
                      {vibeEmoji(data.topVibe)}
                    </div>
                  )}
                  {data.hasData && (
                    <div className="text-xs text-gray-500 mt-1">
                      {(data.confidence * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-200 rounded"></div>
                  <span>Morning (6-12)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-200 rounded"></div>
                  <span>Afternoon (12-18)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-200 rounded"></div>
                  <span>Evening (18-22)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-200 rounded"></div>
                  <span>Night (22-6)</span>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="chronotype" className="space-y-4">
            {chronotype && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl mb-2">
                    {chronotype.type === 'lark' ? '🐦' : chronotype.type === 'owl' ? '🦉' : '⚖️'}
                  </div>
                  <h3 className="text-xl font-semibold capitalize">
                    {chronotype.type === 'lark' ? 'Morning Person' : 
                     chronotype.type === 'owl' ? 'Night Owl' : 'Balanced'}
                  </h3>
                  <Badge className="mt-2">
                    {(chronotype.confidence * 100).toFixed(0)}% confidence
                  </Badge>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-center text-muted-foreground">
                    {chronotype.explanation}
                  </p>
                </div>
                
                {chronotype.peakHours.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Peak Energy Hours</h4>
                    <div className="flex flex-wrap gap-2">
                      {chronotype.peakHours.map((hour) => (
                        <Badge key={hour} variant="outline">
                          {hour.toString().padStart(2, '0')}:00
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {chronotype.lowEnergyHours.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Low Energy Hours</h4>
                    <div className="flex flex-wrap gap-2">
                      {chronotype.lowEnergyHours.map((hour) => (
                        <Badge key={hour} variant="secondary">
                          {hour.toString().padStart(2, '0')}:00
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-sm text-muted-foreground">
                  Based on {patternMetadata.sampleCount} behavioral samples
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}