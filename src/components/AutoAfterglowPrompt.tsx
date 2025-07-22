
import { useState, useEffect } from "react";
import { Sparkles, Clock, ArrowRight, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TimeProgressBar } from "@/components/ExecutionFeedbackUtils";
import { zIndex } from "@/constants/z";

interface AutoAfterglowPromptProps {
  planId: string;
  planTitle: string;
  isActive: boolean;
  onAccept: () => void;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
  className?: string;
}

export const AutoAfterglowPrompt = ({
  planId,
  planTitle,
  isActive,
  onAccept,
  onDismiss,
  onSnooze,
  className = ""
}: AutoAfterglowPromptProps) => {
  const [countdown, setCountdown] = useState(30); // 30 second countdown
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        const newCount = prev - 1;
        setProgress((newCount / 30) * 100);
        
        if (newCount <= 0) {
          onAccept(); // Auto-accept when countdown reaches 0
          return 0;
        }
        
        return newCount;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, onAccept, planId, planTitle]);

  // Reset countdown when prompt becomes active
  useEffect(() => {
    if (isActive) {
      setCountdown(30);
      setProgress(100);
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      {...zIndex('modal')}
    >
      <Card className={`w-full max-w-md p-6 border-primary/20 bg-gradient-to-br from-purple-50 to-pink-50 animate-scale-in shadow-2xl ${className}`}>
        <div className="text-center space-y-4">
          {/* Header */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">
              Time for Afterglow! ✨
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your plan "{planTitle}" seems to be winding down. 
              Ready to capture some memories and reflections?
            </p>
          </div>

           {/* Countdown */}
           <div className="space-y-2">
             <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
               <Clock className="w-4 h-4" />
               <span>Auto-starting in {countdown}s</span>
             </div>
             <TimeProgressBar progress={progress} label="Afterglow starting..." />
           </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              onClick={onAccept}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Start Afterglow Now
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onSnooze(10)}
                className="flex-1"
              >
                <Clock className="w-3 h-3 mr-1" />
                Snooze 10m
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onSnooze(30)}
                className="flex-1"
              >
                <Clock className="w-3 h-3 mr-1" />
                Snooze 30m
              </Button>
            </div>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDismiss}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3 mr-1" />
              Skip for today
            </Button>
          </div>

          {/* Benefits preview */}
          <div className="text-xs text-muted-foreground pt-3 border-t">
            <p>📸 Capture moments • 🎭 Share vibes • 📝 Log memories</p>
            <button className="text-primary hover:underline mt-1" title="Afterglow helps preserve memories and strengthens social bonds">
              Why Afterglow?
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
