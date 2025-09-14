import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, MapPin, Clock, Sparkles } from 'lucide-react';
import { usePersonalityInsights } from '@/hooks/usePersonalityInsights';
import { intelligenceIntegration } from '@/lib/intelligence/IntelligenceIntegration';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface IntelligenceCardProps {
  variant?: 'compact' | 'full';
  className?: string;
  onViewDetails?: () => void;
}

/**
 * Main UI card for surfacing intelligence features in the home screen
 */
export function IntelligenceCard({ variant = 'compact', className, onViewDetails }: IntelligenceCardProps) {
  const insights = usePersonalityInsights();
  const [intelligenceState, setIntelligenceState] = React.useState<any>(null);

  React.useEffect(() => {
    // Get current intelligence state
    const state = intelligenceIntegration.getIntelligenceState();
    setIntelligenceState(state);
  }, []);

  if (!insights.hasEnoughData && variant === 'compact') {
    return (
      <Card className={cn("bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-sm">Personal Intelligence</h3>
              <p className="text-xs text-muted-foreground">
                {10 - insights.correctionCount} more corrections to unlock
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              Building
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights.hasEnoughData && variant === 'full') {
    return (
      <Card className={cn("bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Personal Intelligence
          </CardTitle>
          <CardDescription>
            Building your vibe intelligence profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Progress</span>
            <span className="text-sm font-medium">
              {insights.correctionCount}/10 corrections
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (insights.correctionCount / 10) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Keep correcting auto-detected vibes to build your personal intelligence system
          </p>
        </CardContent>
      </Card>
    );
  }

  // Active intelligence features
  const recentInsights = intelligenceState?.recentInsights || [];
  const hasRecentActivity = intelligenceState?.learningStatus?.isActivelyLearning;

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={cn("bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 cursor-pointer hover:from-primary/10 hover:to-primary/15 transition-all", className)} onClick={onViewDetails}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Brain className="h-4 w-4 text-primary" />
                {hasRecentActivity && (
                  <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm">Intelligence Active</h3>
                <p className="text-xs text-muted-foreground">
                  {recentInsights.length > 0 ? `${recentInsights.length} new insights` : 'Learning from patterns'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-500/20">
                  Active
                </Badge>
                {recentInsights.length > 0 && (
                  <Sparkles className="h-3 w-3 text-primary animate-bounce" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <Card className={cn("bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Personal Intelligence
            {hasRecentActivity && (
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
            Active
          </Badge>
        </CardTitle>
        <CardDescription>
          AI-powered insights from {insights.correctionCount} corrections
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Intelligence metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Personality</span>
            </div>
            <p className="text-sm font-medium">{insights.chronotype}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Energy</span>
            </div>
            <p className="text-sm font-medium">{insights.energyType}</p>
          </div>
        </div>

        {/* Recent insights */}
        {recentInsights.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Recent Insights
            </h4>
            <div className="space-y-1">
              {recentInsights.slice(0, 2).map((insight: any, index: number) => (
                <div key={index} className="text-xs p-2 bg-secondary/50 rounded">
                  {insight.description}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-4" 
          onClick={onViewDetails}
        >
          View Intelligence Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}