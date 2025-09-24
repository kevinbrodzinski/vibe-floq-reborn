import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

/**
 * Auto-prompt post-plan review modal with localStorage tracking
 */
export function useAutoPromptReview(
  planId: string | undefined, 
  hasEnded: boolean,
  onPromptReview?: () => void
) {
  const [reviewedPlans, setReviewedPlans] = useLocalStorage<string[]>('reviewed_plans', []);

  useEffect(() => {
    if (!planId || !hasEnded || !onPromptReview) return;

    // Check if we've already prompted for this plan
    if (!reviewedPlans.includes(planId)) {
      // Delay the prompt slightly for better UX
      const timeoutId = setTimeout(() => {
        onPromptReview();
        // Mark this plan as reviewed to prevent re-prompting
        setReviewedPlans(prev => [...prev, planId]);
      }, 2000); // 2 second delay

      return () => clearTimeout(timeoutId);
    }
  }, [planId, hasEnded, reviewedPlans, setReviewedPlans, onPromptReview]);

  // Return helper to manually mark as reviewed (if needed)
  const markAsReviewed = (id: string) => {
    setReviewedPlans(prev => prev.includes(id) ? prev : [...prev, id]);
  };

  return { 
    isAlreadyReviewed: planId ? reviewedPlans.includes(planId) : false,
    markAsReviewed 
  };
}