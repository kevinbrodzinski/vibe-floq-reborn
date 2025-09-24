import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, Lightbulb, Target, ChevronRight } from 'lucide-react';
import { learningFeedback, type LearningEvent } from '@/core/intelligence/RealTimeLearningFeedback';
import { usePersonalityInsights } from '@/hooks/usePersonalityInsights';

export function LearningFeedbackPanel() {
  const insights = usePersonalityInsights();
  const [feedback, setFeedback] = useState(learningFeedback.getCurrentFeedback());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const updateFeedback = () => {
      setFeedback(learningFeedback.getCurrentFeedback());
    };

    // Listen for learning events
    const handleLearningEvent = (event: CustomEvent) => {
      updateFeedback();
    };

    window.addEventListener('vibe-learning-event', handleLearningEvent as EventListener);
    
    // Update feedback periodically
    const interval = setInterval(updateFeedback, 30000);

    return () => {
      window.removeEventListener('vibe-learning-event', handleLearningEvent as EventListener);
      clearInterval(interval);
    };
  }, []);

  if (!insights) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Pattern Learning</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Collecting data to learn your vibe patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs">
            Make corrections to start building your personal vibe intelligence
          </p>
        </CardContent>
      </Card>
    );
  }

  const getEventIcon = (type: LearningEvent['type']) => {
    switch (type) {
      case 'correction': return <Target className="h-3 w-3" />;
      case 'pattern_detected': return <Lightbulb className="h-3 w-3" />;
      case 'confidence_boost': return <TrendingUp className="h-3 w-3" />;
      default: return <Brain className="h-3 w-3" />;
    }
  };

  const getEventColor = (type: LearningEvent['type']) => {
    switch (type) {
      case 'correction': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'pattern_detected': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'confidence_boost': return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const confidenceProgress = Math.round(feedback.currentLearningState.patternStrength * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Learning Intelligence</CardTitle>
            {feedback.currentLearningState.isActivelyLearning && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-500/20">
                Learning
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
          {feedback.currentLearningState.nextMilestone}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Confidence Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Pattern Confidence</span>
            <span className="font-medium">{confidenceProgress}%</span>
          </div>
          <Progress value={confidenceProgress} className="h-1.5" />
        </div>

        {/* Recent Activity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Recent Activity</span>
            {feedback.insights.confidenceGrowth > 0 && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-500/20">
                +{feedback.insights.confidenceGrowth}% confidence
              </Badge>
            )}
          </div>
          
          <div className="space-y-1">
            {feedback.recentEvents.slice(0, showDetails ? 5 : 2).map((event) => (
              <div key={event.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                <div className={`flex items-center justify-center w-5 h-5 rounded-full ${getEventColor(event.type)}`}>
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{event.description}</p>
                  <p className="text-xs text-muted-foreground truncate">{event.impact}</p>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(event.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insights */}
        {showDetails && (
          <div className="space-y-2 pt-2 border-t">
            {feedback.insights.strongestPatterns.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Strongest Patterns</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {feedback.insights.strongestPatterns.map((pattern, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {pattern}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {feedback.insights.recentDiscoveries.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Recent Discoveries</span>
                <ul className="mt-1 space-y-1">
                  {feedback.insights.recentDiscoveries.map((discovery, index) => (
                    <li key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lightbulb className="h-3 w-3" />
                      {discovery}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Corrections</span>
                <p className="font-medium">{insights.correctionCount}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Data Quality</span>
                <p className="font-medium capitalize">{insights.dataQuality}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}