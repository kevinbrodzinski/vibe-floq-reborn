import React from 'react';
import { Brain, Lightbulb, Target, Settings } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useSmartSuggestionToggle } from '@/hooks/useSmartSuggestionToggle';
import { usePersonalityInsights } from '@/hooks/usePersonalityInsights';
import { useAuth } from '@/hooks/useAuth';
import { IntelligenceOnboarding } from './IntelligenceOnboarding';

export function IntelligenceSettings() {
  const { user } = useAuth();
  const profileId = user?.id;
  
  const { enabled: smartSuggestionsEnabled, toggle: toggleSmartSuggestions, isToggling } = 
    useSmartSuggestionToggle(profileId || '');
    
  const insights = usePersonalityInsights();
  const [showOnboarding, setShowOnboarding] = React.useState(false);

  if (!profileId) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Sign in to access intelligence features
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Smart Suggestions Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Smart Suggestions
            </Label>
            <p className="text-xs text-muted-foreground">
              Get AI-powered activity and vibe recommendations
            </p>
          </div>
          <Switch
            checked={smartSuggestionsEnabled}
            onCheckedChange={toggleSmartSuggestions}
            disabled={isToggling}
          />
        </div>

        {/* Pattern Learning Status */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Pattern Learning
            </Label>
            <p className="text-xs text-muted-foreground">
              {insights?.hasEnoughData 
                ? `Learning active • ${(insights.confidence * 100).toFixed(0)}% confidence`
                : 'Building your pattern profile...'
              }
            </p>
          </div>
          <div className="text-right">
            <div className={`w-2 h-2 rounded-full ${
              insights?.hasEnoughData ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
          </div>
        </div>

        {/* Contextual Recommendations */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Contextual Recommendations
            </Label>
            <p className="text-xs text-muted-foreground">
              Location and time-aware activity suggestions
            </p>
          </div>
          <Switch defaultChecked disabled={!smartSuggestionsEnabled} />
        </div>

        {/* Intelligence Dashboard Access */}
        <div className="pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => setShowOnboarding(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Learn About Intelligence Features
          </Button>
        </div>

        {/* Learning Status */}
        {insights && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm font-medium mb-2">Your Intelligence Profile</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>Chronotype: {insights.chronotype}</div>
              <div>Energy type: {insights.energyType}</div>
              <div>Social type: {insights.socialType}</div>
              <div>Accuracy: {(insights.confidence * 100).toFixed(0)}%</div>
              <div>Learning from your vibe corrections and preferences</div>
            </div>
          </div>
        )}
      </div>

      <IntelligenceOnboarding 
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
      />
    </>
  );
}