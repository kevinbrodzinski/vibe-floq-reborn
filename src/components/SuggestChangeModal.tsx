import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar, Sparkles, Send, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogOverlay,
  DialogPortal,
  DialogClose
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface SuggestChangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  floqId: string;
  currentVibe: string;
  currentTime: string;
}

const vibeOptions = [
  { value: 'chill', label: 'Chill', color: 'hsl(180, 70%, 60%)', emoji: '😌' },
  { value: 'hype', label: 'Hype', color: 'hsl(260, 70%, 65%)', emoji: '🎉' },
  { value: 'romantic', label: 'Romantic', color: 'hsl(330, 70%, 65%)', emoji: '💕' },
  { value: 'social', label: 'Social', color: 'hsl(25, 70%, 60%)', emoji: '🤝' },
  { value: 'solo', label: 'Solo', color: 'hsl(210, 70%, 65%)', emoji: '🧘' },
  { value: 'weird', label: 'Weird', color: 'hsl(280, 70%, 65%)', emoji: '🤪' },
  { value: 'flowing', label: 'Flowing', color: 'hsl(100, 70%, 60%)', emoji: '🌊' },
  { value: 'down', label: 'Down', color: 'hsl(220, 15%, 55%)', emoji: '😔' },
];

const timeAdjustments = [
  { label: '+15 min', value: 15, icon: '⏰' },
  { label: '+30 min', value: 30, icon: '🕐' },
  { label: '+1 hour', value: 60, icon: '🕑' },
  { label: '-15 min', value: -15, icon: '⏪' },
  { label: '-30 min', value: -30, icon: '⏮️' },
];

export const SuggestChangeModal = ({ 
  open, 
  onOpenChange, 
  floqId, 
  currentVibe, 
  currentTime 
}: SuggestChangeModalProps) => {
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const [timeAdjustment, setTimeAdjustment] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedVibe && !timeAdjustment && !message.trim()) {
      toast({
        title: "Nothing to suggest",
        description: "Please select a change or add a message",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Implement suggestion submission to backend
      console.log('🎯 Suggestion submitted:', {
        floqId,
        suggestedVibe: selectedVibe,
        timeAdjustment,
        message: message.trim()
      });

      toast({
        title: "Suggestion sent! 🚀",
        description: "Your suggestion has been sent to the floq creator",
      });

      // Reset form and close modal
      setSelectedVibe(null);
      setTimeAdjustment(null);
      setMessage('');
      onOpenChange(false);

    } catch (error) {
      console.error('Failed to submit suggestion:', error);
      toast({
        title: "Failed to send suggestion",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVibeOption = vibeOptions.find(v => v.value === selectedVibe);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        
        <div className="
          fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg
          -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface/90
          shadow-xl backdrop-blur-md
          sm:w-full sm:bottom-0 sm:top-auto sm:translate-x-0 sm:translate-y-0
          sm:left-0 sm:rounded-t-2xl sm:rounded-b-none
        ">
          {/* Sticky Header */}
          <header className="sticky top-0 flex items-center justify-between p-4 bg-surface/80 backdrop-blur rounded-t-2xl border-b border-border/20">
            <DialogTitle className="flex items-center gap-2 text-foreground text-base font-semibold">
              <Sparkles className="w-5 h-5 text-accent" />
              Suggest Changes
            </DialogTitle>
            <DialogClose asChild>
              <X className="h-5 w-5 cursor-pointer text-muted-foreground hover:text-foreground transition-colors" />
            </DialogClose>
          </header>

          {/* Scrollable Body */}
          <ScrollArea className="max-h-[70vh] sm:max-h-[calc(100vh-10rem)]">
            <div className="space-y-6 p-4">
              {/* Vibe Selection */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Suggest New Vibe
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {vibeOptions.map((vibe) => (
                    <motion.button
                      key={vibe.value}
                      onClick={() => setSelectedVibe(selectedVibe === vibe.value ? null : vibe.value)}
                      className={`
                        p-3 rounded-xl border transition-all duration-200 text-left min-h-[44px]
                        ${selectedVibe === vibe.value
                          ? 'border-accent bg-accent/20 text-accent-foreground'
                          : 'border-border/40 bg-secondary/30 text-secondary-foreground hover:bg-secondary/50'
                        }
                        ${vibe.value === currentVibe ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                      disabled={vibe.value === currentVibe}
                      whileHover={{ scale: vibe.value === currentVibe ? 1 : 1.02 }}
                      whileTap={{ scale: vibe.value === currentVibe ? 1 : 0.98 }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{vibe.emoji}</span>
                        <div>
                          <div className="font-medium text-sm">{vibe.label}</div>
                          {vibe.value === currentVibe && (
                            <div className="text-xs opacity-60">Current</div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Time Adjustment */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Suggest Time Change
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {timeAdjustments.map((time) => (
                    <motion.button
                      key={time.value}
                      onClick={() => setTimeAdjustment(timeAdjustment === time.value ? null : time.value)}
                      className={`
                        p-3 rounded-lg border transition-all duration-200 text-center min-h-[44px]
                        ${timeAdjustment === time.value
                          ? 'border-accent bg-accent/20 text-accent-foreground'
                          : 'border-border/40 bg-secondary/30 text-secondary-foreground hover:bg-secondary/50'
                        }
                      `}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="text-lg mb-1">{time.icon}</div>
                      <div className="text-xs font-medium">{time.label}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Add Message (Optional)
                </h4>
                <Textarea
                  placeholder="Explain your suggestion..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-secondary/30 border-border/40 text-foreground placeholder:text-muted-foreground resize-none"
                  rows={3}
                />
              </div>

              {/* Summary */}
              <AnimatePresence>
                {(selectedVibe || timeAdjustment || message.trim()) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-primary/10 rounded-xl p-4 border border-primary/20"
                  >
                    <h5 className="text-sm font-medium text-primary mb-2">Your Suggestion:</h5>
                    <div className="space-y-1 text-sm text-foreground/80">
                      {selectedVibe && (
                        <div className="flex items-center gap-2">
                          <span>{selectedVibeOption?.emoji}</span>
                          <span>Change vibe to {selectedVibeOption?.label}</span>
                        </div>
                      )}
                      {timeAdjustment && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          <span>
                            {timeAdjustment > 0 ? 'Delay by' : 'Start earlier by'} {Math.abs(timeAdjustment)} minutes
                          </span>
                        </div>
                      )}
                      {message.trim() && (
                        <div className="text-foreground/60 italic">"{message.trim()}"</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>

          {/* Sticky Footer */}
          <footer className="sticky bottom-0 flex gap-2 border-t border-border/20 bg-surface/80 p-4 backdrop-blur rounded-b-2xl sm:rounded-none">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 min-h-[44px]"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (!selectedVibe && !timeAdjustment && !message.trim())}
              className="flex-1 bg-gradient-primary text-primary-foreground min-h-[44px]"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Send
                </span>
              )}
            </Button>
          </footer>
        </div>
      </DialogPortal>
    </Dialog>
  );
};