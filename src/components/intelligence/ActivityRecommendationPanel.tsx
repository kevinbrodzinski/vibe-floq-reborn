import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Activity, Zap, Clock, ExternalLink, ChevronRight, Lightbulb } from 'lucide-react';
import { ActivityRecommendationEngine, type ActivityRecommendation } from '@/core/intelligence/ActivityRecommendationEngine';
import { usePersonalityInsights } from '@/hooks/usePersonalityInsights';
import { useVibeEngine } from '@/hooks/useVibeEngine';
import { vibeToHex } from '@/lib/vibe';

export function ActivityRecommendationPanel() {
  const insights = usePersonalityInsights();
  const engine = useVibeEngine();
  const [recommendations, setRecommendations] = useState<ActivityRecommendation[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!insights?.hasEnoughData || !engine) {
      setRecommendations([]);
      return;
    }

    const updateRecommendations = () => {
      const recommendationEngine = new ActivityRecommendationEngine(insights);
      const now = new Date();
      
      const context = {
        currentVibe: engine.currentVibe,
        currentConfidence: engine.confidence,
        timeOfDay: now.getHours(),
        dayOfWeek: now.getDay(),
        isWeekend: now.getDay() === 0 || now.getDay() === 6,
        availableTime: undefined, // Could be enhanced with calendar integration
        currentLocation: undefined, // Could be enhanced with location services
        recentVenues: [] // Could be enhanced with venue history
      };

      const newRecommendations = recommendationEngine.generateRecommendations(context);
      
      // Filter out dismissed recommendations
      const filteredRecommendations = newRecommendations.filter(rec => 
        !dismissedIds.has(rec.id.split('-').slice(0, 2).join('-')) // Match by type and base
      );
      
      setRecommendations(filteredRecommendations);
    };

    updateRecommendations();
    
    // Update recommendations every 15 minutes
    const interval = setInterval(updateRecommendations, 15 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [insights, engine, dismissedIds]);

  const handleDismiss = (recommendation: ActivityRecommendation) => {
    const dismissKey = recommendation.id.split('-').slice(0, 2).join('-');
    setDismissedIds(prev => new Set([...prev, dismissKey]));
    
    // Auto-clear dismissals after 4 hours
    setTimeout(() => {
      setDismissedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(dismissKey);
        return newSet;
      });
    }, 4 * 60 * 60 * 1000);
  };

  if (!insights?.hasEnoughData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Smart Recommendations</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Personalized activity suggestions coming soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs">
            Need {Math.max(0, 10 - (insights?.correctionCount || 0))} more corrections for personalized recommendations
          </p>
        </CardContent>
      </Card>
    );
  }

  const getTypeIcon = (type: ActivityRecommendation['type']) => {
    switch (type) {
      case 'venue': return <MapPin className="h-3 w-3" />;
      case 'activity': return <Activity className="h-3 w-3" />;
      case 'vibe-shift': return <Zap className="h-3 w-3" />;
      default: return <Lightbulb className="h-3 w-3" />;
    }
  };

  const getTypeColor = (type: ActivityRecommendation['type']) => {
    switch (type) {
      case 'venue': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'activity': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'vibe-shift': return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.7) return 'text-green-600';
    if (confidence > 0.5) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Smart Recommendations</CardTitle>
            {recommendations.length > 0 && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-500/20">
                {recommendations.length} available
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="h-6 px-2 text-xs"
          >
            {showDetails ? 'Hide' : 'Details'}
            <ChevronRight className={`h-3 w-3 ml-1 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
          </Button>
        </div>
        <CardDescription className="text-xs">
          Based on your patterns and current vibe
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {recommendations.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No recommendations right now - check back later!
          </p>
        ) : (
          <div className="space-y-3">
            {recommendations.slice(0, showDetails ? 5 : 3).map((rec) => (
              <div
                key={rec.id}
                className="p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-xs ${getTypeColor(rec.type)}`}>
                        {getTypeIcon(rec.type)}
                        {rec.type}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: vibeToHex(rec.targetVibe) }}
                        />
                        <span className="text-xs text-muted-foreground">→ {rec.targetVibe}</span>
                      </div>
                    </div>
                    
                    <h4 className="text-sm font-medium mb-1">{rec.title}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{rec.description}</p>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {rec.estimatedDuration}
                      </div>
                      <span className={`font-medium ${getConfidenceColor(rec.confidence)}`}>
                        {Math.round(rec.confidence * 100)}% match
                      </span>
                    </div>
                    
                    {rec.contextualTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rec.contextualTags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    {rec.actionable.canNavigate && (
                      <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDismiss(rec)}
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </Button>
                  </div>
                </div>
                
                {/* Detailed reasoning */}
                {showDetails && rec.reasoning.length > 0 && (
                  <div className="mt-2 pt-2 border-t space-y-1">
                    {rec.reasoning.map((reason, index) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        • {reason}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {recommendations.length > 3 && !showDetails && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowDetails(true)}
            className="w-full h-8 text-xs"
          >
            Show {recommendations.length - 3} more recommendations
          </Button>
        )}

        {recommendations.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              💡 Recommendations refresh based on your current context and patterns
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}