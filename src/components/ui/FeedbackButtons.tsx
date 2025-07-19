import { useState } from "react";
import { Check, X, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Vibe } from "@/types/vibes";

interface FeedbackButtonsProps {
  suggestedVibe: Vibe;
  confidence: number;
  onAccept: () => void;
  onCorrect: (correctedVibe: Vibe) => void;
  onClose: () => void;
  isProcessing?: boolean;
  learningBoost?: {
    boosted: boolean;
    boostFactor: number;
    originalConfidence: number;
  };
}

export const FeedbackButtons = ({ 
  suggestedVibe, 
  confidence, 
  onAccept, 
  onCorrect, 
  onClose,
  isProcessing = false,
  learningBoost
}: FeedbackButtonsProps) => {
  const [showCorrection, setShowCorrection] = useState(false);

  const vibeOptions: Vibe[] = [
    "chill", "hype", "social", "romantic", "weird", 
    "open", "flowing", "down", "solo"
  ];

  const handleAccept = () => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    onAccept();
  };

  const handleCorrect = () => {
    if (navigator.vibrate) {
      navigator.vibrate([30, 50, 30]);
    }
    setShowCorrection(true);
  };

  const handleVibeCorrection = (vibe: Vibe) => {
    if (navigator.vibrate) {
      navigator.vibrate(80);
    }
    onCorrect(vibe);
    setShowCorrection(false);
  };

  if (showCorrection) {
    return (
      <div className="bg-card/95 backdrop-blur-xl rounded-xl p-4 border border-border/30 animate-scale-in">
        <div className="text-center mb-3">
          <p className="text-sm font-medium text-foreground mb-1">What's your actual vibe?</p>
          <p className="text-xs text-muted-foreground">
            Help improve future suggestions
          </p>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mb-3 max-h-32 overflow-y-auto">
          {vibeOptions.map((vibe) => (
            <Button
              key={vibe}
              variant={vibe === suggestedVibe ? "outline" : "ghost"}
              size="sm"
              onClick={() => handleVibeCorrection(vibe)}
              className={`h-8 text-xs capitalize transition-all duration-200 ${
                vibe === suggestedVibe 
                  ? "opacity-50 border-dashed bg-muted/30" 
                  : "hover:bg-primary/10 hover:text-primary bg-muted/20"
              }`}
              disabled={isProcessing}
            >
              {vibe}
            </Button>
          ))}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCorrection(false)}
          className="w-full h-7 text-xs text-muted-foreground"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card/95 backdrop-blur-xl rounded-xl p-4 border border-border/30 animate-scale-in">
      <div className="text-center mb-3">
        <div className="flex items-center justify-center gap-2 mb-1">
          <p className="text-sm font-medium text-foreground">
            Detected: <span className="text-primary capitalize">{suggestedVibe}</span>
          </p>
          {learningBoost?.boosted && (
            <div className="text-accent text-xs flex items-center gap-1" title="Boosted by your preferences">
              💡
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {Math.round(confidence * 100)}% confidence
          {learningBoost?.boosted && (
            <span className="text-accent ml-1">
              • learned boost +{Math.round((confidence - learningBoost.originalConfidence) * 100)}%
            </span>
          )}
          {" • Is this correct?"}
        </p>
      </div>
      
      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleAccept}
          disabled={isProcessing}
          className="flex-1 h-8 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
        >
          <ThumbsUp className="w-3 h-3 mr-1" />
          Correct
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleCorrect}
          disabled={isProcessing}
          className="flex-1 h-8 text-xs hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
        >
          <ThumbsDown className="w-3 h-3 mr-1" />
          Fix
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={isProcessing}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
      
      {isProcessing && (
        <div className="mt-2 text-center">
          <div className="inline-flex items-center gap-1 text-xs text-accent">
            <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin"></div>
            Learning...
          </div>
        </div>
      )}
    </div>
  );
};