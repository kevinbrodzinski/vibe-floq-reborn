import React from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  UserPlus, 
  X, 
  MapPin, 
  Calendar, 
  Users, 
  Clock,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import type { FriendSuggestionRecord } from '@/types/friendDetection';

interface FriendSuggestionCardProps {
  suggestion: FriendSuggestionRecord & {
    suggested_friend: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    };
  };
  onAccept: (suggestionId: string) => void;
  onDecline: (suggestionId: string) => void;
  onIgnore: (suggestionId: string) => void;
  isResponding?: boolean;
}

export const FriendSuggestionCard: React.FC<FriendSuggestionCardProps> = ({
  suggestion,
  onAccept,
  onDecline,
  onIgnore,
  isResponding = false
}) => {
  const { suggested_friend, score, confidence_level, suggestion_reason, signals_summary } = suggestion;

  // Get confidence color and icon
  const getConfidenceStyle = (level: string) => {
    switch (level) {
      case 'very_high':
        return { color: 'bg-green-500', icon: <Sparkles className="h-3 w-3" />, text: 'Very High Match' };
      case 'high':
        return { color: 'bg-blue-500', icon: <TrendingUp className="h-3 w-3" />, text: 'High Match' };
      case 'medium':
        return { color: 'bg-yellow-500', icon: <Users className="h-3 w-3" />, text: 'Good Match' };
      default:
        return { color: 'bg-gray-500', icon: <Clock className="h-3 w-3" />, text: 'Potential Match' };
    }
  };

  const confidenceStyle = getConfidenceStyle(confidence_level);

  // Get signal icons and descriptions
  const getSignalInfo = (signalType: string, strength: number) => {
    switch (signalType) {
      case 'co_location':
        return { 
          icon: <MapPin className="h-4 w-4" />, 
          label: 'Same Places', 
          description: `${strength}% location overlap`,
          color: 'text-blue-600'
        };
      case 'shared_activity':
        return { 
          icon: <Users className="h-4 w-4" />, 
          label: 'Shared Activities', 
          description: `${strength}% activity overlap`,
          color: 'text-green-600'
        };
      case 'venue_overlap':
        return { 
          icon: <MapPin className="h-4 w-4" />, 
          label: 'Similar Preferences', 
          description: `${strength}% venue similarity`,
          color: 'text-purple-600'
        };
      case 'time_sync':
        return { 
          icon: <Clock className="h-4 w-4" />, 
          label: 'Similar Schedule', 
          description: `${strength}% time sync`,
          color: 'text-orange-600'
        };
      case 'interaction_frequency':
        return { 
          icon: <TrendingUp className="h-4 w-4" />, 
          label: 'Mutual Connections', 
          description: `${strength}% interaction frequency`,
          color: 'text-indigo-600'
        };
      default:
        return { 
          icon: <Users className="h-4 w-4" />, 
          label: 'Connection', 
          description: `${strength}% strength`,
          color: 'text-gray-600'
        };
    }
  };

  // Get top signals to display
  const topSignals = Object.entries(signals_summary)
    .map(([type, strength]) => ({ type, strength: strength as number }))
    .filter(signal => signal.strength > 20) // Only show meaningful signals
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3); // Show top 3 signals

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full max-w-md mx-auto hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage 
                  src={suggested_friend.avatar_url || undefined} 
                  alt={suggested_friend.display_name} 
                />
                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                  {suggested_friend.display_name?.charAt(0) || suggested_friend.username?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">
                  {suggested_friend.display_name || suggested_friend.username}
                </h3>
                {suggested_friend.display_name && (
                  <p className="text-sm text-muted-foreground truncate">
                    @{suggested_friend.username}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end space-y-1">
              <Badge 
                variant="secondary" 
                className={`${confidenceStyle.color} text-white text-xs px-2 py-1`}
              >
                <span className="flex items-center space-x-1">
                  {confidenceStyle.icon}
                  <span>{score}/100</span>
                </span>
              </Badge>
              <span className="text-xs text-muted-foreground">
                {confidenceStyle.text}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Suggestion Reason */}
          <div className="text-sm text-muted-foreground leading-relaxed">
            {suggestion_reason}
          </div>

          {/* Signal Indicators */}
          {topSignals.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Connection Signals
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {topSignals.map(signal => {
                    const signalInfo = getSignalInfo(signal.type, signal.strength);
                    return (
                      <div key={signal.type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={signalInfo.color}>
                            {signalInfo.icon}
                          </span>
                          <span className="text-sm font-medium">
                            {signalInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${signalInfo.color.replace('text-', 'bg-')} transition-all duration-300`}
                              style={{ width: `${signal.strength}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {signal.strength}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <Separator />
          <div className="flex space-x-2">
            <Button
              onClick={() => onAccept(suggestion.id)}
              disabled={isResponding}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Friend
            </Button>
            
            <Button
              onClick={() => onDecline(suggestion.id)}
              disabled={isResponding}
              variant="outline"
              size="sm"
              className="px-3"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Ignore Option */}
          <button
            onClick={() => onIgnore(suggestion.id)}
            disabled={isResponding}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Not interested
          </button>
        </CardContent>
      </Card>
    </motion.div>
  );
};