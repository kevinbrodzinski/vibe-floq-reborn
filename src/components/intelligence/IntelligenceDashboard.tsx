import React from 'react';
import { PatternDevTools } from '@/components/dev/PatternDevTools';
import { LearningFeedbackPanel } from '@/components/intelligence/LearningFeedbackPanel';
import { PredictiveVibePanel } from '@/components/intelligence/PredictiveVibePanel';
import { ActivityRecommendationPanel } from '@/components/intelligence/ActivityRecommendationPanel';

export function IntelligenceDashboard() {
  return (
    <div className="space-y-4">
      <PatternDevTools />
      <LearningFeedbackPanel />
      <PredictiveVibePanel />
      <ActivityRecommendationPanel />
    </div>
  );
}