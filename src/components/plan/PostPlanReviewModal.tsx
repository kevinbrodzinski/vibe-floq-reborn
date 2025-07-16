import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Heart, Star } from 'lucide-react';
import { useSubmitPlanFeedback, type PlanFeedbackInput } from '@/hooks/usePlanFeedback';

interface PostPlanReviewModalProps {
  planId: string;
  planTitle: string;
  onClose: () => void;
}

export function PostPlanReviewModal({ 
  planId, 
  planTitle, 
  onClose 
}: PostPlanReviewModalProps) {
  const [feedback, setFeedback] = useState<PlanFeedbackInput>({});
  const submitFeedback = useSubmitPlanFeedback();

  const handleSubmit = async () => {
    await submitFeedback.mutateAsync({ planId, feedback });
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
            <Label htmlFor="favorite-moment" className="text-sm font-medium">
              What was your favorite moment?
            </Label>
            <Textarea
              id="favorite-moment"
              value={feedback.favorite_moment || ''}
              onChange={(e) => setFeedback(prev => ({ 
                ...prev, 
                favorite_moment: e.target.value 
              }))}
              placeholder="Tell us about a highlight from the experience..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Would Repeat */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="would-repeat"
              checked={feedback.would_repeat || false}
              onCheckedChange={(checked) => setFeedback(prev => ({ 
                ...prev, 
                would_repeat: !!checked 
              }))}
            />
            <Label htmlFor="would-repeat" className="text-sm">
              I'd definitely do something like this again!
            </Label>
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