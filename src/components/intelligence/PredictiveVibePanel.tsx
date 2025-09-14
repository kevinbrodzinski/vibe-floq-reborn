import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Clock, ChevronRight, Sparkles } from 'lucide-react';
import { PredictiveVibeEngine, type VibePrediction } from '@/core/intelligence/PredictiveVibeEngine';
import { usePersonalityInsights } from '@/hooks/usePersonalityInsights';
import { useVibeEngine } from '@/hooks/useVibeEngine';
import { vibeToHex } from '@/lib/vibe';

export function PredictiveVibePanel() {
  const insights = usePersonalityInsights();
  const engine = useVibeEngine();
  const [predictions, setPredictions] = useState<VibePrediction[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!insights?.hasEnoughData) {
      setPredictions([]);
      return;
    }

    const updatePredictions = () => {
      const predictiveEngine = new PredictiveVibeEngine(insights);
      const now = new Date();
      
      const context = {
        hour: now.getHours(),
        dayOfWeek: now.getDay(),
        isWeekend: now.getDay() === 0 || now.getDay() === 6,
        expectedVenueType: undefined, // Could be enhanced with location data
        weatherCondition: undefined   // Could be enhanced with weather data
      };

      const newPredictions = predictiveEngine.predictUpcomingVibes(context);
      setPredictions(newPredictions);
    };

    updatePredictions();
    
    // Update predictions every 30 minutes
    const interval = setInterval(updatePredictions, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [insights]);

  if (!insights?.hasEnoughData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Vibe Predictions</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Need more pattern data for predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs">
            Make {Math.max(0, 10 - insights?.correctionCount || 0)} more corrections to unlock predictive insights
          </p>
        </CardContent>
      </Card>
    );
  }

  const getTimeLabel = (timeSlot: string) => {
    switch (timeSlot) {
      case 'soon': return 'Next 2 hours';
      case 'later': return 'Later today';
      case 'evening': return 'This evening';
      case 'tonight': return 'Tonight';
      default: return timeSlot;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.7) return 'bg-green-500/10 text-green-700 border-green-500/20';
    if (confidence > 0.5) return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
    return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Vibe Predictions</CardTitle>
            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 border-purple-500/20">
              <Sparkles className="h-3 w-3 mr-1" />
              AI
            </Badge>
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
          Based on your learned patterns and context
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {predictions.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No strong predictions available right now
          </p>
        ) : (
          <div className="space-y-2">
            {predictions.map((prediction, index) => (
              <div
                key={`${prediction.timeSlot}-${prediction.vibe}`}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium">{getTimeLabel(prediction.timeSlot)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: vibeToHex(prediction.vibe) }}
                    />
                    <span className="text-sm font-medium capitalize">{prediction.vibe}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getConfidenceColor(prediction.confidence)}`}
                  >
                    {Math.round(prediction.confidence * 100)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detailed reasoning */}
        {showDetails && predictions.length > 0 && (
          <div className="space-y-3 pt-2 border-t">
            {predictions.map((prediction, index) => (
              <div key={`detail-${prediction.timeSlot}-${prediction.vibe}`} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: vibeToHex(prediction.vibe) }}
                  />
                  <span className="text-xs font-medium">{getTimeLabel(prediction.timeSlot)} - {prediction.vibe}</span>
                </div>
                
                <div className="ml-5 space-y-1">
                  {prediction.reasoning.map((reason, reasonIndex) => (
                    <p key={reasonIndex} className="text-xs text-muted-foreground">
                      • {reason}
                    </p>
                  ))}
                  
                  {prediction.contextualFactors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {prediction.contextualFactors.map((factor, factorIndex) => (
                        <Badge key={factorIndex} variant="outline" className="text-xs">
                          {factor}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {predictions.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              💡 Predictions improve as you make more corrections
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}