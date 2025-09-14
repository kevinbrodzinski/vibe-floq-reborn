import React, { useEffect } from 'react';
import { PatternDevTools } from '@/components/dev/PatternDevTools';
import { LearningFeedbackPanel } from '@/components/intelligence/LearningFeedbackPanel';
import { PredictiveVibePanel } from '@/components/intelligence/PredictiveVibePanel';
import { ActivityRecommendationPanel } from '@/components/intelligence/ActivityRecommendationPanel';
import { PatternInsightsPanel } from '@/components/intelligence/PatternInsightsPanel';
import { VenueImpactHeatmap } from '@/components/intelligence/VenueImpactHeatmap';
import { TemporalChart } from '@/components/intelligence/TemporalChart';
import { PersonalityEvolution } from '@/components/intelligence/PersonalityEvolution';
import { initializePatternLearning } from '@/core/patterns/learner';
import { usePatternMaintenance } from '@/hooks/usePatternMaintenance';

export function IntelligenceDashboard() {
  // Initialize pattern learning and maintenance
  useEffect(() => {
    initializePatternLearning();
  }, []);

  // Enable weekly pattern maintenance
  usePatternMaintenance();

  return (
    <div className="space-y-4">
      <PatternInsightsPanel />
      <VenueImpactHeatmap />
      <TemporalChart />
      <PersonalityEvolution />
      <PatternDevTools />
      <LearningFeedbackPanel />
      <PredictiveVibePanel />
      <ActivityRecommendationPanel />
    </div>
  );
}