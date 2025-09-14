import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { PersonalHero } from './PersonalHero';
import { EnhancedPersonalHero } from './EnhancedPersonalHero';

import { VibeFlowChart } from './enhanced-visualizations/VibeFlowChart';
import { VibePersonalityRadar } from './enhanced-visualizations/VibePersonalityRadar';
import { VibeMetricsDashboard } from './enhanced-visualizations/VibeMetricsDashboard';
import { PersistentVibeDistribution } from './PersistentVibeDistribution';
import { EnhancedProgressInsights } from './EnhancedProgressInsights';
import { VibeWheel } from '@/components/vibe/VibeWheel';
import { DynamicVibeToggle } from '@/components/ui/DynamicVibeToggle';
import { FeedbackButtons } from '@/components/ui/FeedbackButtons';
import { EnhancedFeedbackButtons } from '@/components/ui/EnhancedFeedbackButtons';
import { VisibilityButton } from '@/components/vibe/VisibilityButton';
import { SystemHealthMonitor } from '@/components/ui/SystemHealthMonitor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, ZapOff, BarChart3, TrendingUp, Eye, EyeOff } from 'lucide-react';
import { useVibe } from '@/lib/store/useVibe';
import { useVibeDetection } from '@/store/useVibeDetection';
import { useSensorMonitoring } from '@/hooks/useSensorMonitoring';
import { useVibeMatch } from '@/hooks/useVibeMatch';
import { useSyncedVibeDetection } from '@/hooks/useSyncedVibeDetection';
import { useSyncedVisibility } from '@/hooks/useSyncedVisibility';
import { useBottomGap } from '@/hooks/useBottomGap';
import { useEnhancedLocationSharing } from '@/hooks/location/useEnhancedLocationSharing';
import { LocationEnhancedVibeSystem } from '@/lib/vibeAnalysis/LocationEnhancedVibeSystem';
import type { EnhancedPersonalHeroData } from '@/lib/vibeAnalysis/VibeSystemIntegration';
import { useVibeContext } from '@/hooks/useVibeContext';
import { intelligenceIntegration } from '@/lib/intelligence/IntelligenceIntegration';

/**
 * PersonalMode - Enhanced immersive self-dashboard with ML-powered vibe detection
 * Now integrates with LocationEnhancedVibeSystem for context-aware vibe analysis
 */
export const PersonalMode: React.FC = () => {
  useSyncedVisibility();
  useSyncedVibeDetection();
  
  const bottomGap = useBottomGap();
  const { vibe: selectedVibe } = useVibe();
  const { autoMode, toggleAutoMode } = useVibeDetection();
  const { learningData, vibeDetection, sensorData } = useSensorMonitoring(autoMode);
  const { crowdData, eventTags, dominantVibe } = useVibeMatch();
  const enhancedLocation = useEnhancedLocationSharing();
  const contextData = useVibeContext();

  // Enhanced vibe system integration
  const [vibeSystem] = useState(() => new LocationEnhancedVibeSystem());
  const [heroData, setHeroData] = useState<EnhancedPersonalHeroData | null>(null);
  const [showSystemHealth, setShowSystemHealth] = useState(false);
  const [isEnhancedMode, setIsEnhancedMode] = useState(true);
  const [isTogglingMode, setIsTogglingMode] = useState(false);
  const [showAdvancedVisuals, setShowAdvancedVisuals] = useState(true);
  const [visualsMode, setVisualsMode] = useState<'flow' | 'analytics' | 'personality'>('flow');
  const [showFeedback, setShowFeedback] = useState(false);
  const [stableFeedbackData, setStableFeedbackData] = useState<any>(null);

  // Update hero data when sensor data or location changes
  useEffect(() => {
    // Debounce rapid updates to prevent freeze
    const updateHeroData = async () => {
      if (!autoMode || !sensorData) {
        setHeroData(null);
        return;
      }

      try {
        if (enhancedLocation.location && isEnhancedMode) {
          // Use location-enhanced vibe system
          const data = await vibeSystem.getLocationEnhancedPersonalHeroData(
            sensorData,
            enhancedLocation
          );
          setHeroData(data);
        } else {
          // Fallback to basic enhanced system using real context
          const data = await vibeSystem.getEnhancedPersonalHeroData(sensorData, contextData);
          setHeroData(data);
        }
      } catch (error) {
        console.error('Failed to update hero data:', error);
        // Graceful degradation - clear data to prevent freeze
        setHeroData(null);
      }
    };

    // Debounce the update to prevent rapid re-renders
    const timeoutId = setTimeout(updateHeroData, 300);
    return () => clearTimeout(timeoutId);
  }, [autoMode, isEnhancedMode, Date.now()]); // Use Date.now() instead of sensorData?.timestamp

  // Stabilize feedback button visibility to prevent glitching
  useEffect(() => {
    const shouldShowFeedback = vibeDetection && 
                              vibeDetection.suggestedVibe && 
                              vibeDetection.confidence > 0.3 &&
                              autoMode;

    if (shouldShowFeedback && !showFeedback) {
      // Debounce showing feedback
      const showTimer = setTimeout(() => {
        setShowFeedback(true);
        setStableFeedbackData(vibeDetection);
      }, 500);
      return () => clearTimeout(showTimer);
    } else if (!shouldShowFeedback && showFeedback) {
      // Debounce hiding feedback
      const hideTimer = setTimeout(() => {
        setShowFeedback(false);
        setStableFeedbackData(null);
      }, 1000);
      return () => clearTimeout(hideTimer);
    } else if (shouldShowFeedback && showFeedback) {
      // Update data while visible
      setStableFeedbackData(vibeDetection);
    }
  }, [vibeDetection?.suggestedVibe, vibeDetection?.confidence, autoMode, showFeedback]);

  const handleVibeSelect = (vibe: string) => {
    console.log('Jump to vibe:', vibe);
    // TODO: Implement wheel rotation to selected vibe
  };

  const handleEnhancedFeedback = async (feedback: any) => {
    try {
      if (enhancedLocation.location && heroData) {
        await vibeSystem.recordLocationEnhancedUserInteraction(
          feedback,
          enhancedLocation,
          heroData.currentVibe
        );
      }
      // Dismiss feedback after interaction
      setShowFeedback(false);
      setStableFeedbackData(null);
    } catch (error) {
      console.error('Failed to record enhanced feedback:', error);
    }
  };

  const handleBasicFeedback = async (action: string) => {
    if (action === 'Correct' && stableFeedbackData) {
      // This is where we can add a correction interface later
      // For now, just log the correction intent
      console.log('User wants to correct vibe suggestion');
    }
    console.log(`${action} suggestion`);
    // Dismiss feedback after interaction
    setShowFeedback(false);
    setStableFeedbackData(null);
  };

  const toggleSystemHealth = () => {
    setShowSystemHealth(!showSystemHealth);
  };

  const toggleEnhancedMode = async () => {
    if (isTogglingMode) return; // Prevent rapid clicking
    
    try {
      setIsTogglingMode(true);
      console.log('Toggling enhanced mode from:', isEnhancedMode, 'to:', !isEnhancedMode);
      
      // Clear hero data when switching modes to force fresh data
      setHeroData(null);
      
      // Toggle the mode
      setIsEnhancedMode(!isEnhancedMode);
      
      // If switching to enhanced mode, ensure we have necessary data
      if (!isEnhancedMode && !sensorData) {
        console.warn('Enhanced mode requires sensor data - auto mode should be enabled');
      }
      
      // Small delay to prevent rapid state changes
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error('Error toggling enhanced mode:', error);
      // Fallback to basic mode on error
      setIsEnhancedMode(false);
      setHeroData(null);
    } finally {
      setIsTogglingMode(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-background to-secondary/20">
      <ScrollArea className="h-full">
        <div style={{ paddingBottom: bottomGap + 16 }}>
        {/* Enhanced Header Bar */}
        <div className="flex justify-between items-center p-2 pt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAutoMode}
              className={`p-1 rounded-lg bg-card/40 backdrop-blur-sm border border-border/30 transition-all duration-300 hover:bg-card/60 text-xs ${
                autoMode ? "text-primary border-primary/30 bg-primary/10" : "text-muted-foreground"
              }`}
            >
              {autoMode ? <Zap className="mr-1 w-3 h-3" /> : <ZapOff className="mr-1 w-3 h-3" />}
              {autoMode ? 'Auto On' : 'Auto Off'}
            </Button>
            
            {/* Enhanced Mode Toggle */}
            {autoMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleEnhancedMode}
                disabled={isTogglingMode}
                className={`p-1 rounded-lg bg-card/40 backdrop-blur-sm border border-border/30 transition-all duration-300 hover:bg-card/60 text-xs ${
                  isEnhancedMode ? "text-green-500 border-green-500/30 bg-green-500/10" : "text-muted-foreground"
                } ${isTogglingMode ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Zap className={`mr-1 w-3 h-3 ${isTogglingMode ? "animate-spin" : ""}`} />
                {isTogglingMode ? 'Switching...' : (isEnhancedMode ? 'Enhanced' : 'Basic')}
              </Button>
            )}
          </div>
          
          <h1 className="text-sm font-medium text-foreground glow-primary">vibe</h1>
          
          <div className="flex items-center gap-2">
            <VisibilityButton />
            {autoMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSystemHealth}
                className="p-1 rounded-lg bg-card/40 backdrop-blur-sm border border-border/30 transition-all duration-300 hover:bg-card/60 text-xs"
              >
                <BarChart3 className="w-3 h-3" />
              </Button>
            )}
            
            {/* Enhanced Visuals Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedVisuals(!showAdvancedVisuals)}
              className={`p-1 rounded-lg bg-card/40 backdrop-blur-sm border border-border/30 transition-all duration-300 hover:bg-card/60 text-xs ${
                showAdvancedVisuals ? "text-blue-500 border-blue-500/30 bg-blue-500/10" : "text-muted-foreground"
              }`}
            >
              {showAdvancedVisuals ? <BarChart3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {/* System Health Monitor (Development/Debug) */}
        {showSystemHealth && autoMode && (
          <div className="px-2 mb-4">
            <SystemHealthMonitor 
              showLocationMetrics={!!enhancedLocation.location}
              compactMode={true}
            />
          </div>
        )}

        {/* Enhanced Personal Hero Status Strip */}
        {(() => {
          try {
            if (heroData && isEnhancedMode) {
              return (
                <EnhancedPersonalHero
                  {...{ heroData, sensorData, locationData: enhancedLocation } as any}
                />
              );
            } else {
              return <PersonalHero />;
            }
          } catch (error) {
            console.error('Error rendering hero component:', error);
            // Fallback to basic hero on error
            return <PersonalHero />;
          }
        })()}

        {/* Enhanced Vibe Wheel with Dynamic Halo */}
        <motion.div 
          className="px-2 mb-2 relative"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          {/* Dynamic halo effect - enhanced with confidence */}
          <div 
            className="absolute inset-0 rounded-full opacity-30 blur-xl animate-pulse"
            style={{
              background: `radial-gradient(circle, transparent 60%, var(--${selectedVibe || 'chill'}) 100%)`,
              opacity: heroData?.confidence ? heroData.confidence * 0.5 : 0.3
            }}
          />
          
          <VibeWheel
            eventVibeData={{
              crowdData,
              eventTags,
              dominantVibe: dominantVibe || selectedVibe || 'chill'
            }}
            userPreferences={learningData.preferences}
          />
        </motion.div>

        {/* Enhanced Visualizations Section */}
        {showAdvancedVisuals && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-2 mb-4 space-y-4"
          >
            {/* Visualization Mode Selector */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex bg-muted/50 rounded-lg p-1">
                {[
                  { key: 'flow', label: 'Flow', icon: TrendingUp },
                  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
                  { key: 'personality', label: 'Personality', icon: Zap }
                ].map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    variant={visualsMode === key ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setVisualsMode(key as any)}
                    className="h-7 px-2 text-xs"
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {label}
                  </Button>
                ))}
              </div>
              <Badge variant="secondary" className="text-xs">
                High-end visuals
              </Badge>
            </div>

            {/* Enhanced Visualization Content */}
            <motion.div
              key={visualsMode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {visualsMode === 'flow' && (
                <VibeFlowChart
                  timeRange="24h"
                  onVibeSelect={handleVibeSelect}
                  showPredictions={isEnhancedMode}
                />
              )}
              
              {visualsMode === 'analytics' && (
                <VibeMetricsDashboard
                  realTimeMode={autoMode}
                />
              )}
              
              {visualsMode === 'personality' && (
                <VibePersonalityRadar
                  showComparison={true}
                  timeframe="month"
                />
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Dynamic Vibe Toggle */}
        <div className="px-2 mb-2 flex justify-center">
          <DynamicVibeToggle
            showMotionData={true}
            showDbData={true}
          />
        </div>

        {/* Enhanced Feedback Buttons (when auto-detection suggests changes) */}
        {showFeedback && stableFeedbackData && (
          <motion.div 
            className="px-2 mb-2"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300,
              duration: 0.3
            }}
            layout
          >
            {(() => {
              try {
                if (isEnhancedMode && heroData) {
                  return (
                    <EnhancedFeedbackButtons
                      analysis={stableFeedbackData}
                      onFeedback={handleEnhancedFeedback}
                      enhancedLocationData={enhancedLocation.location ? enhancedLocation : undefined}
                    />
                  );
                } else {
                  return (
                    <FeedbackButtons
                      suggestedVibe={stableFeedbackData.suggestedVibe}
                      confidence={stableFeedbackData.confidence}
                      onAccept={() => handleBasicFeedback('Accept')}
                      onCorrect={() => handleBasicFeedback('Correct')}
                      onClose={() => handleBasicFeedback('Close')}
                      isProcessing={false}
                      learningBoost={stableFeedbackData.learningBoost}
                    />
                  );
                }
              } catch (error) {
                console.error('Error rendering feedback buttons:', error);
                return null; // Hide feedback buttons on error
              }
            })()}
          </motion.div>
        )}

        {/* Persistent Vibe Distribution Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="px-2 mb-4"
        >
          <PersistentVibeDistribution />
        </motion.div>

        {/* Streak & Achievements Card */}
        <EnhancedProgressInsights />
        </div>
      </ScrollArea>
      
    </div>
  );
};