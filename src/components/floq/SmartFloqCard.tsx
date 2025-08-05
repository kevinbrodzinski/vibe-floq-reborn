import React from 'react';
import { Brain, Star, Clock, Users, MapPin, Sparkles } from 'lucide-react';
import { FloqCard } from './FloqCard';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { SmartFloqMatch } from '@/hooks/useSmartFloqDiscovery';

interface SmartFloqCardProps {
  match: SmartFloqMatch;
  onBoost?: (floqId: string) => void;
  onLeave?: (floqId: string) => void;
  hasUserBoosted?: boolean;
  showAIInsights?: boolean;
}

export const SmartFloqCard = React.memo<SmartFloqCardProps>(({ 
  match, 
  onBoost, 
  onLeave,
  hasUserBoosted = false,
  showAIInsights = true
}) => {
  const { floq, vibeMatchScore, confidenceScore, matchReasons, contextFactors } = match;

  return (
    <div className="relative">
      {/* AI Confidence Badge */}
      {showAIInsights && confidenceScore > 0.7 && (
        <div className="absolute -top-2 -right-2 z-20">
          <Badge 
            variant="secondary" 
            className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-400/30 text-purple-300 px-2 py-1"
          >
            <Brain size={12} className="mr-1" />
            AI Pick
          </Badge>
        </div>
      )}

      {/* Main Floq Card */}
      <FloqCard
        floq={{
          ...floq,
          boost_count: floq.boost_count || 0,
          starts_in_min: floq.starts_in_min || 0,
          members: floq.members || [],
          is_joined: floq.is_joined || false
        }}
        onBoost={onBoost}
        onLeave={onLeave}
        hasUserBoosted={hasUserBoosted}
      />

      {/* AI Insights Panel */}
      {showAIInsights && (
        <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-400/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-purple-400" />
            <span className="text-sm font-medium text-purple-300">AI Analysis</span>
            <div className="ml-auto text-xs text-purple-400">
              {Math.round(confidenceScore * 100)}% match
            </div>
          </div>

          {/* Confidence Score */}
          <div className="mb-3">
            <Progress 
              value={confidenceScore * 100} 
              className="h-2 bg-purple-900/30"
            />
          </div>

          {/* Context Factors */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center gap-1 text-xs">
              <Star size={12} className="text-yellow-400" />
              <span className="text-gray-300">Vibe:</span>
              <span className="text-yellow-400">{Math.round(contextFactors.vibe * 100)}%</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Clock size={12} className="text-green-400" />
              <span className="text-gray-300">Timing:</span>
              <span className="text-green-400">{Math.round(contextFactors.temporal * 100)}%</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <MapPin size={12} className="text-blue-400" />
              <span className="text-gray-300">Distance:</span>
              <span className="text-blue-400">{Math.round(contextFactors.proximity * 100)}%</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Users size={12} className="text-pink-400" />
              <span className="text-gray-300">Social:</span>
              <span className="text-pink-400">{Math.round(contextFactors.social * 100)}%</span>
            </div>
          </div>

          {/* Match Reasons */}
          {matchReasons.length > 0 && (
            <div className="space-y-1">
              {matchReasons.slice(0, 3).map((reason, index) => (
                <div key={index} className="flex items-center gap-2 text-xs text-gray-300">
                  <div className="w-1 h-1 rounded-full bg-purple-400" />
                  {reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});