import React, { useEffect } from 'react';
import { PatternDevTools } from '@/components/dev/PatternDevTools';
import { LearningFeedbackPanel } from '@/components/intelligence/LearningFeedbackPanel';
import { PredictiveVibePanel } from '@/components/intelligence/PredictiveVibePanel';
import { ActivityRecommendationPanel } from '@/components/intelligence/ActivityRecommendationPanel';
import { PatternInsightsPanel } from '@/components/intelligence/PatternInsightsPanel';
import { initializePatternLearning } from '@/core/patterns/learner';

export function IntelligenceDashboard() {
  useEffect(() => {
    // Initialize pattern learning system on dashboard mount
    initializePatternLearning();
  }, []);

  return (
    <div className="space-y-4">
      <PatternInsightsPanel />
      <PatternDevTools />
      <LearningFeedbackPanel />
      <PredictiveVibePanel />
      <ActivityRecommendationPanel />
    </div>
  );
}