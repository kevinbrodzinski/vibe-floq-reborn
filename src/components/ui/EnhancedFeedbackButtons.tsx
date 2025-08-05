import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, MoreHorizontal, MapPin, Users, Clock } from 'lucide-react';
import { VibeSystemIntegration, type EnhancedFeedbackData } from '@/lib/vibeAnalysis/VibeSystemIntegration';
import { LocationEnhancedVibeSystem } from '@/lib/vibeAnalysis/LocationEnhancedVibeSystem';

interface EnhancedFeedbackButtonsProps {
  analysis: any; // Vibe detection analysis result
  onFeedback: (feedback: any) => Promise<void>;
  enhancedLocationData?: any; // Enhanced location data if available
}

/**
 * EnhancedFeedbackButtons - Adaptive feedback system
 * Provides different feedback interfaces based on user consistency and confidence
 */
export const EnhancedFeedbackButtons: React.FC<EnhancedFeedbackButtonsProps> = ({
  analysis,
  onFeedback,
  enhancedLocationData
}) => {
  const [feedbackData, setFeedbackData] = useState<EnhancedFeedbackData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetailedOptions, setShowDetailedOptions] = useState(false);
  const [vibeSystem] = useState(() => 
    enhancedLocationData ? new LocationEnhancedVibeSystem() : new VibeSystemIntegration()
  );

  // Fetch enhanced feedback data
  useEffect(() => {
    const fetchFeedbackData = async () => {
      try {
        const mockSensorData = {
          audio: { level: 0.5, pattern: 'steady' },
          light: { level: 0.7, pattern: 'stable' },
          movement: { intensity: 0.3, pattern: 'still', frequency: 0.1 },
          location: { density: 0.6, pattern: 'stationary' }
        };

        const mockContext = {
          timestamp: new Date(),
          location: enhancedLocationData?.location || null,
          socialContext: { nearbyFriends: [], crowdDensity: 0 },
          environmentalFactors: { timeOfDay: 'day', weather: 'clear' }
        };

        const data = await vibeSystem.getEnhancedFeedbackData(
          mockSensorData,
          mockContext
        );
        setFeedbackData(data);
      } catch (error) {
        console.error('Failed to fetch enhanced feedback data:', error);
      }
    };

    fetchFeedbackData();
  }, [vibeSystem, analysis, enhancedLocationData]);

  const handleFeedback = async (feedbackType: 'accept' | 'correct' | 'context', additionalData?: any) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const feedbackPayload = {
        type: feedbackType,
        originalSuggestion: analysis.suggestedVibe,
        confidence: analysis.confidence,
        timestamp: new Date(),
        profileId: 'current-user', // Would be from auth context
        sessionId: 'current-session',
        ...additionalData
      };

      await onFeedback(feedbackPayload);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-green-500';
    if (confidence > 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const renderSimpleFeedback = () => (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleFeedback('accept')}
        disabled={isSubmitting}
        className="flex items-center gap-1 text-green-600 border-green-600/30 hover:bg-green-600/10"
      >
        <CheckCircle className="w-3 h-3" />
        Correct
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleFeedback('correct')}
        disabled={isSubmitting}
        className="flex items-center gap-1 text-red-600 border-red-600/30 hover:bg-red-600/10"
      >
        <XCircle className="w-3 h-3" />
        Wrong
      </Button>
    </div>
  );

  const renderDetailedFeedback = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">How accurate was this suggestion?</span>
        <Badge className={getConfidenceColor(analysis.confidence)}>
          {Math.round(analysis.confidence * 100)}% confident
        </Badge>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleFeedback('accept', { accuracy: 'perfect' })}
          disabled={isSubmitting}
          className="text-green-600 border-green-600/30 hover:bg-green-600/10"
        >
          Perfect
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleFeedback('accept', { accuracy: 'close' })}
          disabled={isSubmitting}
          className="text-yellow-600 border-yellow-600/30 hover:bg-yellow-600/10"
        >
          Close
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleFeedback('correct', { accuracy: 'wrong' })}
          disabled={isSubmitting}
          className="text-red-600 border-red-600/30 hover:bg-red-600/10"
        >
          Wrong
        </Button>
      </div>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => setShowDetailedOptions(!showDetailedOptions)}
        className="w-full flex items-center gap-1 text-muted-foreground"
      >
        <MoreHorizontal className="w-3 h-3" />
        {showDetailedOptions ? 'Less' : 'More'} Options
      </Button>

      {showDetailedOptions && (
        <div className="space-y-2 pt-2 border-t border-border/30">
          <div className="text-xs text-muted-foreground">Why was this suggestion off?</div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleFeedback('context', { reason: 'location' })}
              disabled={isSubmitting}
              className="flex items-center gap-1 text-xs"
            >
              <MapPin className="w-3 h-3" />
              Location
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleFeedback('context', { reason: 'social' })}
              disabled={isSubmitting}
              className="flex items-center gap-1 text-xs"
            >
              <Users className="w-3 h-3" />
              Social
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleFeedback('context', { reason: 'time' })}
              disabled={isSubmitting}
              className="flex items-center gap-1 text-xs"
            >
              <Clock className="w-3 h-3" />
              Timing
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleFeedback('context', { reason: 'mood' })}
              disabled={isSubmitting}
              className="flex items-center gap-1 text-xs"
            >
              Personal
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderContextualFeedback = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Contextual Feedback</span>
        <Badge variant="outline">Smart Mode</Badge>
      </div>

      {/* Location Context */}
      {enhancedLocationData?.location && (
        <div className="text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 inline mr-1" />
          Detected at {enhancedLocationData.venueDetection?.name || 'current location'}
        </div>
      )}

      {/* Proximity Context */}
      {enhancedLocationData?.proximityEvents?.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <Users className="w-3 h-3 inline mr-1" />
          {enhancedLocationData.proximityEvents.length} friend(s) nearby
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleFeedback('accept', { 
            contextAware: true,
            locationContext: enhancedLocationData?.location,
            socialContext: enhancedLocationData?.proximityEvents
          })}
          disabled={isSubmitting}
          className="text-green-600 border-green-600/30 hover:bg-green-600/10"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          Spot On
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleFeedback('correct', { 
            contextAware: true,
            locationContext: enhancedLocationData?.location,
            socialContext: enhancedLocationData?.proximityEvents
          })}
          disabled={isSubmitting}
          className="text-red-600 border-red-600/30 hover:bg-red-600/10"
        >
          <XCircle className="w-3 h-3 mr-1" />
          Not Right
        </Button>
      </div>

      {feedbackData && (
        <div className="text-xs text-muted-foreground">
          Learning: {feedbackData.adaptiveInterface.userConsistency > 0.8 ? 'High' : 'Moderate'} consistency
        </div>
      )}
    </div>
  );

  if (!feedbackData) {
    return (
      <Card className="bg-card/40 backdrop-blur-sm border border-border/30">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-3 h-3 rounded-full bg-current animate-pulse" />
            <span className="text-sm">Loading feedback options...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { adaptiveInterface } = feedbackData;

  return (
    <Card className="bg-card/40 backdrop-blur-sm border border-border/30">
      <CardContent className="p-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Suggested: <span className="capitalize">{analysis.suggestedVibe}</span>
            </span>
            {analysis.learningBoost && (
              <Badge variant="outline" className="text-xs">
                Learning Boost
              </Badge>
            )}
          </div>

          {/* Render appropriate feedback interface */}
          {adaptiveInterface.feedbackType === 'simple' && renderSimpleFeedback()}
          {adaptiveInterface.feedbackType === 'detailed' && renderDetailedFeedback()}
          {adaptiveInterface.feedbackType === 'contextual' && renderContextualFeedback()}

          {/* Learning Progress Indicator */}
          {feedbackData.learningInsights && (
            <div className="pt-2 border-t border-border/30">
              <div className="text-xs text-muted-foreground">
                Accuracy improving: {Math.round(feedbackData.learningInsights.accuracyTrend * 100)}%
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};