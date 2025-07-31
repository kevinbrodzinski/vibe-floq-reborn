import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Settings, Zap } from 'lucide-react'
import { useNovaSnap } from '@/hooks/useNovaSnap'
import { useWeightedScoring } from '@/hooks/useWeightedScoring'

export function SmartSuggestionsToggle() {
  const { preferSmartSuggestions, toggleSmartSuggestions } = useNovaSnap()
  const { weights, isDefault } = useWeightedScoring()

  // Calculate overall personalization strength
  const personalizationStrength = Math.round(weights.personalization * 100)

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
                Personalization: {personalizationStrength}%
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