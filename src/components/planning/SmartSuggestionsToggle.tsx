import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Sparkles } from 'lucide-react'
import { useNovaSnap } from '@/hooks/useNovaSnap'

export function SmartSuggestionsToggle() {
  const { preferSmartSuggestions, toggleSmartSuggestions } = useNovaSnap()

  return (
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
  )
}