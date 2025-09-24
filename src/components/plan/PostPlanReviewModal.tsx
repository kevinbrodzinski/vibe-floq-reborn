import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Heart, Star, ToggleLeft, ToggleRight } from 'lucide-react';
import { useSubmitPlanFeedback, type PlanFeedbackInput } from '@/hooks/usePlanFeedback';

// Use the exported type but with stricter validation
type StrictPlanFeedbackInput = PlanFeedbackInput;

interface PostPlanReviewModalProps {
  planId: string;
  planTitle: string;
  onClose: () => void;
  onSubmit?: (feedback: StrictPlanFeedbackInput) => void;
}

export function PostPlanReviewModal({ 
  planId, 
  planTitle, 
  onClose,
  onSubmit 
}: PostPlanReviewModalProps) {
  const [feedback, setFeedback] = useState<StrictPlanFeedbackInput>({});
  const [momentCharCount, setMomentCharCount] = useState(0);
  const submitFeedback = useSubmitPlanFeedback();

  const MAX_MOMENT_LENGTH = 280;

  const handleSubmit = async () => {
    await submitFeedback.mutateAsync({ planId, feedback });
    
    // Call the optional onSubmit callback for preference learning
    onSubmit?.(feedback);
    
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            How was "{planTitle}"?
          </DialogTitle>
          <DialogDescription>
            Share your feedback about this plan to help us improve future recommendations.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Vibe Rating */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">How would you rate the vibe?</Label>
            <RadioGroup 
              value={feedback.vibe_rating?.toString() || ''}
              onValueChange={(value) => setFeedback(prev => ({ 
                ...prev, 
                vibe_rating: parseInt(value) 
              }))}
            >
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <div key={rating} className="flex items-center space-x-1">
                    <RadioGroupItem
                      value={rating.toString()}
                      id={`rating-${rating}`}
                      className="sr-only"
                    />
                    <Label 
                      htmlFor={`rating-${rating}`}
                      className="cursor-pointer p-1"
                    >
                      <Star 
                        className={`w-6 h-6 ${
                          feedback.vibe_rating && feedback.vibe_rating >= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Favorite Moment */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="favorite-moment" className="text-sm font-medium">
                What was your favorite moment?
              </Label>
              <Badge variant={momentCharCount > MAX_MOMENT_LENGTH ? "destructive" : "secondary"} className="text-xs">
                {momentCharCount}/{MAX_MOMENT_LENGTH}
              </Badge>
            </div>
            <Textarea
              id="favorite-moment"
              value={feedback.favorite_moment || ''}
              onChange={(e) => {
                const value = e.target.value;
                setFeedback(prev => ({ 
                  ...prev, 
                  favorite_moment: value 
                }));
                setMomentCharCount(value.length);
              }}
              placeholder="Tell us about a highlight from the experience..."
              rows={3}
              className="resize-none"
              maxLength={MAX_MOMENT_LENGTH}
            />
          </div>

          {/* Would Repeat - Radio-style toggle */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Would you do something like this again?</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={feedback.would_repeat === true ? "default" : "outline"}
                size="sm"
                onClick={() => setFeedback(prev => ({ ...prev, would_repeat: true }))}
                className="flex-1"
              >
                {feedback.would_repeat === true ? <ToggleRight className="w-4 h-4 mr-1" /> : <ToggleLeft className="w-4 h-4 mr-1" />}
                Yes, definitely!
              </Button>
              <Button
                type="button"
                variant={feedback.would_repeat === false ? "default" : "outline"}
                size="sm"
                onClick={() => setFeedback(prev => ({ ...prev, would_repeat: false }))}
                className="flex-1"
              >
                {feedback.would_repeat === false ? <ToggleRight className="w-4 h-4 mr-1" /> : <ToggleLeft className="w-4 h-4 mr-1" />}
                Not really
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={handleSkip}>
              Skip
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={submitFeedback.isPending}
            >
              {submitFeedback.isPending ? 'Submitting...' : 'Share Feedback'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}