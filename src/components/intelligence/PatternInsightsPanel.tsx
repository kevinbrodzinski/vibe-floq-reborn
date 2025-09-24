// Pattern insights visualization and debugging panel
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePatternEnrichedPersonality } from '@/hooks/usePatternEnrichedPersonality';
import { 
  readAllPatterns, 
  cleanupOldPatterns, 
  invalidatePatternCache 
} from '@/core/patterns/service';
import { 
  performPatternMaintenance, 
  initializePatternLearning 
} from '@/core/patterns/learner';
import { 
  getPatternTelemetry, 
  resetPatternTelemetry 
} from '@/core/patterns/engine-integration';
import { vibeEmoji } from '@/utils/vibe';
import type { V1, VenueImpacts, TemporalPrefs, PersonalityProfile } from '@/core/patterns/store';

export function PatternInsightsPanel() {
  const { insights, patternMetadata, getPatternConfidence, getPatternExplanation } = usePatternEnrichedPersonality();
  const [patterns, setPatterns] = useState<{
    venue: V1<VenueImpacts>;
    temporal: V1<TemporalPrefs>;
    profile: V1<PersonalityProfile>;
  } | null>(null);
  const [telemetry, setTelemetry] = useState(getPatternTelemetry());
  const [isLoading, setIsLoading] = useState(false);

  // Load pattern data
  useEffect(() => {
    loadPatterns();
    const interval = setInterval(() => {
      setTelemetry(getPatternTelemetry());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadPatterns = async () => {
    try {
      const allPatterns = await readAllPatterns();
      setPatterns(allPatterns);
    } catch (error) {
      console.warn('Failed to load patterns:', error);
    }
  };

  const handleMaintenance = async () => {
    setIsLoading(true);
    try {
      await performPatternMaintenance();
      await loadPatterns();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanup = async () => {
    setIsLoading(true);
    try {
      await cleanupOldPatterns();
      await loadPatterns();
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      invalidatePatternCache();
      resetPatternTelemetry();
      setTelemetry(getPatternTelemetry());
      await loadPatterns();
    } finally {
      setIsLoading(false);
    }
  };

  const patternConfidence = getPatternConfidence();
  const patternExplanation = getPatternExplanation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧠 Pattern Intelligence
          <Badge variant={patternMetadata.hasPatternData ? "default" : "secondary"}>
            {patternMetadata.hasPatternData ? "Active" : "Learning"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Cross-session learning and behavioral pattern recognition
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Pattern Confidence */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Pattern Confidence</Label>
            <span className="text-sm text-muted-foreground">
              {(patternConfidence * 100).toFixed(0)}%
            </span>
          </div>
          <Progress value={patternConfidence * 100} className="h-2" />
          {patternExplanation && (
            <p className="text-sm text-muted-foreground">{patternExplanation}</p>
          )}
        </div>

        <Separator />

        {/* Enhanced Personality Profile */}
        <div className="space-y-3">
          <h4 className="font-medium">Enhanced Personality Profile</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Energy Type</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{insights.energyType}</Badge>
                {insights.confidence > 0.7 && <span className="text-green-500">✓</span>}
              </div>
            </div>
            <div>
              <Label className="text-sm">Social Type</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{insights.socialType}</Badge>
                {insights.confidence > 0.7 && <span className="text-green-500">✓</span>}
              </div>
            </div>
            <div>
              <Label className="text-sm">Chronotype</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{insights.chronotype}</Badge>
                {patternMetadata.sampleCount > 20 && <span className="text-blue-500">📊</span>}
              </div>
            </div>
            <div>
              <Label className="text-sm">Consistency</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{insights.consistency}</Badge>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Venue Patterns */}
        {patterns?.venue && Object.keys(patterns.venue.data).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Learned Venue Patterns</h4>
            <div className="space-y-2">
              {Object.entries(patterns.venue.data).slice(0, 5).map(([venueType, impact]) => (
                <div key={venueType} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{venueType}</span>
                    <Badge variant="secondary" className="text-xs">
                      {impact.sampleN} samples
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={impact.energyDelta > 0 ? "text-green-600" : "text-red-600"}>
                      {impact.energyDelta > 0 ? "+" : ""}{impact.energyDelta.toFixed(2)}
                    </span>
                    {Object.entries(impact.preferredVibes).slice(0, 2).map(([vibe, weight]) => (
                      <span key={vibe} title={`${vibe}: ${(weight * 100).toFixed(0)}%`}>
                        {vibeEmoji(vibe)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Temporal Patterns */}
        {patterns?.temporal && Object.keys(patterns.temporal.data).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Time-of-Day Preferences</h4>
            <div className="grid grid-cols-6 gap-1 text-xs">
              {Array.from({ length: 24 }, (_, hour) => {
                const prefs = patterns.temporal.data[hour];
                const topVibe = prefs ? Object.entries(prefs)
                  .sort(([,a], [,b]) => (b || 0) - (a || 0))[0] : null;
                
                return (
                  <div key={hour} className="text-center p-1 bg-muted/30 rounded" title={`${hour}:00`}>
                    <div className="font-mono">{hour}</div>
                    {topVibe && topVibe[1] > 0.3 && (
                      <div>{vibeEmoji(topVibe[0])}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Separator />

        {/* Performance Telemetry */}
        <div className="space-y-3">
          <h4 className="font-medium">Performance Telemetry</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <Label>Avg Apply Time</Label>
              <div className="font-mono">{telemetry.averageApplyMs}ms</div>
            </div>
            <div>
              <Label>Total Reads</Label>
              <div className="font-mono">{telemetry.totalReads}</div>
            </div>
            <div>
              <Label>Status</Label>
              <Badge variant={telemetry.enabled ? "default" : "secondary"}>
                {telemetry.enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Pattern Management */}
        <div className="space-y-3">
          <h4 className="font-medium">Pattern Management</h4>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleMaintenance}
              disabled={isLoading}
            >
              Run Maintenance
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCleanup}
              disabled={isLoading}
            >
              Cleanup Old Data
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReset}
              disabled={isLoading}
            >
              Reset Cache
            </Button>
          </div>
          
          {patternMetadata.hasPatternData && (
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date(patternMetadata.profileUpdated).toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}