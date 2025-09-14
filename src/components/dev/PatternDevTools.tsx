import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePersonalityInsights } from '@/hooks/usePersonalityInsights';
import { PatternDevTools } from '@/components/dev/PatternDevTools';
import { LearningFeedbackPanel } from '@/components/intelligence/LearningFeedbackPanel';
import { PredictiveVibePanel } from '@/components/intelligence/PredictiveVibePanel';
import { ActivityRecommendationPanel } from '@/components/intelligence/ActivityRecommendationPanel';

export function PatternDevTools() {
  const insights = usePersonalityInsights();

  if (!insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pattern Intelligence</CardTitle>
          <CardDescription>Collecting user pattern data...</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Need at least 10 corrections to analyze patterns
          </p>
        </CardContent>
      </Card>
    );
  }

  const getChronotypeColor = (type: string) => {
    switch (type) {
      case 'lark': return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'owl': return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      default: return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    }
  };

  const getEnergyColor = (type: string) => {
    switch (type) {
      case 'high-energy': return 'bg-red-500/10 text-red-700 border-red-500/20';
      case 'low-energy': return 'bg-green-500/10 text-green-700 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const getSocialColor = (type: string) => {
    switch (type) {
      case 'social': return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
      case 'solo': return 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-4">
      <PatternDevTools />
      <LearningFeedbackPanel />
      <PredictiveVibePanel />
      <ActivityRecommendationPanel />
    </div>
  );
}