import { useMemo } from 'react';
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Settings, Zap } from 'lucide-react'
import { useNovaSnap } from '@/hooks/useNovaSnap'
import { useWeightedScoring } from '@/hooks/useWeightedScoring'

export function SmartSuggestionsToggle() {
  const { preferSmartSuggestions, toggleSmartSuggestions } = useNovaSnap()
  const { weights, isDefault } = useWeightedScoring()

  // Calculate overall personalization strength with memoization
  const personalizationStrength = useMemo(() => {
    const nonDefaultWeights = Object.values(weights).filter((weight, index) => {
      const defaultValues = [0.3, 0.25, 0.2, 0.15, 0.1];
      return Math.abs(weight - defaultValues[index]) > 0.01;
    });
    
    if (nonDefaultWeights.length === 0) return 'Standard';
    if (nonDefaultWeights.length <= 2) return 'Light';
    if (nonDefaultWeights.length <= 3) return 'Moderate';
    return 'Heavy';
  }, [weights]);

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <Label htmlFor="smart-suggestions" className="text-sm font-medium">
          Smart Suggestions
        </Label>
        <Switch
          id="smart-suggestions"
          checked={preferSmartSuggestions}
          onCheckedChange={toggleSmartSuggestions}
        />
      </div>
      
      {preferSmartSuggestions && (
        <div className="ml-6 space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-accent" />
              <span className="text-xs text-muted-foreground">
                {personalizationStrength} personalization
              </span>
            </div>
            {!isDefault && (
              <Badge variant="secondary" className="text-xs h-4">
                Custom
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Settings className="h-3 w-3" />
            <span>Distance: {Math.round(weights.distance * 100)}%</span>
            <span>•</span>
            <span>Rating: {Math.round(weights.rating * 100)}%</span>
            <span>•</span>
            <span>Activity: {Math.round(weights.activity * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  )
}