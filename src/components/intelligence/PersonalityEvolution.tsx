// Personality evolution timeline visualization  
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { storage } from '@/lib/storage';
import { STORAGE_KEYS, EMPTY_TIMELINE } from '@/core/patterns/store';
import { usePatternEnrichedPersonality } from '@/hooks/usePatternEnrichedPersonality';
import type { PersonalitySnapshot } from '@/core/patterns/store';

interface TimelineData {
  date: string;
  timestamp: number;
  energyPreference: number;
  socialPreference: number;
  consistency: number;
  sampleCount: number;
  chronotype: string;
}

interface PersonalityTrend {
  trait: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  magnitude: number;
  description: string;
}

export function PersonalityEvolution() {
  const { insights, patternMetadata } = usePatternEnrichedPersonality();
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [trends, setTrends] = useState<PersonalityTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimelineData();
  }, []);

  const loadTimelineData = async () => {
    try {
      const timelineStore = await readPersonalityTimeline();
      const processedData = processTimelineData(timelineStore.data);
      setTimeline(processedData);
      setTrends(analyzeTrends(processedData));
    } catch (error) {
      console.warn('Failed to load personality timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const processTimelineData = (snapshots: PersonalitySnapshot[]): TimelineData[] => {
    return snapshots
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(snapshot => ({
        date: new Date(snapshot.timestamp).toLocaleDateString(),
        timestamp: snapshot.timestamp,
        energyPreference: snapshot.energyPreference,
        socialPreference: snapshot.socialPreference,
        consistency: snapshot.consistency01,
        sampleCount: snapshot.sampleCount,
        chronotype: snapshot.chronotype
      }));
  };

  const analyzeTrends = (data: TimelineData[]): PersonalityTrend[] => {
    if (data.length < 2) return [];

    const trends: PersonalityTrend[] = [];
    const recent = data.slice(-4); // Last 4 snapshots

    // Analyze energy preference trend
    const energyTrend = calculateTrend(recent.map(d => d.energyPreference));
    trends.push({
      trait: 'Energy Preference',
      direction: energyTrend.direction,
      magnitude: Math.abs(energyTrend.slope),
      description: getEnergyTrendDescription(energyTrend)
    });

    // Analyze social preference trend
    const socialTrend = calculateTrend(recent.map(d => d.socialPreference));
    trends.push({
      trait: 'Social Preference',
      direction: socialTrend.direction,
      magnitude: Math.abs(socialTrend.slope),
      description: getSocialTrendDescription(socialTrend)
    });

    // Analyze consistency trend
    const consistencyTrend = calculateTrend(recent.map(d => d.consistency));
    trends.push({
      trait: 'Behavioral Consistency',
      direction: consistencyTrend.direction,
      magnitude: Math.abs(consistencyTrend.slope),
      description: getConsistencyTrendDescription(consistencyTrend)
    });

    return trends.filter(t => t.magnitude > 0.05); // Only significant trends
  };

  const calculateTrend = (values: number[]): { direction: 'increasing' | 'decreasing' | 'stable'; slope: number } => {
    if (values.length < 2) return { direction: 'stable', slope: 0 };

    // Simple linear regression
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    if (Math.abs(slope) < 0.05) return { direction: 'stable', slope };
    return { direction: slope > 0 ? 'increasing' : 'decreasing', slope };
  };

  const getEnergyTrendDescription = (trend: { direction: string; slope: number }): string => {
    if (trend.direction === 'increasing') {
      return trend.slope > 0.2 ? 'Becoming much more high-energy' : 'Becoming more energetic';
    } else if (trend.direction === 'decreasing') {
      return trend.slope < -0.2 ? 'Becoming much more low-energy' : 'Becoming more calm and focused';
    }
    return 'Energy preferences remain stable';
  };

  const getSocialTrendDescription = (trend: { direction: string; slope: number }): string => {
    if (trend.direction === 'increasing') {
      return trend.slope > 0.2 ? 'Becoming much more social' : 'Becoming more social';
    } else if (trend.direction === 'decreasing') {
      return trend.slope < -0.2 ? 'Becoming much more solo-focused' : 'Preferring more alone time';
    }
    return 'Social preferences remain stable';
  };

  const getConsistencyTrendDescription = (trend: { direction: string; slope: number }): string => {
    if (trend.direction === 'increasing') {
      return 'Developing more consistent patterns';
    } else if (trend.direction === 'decreasing') {
      return 'Becoming more adaptable and spontaneous';
    }
    return 'Consistency remains stable';
  };

  const saveCurrentSnapshot = async () => {
    try {
      const timelineStore = await readPersonalityTimeline();
      
      const snapshot: PersonalitySnapshot = {
        timestamp: Date.now(),
        energyPreference: insights.energyType === 'high-energy' ? 0.5 : insights.energyType === 'low-energy' ? -0.5 : 0,
        socialPreference: insights.socialType === 'social' ? 0.5 : insights.socialType === 'solo' ? -0.5 : 0,
        chronotype: insights.chronotype,
        consistency01: insights.consistency === 'very-consistent' ? 0.9 : 
                     insights.consistency === 'consistent' ? 0.7 : 
                     insights.consistency === 'adaptive' ? 0.5 : 0.3,
        sampleCount: patternMetadata.sampleCount,
        contextInfo: {
          totalVenues: 0, // Would need to calculate from venue patterns
          dominantVenueTypes: [],
          socialSessionRatio: 0.5
        }
      };
      
      timelineStore.data.push(snapshot);
      
      // Keep only last 52 snapshots (1 year of weekly snapshots)
      if (timelineStore.data.length > 52) {
        timelineStore.data = timelineStore.data.slice(-52);
      }
      
      await writePersonalityTimeline(timelineStore);
      await loadTimelineData();
    } catch (error) {
      console.warn('Failed to save personality snapshot:', error);
    }
  };

  const getTrendIcon = (direction: string): string => {
    switch (direction) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (direction: string): string => {
    switch (direction) {
      case 'increasing': return 'text-green-600';
      case 'decreasing': return 'text-red-600';  
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 Personality Evolution</CardTitle>
          <CardDescription>Loading personality timeline...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>📊 Personality Evolution</CardTitle>
            <CardDescription>
              How your behavioral patterns have evolved over time
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={saveCurrentSnapshot}>
            Save Snapshot
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>
          
          <TabsContent value="timeline" className="space-y-4">
            {timeline.length >= 2 ? (
              <div className="space-y-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeline}>
                      <XAxis 
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis domain={[-1, 1]} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          value.toFixed(2),
                          name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
                        ]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="energyPreference" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        dot={{ fill: '#ef4444', r: 4 }}
                        name="Energy Preference"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="socialPreference" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 4 }}
                        name="Social Preference"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="consistency" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981', r: 4 }}
                        name="Consistency"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Energy Preference</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>Social Preference</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Consistency</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-4xl mb-2">📊</div>
                <h3 className="font-medium mb-2">Not enough timeline data</h3>
                <p className="text-sm">
                  Save snapshots over time to see your personality evolution
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="trends" className="space-y-4">
            {trends.length > 0 ? (
              <div className="space-y-3">
                {trends.map((trend, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getTrendIcon(trend.direction)}</span>
                        <h4 className="font-medium">{trend.trait}</h4>
                      </div>
                      <Badge variant="outline" className={getTrendColor(trend.direction)}>
                        {trend.direction}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{trend.description}</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Magnitude: {(trend.magnitude * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-4xl mb-2">📈</div>
                <h3 className="font-medium mb-2">No significant trends yet</h3>
                <p className="text-sm">
                  Save more snapshots to detect personality trends
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Storage operations for personality timeline
async function readPersonalityTimeline() {
  try {
    const stored = await storage.getItem(STORAGE_KEYS.TIMELINE);
    return stored ? JSON.parse(stored) : EMPTY_TIMELINE;
  } catch {
    return EMPTY_TIMELINE;
  }
}

async function writePersonalityTimeline(timeline: typeof EMPTY_TIMELINE) {
  try {
    timeline.updatedAt = Date.now();
    await storage.setJSON(STORAGE_KEYS.TIMELINE, timeline);
  } catch (error) {
    console.warn('Failed to write personality timeline:', error);
  }
}
