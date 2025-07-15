import { useState, useRef, useCallback, useEffect } from "react";
import { Radio, Eye, EyeOff, Users, Zap, ZapOff, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackButtons } from "@/components/ui/FeedbackButtons";
import { LearningPatterns } from "@/components/ui/LearningPatterns";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useSensorMonitoring } from "@/hooks/useSensorMonitoring";
import type { Vibe } from "@/utils/vibe";

type VibeState = "hype" | "social" | "romantic" | "weird" | "open" | "flowing" | "down" | "solo" | "chill";
type VisibilityState = "public" | "friends" | "off";

interface VibeInfo {
  label: string;
  angle: number;
  color: string;
}

export const VibeScreen = () => {
  const { user } = useAuth();
  const [selectedVibe, setSelectedVibe] = useState<VibeState>("chill");
  const [visibility, setVisibility] = useState<VisibilityState>("public");
  const [isDragging, setIsDragging] = useState(false);
  const [activeDuration, setActiveDuration] = useState(37);
  const [autoMode, setAutoMode] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loggedThisSessionRef = useRef<boolean>(false);
  const dialRef = useRef<HTMLDivElement>(null);
  
  // Sensor monitoring for auto-detection
  const { sensorData, vibeDetection, permissions, requestPermissions, recordFeedback, learningData } = useSensorMonitoring(autoMode);

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

  const handleVibeSelect = useCallback((vibe: VibeState) => {
    setSelectedVibe(vibe);
    // Turn off auto mode when manually selecting
    if (autoMode) {
      setAutoMode(false);
    }
    // Brief haptic feedback simulation
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, [autoMode]);

  // Dynamic threshold calculation based on personal preferences
  const getPersonalisedThreshold = useCallback(
    (suggested: Vibe): number => {
      const bias = learningData.preferences[suggested] ?? 0;   // −0.3…+0.3
      // Base 0.50 → as low as 0.25 for strong positive preference,
      // or as high as 0.65 for strong negative
      return 0.50 - bias * 0.25;
    },
    [learningData.preferences]
  );

  // Auto-apply detected vibe with adaptive threshold
  const applyDetectedVibe = useCallback(() => {
    if (vibeDetection) {
      const threshold = getPersonalisedThreshold(vibeDetection.suggestedVibe);
      
      if (vibeDetection.confidence >= threshold) {
        // Throttled debug log for performance analysis (once per session)
        if (!loggedThisSessionRef.current) {
          console.info(
            `[VibeAI] applied="${vibeDetection.suggestedVibe}" ` +
            `conf=${vibeDetection.confidence.toFixed(2)} ` +
            `bias=${(learningData.preferences[vibeDetection.suggestedVibe] ?? 0).toFixed(2)} ` +
            `threshold=${threshold.toFixed(2)}`
          );
          loggedThisSessionRef.current = true;
        }
        
        // Only apply if it's a valid VibeState
        const vibeAsState = vibeDetection.suggestedVibe as VibeState;
        if (vibes[vibeAsState]) {
          setSelectedVibe(vibeAsState);
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
  }, [vibeDetection, learningData.preferences, getPersonalisedThreshold, showFeedback]);

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
      setSelectedVibe(correctedVibe as VibeState);
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

  // Toggle auto mode
  const toggleAutoMode = useCallback(async () => {
    if (!autoMode) {
      await requestPermissions();
    }
    setAutoMode(!autoMode);
  }, [autoMode, requestPermissions]);

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

  const updateVisibility = useCallback(async (newVisibility: VisibilityState) => {
    if (!user) {
      console.error('No user authenticated for visibility update');
      return;
    }

    try {
      const { error } = await supabase
        .from('vibes_now')
        .update({ visibility: newVisibility })
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to update visibility:', error);
      }
    } catch (err) {
      console.error('Visibility update error:', err);
    }
  }, [user]);

  const cycleVisibility = useCallback(() => {
    setVisibility(prev => {
      const newVisibility = (() => {
        switch (prev) {
          case "public": return "friends";
          case "friends": return "off";
          case "off": return "public";
          default: return "public";
        }
      })();
      
      updateVisibility(newVisibility);
      return newVisibility;
    });
  }, [updateVisibility]);

  const getVisibilityIcon = () => {
    switch (visibility) {
      case "public": return <Eye className="w-5 h-5" />;
      case "friends": return <Users className="w-5 h-5" />;
      case "off": return <EyeOff className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header Bar */}
      <div className="flex justify-between items-center p-6 pt-16">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleAutoMode}
          className={`p-2 rounded-xl bg-card/40 backdrop-blur-sm border border-border/30 transition-all duration-300 hover:bg-card/60 ${
            autoMode ? "text-primary border-primary/30 bg-primary/10" : "text-muted-foreground"
          }`}
        >
          {autoMode ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
        </Button>
        <h1 className="text-xl font-medium text-foreground glow-primary">vibe</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={cycleVisibility}
          className={`p-2 rounded-xl bg-card/40 backdrop-blur-sm border border-border/30 transition-all duration-300 hover:bg-card/60 ${
            visibility === "off" ? "opacity-30 grayscale" : "text-foreground"
          }`}
        >
          {getVisibilityIcon()}
        </Button>
      </div>

      {/* Radial Vibe Selector */}
      <div className="px-6 mb-8">
        <div 
          ref={dialRef}
          className="relative w-80 h-80 mx-auto"
          onTouchStart={handleDragStart}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
        >
          {/* Outer gradient ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-vibe p-1">
            <div className="w-full h-full rounded-full bg-background/95 backdrop-blur-sm"></div>
          </div>
          
          {/* Vibe labels around the circle */}
          {Object.entries(vibes).map(([key, vibe]) => {
            const isSelected = key === selectedVibe;
            const radian = (vibe.angle * Math.PI) / 180;
            const radius = 130;
            const x = Math.cos(radian) * radius;
            const y = Math.sin(radian) * radius;
            
            return (
              <button
                key={key}
                onClick={() => handleVibeSelect(key as VibeState)}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 px-3 py-2 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${
                  isSelected 
                    ? "text-primary font-bold scale-110 bg-primary/10 backdrop-blur-sm border border-primary/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30 hover:scale-105"
                }`}
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                }}
              >
                <span className="text-sm font-medium">{vibe.label}</span>
              </button>
            );
          })}

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
                {vibes[selectedVibe].label}
              </h2>
              <p className="text-sm text-muted-foreground mb-2">
                {getCurrentVibeDescription()}
              </p>
              {autoMode && (
                <p className="text-xs text-accent mb-2 flex items-center justify-center gap-1">
                  <Brain className="w-3 h-3" />
                  Auto Mode
                </p>
              )}
              <div className={`w-16 h-16 rounded-full backdrop-blur-sm border flex items-center justify-center transition-all duration-500 ${
                autoMode 
                  ? "bg-accent/20 border-accent/30 animate-pulse" 
                  : "bg-gradient-primary/20 border-primary/30 animate-pulse-glow"
              }`}>
                <div className={`w-8 h-8 rounded-full ${
                  autoMode ? "bg-gradient-secondary" : "bg-gradient-primary"
                }`}></div>
              </div>
              {autoMode && vibeDetection && vibeDetection.confidence > 0.3 && !showFeedback && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={applyDetectedVibe}
                    size="sm"
                    role="button"
                    aria-label="Apply detected vibe"
                    className={`text-xs px-3 py-1 h-6 ${
                      vibeDetection.learningBoost?.boosted 
                        ? "shadow-[0_0_6px_hsl(var(--accent)/40)] bg-accent/20 border border-accent/30 text-accent hover:bg-accent/30" 
                        : ""
                    }`}
                    disabled={vibeDetection.confidence < (learningData.preferences[vibeDetection.suggestedVibe] ? 0.50 - (learningData.preferences[vibeDetection.suggestedVibe] || 0) * 0.25 : 0.5)}
                  >
                    Apply {vibeDetection.suggestedVibe} ({Math.round(vibeDetection.confidence * 100)}%)
                  </Button>
                  {vibeDetection.learningBoost?.boosted && (
                    <div className="text-xs text-accent flex items-center gap-1" title="Boosted by your preferences">
                      💡 <span className="text-[10px] hidden sm:inline">learned</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Selection indicator */}
          <div 
            className="absolute w-3 h-3 rounded-full transition-all duration-500 animate-pulse-glow"
            style={{
              backgroundColor: vibes[selectedVibe].color,
              boxShadow: `0 0 15px ${vibes[selectedVibe].color}`,
              left: `calc(50% + ${Math.cos((vibes[selectedVibe].angle * Math.PI) / 180) * 115}px)`,
              top: `calc(50% + ${Math.sin((vibes[selectedVibe].angle * Math.PI) / 180) * 115}px)`,
              transform: "translate(-50%, -50%)"
            }}
          ></div>
        </div>
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

      {/* Learning Patterns */}
      {autoMode && (
        <div className="px-6 mb-6">
          <LearningPatterns
            patterns={learningData.patterns}
            topPreferences={learningData.preferences}
            accuracy={learningData.accuracy}
            correctionCount={learningData.correctionCount}
          />
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

      {/* Emotional Density Map Preview */}
      <div className="px-6 mb-6">
        <button className="w-full bg-card/40 backdrop-blur-xl rounded-2xl p-4 border border-border/30 transition-all duration-300 hover:bg-card/60 hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-secondary/20 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-gradient-secondary animate-pulse"></div>
              </div>
              <div className="text-left">
                <h4 className="font-medium text-foreground">Emotional Density Map</h4>
                <p className="text-xs text-muted-foreground">Tap to explore energy clusters</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-accent">4 matches</div>
              <div className="text-xs text-muted-foreground">2mi radius</div>
            </div>
          </div>
        </button>
      </div>

      {/* Mini Vibe Card */}
      <div className="fixed bottom-20 left-6 right-6">
        <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-4 border border-border/30 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: vibes[selectedVibe].color }}
              ></div>
              <div>
                <span className="font-medium text-foreground">{vibes[selectedVibe].label}</span>
                <div className="text-xs text-muted-foreground">Active for {activeDuration} min</div>
              </div>
            </div>
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200">
              Clear Vibe
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Spacer */}
      <div className="h-32"></div>
    </div>
  );
};