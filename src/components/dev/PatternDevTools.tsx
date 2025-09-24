import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePersonalityInsights } from '@/hooks/usePersonalityInsights';

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
    <Card>
      <CardHeader>
        <CardTitle>Pattern Intelligence</CardTitle>
        <CardDescription>
          Personality insights from {insights.correctionCount} corrections
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Chronotype</label>
            <Badge 
              variant="outline" 
              className={`mt-1 ${getChronotypeColor(insights.chronotype)}`}
            >
              {insights.chronotype}
            </Badge>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Energy Type</label>
            <Badge 
              variant="outline" 
              className={`mt-1 ${getEnergyColor(insights.energyType)}`}
            >
              {insights.energyType}
            </Badge>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Social Type</label>
            <Badge 
              variant="outline" 
              className={`mt-1 ${getSocialColor(insights.socialType)}`}
            >
              {insights.socialType}
            </Badge>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Consistency</label>
            <Badge variant="outline" className="mt-1">
              {insights.consistency}
            </Badge>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pattern Confidence:</span>
            <span className={insights.hasEnoughData ? 'text-green-600' : 'text-yellow-600'}>
              {insights.hasEnoughData ? 'High' : 'Building'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted-foreground">Data Points:</span>
            <span>{insights.correctionCount}</span>
          </div>
        </div>

        {insights.hasEnoughData && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              ✨ Pattern nudges active in vibe engine
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}