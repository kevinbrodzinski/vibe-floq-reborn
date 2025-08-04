import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Check, 
  X, 
  Brain, 
  TrendingUp, 
  User, 
  Zap,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Target,
  Clock,
  Sparkles
} from 'lucide-react';
import { VibeSystemIntegration, type EnhancedFeedbackData } from '@/lib/vibeAnalysis/VibeSystemIntegration';
import { LocationEnhancedVibeSystem } from '@/lib/vibeAnalysis/LocationEnhancedVibeSystem';
import type { VibeAnalysisResult } from '@/lib/vibeAnalysis/VibeAnalysisEngine';
import { getVibeColor } from '@/utils/getVibeColor';
import { getVibeIcon } from '@/utils/vibeIcons';
import { cn } from '@/lib/utils';

interface EnhancedFeedbackButtonsProps {
  analysis: VibeAnalysisResult;
  onAccept: () => void;
  onCorrect: (correctedVibe: string) => void;
  onClose: () => void;
  isProcessing?: boolean;
  userHistory?: any[];
  enhancedLocationData?: any;
  className?: string;
}

export const EnhancedFeedbackButtons: React.FC<EnhancedFeedbackButtonsProps> = ({
  analysis,
  onAccept,
  onCorrect,
  onClose,
  isProcessing = false,
  userHistory = [],
  enhancedLocationData,
  className
}) => {
  const [feedbackData, setFeedbackData] = useState<EnhancedFeedbackData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null);
  const [vibeSystem] = useState(() => 
    enhancedLocationData ? new LocationEnhancedVibeSystem() : new VibeSystemIntegration()
  );
  
  useEffect(() => {
    const loadFeedbackData = async () => {
      try {
        const data = await vibeSystem.getEnhancedFeedbackData(analysis, userHistory);
        setFeedbackData(data);
      } catch (error) {
        console.warn('Failed to load enhanced feedback data:', error);
      }
    };
    
    loadFeedbackData();
  }, [analysis, userHistory, vibeSystem]);
  
  if (!feedbackData) {
    return (
      <div className={cn('p-4 bg-card/40 backdrop-blur-sm rounded-xl border border-border/30', className)}>
        <div className="animate-pulse">
          <div className="h-4 bg-muted/20 rounded mb-2" />
          <div className="h-8 bg-muted/20 rounded" />
        </div>
      </div>
    );
  }
  
  const { suggestion, learningContext, adaptiveInterface } = feedbackData;
  const confidenceColor = suggestion.confidence > 0.8 ? 'text-green-400' : 
                         suggestion.confidence > 0.6 ? 'text-yellow-400' : 'text-orange-400';
  
  const handleAccept = async () => {
    await vibeSystem.recordUserInteraction('feedback', {
      type: 'accept',
      suggestedVibe: suggestion.vibe,
      confidence: suggestion.confidence,
      userHistory
    });
    onAccept();
  };
  
  const handleCorrect = async (correctedVibe: string) => {
    await vibeSystem.recordUserInteraction('correction', {
      originalVibe: suggestion.vibe,
      correctedVibe,
      confidence: suggestion.confidence,
      context: analysis.contextFactors,
      userHistory
    });
    onCorrect(correctedVibe);
  };
  
  const renderSimpleFeedback = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getVibeIcon(suggestion.vibe)}</span>
          <div>
            <h4 className="font-semibold capitalize">{suggestion.vibe}</h4>
            <p className="text-xs text-muted-foreground">
              Suggested based on your patterns
            </p>
          </div>
        </div>
        <Badge variant="outline" className={cn("text-xs", confidenceColor)}>
          {Math.round(suggestion.confidence * 100)}%
        </Badge>
      </div>
      
      <div className="flex gap-2">
        <Button
          onClick={handleAccept}
          disabled={isProcessing}
          className="flex-1"
          size="sm"
        >
          <Check className="w-4 h-4 mr-1" />
          Accept
        </Button>
        <Button
          onClick={() => setShowDetails(true)}
          variant="outline"
          size="sm"
        >
          <Brain className="w-4 h-4 mr-1" />
          More Options
        </Button>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="px-2"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
  
  const renderDetailedFeedback = () => (
    <div className="space-y-4">
      {/* Main Suggestion */}
      <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full border-2 flex items-center justify-center"
            style={{ borderColor: getVibeColor(suggestion.vibe) }}
          >
            <span className="text-lg">{getVibeIcon(suggestion.vibe)}</span>
          </div>
          <div>
            <h4 className="font-semibold capitalize">{suggestion.vibe}</h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="w-3 h-3" />
              <span>{Math.round(suggestion.confidence * 100)}% confidence</span>
              {adaptiveInterface.showUncertainty && (
                <>
                  <span>•</span>
                  <span>±{Math.round(analysis.mlAnalysis.uncertaintyEstimate * 100)}% uncertainty</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleAccept} disabled={isProcessing} size="sm">
            <Check className="w-4 h-4 mr-1" />
            Accept
          </Button>
        </div>
      </div>
      
      {/* Reasoning */}
      <div className="space-y-2">
        <h5 className="text-sm font-medium flex items-center gap-1">
          <Brain className="w-4 h-4" />
          Why this suggestion?
        </h5>
        <ul className="space-y-1">
          {suggestion.reasoning.slice(0, 3).map((reason, index) => (
            <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
              <span className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Learning Context */}
      {adaptiveInterface.emphasizePersonalization && (
        <div className="p-3 bg-secondary/10 rounded-lg border border-secondary/20">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium">Personal Learning Context</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Similar situations:</span>
              <span className="ml-1 font-medium">{learningContext.similarPastSituations}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Consistency:</span>
              <span className="ml-1 font-medium">{Math.round(learningContext.userConsistency * 100)}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Personality match:</span>
              <span className="ml-1 font-medium">{Math.round(learningContext.personalityAlignment * 100)}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Context relevance:</span>
              <span className="ml-1 font-medium">{Math.round(learningContext.contextualRelevance * 100)}%</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Alternatives */}
      {suggestion.alternatives.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium">Alternative suggestions:</h5>
          <div className="space-y-2">
            {suggestion.alternatives.map((alt, index) => (
              <motion.div
                key={alt.vibe}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors",
                  selectedAlternative === alt.vibe 
                    ? "bg-primary/10 border-primary/30" 
                    : "bg-card/40 border-border/20 hover:bg-card/60"
                )}
                onClick={() => setSelectedAlternative(
                  selectedAlternative === alt.vibe ? null : alt.vibe
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{getVibeIcon(alt.vibe)}</span>
                  <div>
                    <span className="text-sm font-medium capitalize">{alt.vibe}</span>
                    <p className="text-xs text-muted-foreground">{alt.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {Math.round(alt.confidence * 100)}%
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCorrect(alt.vibe);
                    }}
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex gap-2 pt-2 border-t border-border/20">
        <Button
          onClick={() => setShowDetails(false)}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <ChevronUp className="w-4 h-4 mr-1" />
          Simple View
        </Button>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
  
  const renderContextualFeedback = () => (
    <div className="space-y-4">
      {/* Contextual Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold">Smart Suggestion</h4>
            <p className="text-xs text-muted-foreground">
              Based on your context and patterns
            </p>
          </div>
        </div>
        {enhancedLocationData && (
          <Badge variant="secondary" className="text-xs">
            Location-aware
          </Badge>
        )}
      </div>
      
      {/* Main Suggestion Card */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 mb-3">
            <div 
              className="w-12 h-12 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: getVibeColor(suggestion.vibe) }}
            >
              <span className="text-xl">{getVibeIcon(suggestion.vibe)}</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-lg capitalize">{suggestion.vibe}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Progress 
                  value={suggestion.confidence * 100} 
                  className="h-2 flex-1"
                  style={{
                    '--progress-foreground': getVibeColor(suggestion.vibe)
                  } as any}
                />
                <span className={cn("text-sm font-medium", confidenceColor)}>
                  {Math.round(suggestion.confidence * 100)}%
                </span>
              </div>
            </div>
          </div>
          
          {/* Contextual Insights */}
          <div className="space-y-2 mb-4">
            {suggestion.reasoning.slice(0, 2).map((reason, index) => (
              <div key={index} className="flex items-start gap-2">
                <Zap className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{reason}</span>
              </div>
            ))}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleAccept}
              disabled={isProcessing}
              className="flex-1"
            >
              <Check className="w-4 h-4 mr-2" />
              Switch to {suggestion.vibe}
            </Button>
            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="outline"
              size="sm"
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Expanded Details */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {renderDetailedFeedback()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
  
  // Exploration suggestion for high adaptability users
  const renderExplorationSuggestion = () => (
    adaptiveInterface.suggestExploration && (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20"
      >
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-400">Exploration Opportunity</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Based on your adaptable personality, you might enjoy trying a different vibe than usual.
        </p>
      </motion.div>
    )
  );

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          'p-4 bg-card/40 backdrop-blur-sm rounded-xl border border-border/30',
          className
        )}
      >
        {/* Adaptive Interface Rendering */}
        {adaptiveInterface.feedbackType === 'simple' && renderSimpleFeedback()}
        {adaptiveInterface.feedbackType === 'detailed' && renderDetailedFeedback()}
        {adaptiveInterface.feedbackType === 'contextual' && renderContextualFeedback()}
        
        {/* Personalization Emphasis */}
        {adaptiveInterface.emphasizePersonalization && !showDetails && (
          <div className="mt-3 flex items-center gap-1 text-xs text-primary">
            <Sparkles className="w-3 h-3" />
            <span>This suggestion is personalized based on your patterns</span>
          </div>
        )}
        
        {/* Exploration Suggestion */}
        {renderExplorationSuggestion()}
        
        {/* Uncertainty Warning */}
        {adaptiveInterface.showUncertainty && analysis.mlAnalysis.uncertaintyEstimate > 0.4 && (
          <div className="mt-3 flex items-center gap-1 text-xs text-yellow-600">
            <AlertCircle className="w-3 h-3" />
            <span>Lower confidence - system is still learning your preferences</span>
          </div>
        )}
      </motion.div>
    </TooltipProvider>
  );
};