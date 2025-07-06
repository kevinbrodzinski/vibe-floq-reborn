import { useState, useEffect } from 'react';
import { useSocialContext } from '@/hooks/useSocialContext';
import { useTimeSyncContext } from './TimeSyncProvider';
import { FloqAI } from './FloqAI';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';

export const AIContextSurface = () => {
  const { socialContext, shouldSurfaceAI } = useSocialContext();
  const { timeState, isTransitioning } = useTimeSyncContext();
  const [isAIVisible, setIsAIVisible] = useState(false);
  const [showContextPrompt, setShowContextPrompt] = useState(false);
  const [lastSurfaceTime, setLastSurfaceTime] = useState(0);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastSurface = now - lastSurfaceTime;
    
    // Don't surface too frequently (at least 5 minutes apart)
    if (timeSinceLastSurface < 300000) return;
    
    if (shouldSurfaceAI() && !isAIVisible && !isTransitioning) {
      // Show contextual prompt first, then AI if user engages
      setShowContextPrompt(true);
      setLastSurfaceTime(now);
      
      // Auto-hide prompt after 10 seconds if no interaction
      setTimeout(() => {
        setShowContextPrompt(false);
      }, 10000);
    }
  }, [shouldSurfaceAI, isAIVisible, isTransitioning, lastSurfaceTime]);

  const handlePromptClick = () => {
    setShowContextPrompt(false);
    setIsAIVisible(true);
  };

  const getCurrentPrompt = (): string => {
    if (socialContext.contextualPrompts.length > 0) {
      return socialContext.contextualPrompts[0];
    }
    
    // Fallback contextual prompts
    switch (timeState) {
      case 'evening':
      case 'night':
        return "Peak social energy detected. Want to ride the wave?";
      case 'afternoon':
        return "Energy is building. Check who's around?";
      case 'late':
        return "Intimate connections are active. Time for deeper vibes?";
      default:
        return "I'm sensing shifts in your social field...";
    }
  };

  return (
    <>
      {/* Contextual Floating Prompt */}
      {showContextPrompt && !isAIVisible && (
        <div className="fixed bottom-32 right-6 z-40 animate-fade-in">
          <div className="bg-card/95 backdrop-blur-xl rounded-2xl p-4 border border-primary/30 glow-primary max-w-xs shadow-lg">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center animate-pulse-glow">
                  <Sparkles className="w-3 h-3 text-primary-foreground" />
                </div>
                <span className="text-xs font-medium text-primary">FLOQ AI</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowContextPrompt(false)}
                className="h-6 w-6 p-0 hover:glow-secondary"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            
            <p className="text-sm text-foreground mb-3 leading-relaxed">
              {getCurrentPrompt()}
            </p>
            
            <Button 
              onClick={handlePromptClick}
              className="w-full h-8 text-xs gradient-secondary text-secondary-foreground rounded-xl transition-smooth hover:glow-active"
            >
              Let's Talk
            </Button>
          </div>
        </div>
      )}

      {/* AI Interface */}
      <FloqAI 
        isVisible={isAIVisible} 
        onClose={() => setIsAIVisible(false)} 
      />

      {/* Manual AI Trigger (always available) */}
      {!showContextPrompt && !isAIVisible && (
        <div className="fixed bottom-32 right-6 z-40">
          <Button
            onClick={() => setIsAIVisible(true)}
            className="w-12 h-12 rounded-full gradient-primary animate-pulse-glow transition-smooth hover:scale-110 hover:glow-active shadow-lg"
          >
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </Button>
        </div>
      )}
    </>
  );
};