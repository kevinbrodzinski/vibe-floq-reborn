import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Clock, Users, TrendingUp, Star } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ReasoningCardProps {
  reasoning: {
    algorithm: string;
    crowdIntelligence: string;
    socialProof: string;
    contextualFactors: string[];
    confidence: number;
  };
  vibeBreakdown?: {
    composition: { [vibe: string]: number };
    trend: string;
    friendPresence: number;
  };
  realTimeFactors?: {
    liveEvents: string[];
    waitTimes: string;
    energyLevel: string;
  };
}

export const ReasoningCard: React.FC<ReasoningCardProps> = ({
  reasoning,
  vibeBreakdown,
  realTimeFactors
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-orange-600 bg-orange-100';
  };

  const getVibeColor = (vibe: string) => {
    const colors: { [key: string]: string } = {
      flowing: 'bg-blue-100 text-blue-700',
      social: 'bg-purple-100 text-purple-700',
      energetic: 'bg-red-100 text-red-700',
      creative: 'bg-green-100 text-green-700',
      chill: 'bg-gray-100 text-gray-700'
    };
    return colors[vibe] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors">
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            Why this suggestion?
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-xs", getConfidenceColor(reasoning.confidence))}>
              {Math.round(reasoning.confidence * 100)}% confident
            </Badge>
            <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
          </div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <Card className="mt-3 border-l-4 border-l-primary/20">
          <CardContent className="pt-4 space-y-4">
            {/* Algorithm Explanation */}
            <div>
              <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Algorithm Match
              </h4>
              <p className="text-sm text-muted-foreground">{reasoning.algorithm}</p>
            </div>

            {/* Crowd Intelligence */}
            <div>
              <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                <Users className="w-3 h-3" />
                Crowd Intelligence
              </h4>
              <p className="text-sm text-muted-foreground">{reasoning.crowdIntelligence}</p>
            </div>

            {/* Social Proof */}
            <div>
              <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                <Star className="w-3 h-3" />
                Social Proof
              </h4>
              <p className="text-sm text-muted-foreground">{reasoning.socialProof}</p>
            </div>

            {/* Vibe Breakdown */}
            {vibeBreakdown && (
              <div>
                <h4 className="text-sm font-medium mb-2">Vibe Composition</h4>
                <div className="flex flex-wrap gap-1 mb-2">
                  {Object.entries(vibeBreakdown.composition).map(([vibe, percentage]) => (
                    <Badge key={vibe} variant="outline" className={cn("text-xs", getVibeColor(vibe))}>
                      {vibe} {percentage}%
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{vibeBreakdown.trend}</p>
                {vibeBreakdown.friendPresence > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {vibeBreakdown.friendPresence} friend{vibeBreakdown.friendPresence > 1 ? 's' : ''} in this area
                  </p>
                )}
              </div>
            )}

            {/* Real-time Factors */}
            {realTimeFactors && (
              <div>
                <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Real-time Factors
                </h4>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{realTimeFactors.energyLevel}</p>
                  <p className="text-sm text-muted-foreground">{realTimeFactors.waitTimes}</p>
                  {realTimeFactors.liveEvents.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Live Events:</p>
                      <ul className="space-y-1">
                        {realTimeFactors.liveEvents.map((event, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground">• {event}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contextual Factors */}
            {reasoning.contextualFactors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1">Key Factors</h4>
                <ul className="space-y-1">
                  {reasoning.contextualFactors.map((factor, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">• {factor}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};