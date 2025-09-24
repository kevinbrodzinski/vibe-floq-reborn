import React from 'react';
import { IntelligenceCard } from '@/components/intelligence/IntelligenceCard';
import { ContextualVibeRecommendations } from '@/components/intelligence/ContextualVibeRecommendations';
// import { ContextAwareCard } from '@/components/intelligence/ContextAwareCard';
// import { FrictionReport } from '@/components/intelligence/FrictionReport';
// import { usePersonalityInsights } from '@/hooks/usePersonalityInsights';

interface IntelligenceWidgetsProps {
  location?: { lat: number; lng: number };
  weather?: any;
  onViewIntelligenceDashboard?: () => void;
}

/**
 * Intelligence widgets for the field/home screen
 * Temporarily simplified to avoid context initialization issues
 */
export function IntelligenceWidgets({ 
  location, 
  weather, 
  onViewIntelligenceDashboard 
}: IntelligenceWidgetsProps) {
  // Temporarily disable personality insights until context system is stable
  // const insights = usePersonalityInsights();

  // Show basic intelligence card for now
  return (
    <div className="space-y-3">
      <IntelligenceCard 
        variant="compact" 
        onViewDetails={onViewIntelligenceDashboard}
      />
      <ContextualVibeRecommendations 
        location={location}
        weather={weather}
        compact
      />
    </div>
  );
}