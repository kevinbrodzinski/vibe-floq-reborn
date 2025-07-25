import React from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, Users, Calendar, MapPin, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FloqInsight {
  type: 'activity_summary' | 'trending_topic' | 'member_engagement' | 'plan_suggestion' | 'vibe_analysis';
  title: string;
  description: string;
  confidence: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  metadata?: {
    memberCount?: number;
    messageCount?: number;
    topVibe?: string;
    location?: string;
    timeRange?: string;
  };
}

interface FloqInsightsProps {
  insights: FloqInsight[];
  onAction?: (action: string) => void;
  className?: string;
}

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'activity_summary': return <Brain className="w-4 h-4" />;
    case 'trending_topic': return <TrendingUp className="w-4 h-4" />;
    case 'member_engagement': return <Users className="w-4 h-4" />;
    case 'plan_suggestion': return <Calendar className="w-4 h-4" />;
    case 'vibe_analysis': return <Sparkles className="w-4 h-4" />;
    default: return <Brain className="w-4 h-4" />;
  }
};

const getInsightColor = (type: string) => {
  switch (type) {
    case 'activity_summary': return 'bg-blue-500/20 text-blue-500';
    case 'trending_topic': return 'bg-orange-500/20 text-orange-500';
    case 'member_engagement': return 'bg-green-500/20 text-green-500';
    case 'plan_suggestion': return 'bg-purple-500/20 text-purple-500';
    case 'vibe_analysis': return 'bg-pink-500/20 text-pink-500';
    default: return 'bg-gray-500/20 text-gray-500';
  }
};

export const FloqInsights: React.FC<FloqInsightsProps> = ({
  insights,
  onAction,
  className = ''
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">What's Up</h3>
        <Badge variant="secondary" className="text-xs">
          AI Insights
        </Badge>
      </div>

      {/* Insights List */}
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "p-4 rounded-xl border border-border/30",
              "bg-gradient-to-r from-card/60 to-card/40 backdrop-blur-sm",
              "hover:bg-card/80 transition-all duration-200"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                getInsightColor(insight.type)
              )}>
                {getInsightIcon(insight.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(insight.confidence * 100)}% confidence
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-2">
                  {insight.description}
                </p>

                {/* Metadata */}
                {insight.metadata && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    {insight.metadata.memberCount && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{insight.metadata.memberCount} members</span>
                      </div>
                    )}
                    {insight.metadata.messageCount && (
                      <div className="flex items-center gap-1">
                        <Brain className="w-3 h-3" />
                        <span>{insight.metadata.messageCount} messages</span>
                      </div>
                    )}
                    {insight.metadata.topVibe && (
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span className="capitalize">{insight.metadata.topVibe}</span>
                      </div>
                    )}
                    {insight.metadata.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{insight.metadata.location}</span>
                      </div>
                    )}
                    {insight.metadata.timeRange && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{insight.metadata.timeRange}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Button */}
                {insight.action && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      insight.action?.onClick();
                      onAction?.(insight.action.label);
                    }}
                    className="text-xs"
                  >
                    {insight.action.label}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {insights.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No insights yet</h3>
          <p className="text-muted-foreground text-sm">
            AI insights will appear as your Floq becomes more active
          </p>
        </motion.div>
      )}
    </div>
  );
}; 