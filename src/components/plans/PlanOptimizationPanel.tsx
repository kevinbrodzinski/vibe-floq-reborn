import React, { useState } from 'react';
import { Brain, TrendingUp, Clock, MapPin, Users, Zap, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSmartPlanOptimization, type PlanOptimizationSuggestion } from '@/hooks/useSmartPlanOptimization';
import type { Vibe } from '@/types/vibes';

interface PlanOptimizationPanelProps {
  planId: string;
  groupVibes?: Vibe[];
  onApplySuggestion?: (suggestion: PlanOptimizationSuggestion) => void;
  className?: string;
}

export function PlanOptimizationPanel({ 
  planId, 
  groupVibes = ['social'], 
  onApplySuggestion,
  className = ''
}: PlanOptimizationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  
  const { optimization, loading, error } = useSmartPlanOptimization(planId, {
    groupVibes,
    optimizeFor: 'experience'
  });

  if (loading) {
    return (
      <Card className={`border-purple-200/20 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400 animate-pulse" />
            <CardTitle className="text-sm text-purple-300">Analyzing plan...</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-3 bg-purple-900/30 rounded animate-pulse" />
            <div className="h-3 bg-purple-900/30 rounded animate-pulse w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !optimization) {
    return (
      <Card className={`border-red-200/20 ${className}`}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Unable to analyze plan</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { suggestions, overallVibeFlow, timeOptimization, groupCompatibility } = optimization;
  const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high');
  const otherSuggestions = suggestions.filter(s => s.priority !== 'high');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'timing': return <Clock className="w-4 h-4" />;
      case 'venue': return <MapPin className="w-4 h-4" />;
      case 'energy_flow': return <Zap className="w-4 h-4" />;
      case 'order': return <TrendingUp className="w-4 h-4" />;
      case 'duration': return <Clock className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 border-red-400/30 bg-red-500/10';
      case 'medium': return 'text-yellow-400 border-yellow-400/30 bg-yellow-500/10';
      case 'low': return 'text-blue-400 border-blue-400/30 bg-blue-500/10';
      default: return 'text-gray-400 border-gray-400/30 bg-gray-500/10';
    }
  };

  return (
    <Card className={`border-purple-200/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5 ${className}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-purple-500/5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <CardTitle className="text-sm text-purple-300">AI Plan Analysis</CardTitle>
                {highPrioritySuggestions.length > 0 && (
                  <Badge variant="destructive" className="text-xs px-2 py-0">
                    {highPrioritySuggestions.length} issues
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-purple-400">
                  {Math.round(overallVibeFlow.score * 100)}% optimized
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
            
            {/* Quick overview when collapsed */}
            {!isExpanded && (
              <div className="mt-2">
                <Progress 
                  value={overallVibeFlow.score * 100} 
                  className="h-2 bg-purple-900/30"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Vibe Flow</span>
                  <span>{Math.round(overallVibeFlow.score * 100)}%</span>
                </div>
              </div>
            )}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Overall Scores */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-300">
                  {Math.round(overallVibeFlow.score * 100)}%
                </div>
                <div className="text-xs text-gray-400">Vibe Flow</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-300">
                  {Math.round(groupCompatibility.score * 100)}%
                </div>
                <div className="text-xs text-gray-400">Group Match</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-300">
                  {Math.round(timeOptimization.totalDuration / 60)}h
                </div>
                <div className="text-xs text-gray-400">Duration</div>
              </div>
            </div>

            {/* Analysis Summary */}
            <div className="mb-4 p-3 rounded-lg bg-purple-900/20 border border-purple-400/20">
              <p className="text-sm text-gray-300">{overallVibeFlow.analysis}</p>
            </div>

            {/* High Priority Suggestions */}
            {highPrioritySuggestions.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-red-300 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  High Priority Issues
                </h4>
                <div className="space-y-2">
                  {highPrioritySuggestions.map((suggestion, index) => (
                    <SuggestionCard 
                      key={index} 
                      suggestion={suggestion} 
                      onApply={onApplySuggestion}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Suggestions */}
            {otherSuggestions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-300">
                    Additional Suggestions ({otherSuggestions.length})
                  </h4>
                  {otherSuggestions.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      {showAllSuggestions ? 'Show Less' : 'Show All'}
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {(showAllSuggestions ? otherSuggestions : otherSuggestions.slice(0, 3)).map((suggestion, index) => (
                    <SuggestionCard 
                      key={index} 
                      suggestion={suggestion} 
                      onApply={onApplySuggestion}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No suggestions - all good! */}
            {suggestions.length === 0 && (
              <div className="text-center py-4">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-green-300">Your plan is well optimized!</p>
                <p className="text-xs text-gray-400">No major improvements needed</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface SuggestionCardProps {
  suggestion: PlanOptimizationSuggestion;
  onApply?: (suggestion: PlanOptimizationSuggestion) => void;
}

function SuggestionCard({ suggestion, onApply }: SuggestionCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'timing': return <Clock className="w-4 h-4" />;
      case 'venue': return <MapPin className="w-4 h-4" />;
      case 'energy_flow': return <Zap className="w-4 h-4" />;
      case 'order': return <TrendingUp className="w-4 h-4" />;
      case 'duration': return <Clock className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 border-red-400/30 bg-red-500/10';
      case 'medium': return 'text-yellow-400 border-yellow-400/30 bg-yellow-500/10';
      case 'low': return 'text-blue-400 border-blue-400/30 bg-blue-500/10';
      default: return 'text-gray-400 border-gray-400/30 bg-gray-500/10';
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getPriorityColor(suggestion.priority)}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {getTypeIcon(suggestion.type)}
            <span className="text-sm font-medium">{suggestion.title}</span>
            <Badge variant="outline" className="text-xs px-1 py-0">
              {Math.round(suggestion.confidence * 100)}%
            </Badge>
          </div>
          <p className="text-xs text-gray-300 mb-1">{suggestion.description}</p>
          <p className="text-xs text-gray-400">{suggestion.impact}</p>
        </div>
        
        {onApply && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onApply(suggestion)}
            className="text-xs ml-2"
          >
            Apply
          </Button>
        )}
      </div>
    </div>
  );
}