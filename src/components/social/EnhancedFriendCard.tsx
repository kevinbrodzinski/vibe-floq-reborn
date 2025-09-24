import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, MapPin, Clock, Users, TrendingUp, Star, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FriendMatch } from '@/hooks/useFriendVibeMatches';

interface EnhancedFriendCardProps {
  friend: FriendMatch;
  onPlan: (friendId: string) => void;
  onPing: (friendId: string) => void;
}

export const EnhancedFriendCard: React.FC<EnhancedFriendCardProps> = ({
  friend,
  onPlan,
  onPing
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  const getVibeColor = (vibe: string) => {
    const colors: { [key: string]: string } = {
      flowing: 'bg-blue-100 text-blue-700 border-blue-200',
      social: 'bg-purple-100 text-purple-700 border-purple-200',
      energetic: 'bg-red-100 text-red-700 border-red-200',
      creative: 'bg-green-100 text-green-700 border-green-200',
      chill: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[vibe] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'increasing') return <TrendingUp className="w-3 h-3 text-green-600" />;
    if (trend === 'decreasing') return <TrendingUp className="w-3 h-3 text-red-600 rotate-180" />;
    return <div className="w-3 h-3 rounded-full bg-yellow-400" />;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <img 
                  src={friend.avatar} 
                  alt={friend.name} 
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="absolute -bottom-1 -right-1">
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs px-1.5 py-0.5", getVibeColor(friend.currentVibe))}
                  >
                    {friend.currentVibe}
                  </Badge>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base truncate">{friend.displayName}</CardTitle>
                <p className="text-sm text-muted-foreground truncate">{friend.username}</p>
                <p className="text-xs text-muted-foreground/80 truncate">matches your vibe</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <div className="flex items-center gap-1">
                {getTrendIcon(friend.contextualFactors.energyTrend)}
                <Badge variant="outline" className="text-xs">
                  {Math.round(friend.reasoning.confidence * 100)}%
                </Badge>
              </div>
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                {Math.round(friend.match * 100)}% match
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Quick context */}
          <div className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-3 border border-primary/10">
            <p className="text-sm text-muted-foreground leading-relaxed">{friend.reasoning.vibeAlignment}</p>
          </div>

          {/* Compact stats row */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="w-3 h-3" />
              <span className="truncate">{friend.socialProof.mutualFriends} mutual</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Heart className="w-3 h-3" />
              <span className="truncate">{friend.socialProof.successRate}% success</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="truncate">{friend.contextualFactors.travelTime}</span>
            </div>
          </div>

          {/* Optimal timing highlight */}
          <div className="text-center">
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              <MapPin className="w-3 h-3 mr-1" />
              {friend.location} • {friend.contextualFactors.optimalWindow}
            </Badge>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              className="flex-1 hover:bg-secondary/80 transition-colors"
              onClick={() => onPlan(friend.id)}
            >
              Plan Together
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 hover:bg-primary/5 hover:border-primary/30 transition-colors"
              onClick={() => onPing(friend.id)}
            >
              Send Ping
            </Button>
          </div>

          {/* Expandable details */}
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger className="w-full pt-2">
              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <span>View detailed reasoning</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", showDetails && "rotate-180")} />
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <h4 className="font-medium mb-1">Recent Activity</h4>
                  <p className="text-muted-foreground">{friend.reasoning.recentActivity}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Mutual Interests</h4>
                  <div className="flex flex-wrap gap-1">
                    {friend.reasoning.mutualInterests.map((interest, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-1">Timing Context</h4>
                  <p className="text-muted-foreground">{friend.reasoning.timingContext}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-1">History Together</h4>
                  <p className="text-muted-foreground">{friend.reasoning.interactionHistory}</p>
                  {friend.socialProof.lastMeetup && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last meetup: {friend.socialProof.lastMeetup}
                    </p>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </motion.div>
  );
};