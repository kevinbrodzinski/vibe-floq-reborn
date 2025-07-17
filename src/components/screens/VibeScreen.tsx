import { useState, useRef, useCallback, useEffect } from "react";
import { Radio, Eye, EyeOff, Users, Zap, ZapOff, Brain } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FeedbackButtons } from "@/components/ui/FeedbackButtons";
import { LearningPatterns } from "@/components/ui/LearningPatterns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useSensorMonitoring } from "@/hooks/useSensorMonitoring";
import { VibeDensityMap } from "@/components/map/VibeDensityMap";
import { useVibeCardDynamics } from "@/hooks/useVibeCardDynamics";
import { useClusters } from "@/hooks/useClusters";
import { useSmartSuggestions } from "@/hooks/useSmartSuggestions";
import { useHotspotToast } from "@/hooks/useHotspotToast";
import SuggestionToast from "@/components/vibe/SuggestionToast";
import type { Vibe } from "@/utils/vibe";
import { useVibe, useCurrentVibeRow } from "@/lib/store/useVibe";
import { useVibeDetection } from '@/store/useVibeDetection';
import { useSyncedVibeDetection } from '@/hooks/useSyncedVibeDetection';
import { FullScreenSpinner } from "@/components/ui/FullScreenSpinner";
import type { VibeEnum } from "@/constants/vibes";
import { VibeWheel } from "@/components/vibe/VibeWheel";
import { useSyncedVisibility } from "@/hooks/useSyncedVisibility";
import { VisibilityButton } from "@/components/vibe/VisibilityButton";

type VibeState = VibeEnum;
type VisibilityState = "public" | "friends" | "off";

interface VibeInfo {
  label: string;
  angle: number;
  color: string;
}

export const VibeScreen = () => {
  useSyncedVisibility(); // Sync visibility across app and devices
  
  const { user } = useAuth();
  const { vibe: selectedVibe, setVibe: setSelectedVibe, isUpdating, hydrated, clearVibe, visibility } = useVibe();
  const currentVibeRow = useCurrentVibeRow();
  const [isDragging, setIsDragging] = useState(false);
  const [elapsed, setElapsed] = useState<string>('—');
  const { autoMode, toggleAutoMode } = useVibeDetection();
  
  // Sync vibe detection preference across devices
  useSyncedVibeDetection();
  const [showFeedback, setShowFeedback] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [showDensityMap, setShowDensityMap] = useState(false);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loggedThisSessionRef = useRef<boolean>(false);
  const dialRef = useRef<HTMLDivElement>(null);
  
  // Sensor monitoring for auto-detection
  const { sensorData, vibeDetection, permissions, requestPermissions, recordFeedback, learningData } = useSensorMonitoring(autoMode);
  
  // Hotspot toast notifications
  useHotspotToast();
  
  // Mock user location for demo (replace with real geolocation)
  const userLocation = { lat: 37.7749, lng: -122.4194 };
  
  // Mock bounding box for cluster data
  const bbox = [-122.5, 37.7, -122.3, 37.8] as [number, number, number, number];
  const { clusters, loading, isRealTimeConnected, lastUpdateTime } = useClusters(bbox, 6);
  
  // Smart suggestions based on nearby clusters
  const { suggestionQueue, dismissSuggestion, applyVibe } = useSmartSuggestions();
  
  // Enhanced vibe card dynamics
  const { pulseScale, pulseOpacity, tintColor, showGlow } = useVibeCardDynamics(
    clusters,
    userLocation,
    selectedVibe,
    learningData.preferences
  );

  const vibes: Record<VibeState, VibeInfo> = {
    chill: { label: "Chill", angle: 0, color: "hsl(var(--accent))" },
    hype: { label: "Hype", angle: 40, color: "hsl(0 70% 60%)" },
    social: { label: "Social", angle: 80, color: "hsl(200 70% 60%)" },
    romantic: { label: "Romantic", angle: 120, color: "hsl(320 70% 60%)" },
    weird: { label: "Weird", angle: 160, color: "hsl(60 70% 60%)" },
    open: { label: "Open", angle: 200, color: "hsl(120 70% 60%)" },
    flowing: { label: "Flowing", angle: 240, color: "hsl(30 70% 60%)" },
    down: { label: "Down", angle: 280, color: "hsl(280 70% 60%)" },
    solo: { label: "Solo", angle: 320, color: "hsl(240 70% 60%)" }
  };

  // Dynamic status updates based on auto-detection
  const getStatusUpdates = () => {
    if (autoMode && vibeDetection) {
      return [
        `Auto-detected: ${vibeDetection.suggestedVibe} (${Math.round(vibeDetection.confidence * 100)}% confidence)`,
        ...vibeDetection.reasoning,
        `Audio: ${sensorData.audioLevel}% • Movement: ${sensorData.movement.pattern}`,
        "Your vibe is now visible to 19 friends nearby"
      ];
    }
    
    return [
      "Feed priority has shifted toward Chill Floqs",
      "Pulse is scanning venues with low lighting + mellow music", 
      "Your vibe is now visible to 19 friends nearby",
      "4 people with matching vibes in a 2-mile radius"
    ];
  };

  const handleVibeSelect = useCallback(async (vibe: VibeState) => {
    await setSelectedVibe(vibe);
    // Turn off auto mode when manually selecting
    if (autoMode) {
      toggleAutoMode();
    }
    // Brief haptic feedback simulation
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, [autoMode, setSelectedVibe, toggleAutoMode]);

  // Auto-apply detected vibe with adaptive threshold
  const applyDetectedVibe = useCallback(async () => {
    if (vibeDetection) {
      const bias = learningData.preferences[vibeDetection.suggestedVibe] ?? 0;
      // Base 0.50 → as low as 0.25, capped upper bound at 0.60 to avoid locking out vibes
      const threshold = Math.min(0.60, Math.max(0.25, 0.50 - bias * 0.25));
      
      if (vibeDetection.confidence >= threshold) {
        // Throttled debug log with dev guard (once per session)
        if (import.meta.env.DEV && !loggedThisSessionRef.current) {
          console.info(
            `[VibeAI] applied="${vibeDetection.suggestedVibe}" ` +
            `conf=${vibeDetection.confidence.toFixed(2)} ` +
            `bias=${bias.toFixed(2)} ` +
            `threshold=${threshold.toFixed(2)}`
          );
          loggedThisSessionRef.current = true;
        }
        
        // Only apply if it's a valid VibeState
        const vibeAsState = vibeDetection.suggestedVibe as VibeState;
        if (vibes[vibeAsState]) {
          await setSelectedVibe(vibeAsState);
          // Debounce feedback banner to prevent double-shows
          if (!showFeedback) {
            setShowFeedback(true);
          }
          if (navigator.vibrate) {
            navigator.vibrate([50, 100, 50]);
          }
        }
      }
    }
  }, [vibeDetection, learningData.preferences, showFeedback, setSelectedVibe]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  // Handle feedback acceptance
  const handleAcceptFeedback = useCallback(async () => {
    if (!vibeDetection) return;
    
    setIsLearning(true);
    try {
      await recordFeedback(true);
      // Small delay to show completion before hiding with cleanup
      feedbackTimeoutRef.current = setTimeout(() => setShowFeedback(false), 200);
    } catch (error) {
      console.error('Failed to record acceptance:', error);
      setShowFeedback(false);
    } finally {
      setIsLearning(false);
    }
  }, [vibeDetection, recordFeedback]);

  // Handle feedback correction
  const handleCorrectFeedback = useCallback(async (correctedVibe: Vibe) => {
    if (!vibeDetection) return;
    
    setIsLearning(true);
    try {
      await recordFeedback(false, correctedVibe);
      await setSelectedVibe(correctedVibe as VibeState);
      // Small delay to show completion before hiding with cleanup
      feedbackTimeoutRef.current = setTimeout(() => setShowFeedback(false), 200);
    } catch (error) {
      console.error('Failed to record correction:', error);
      setShowFeedback(false);
    } finally {
      setIsLearning(false);
    }
  }, [vibeDetection, recordFeedback]);

  // Close feedback without recording
  const handleCloseFeedback = useCallback(() => {
    setShowFeedback(false);
  }, []);

  // Hide feedback banner when auto-mode is disabled
  useEffect(() => {
    if (!autoMode) {
      setShowFeedback(false);
    }
  }, [autoMode]);

  // Controlled pulse for outdoor patterns detection
  useEffect(() => {
    const outdoorPatterns = learningData.patterns.filter(p => 
      p.context.toLowerCase().includes('outdoor') && p.confidence > 0.7
    );
    
    if (outdoorPatterns.length >= 3) {
      setShowPulse(true);
      const timeout = setTimeout(() => setShowPulse(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [learningData.patterns]);

  // Enhanced toggle auto mode with Supabase sync and logging
  const handleToggleAutoMode = useCallback(async () => {
    if (!autoMode) {
      await requestPermissions();
    }
    
    const newAutoMode = !autoMode;
    toggleAutoMode();
    
    // Log the toggle event (optional)
    if (user) {
      try {
        await supabase.from('user_action_log').insert({
          action: newAutoMode ? 'vibe_detection_enabled' : 'vibe_detection_disabled'
        });
      } catch (error) {
        console.warn('Failed to log vibe detection toggle:', error);
      }
    }
    
    // Sync to Supabase for cross-device persistence (deferred)
    if (user) {
      setTimeout(async () => {
        try {
          await supabase
            .from('user_preferences')
            .upsert({ 
              user_id: user.id, 
              vibe_detection_enabled: newAutoMode 
            }, { 
              onConflict: 'user_id' 
            });
        } catch (error) {
          console.warn('Failed to sync vibe detection preference:', error);
        }
      }, 0);
    }
  }, [autoMode, requestPermissions, toggleAutoMode, user]);

  const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const getCurrentVibeDescription = () => {
    switch (selectedVibe) {
      case "chill": return "Calm • Peaceful • Grounded";
      case "hype": return "Energetic • Excited • Ready";
      case "social": return "Connected • Outgoing • Open";
      case "romantic": return "Intimate • Affectionate • Warm";
      case "weird": return "Playful • Unique • Creative";
      case "open": return "Curious • Receptive • Flowing";
      case "flowing": return "Natural • Easy • Smooth";
      case "down": return "Reflective • Quiet • Inward";
      case "solo": return "Independent • Focused • Centered";
      default: return "Present • Aware • Here";
    }
  };

  // Remove the local visibility management - now handled by useSyncedVisibility

  const handleApplySuggestion = useCallback(async (suggestion: any) => {
    await handleVibeSelect(suggestion.vibe as VibeState);
    applyVibe(suggestion);
  }, [handleVibeSelect, applyVibe]);

  // Live timer for active duration
  useEffect(() => {
    if (!currentVibeRow?.started_at) return;

    const tick = () => {
      const ms = Date.now() - new Date(currentVibeRow.started_at).getTime();
      const mins = Math.floor(ms / 60_000);
      const hrs = Math.floor(mins / 60);
      setElapsed(
        hrs > 0 ? `${hrs} h ${mins % 60} min` : `${mins} min`
      );
    };

    tick(); // initial render
    const id = setInterval(tick, 30_000); // update every 30 seconds
    return () => clearInterval(id);
  }, [currentVibeRow?.started_at]);

  const handleClearVibe = useCallback(async () => {
    await clearVibe();
  }, [clearVibe]);

  // Remove getVisibilityIcon - now handled by VisibilityButton component

  // Show loading skeleton while hydrating from AsyncStorage
  if (!hydrated) return <FullScreenSpinner />;

  // Safe vibe fallback to prevent crashes
  const safeVibe = selectedVibe ?? 'chill';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header Bar */}
      <div className="flex justify-between items-center p-6 pt-16">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleAutoMode}
          className={`p-2 rounded-xl bg-card/40 backdrop-blur-sm border border-border/30 transition-all duration-300 hover:bg-card/60 ${
            autoMode ? "text-primary border-primary/30 bg-primary/10" : "text-muted-foreground"
          }`}
        >
          {autoMode ? <Zap className="mr-2" /> : <ZapOff className="mr-2" />}
          {autoMode ? 'Auto Vibe On' : 'Auto Vibe Off'}
        </Button>
        <h1 className="text-xl font-medium text-foreground glow-primary">vibe</h1>
        <VisibilityButton />
      </div>

      {/* Magical Vibe Wheel with Physics */}
      <div className="px-6 mb-8">
        <VibeWheel />
      </div>

      {/* Feedback Buttons */}
      {showFeedback && vibeDetection && (
        <div className="px-6 mb-6">
          <FeedbackButtons
            suggestedVibe={vibeDetection.suggestedVibe}
            confidence={vibeDetection.confidence}
            onAccept={handleAcceptFeedback}
            onCorrect={handleCorrectFeedback}
            onClose={handleCloseFeedback}
            isProcessing={isLearning}
            learningBoost={vibeDetection.learningBoost}
          />
        </div>
      )}

      {/* Learning Patterns with spring animation on first learning */}
      {autoMode && (
        <div className="px-6 mb-6">
          <motion.div
            key={learningData.correctionCount}
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            style={{ willChange: 'transform, opacity' }}
          >
            <div aria-live="polite">
              <LearningPatterns
                patterns={learningData.patterns}
                topPreferences={learningData.preferences}
                accuracy={learningData.accuracy}
                correctionCount={learningData.correctionCount}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Vibe Impact Panel */}
      <div className="px-6 mb-6">
        <div className="bg-card/60 backdrop-blur-xl rounded-2xl p-6 border border-border/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Vibe Impact</h3>
            {autoMode && (
              <div className="text-xs text-accent flex items-center gap-1">
                <Brain className="w-3 h-3" />
                Sensor Data
              </div>
            )}
          </div>
          <div className="space-y-3">
            {getStatusUpdates().map((update, index) => (
              <div key={index} className="flex items-start space-x-3 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                  style={{ 
                    backgroundColor: autoMode && index === 0 
                      ? "hsl(var(--accent))" 
                      : index < 2 
                        ? "hsl(var(--muted-foreground))" 
                        : "hsl(var(--accent))" 
                  }}
                ></div>
                <p className="text-sm text-muted-foreground leading-relaxed">{update}</p>
              </div>
            ))}
          </div>
          {autoMode && !permissions.microphone && (
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Enable ambient noise level access for vibe detection
              </p>
            </div>
          )}
          {autoMode && (
            <div className="mt-2 text-xs text-muted-foreground/60">
              Session active • Auto-expires after 90 minutes
            </div>
          )}
        </div>
      </div>

      {/* Emotional Density Map Preview with controlled pulse */}
      <div className="px-6 mb-6">
        <div className={`relative ${showPulse ? "animate-[pulseOnce_2s_ease-out] motion-reduce:animate-none" : ""}`}>
          <button 
            onClick={() => setShowDensityMap(true)}
            className={`w-full bg-card/40 backdrop-blur-xl rounded-2xl p-4 border transition-all duration-300 hover:bg-card/60 hover:scale-[1.02] ${
              showPulse 
                ? "border-accent/50 ring-2 ring-accent/30 shadow-[0_0_20px_hsl(var(--accent)/30)]" 
                : "border-border/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-secondary/20 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-gradient-secondary animate-pulse"></div>
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-foreground">Emotional Density Map</h4>
                  <p className="text-xs text-muted-foreground">
                    {showPulse ? "Outdoor patterns detected • Tap to explore" : "Tap to explore energy clusters"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-accent">Live</div>
                <div className="text-xs text-muted-foreground">Real-time vibes</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Density Map Modal */}
      <VibeDensityMap
        isOpen={showDensityMap}
        onClose={() => setShowDensityMap(false)}
        userLocation={null} // TODO: Add user location when available
      />

      {/* Enhanced Mini Vibe Card */}
      <div className="fixed bottom-20 left-6 right-6">
        {selectedVibe ? (
          <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-4 border border-border/30 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="relative w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-100 ease-linear"
                  style={{ 
                    backgroundColor: tintColor ? `color-mix(in srgb, ${vibes[safeVibe].color} 80%, ${tintColor} 20%)` : vibes[safeVibe].color,
                    transform: `scale(${pulseScale})`,
                    boxShadow: showGlow ? `0 0 12px 4px rgba(255,255,255,${pulseOpacity})` : undefined
                  }}
                >
                  <span className="text-lg font-bold text-white drop-shadow-sm">
                    {vibes[safeVibe].label.charAt(0).toUpperCase()}
                  </span>
                  {/* Accessibility: Reduced motion fallback */}
                  <style>{`
                    @media (prefers-reduced-motion: reduce) {
                      .vibe-card { 
                        transition: none !important; 
                        transform: none !important; 
                        box-shadow: none !important;
                      }
                    }
                  `}</style>
                </div>
                <div>
                  <span className="font-medium text-foreground">{vibes[safeVibe].label}</span>
                   <div className="text-xs text-muted-foreground">
                     Active for {elapsed}
                    {clusters.length > 0 && (
                      <span className="ml-2 opacity-70">• {clusters.length} nearby</span>
                    )}
                    {isRealTimeConnected && lastUpdateTime && (
                      <span className="ml-2 flex items-center text-xs text-emerald-400">
                        <span className="animate-pulse h-2 w-2 rounded-full bg-emerald-400 mr-1" />
                        LIVE
                      </span>
                    )}
                    {!isRealTimeConnected && clusters.length > 0 && (
                      <span className="ml-2 opacity-40 text-xs">
                        • Cached
                      </span>
                    )}
                    {lastUpdateTime && (
                      <span className="ml-2 opacity-40 text-[10px]">
                        {new Intl.DateTimeFormat('en', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          second: '2-digit'
                        }).format(lastUpdateTime)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={handleClearVibe}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                Clear Vibe
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-card/60 backdrop-blur-xl rounded-2xl p-4 border border-border/30 shadow-lg">
            <div className="flex items-center justify-center">
              <Button 
                onClick={() => {
                  // Focus on the vibe wheel - scroll to top where the wheel is
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-sm"
              >
                Set your vibe
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Smart Suggestion Toast */}
      {suggestionQueue[0] && (
        <SuggestionToast
          key={suggestionQueue[0].clusterId}
          suggestion={suggestionQueue[0]}
          onApply={handleApplySuggestion}
          onDismiss={dismissSuggestion}
        />
      )}

      {/* Bottom Navigation Spacer */}
      <div className="h-32"></div>
    </div>
  );
};