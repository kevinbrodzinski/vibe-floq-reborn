import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Users, Zap } from 'lucide-react';
import { useShakeDetection } from '@/hooks/useShakeDetection';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useFieldUI } from '@/components/field/contexts/FieldUIContext';
import { Button } from '@/components/ui/button';

interface Friend {
  id: string;
  name: string;
  vibe: string;
  color: string;
}

interface ConstellationGestureHandlerProps {
  friends: Friend[];
  onConstellationGesture?: (gesture: string, friends: Friend[]) => void;
  enabled?: boolean;
}

export const ConstellationGestureHandler = ({
  friends,
  onConstellationGesture,
  enabled = true
}: ConstellationGestureHandlerProps) => {
  const { socialHaptics } = useHapticFeedback();
  const { constellationMode, setConstellationMode } = useFieldUI();
  const [shakeDetected, setShakeDetected] = useState(false);
  const [discoveryMode, setDiscoveryMode] = useState(false);
  const [multiTouchActive, setMultiTouchActive] = useState(false);

  const handleShake = useCallback(() => {
    if (!enabled) return;
    
    setShakeDetected(true);
    setDiscoveryMode(true);
    
    // Auto-enable constellation mode on shake
    if (!constellationMode) {
      setConstellationMode(true);
    }
    
    // Trigger discovery gesture
    onConstellationGesture?.('shake-discovery', friends);
    
    // Show discovery UI for 3 seconds
    setTimeout(() => {
      setShakeDetected(false);
      setDiscoveryMode(false);
    }, 3000);
  }, [enabled, constellationMode, setConstellationMode, onConstellationGesture, friends]);

  const handleLongPress = useCallback(() => {
    if (!enabled || !constellationMode) return;
    
    // Trigger social menu
    onConstellationGesture?.('long-press-social', friends);
  }, [enabled, constellationMode, onConstellationGesture, friends]);

  const handleMultiTouch = useCallback((touches: number) => {
    if (!enabled) return;
    
    setMultiTouchActive(true);
    
    if (touches >= 3) {
      // Three-finger gesture: group constellation
      onConstellationGesture?.('multi-touch-group', friends);
    }
    
    setTimeout(() => setMultiTouchActive(false), 1000);
  }, [enabled, onConstellationGesture, friends]);

  useShakeDetection({
    onShake: handleShake,
    onLongPress: handleLongPress,
    onMultiTouch: handleMultiTouch,
    enabled,
    sensitivity: 12
  });

  const handleQuickAction = (action: string) => {
    socialHaptics.gestureConfirm();
    
    switch (action) {
      case 'discover':
        onConstellationGesture?.('discover-nearby', friends);
        break;
      case 'group-vibe':
        onConstellationGesture?.('group-vibe-check', friends);
        break;
      case 'constellation-view':
        setConstellationMode(!constellationMode);
        break;
    }
    
    setDiscoveryMode(false);
  };

  return (
    <>
      {/* Shake Detection Feedback */}
      <AnimatePresence>
        {shakeDetected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <div className="bg-primary/90 backdrop-blur-xl rounded-2xl p-6 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="h-12 w-12 text-primary-foreground mx-auto mb-2" />
              </motion.div>
              <div className="text-primary-foreground font-medium">
                Shake detected! ✨
              </div>
              <div className="text-primary-foreground/80 text-sm">
                Discovering nearby connections...
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discovery Mode UI */}
      <AnimatePresence>
        {discoveryMode && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-40"
          >
            <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-primary/20 p-4 shadow-lg">
              <div className="text-center mb-3">
                <div className="text-primary font-medium">Social Discovery</div>
                <div className="text-xs text-muted-foreground">
                  {friends.length} friends nearby
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction('discover')}
                  className="flex-1"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Discover
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction('group-vibe')}
                  className="flex-1"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Group Vibe
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction('constellation-view')}
                  className="flex-1"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {constellationMode ? 'Field' : 'Stars'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multi-touch Feedback */}
      <AnimatePresence>
        {multiTouchActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <div className="bg-accent/90 backdrop-blur-xl rounded-xl p-4 text-center">
              <Users className="h-8 w-8 text-accent-foreground mx-auto mb-1" />
              <div className="text-accent-foreground font-medium text-sm">
                Multi-touch detected
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Constellation Mode Indicator */}
      {constellationMode && (
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed left-4 top-1/2 transform -translate-y-1/2 z-30"
        >
          <div className="bg-primary/20 backdrop-blur-xl rounded-full p-3 border border-primary/30">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="h-5 w-5 text-primary" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </>
  );
};