import React from 'react';
import { ScrollView } from 'react-native';
import { motion } from 'framer-motion';
import { PersonalHero } from './PersonalHero';
import { TimelineCarousel } from './TimelineCarousel';
import { StreakCard } from './StreakCard';
import { VibeWheel } from '@/components/vibe/VibeWheel';
import { DynamicVibeToggle } from '@/components/ui/DynamicVibeToggle';
import { FeedbackButtons } from '@/components/ui/FeedbackButtons';
import { LearningPatterns } from '@/components/ui/LearningPatterns';
import { VisibilityButton } from '@/components/vibe/VisibilityButton';
import { Button } from '@/components/ui/button';
import { Zap, ZapOff } from 'lucide-react';
import { useVibe } from '@/lib/store/useVibe';
import { useVibeDetection } from '@/store/useVibeDetection';
import { useSensorMonitoring } from '@/hooks/useSensorMonitoring';
import { useVibeMatch } from '@/hooks/useVibeMatch';
import { useSyncedVibeDetection } from '@/hooks/useSyncedVibeDetection';
import { useSyncedVisibility } from '@/hooks/useSyncedVisibility';
import { useBottomGap } from '@/hooks/useBottomGap';

/**
 * PersonalMode - Enhanced immersive self-dashboard
 * Transforms the basic picker into a data-rich, contextual experience
 */
export const PersonalMode: React.FC = () => {
  useSyncedVisibility();
  useSyncedVibeDetection();
  
  const bottomGap = useBottomGap();
  const { vibe: selectedVibe } = useVibe();
  const { autoMode, toggleAutoMode } = useVibeDetection();
  const { learningData, vibeDetection } = useSensorMonitoring(autoMode);
  const { crowdData, eventTags, dominantVibe } = useVibeMatch();

  const handleVibeSelect = (vibe: string) => {
    console.log('Jump to vibe:', vibe);
    // TODO: Implement wheel rotation to selected vibe
  };

  return (
    <div className="bg-gradient-to-b from-background to-secondary/20">
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomGap + 16 }}
      >
        {/* Header Bar */}
        <div className="flex justify-between items-center p-2 pt-4">
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
          <h1 className="text-sm font-medium text-foreground glow-primary">vibe</h1>
          <div className="flex items-center gap-2">
            <VisibilityButton />
          </div>
        </div>

        {/* Personal Hero Status Strip */}
        <PersonalHero />

        {/* Enhanced Vibe Wheel with Dynamic Halo */}
        <motion.div 
          className="px-2 mb-2 relative"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          {/* Dynamic halo effect */}
          <div 
            className="absolute inset-0 rounded-full opacity-30 blur-xl animate-pulse"
            style={{
              background: `radial-gradient(circle, transparent 60%, var(--${selectedVibe || 'chill'}) 100%)`
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

        {/* Feedback Buttons (when auto-detection suggests changes) */}
        {vibeDetection && (
          <div className="px-2 mb-2">
            <FeedbackButtons
              suggestedVibe={vibeDetection.suggestedVibe}
              confidence={vibeDetection.confidence}
              onAccept={() => console.log('Accept suggestion')}
              onCorrect={() => console.log('Correct suggestion')}
              onClose={() => console.log('Close feedback')}
              isProcessing={false}
              learningBoost={vibeDetection.learningBoost}
            />
          </div>
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
                accuracy={learningData.accuracy}
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