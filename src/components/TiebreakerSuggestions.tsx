import { useState } from "react";
import { Sparkles, Clock, Users, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface TiebreakerSuggestion {
  id: string;
  reason: string;
  recommendation: string;
  confidence: number;
  icon: string;
}

interface TiebreakerSuggestionsProps {
  stopId: string;
  tiedOptions: string[];
  onSelectRecommendation: (recommendation: string) => void;
  className?: string;
}

export const TiebreakerSuggestions = ({
  stopId,
  tiedOptions,
  onSelectRecommendation,
  className = ""
}: TiebreakerSuggestionsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Mock AI suggestions - in production, this would call an AI service
  const suggestions: TiebreakerSuggestion[] = [
    {
      id: "time-optimal",
      reason: "Shortest travel time between stops",
      recommendation: tiedOptions[0],
      confidence: 85,
      icon: "⏱️"
    },
    {
      id: "group-energy",
      reason: "Best for maintaining group energy",
      recommendation: tiedOptions[1],
      confidence: 78,
      icon: "⚡"
    },
    {
      id: "budget-friendly",
      reason: "Most cost-effective option",
      recommendation: tiedOptions[0],
      confidence: 72,
      icon: "💰"
    }
  ];

  const handleGenerateNewSuggestions = async () => {
    setIsGenerating(true);
    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsGenerating(false);
  };

  const topSuggestion = suggestions[0];

  return (
    <Card className={`border-amber-200 bg-amber-50/50 ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              AI Tiebreaker
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-auto p-1 text-amber-700 hover:text-amber-900"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className="space-y-3">
          {/* Top Recommendation */}
          <div className="flex items-start gap-3">
            <span className="text-lg">{topSuggestion.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-amber-800 mb-1">
                <span className="font-medium">Recommended:</span> {topSuggestion.recommendation}
              </p>
              <p className="text-xs text-amber-600 mb-2">
                {topSuggestion.reason}
              </p>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-amber-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>{topSuggestion.confidence}% confidence</span>
                </div>
                
                <Button
                  size="sm"
                  onClick={() => onSelectRecommendation(topSuggestion.recommendation)}
                  className="h-6 text-xs bg-amber-600 hover:bg-amber-700"
                >
                  Accept
                </Button>
              </div>
            </div>
          </div>

          {/* Expanded Options */}
          {isExpanded && (
            <div className="space-y-2 pt-2 border-t border-amber-200">
              {suggestions.slice(1).map((suggestion) => (
                <div key={suggestion.id} className="flex items-start gap-3 py-2">
                  <span className="text-sm">{suggestion.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-amber-800">
                      <span className="font-medium">{suggestion.recommendation}</span>
                    </p>
                    <p className="text-xs text-amber-600">
                      {suggestion.reason} ({suggestion.confidence}% confidence)
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectRecommendation(suggestion.recommendation)}
                    className="h-5 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    Select
                  </Button>
                </div>
              ))}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerateNewSuggestions}
                disabled={isGenerating}
                className="w-full h-8 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="w-3 h-3 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 mr-1" />
                    Generate New Suggestions
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};