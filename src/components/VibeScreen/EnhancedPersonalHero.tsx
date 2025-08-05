import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Brain, 
  TrendingUp, 
  Zap, 
  Users, 
  Clock, 
  Target, 
  ChevronRight,
  Info,
  Sparkles,
  Activity
} from 'lucide-react';
import { useCurrentVibe } from '@/lib/store/useVibe';
import { getVibeColor } from '@/utils/getVibeColor';
import { getVibeIcon } from '@/utils/vibeIcons';
import { usePulseTime } from '@/hooks/usePulseTime';
import { VibeSystemIntegration, type EnhancedPersonalHeroData } from '@/lib/vibeAnalysis/VibeSystemIntegration';
import { cn } from '@/lib/utils';

interface EnhancedPersonalHeroProps {
  className?: string;
  onVibeTransitionSuggestion?: (vibe: string) => void;
  onShowDetails?: () => void;
}

export const EnhancedPersonalHero: React.FC<EnhancedPersonalHeroProps> = ({
  className,
  onVibeTransitionSuggestion,
  onShowDetails
}) => {
  const vibe = useCurrentVibe() as string;
  const pulseTime = usePulseTime(3);
  const [heroData, setHeroData] = useState<EnhancedPersonalHeroData | null>(null);
  const [showPredictions, setShowPredictions] = useState(false);
  const [vibeSystem] = useState(() => new VibeSystemIntegration());
  
  // Convert pulse time to smooth sine wave for animations
  const pulseScale = 1 + Math.sin(pulseTime * Math.PI) * 0.1;
  const glowIntensity = Math.sin(pulseTime * Math.PI * 2) * 0.5 + 0.5;
  
  useEffect(() => {
    // Simulate getting enhanced data from the vibe system
    const fetchEnhancedData = async () => {
      try {
        // Mock sensor data - in real implementation, this would come from sensors
        const mockSensorData = {
          audioLevel: 45,
          lightLevel: 60,
          movement: { intensity: 20, pattern: 'still', frequency: 0 },
          location: { context: 'indoor', density: 15 }
        };
        
        const mockContext = {
          timestamp: new Date(),
          hourOfDay: new Date().getHours(),
          timeOfDay: 'evening' as const,
          isWeekend: false,
          dayOfWeek: new Date().getDay()
        };
        
        const data = await vibeSystem.getEnhancedPersonalHeroData(mockSensorData, mockContext);
        setHeroData(data);
      } catch (error) {
        console.warn('Failed to fetch enhanced hero data:', error);
      }
    };
    
    fetchEnhancedData();
    const interval = setInterval(fetchEnhancedData, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, [vibeSystem]);
  
  if (!heroData) {
    return (
      <div className={cn('px-3 mb-3', className)}>
        <div className="bg-card/40 backdrop-blur-sm border border-border/30 rounded-xl p-4 animate-pulse">
          <div className="h-16 bg-muted/20 rounded-lg" />
        </div>
      </div>
    );
  }
  
  const confidenceColor = heroData.confidence > 0.8 ? 'text-green-400' : 
                         heroData.confidence > 0.6 ? 'text-yellow-400' : 'text-orange-400';
  
  const accuracyColor = heroData.accuracy > 0.8 ? 'text-emerald-400' : 
                       heroData.accuracy > 0.6 ? 'text-blue-400' : 'text-purple-400';

  return (
    <TooltipProvider>
      <motion.div 
        className={cn('px-3 mb-3', className)}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-card/40 backdrop-blur-sm border border-border/30 rounded-xl overflow-hidden">
          {/* Main Status Bar */}
          <div className="flex items-center gap-3 p-4">
            {/* Enhanced Vibe Ring with Multi-layer Visualization */}
            <div className="relative">
              <motion.div 
                className="relative w-12 h-12 rounded-full border-2 flex items-center justify-center"
                style={{
                  borderColor: getVibeColor(vibe || 'chill'),
                  scale: pulseScale,
                  boxShadow: `0 0 ${20 * glowIntensity}px ${getVibeColor(vibe || 'chill')}40`
                }}
              >
                {/* Inner core */}
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: getVibeColor(vibe || 'chill') }}
                />
                
                {/* Quality ring overlay */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-white/20"
                  style={{
                    rotate: pulseTime * 360,
                    borderTopColor: `${getVibeColor(vibe || 'chill')}80`
                  }}
                />
              </motion.div>
              
              {/* Confidence Badge */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute -bottom-1 -right-1 bg-background border border-border rounded-full px-1.5 py-0.5">
                    <span className={cn("text-[10px] font-bold", confidenceColor)}>
                      {Math.round(heroData.confidence * 100)}%
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-medium">Detection Confidence</p>
                    <p className="text-muted-foreground">
                      {heroData.confidence > 0.8 ? 'Very confident' : 
                       heroData.confidence > 0.6 ? 'Moderately confident' : 'Learning...'}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            
            {/* Status Information */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{getVibeIcon(vibe || 'chill')}</span>
                <h3 className="font-semibold text-foreground capitalize truncate">
                  {heroData.currentVibe}
                </h3>
                {heroData.environmentalFactors.isOptimalTime && (
                  <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Optimal
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      <span className={accuracyColor}>
                        {Math.round(heroData.accuracy * 100)}% accuracy
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <p className="font-medium">Personal Learning Accuracy</p>
                      <p className="text-muted-foreground">Based on {heroData.learningProgress.totalCorrections} corrections</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      <span>{Math.round(heroData.sensorQuality.overall * 100)}% signal</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <p className="font-medium">Sensor Quality</p>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>Audio: {Math.round(heroData.sensorQuality.audio * 100)}%</div>
                        <div>Motion: {Math.round(heroData.sensorQuality.motion * 100)}%</div>
                        <div>Light: {Math.round(heroData.sensorQuality.light * 100)}%</div>
                        <div>Location: {Math.round(heroData.sensorQuality.location * 100)}%</div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
                
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{Math.round(heroData.environmentalFactors.socialDensity)} nearby</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPredictions(!showPredictions)}
                className="p-2 hover:bg-primary/10"
              >
                <Brain className="w-4 h-4" />
              </Button>
              
              {onShowDetails && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onShowDetails}
                  className="p-2 hover:bg-primary/10"
                >
                  <Info className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Learning Progress Bar */}
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Learning Progress</span>
              <span className="text-xs font-medium text-foreground">
                {heroData.learningProgress.streakDays} day streak
              </span>
            </div>
            <Progress 
              value={heroData.accuracy * 100} 
              className="h-1.5"
              style={{
                '--progress-background': `${getVibeColor(vibe || 'chill')}20`,
                '--progress-foreground': getVibeColor(vibe || 'chill')
              } as any}
            />
          </div>
          
          {/* Expandable Predictions Section */}
          <AnimatePresence>
            {showPredictions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t border-border/30 bg-muted/10"
              >
                <div className="p-4 space-y-3">
                  {/* Next Transition Prediction */}
                  {heroData.predictions.nextVibeTransition && (
                    <div className="flex items-center justify-between p-3 bg-card/60 rounded-lg border border-border/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Clock className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Predicted Transition</p>
                          <p className="text-xs text-muted-foreground">
                            To {heroData.predictions.nextVibeTransition.vibe} in {heroData.predictions.nextVibeTransition.timeframe}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {Math.round(heroData.predictions.nextVibeTransition.probability * 100)}%
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onVibeTransitionSuggestion?.(heroData.predictions.nextVibeTransition!.vibe)}
                          className="p-1 hover:bg-primary/10"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Contextual Suggestions */}
                  {heroData.predictions.contextualSuggestions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Smart Suggestions
                      </h4>
                      <div className="space-y-2">
                        {heroData.predictions.contextualSuggestions.slice(0, 2).map((suggestion, index) => (
                          <motion.div
                            key={suggestion.vibe}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-2 bg-card/40 rounded-lg border border-border/10 hover:bg-card/60 transition-colors cursor-pointer"
                            onClick={() => onVibeTransitionSuggestion?.(suggestion.vibe)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{getVibeIcon(suggestion.vibe)}</span>
                              <div>
                                <p className="text-sm font-medium capitalize">{suggestion.vibe}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-40">
                                  {suggestion.reason}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(suggestion.confidence * 100)}%
                            </Badge>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Environmental Context */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/20">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-center p-2 bg-card/40 rounded-lg">
                          <div className="text-lg font-bold text-primary">
                            {Math.round(heroData.environmentalFactors.temporalMomentum * 100)}
                          </div>
                          <div className="text-xs text-muted-foreground">Momentum</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">How much your vibe is changing over time</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-center p-2 bg-card/40 rounded-lg">
                          <div className="text-lg font-bold text-secondary">
                            {Math.round(heroData.environmentalFactors.vibeCoherence * 100)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Coherence</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">How well your sensors agree on your current vibe</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </TooltipProvider>
  );
};