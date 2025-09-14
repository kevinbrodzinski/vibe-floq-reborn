import React from 'react';
import { IntelligenceCard } from '@/components/intelligence/IntelligenceCard';
import { ContextualVibeRecommendations } from '@/components/intelligence/ContextualVibeRecommendations';
import { usePersonalityInsights } from '@/hooks/usePersonalityInsights';

interface IntelligenceWidgetsProps {
  location?: { lat: number; lng: number };
  weather?: any;
  onViewIntelligenceDashboard?: () => void;
}

/**
 * Intelligence widgets for the field/home screen
 */
export function IntelligenceWidgets({ 
  location, 
  weather, 
  onViewIntelligenceDashboard 
}: IntelligenceWidgetsProps) {
  const insights = usePersonalityInsights();

  if (!insights.hasEnoughData) {
    // Show building intelligence card
    return (
      <div className="space-y-3">
        <IntelligenceCard 
          variant="compact" 
          onViewDetails={onViewIntelligenceDashboard}
        />
      </div>
    );
  }

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