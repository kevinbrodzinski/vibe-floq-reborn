import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Sparkles, 
  Heart, 
  MessageCircle, 
  UserPlus,
  Star,
  Zap,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useFloqAutoMatch } from "@/hooks/useEnhancedVenueDetails";
import { vibeEmoji } from "@/utils/vibe";
import { getVibeColor } from "@/utils/getVibeColor";

interface FloqAutoMatchCardProps {
  profileId: string | null;
  venueId: string | null;
  onCreateFloq?: (suggestion: any) => void;
}

export function FloqAutoMatchCard({ profileId, venueId, onCreateFloq }: FloqAutoMatchCardProps) {
  const { data: matchData, isLoading } = useFloqAutoMatch(profileId, venueId);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

  if (isLoading || !matchData || matchData.matchCount === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-primary" />
          Perfect Matches Found
          <Badge variant="secondary" className="ml-auto">
            {matchData.matchCount} matches
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* User's Current Vibe */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50">
          <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
          <span className="text-sm text-muted-foreground">Your vibe:</span>
          <div className="flex items-center gap-2">
            <span className="text-lg">{vibeEmoji(matchData.userVibe)}</span>
            <span className="text-sm font-medium capitalize">{matchData.userVibe}</span>
          </div>
        </div>

        {/* Potential Matches */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">People you might vibe with</h4>
          
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
            {matchData.potentialMatches.slice(0, 5).map((match, index) => (
              <motion.div
                key={match.profile_id || match.user_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedMatch === (match.profile_id || match.user_id)
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-card/30 border-border/30 hover:bg-card/50'
                }`}
                onClick={() => setSelectedMatch(selectedMatch === (match.profile_id || match.user_id) ? null : (match.profile_id || match.user_id))}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={match.profiles.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {match.profiles.display_name?.charAt(0) || match.profiles.username.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {match.profiles.display_name || match.profiles.username}
                      </p>
                      <span className="text-lg">{vibeEmoji(match.vibe)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs text-muted-foreground">
                          {Math.round(match.compatibilityScore * 100)}% match
                        </span>
                      </div>
                      <Progress 
                        value={match.compatibilityScore * 100} 
                        className="w-12 h-1" 
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="w-8 h-8 p-0"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Match Details */}
        <AnimatePresence>
          {selectedMatch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {(() => {
                const match = matchData.potentialMatches.find(m => (m.profile_id || m.user_id) === selectedMatch);
                if (!match) return null;
                
                return (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Heart className="w-4 h-4 text-red-400" />
                      <span className="font-medium">Why you match:</span>
                    </div>
                    <div className="space-y-1">
                      {match.matchReasons.map((reason, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-1 h-1 bg-primary rounded-full" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floq Suggestions */}
        {matchData.floqSuggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Suggested Floqs
            </h4>
            
            <div className="space-y-2">
              {matchData.floqSuggestions.slice(0, 2).map((suggestion, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="p-3 rounded-lg bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{vibeEmoji(suggestion.primaryVibe)}</span>
                        <h5 className="font-medium text-sm">{suggestion.title}</h5>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(suggestion.confidence * 100)}% match
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {suggestion.description}
                      </p>
                      
                      <div className="flex items-center gap-1">
                        {suggestion.suggestedMembers.slice(0, 3).map((member, i) => (
                          <Avatar key={i} className="w-5 h-5 border border-white/50">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className="text-[8px]">
                              {member.username.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {suggestion.suggestedMembers.length > 3 && (
                          <div className="w-5 h-5 rounded-full bg-muted border border-white/50 flex items-center justify-center">
                            <span className="text-[8px] text-muted-foreground">
                              +{suggestion.suggestedMembers.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => onCreateFloq?.(suggestion)}
                    >
                      Create
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Action */}
        <Button 
          className="w-full gradient-primary text-white"
          onClick={() => {
            // Handle starting conversations or creating floqs
          }}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Start Connecting
        </Button>
      </CardContent>
    </Card>
  );
}