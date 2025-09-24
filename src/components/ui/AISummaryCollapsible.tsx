import React, { useState } from 'react';
import { Star, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AISummaryCollapsibleProps {
  className?: string;
}

export const AISummaryCollapsible: React.FC<AISummaryCollapsibleProps> = ({
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Mock AI summary data - replace with real data from your AI hooks
  const aiSummary = {
    insights: [
      "You're most active on weekends between 2-6 PM",
      "Your top vibe is 'social' - you love group activities",
      "You've visited 12 different venues this month",
      "Your favorite area is downtown - 8 of your last 10 floqs were there"
    ],
    recommendations: [
      "Try the new coffee shop on Main St - matches your vibe",
      "Your friends are planning something Saturday at 3 PM",
      "Weather looks perfect for outdoor activities this weekend"
    ],
    trends: [
      "Your social energy peaks on Fridays",
      "You prefer venues within 0.5 miles of your location",
      "You're most likely to join floqs with 3-6 people"
    ]
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Trigger Button */}
      <div className="flex justify-end mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Star className="w-4 h-4" />
          <span className="text-sm">AI Summary</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <Card className="bg-card/40 backdrop-blur-xl border-border/30 mb-6">
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-primary/10">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Your AI Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Personalized recommendations based on your activity
                </p>
              </div>
            </div>

            {/* Insights Grid */}
            <div className="grid gap-4">
              {/* Key Insights */}
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  Key Insights
                </h4>
                <div className="space-y-2">
                  {aiSummary.insights.map((insight, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-sm"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span className="text-foreground">{insight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  Recommendations
                </h4>
                <div className="space-y-2">
                  {aiSummary.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-sm"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                      <span className="text-foreground">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trends */}
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  Your Patterns
                </h4>
                <div className="space-y-2">
                  {aiSummary.trends.map((trend, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-sm"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      <span className="text-foreground">{trend}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 