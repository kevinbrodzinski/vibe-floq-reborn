import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Brain, Target, Lightbulb, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CoachingInsight {
  id: string;
  type: 'social' | 'venue' | 'timing' | 'energy';
  title: string;
  insight: string;
  actionItem: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
}

interface IntelligentCoachingProps {
  profileId?: string;
}

export const IntelligentCoaching: React.FC<IntelligentCoachingProps> = ({ profileId }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [insights, setInsights] = useState<CoachingInsight[]>([
    {
      id: '1',
      type: 'social',
      title: 'Peak Social Window',
      insight: 'You\'re 3x more likely to make meaningful connections between 6-8 PM on weekdays.',
      actionItem: 'Plan social activities during your peak energy window to maximize connection potential.',
      confidence: 92,
      priority: 'high'
    },
    {
      id: '2', 
      type: 'venue',
      title: 'Venue Diversification',
      insight: 'You\'ve visited coffee shops 80% of the time. Exploring bars or parks could expand your social circle.',
      actionItem: 'Try 2 new venue types this week - consider The Local Pub or Central Park.',
      confidence: 87,
      priority: 'medium'
    },
    {
      id: '3',
      type: 'timing',
      title: 'Weekend Opportunity',
      insight: 'Your Saturday 2-4 PM slot is consistently free but highly social for others.',
      actionItem: 'Schedule weekend activities during peak social hours to increase serendipitous encounters.',
      confidence: 78,
      priority: 'medium'
    }
  ]);

  const generateNewInsights = async () => {
    setIsGenerating(true);
    
    try {
      // Simulate AI generation delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation, this would call the intelligence edge function
      const newInsight: CoachingInsight = {
        id: Date.now().toString(),
        type: 'energy',
        title: 'Energy Pattern Optimization',
        insight: 'Your energy peaks at 7 PM but you\'re most socially active at 9 PM. There\'s a 2-hour optimization window.',
        actionItem: 'Start social activities at 7 PM instead of 9 PM to leverage your natural energy peak.',
        confidence: 85,
        priority: 'high'
      };
      
      setInsights(prev => [newInsight, ...prev.slice(0, 2)]);
    } finally {
      setIsGenerating(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'social': return '👥';
      case 'venue': return '📍';
      case 'timing': return '⏰';
      case 'energy': return '⚡';
      default: return '💡';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-600 border-red-200';
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
      case 'low': return 'bg-green-500/10 text-green-600 border-green-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-purple-200/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-xl">AI Social Coach</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Personalized insights to optimize your social connections
                </p>
              </div>
            </div>
            
            <Button
              onClick={generateNewInsights}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {isGenerating ? 'Generating...' : 'New Insights'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Insights List */}
      <div className="space-y-4">
        <AnimatePresence>
          {insights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getTypeIcon(insight.type)}</span>
                        <div>
                          <h3 className="font-semibold">{insight.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getPriorityColor(insight.priority)}`}
                            >
                              {insight.priority} priority
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {insight.confidence}% confidence
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Insight */}
                    <div className="space-y-3">
                      <div className="p-3 bg-muted/30 rounded-lg border-l-4 border-primary">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-primary mt-0.5" />
                          <p className="text-sm">{insight.insight}</p>
                        </div>
                      </div>

                      {/* Action Item */}
                      <div className="p-3 bg-green-500/5 rounded-lg border-l-4 border-green-500">
                        <div className="flex items-start gap-2">
                          <Target className="w-4 h-4 text-green-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-green-800">Action Item</p>
                            <p className="text-sm text-green-700">{insight.actionItem}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <Card className="bg-secondary/5 border-secondary/20">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Brain className="w-4 h-4" />
              <span>Powered by behavioral pattern analysis and predictive modeling</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Insights update automatically based on your social activity and venue visits
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};