import React, { useState } from 'react';
import { Settings, RefreshCw, RotateCcw, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useWeightedScoring } from '@/hooks/useWeightedScoring';
import { cn } from '@/lib/utils';

interface PersonalizationSettingsProps {
  className?: string;
}

export const PersonalizationSettings: React.FC<PersonalizationSettingsProps> = ({
  className
}) => {
  const {
    weights,
    updateWeight,
    resetWeights,
    normalizeWeights,
    isDefault
  } = useWeightedScoring();

  const [isExpanded, setIsExpanded] = useState(false);

  const weightConfig = [
    {
      key: 'distance' as const,
      label: 'Distance',
      description: 'How much proximity matters',
      icon: '📍',
      color: 'hsl(var(--primary))'
    },
    {
      key: 'rating' as const,
      label: 'Rating',
      description: 'Venue quality & reviews',
      icon: '⭐',
      color: 'hsl(var(--accent))'
    },
    {
      key: 'activity' as const,
      label: 'Activity',
      description: 'Current buzz & crowd',
      icon: '🔥',
      color: 'hsl(var(--secondary))'
    },
    {
      key: 'personalization' as const,
      label: 'Personal Match',
      description: 'Based on your history',
      icon: '🎯',
      color: 'hsl(var(--muted))'
    },
    {
      key: 'recency' as const,
      label: 'Freshness',
      description: 'Recent discoveries',
      icon: '✨',
      color: 'hsl(var(--primary))'
    }
  ];

  const handleNormalize = () => {
    normalizeWeights();
  };

  const handleReset = () => {
    resetWeights();
  };

  return (
    <Card className={cn("border-border/30 bg-card/50 backdrop-blur-sm", className)}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              <Settings className="w-3 h-3 text-primary" />
            </div>
            <h3 className="text-sm font-medium text-foreground">Personalization</h3>
            {!isDefault && (
              <Badge variant="secondary" className="text-xs">
                Custom
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            <Target className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
          </Button>
        </div>

        {isExpanded ? (
          <div className="space-y-4">
            {/* Weight Controls */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground">
                Recommendation Factors
              </h4>
              
              {weightConfig.map((config) => (
                <div key={config.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{config.icon}</span>
                      <div>
                        <span className="text-xs font-medium text-foreground">
                          {config.label}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {config.description}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(weights[config.key] * 100)}%
                    </span>
                  </div>
                  
                  <Slider
                    value={[weights[config.key]]}
                    onValueChange={(value) => updateWeight(config.key, value[0])}
                    max={1}
                    min={0}
                    step={0.05}
                    className="w-full"
                  />
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleNormalize}
                className="flex-1 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Normalize
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                disabled={isDefault}
                className="flex-1 text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            </div>

            {/* Info */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
              <p className="text-xs text-muted-foreground">
                Adjust these weights to customize how recommendations are ranked. 
                Higher values mean that factor is more important to you.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">
              Customize your recommendation preferences
            </p>
            <div className="flex justify-center gap-1 mt-2">
              {weightConfig.slice(0, 3).map((config) => (
                <div key={config.key} className="flex items-center gap-1">
                  <span className="text-xs">{config.icon}</span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(weights[config.key] * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};