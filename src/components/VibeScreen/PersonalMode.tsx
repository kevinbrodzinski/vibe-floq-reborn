import React, { useState, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { motion } from 'framer-motion';
import { PersonalHero } from './PersonalHero';
import { EnhancedPersonalHero } from './EnhancedPersonalHero';
import { TimelineCarousel } from './TimelineCarousel';
import { StreakCard } from './StreakCard';
import { VibeWheel } from '@/components/vibe/VibeWheel';
import { DynamicVibeToggle } from '@/components/ui/DynamicVibeToggle';
import { FeedbackButtons } from '@/components/ui/FeedbackButtons';
import { EnhancedFeedbackButtons } from '@/components/ui/EnhancedFeedbackButtons';
import { LearningPatterns } from '@/components/ui/LearningPatterns';
import { VisibilityButton } from '@/components/vibe/VisibilityButton';
import { SystemHealthMonitor } from '@/components/ui/SystemHealthMonitor';
import { Button } from '@/components/ui/button';
import { Zap, ZapOff, Activity } from 'lucide-react';
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
  }, [autoMode, isEnhancedMode, sensorData?.timestamp]); // Only depend on essential values

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
    } catch (error) {
      console.error('Failed to record enhanced feedback:', error);
    }
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
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomGap + 16 }}
      >
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
                <Activity className={`mr-1 w-3 h-3 ${isTogglingMode ? "animate-spin" : ""}`} />
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
                <Activity className="w-3 h-3" />
              </Button>
            )}
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

        {/* Timeline Carousel */}
        <TimelineCarousel onVibeSelect={handleVibeSelect} />

        {/* Dynamic Vibe Toggle */}
        <div className="px-2 mb-2 flex justify-center">
          <DynamicVibeToggle
            showMotionData={true}
            showDbData={true}
          />
        </div>

        {/* Enhanced Feedback Buttons (when auto-detection suggests changes) */}
        {vibeDetection && vibeDetection.suggestedVibe && vibeDetection.confidence > 0.3 && (
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
                      analysis={vibeDetection}
                      onFeedback={handleEnhancedFeedback}
                      enhancedLocationData={enhancedLocation.location ? enhancedLocation : undefined}
                    />
                  );
                } else {
                  return (
                    <FeedbackButtons
                      suggestedVibe={vibeDetection.suggestedVibe}
                      confidence={vibeDetection.confidence}
                      onAccept={() => console.log('Accept suggestion')}
                      onCorrect={() => console.log('Correct suggestion')}
                      onClose={() => console.log('Close feedback')}
                      isProcessing={false}
                      learningBoost={vibeDetection.learningBoost}
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

        {/* Learning Patterns (when auto mode is enabled) */}
        {autoMode && (
          <div className="px-2 mb-2">
            <motion.div
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
            >
              <LearningPatterns
                patterns={learningData.patterns}
                topPreferences={learningData.preferences}
                accuracy={heroData?.accuracy || learningData.accuracy}
                correctionCount={learningData.correctionCount}
              />
            </motion.div>
          </div>
        )}

        {/* Streak & Achievements Card */}
        <StreakCard />
      </ScrollView>
      
    </div>
  );
};