import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Clock, MapPin, Activity, Smartphone, Cloud } from 'lucide-react';
import type { VibeReading } from '@/core/vibe/types';
import type { PersonalityInsights } from '@/types/personality';

interface WhyThisVibeProps {
  reading: VibeReading;
  patterns?: PersonalityInsights | null;
  className?: string;
}

interface VibeReason {
  text: string;
  contribution: number;
  icon: React.ComponentType<{ className?: string }>;
  category: 'temporal' | 'movement' | 'venue' | 'device' | 'weather' | 'pattern';
}

/**
 * Explainer component that shows why a particular vibe was detected
 */
export function WhyThisVibe({ reading, patterns, className }: WhyThisVibeProps) {
  const reasons = React.useMemo(() => {
    const reasons: VibeReason[] = [];
    const c = reading.components;

    // Temporal (circadian) reasons
    if (c.circadian > 0.7) {
      const hour = new Date().getHours();
      let timeDescription = 'Time-of-day boost';
      if (hour < 6) timeDescription = 'Early morning calm';
      else if (hour < 9) timeDescription = 'Morning energy rise';
      else if (hour < 17) timeDescription = 'Active daytime hours';
      else if (hour < 22) timeDescription = 'Evening social peak';
      else timeDescription = 'Late night wind-down';
      
      reasons.push({
        text: timeDescription,
        contribution: c.circadian,
        icon: Clock,
        category: 'temporal'
      });
    }

    // Movement reasons
    if (c.movement > 0.6) {
      reasons.push({
        text: 'You\'ve been active',
        contribution: c.movement,
        icon: Activity,
        category: 'movement'
      });
    }

    // Venue reasons
    if (c.venueEnergy > 0.6 && reading.venueIntelligence) {
      const venue = reading.venueIntelligence;
      reasons.push({
        text: `Venue vibe: ${venue.vibeProfile.primaryVibe}`,
        contribution: c.venueEnergy,
        icon: MapPin,
        category: 'venue'
      });
    }

    // Device usage reasons
    if (c.deviceUsage > 0.6) {
      reasons.push({
        text: 'Screen activity influence',
        contribution: c.deviceUsage,
        icon: Smartphone,
        category: 'device'
      });
    }

    // Weather reasons
    if (c.weather > 0.5) {
      reasons.push({
        text: 'Weather condition effect',
        contribution: c.weather,
        icon: Cloud,
        category: 'weather'
      });
    }

    // Pattern-based reasons
    if (patterns?.hasEnoughData) {
      if (patterns.chronotype === 'lark' && new Date().getHours() < 12) {
        reasons.push({
          text: 'You\'re a morning person',
          contribution: 0.6,
          icon: Brain,
          category: 'pattern'
        });
      }
      if (patterns.chronotype === 'owl' && new Date().getHours() > 18) {
        reasons.push({
          text: 'Evening owl pattern',
          contribution: 0.6,
          icon: Brain,
          category: 'pattern'
        });
      }
      if (patterns.energyType === 'high-energy') {
        reasons.push({
          text: 'Personal high-energy trend',
          contribution: 0.5,
          icon: Brain,
          category: 'pattern'
        });
      }
    }

    // Sort by contribution and return top 4
    return reasons.sort((a, b) => b.contribution - a.contribution).slice(0, 4);
  }, [reading, patterns]);

  if (reasons.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            No significant factors detected for this reading.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Why "{reading.vibe}"?
        </CardTitle>
        <CardDescription>
          Confidence: {Math.round(reading.confidence01 * 100)}%
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {reasons.map((reason, index) => {
          const IconComponent = reason.icon;
          return (
            <div key={index} className="flex items-center gap-3">
              <div className="p-1.5 rounded-full bg-primary/10">
                <IconComponent className="h-3 w-3 text-primary" />
              </div>
              <div className="flex-1">
                <span className="text-sm">{reason.text}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {Math.round(reason.contribution * 100)}%
              </Badge>
            </div>
          );
        })}
        
        {patterns?.hasEnoughData && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Learning from {patterns.correctionCount} vibe corrections
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}