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
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src={friend.avatar} 
                  alt={friend.name} 
                  className="w-10 h-10 rounded-full"
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
              <div>
                <CardTitle className="text-base">{friend.name} matches your vibe</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {Math.round(friend.match * 100)}% match
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {friend.location}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(friend.contextualFactors.energyTrend)}
              <Badge variant="outline" className="text-xs">
                {Math.round(friend.reasoning.confidence * 100)}%
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Quick context */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="text-muted-foreground">{friend.reasoning.vibeAlignment}</p>
          </div>

          {/* Social proof highlights */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="w-3 h-3" />
                {friend.socialProof.mutualFriends} mutual
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Heart className="w-3 h-3" />
                {friend.socialProof.successRate}% success
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                {friend.contextualFactors.travelTime}
              </span>
            </div>
            <span className="text-xs text-green-600 font-medium">
              {friend.contextualFactors.optimalWindow}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="secondary" 
              className="flex-1"
              onClick={() => onPlan(friend.id)}
            >
              Plan Together
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
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