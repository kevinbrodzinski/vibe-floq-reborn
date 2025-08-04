import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Clock, 
  Shield, 
  Signal, 
  Navigation, 
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FriendDistance } from '@/hooks/useEnhancedFriendDistances';

interface FriendDistanceCardProps {
  friendDistance: FriendDistance;
  onNavigate?: (friend: FriendDistance) => void;
  onMessage?: (friend: FriendDistance) => void;
  showConfidence?: boolean;
  showPrivacyStatus?: boolean;
  compact?: boolean;
  className?: string;
}

export function FriendDistanceCard({
  friendDistance,
  onNavigate,
  onMessage,
  showConfidence = true,
  showPrivacyStatus = true,
  compact = false,
  className
}: FriendDistanceCardProps) {
  const { friend, distance, formattedDistance, confidence, reliability, proximityAnalysis, isNearby, lastSeen, privacyFiltered } = friendDistance;

  // Calculate time since last seen
  const timeSinceLastSeen = Date.now() - lastSeen;
  const isStale = timeSinceLastSeen > 5 * 60 * 1000; // 5 minutes
  
  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'now';
  };

  // Get reliability indicator
  const getReliabilityIcon = () => {
    switch (reliability) {
      case 'high':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'medium':
        return <Signal className="h-3 w-3 text-yellow-500" />;
      case 'low':
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
    }
  };

  const getReliabilityColor = () => {
    switch (reliability) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  // Get proximity status
  const getProximityStatus = () => {
    if (proximityAnalysis.eventType === 'enter') {
      return { text: 'Just arrived nearby', color: 'text-green-600 bg-green-50', icon: Users };
    } else if (proximityAnalysis.eventType === 'sustain') {
      const duration = Math.round(proximityAnalysis.sustainedDuration / 1000 / 60);
      return { text: `Nearby for ${duration}m`, color: 'text-blue-600 bg-blue-50', icon: Timer };
    } else if (proximityAnalysis.eventType === 'exit') {
      return { text: 'Just left area', color: 'text-gray-600 bg-gray-50', icon: MapPin };
    }
    return null;
  };

  const proximityStatus = getProximityStatus();

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors", className)}>
        <Avatar className="h-8 w-8">
          <AvatarImage src={friend.avatarUrl || undefined} />
          <AvatarFallback className="text-xs">
            {friend.displayName?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {friend.displayName || 'Unknown'}
            </span>
            {isNearby && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                <MapPin className="h-2 w-2 mr-1" />
                Nearby
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formattedDistance}</span>
            {privacyFiltered && (
              <Shield className="h-3 w-3 text-blue-500" />
            )}
            {showConfidence && (
              <div className="flex items-center gap-1">
                {getReliabilityIcon()}
                <span>{Math.round(confidence * 100)}%</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          {getTimeAgo(lastSeen)}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden", isStale && "opacity-75", className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={friend.avatarUrl || undefined} />
              <AvatarFallback>
                {friend.displayName?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            
            {/* Vibe indicator */}
            {friend.vibe && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-xs">
                {friend.vibe === 'chill' ? '😌' : 
                 friend.vibe === 'active' ? '⚡' : 
                 friend.vibe === 'social' ? '🎉' : '✨'}
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">
                {friend.displayName || 'Unknown User'}
              </h3>
              
              {isNearby && (
                <Badge variant="default" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  Nearby
                </Badge>
              )}
            </div>

            {/* Distance and reliability */}
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-1 text-sm">
                <Navigation className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formattedDistance}</span>
                {privacyFiltered && (
                  <Shield className="h-3 w-3 text-blue-500" title="Privacy filtered distance" />
                )}
              </div>

              {showConfidence && (
                <Badge variant="outline" className={cn("text-xs", getReliabilityColor())}>
                  {getReliabilityIcon()}
                  <span className="ml-1">{Math.round(confidence * 100)}% confident</span>
                </Badge>
              )}
            </div>

            {/* Proximity status */}
            {proximityStatus && (
              <div className="flex items-center gap-1 mb-2">
                <Badge variant="outline" className={cn("text-xs", proximityStatus.color)}>
                  <proximityStatus.icon className="h-3 w-3 mr-1" />
                  {proximityStatus.text}
                </Badge>
              </div>
            )}

            {/* Additional info */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Last seen {getTimeAgo(lastSeen)}</span>
              </div>
              
              {friend.venueId && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>At venue</span>
                </div>
              )}
              
              {showPrivacyStatus && (
                <div className="flex items-center gap-1">
                  {privacyFiltered ? (
                    <>
                      <EyeOff className="h-3 w-3 text-blue-500" />
                      <span className="text-blue-600">Privacy filtered</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3" />
                      <span>Exact location</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {onNavigate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate(friendDistance)}
                className="h-8 px-2"
              >
                <Navigation className="h-3 w-3" />
              </Button>
            )}
            
            {onMessage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMessage(friendDistance)}
                className="h-8 px-2"
              >
                💬
              </Button>
            )}
          </div>
        </div>

        {/* Advanced details (collapsible) */}
        {!compact && showConfidence && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-medium text-muted-foreground">Accuracy</div>
                <div>±{friend.accuracy}m</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-muted-foreground">Reliability</div>
                <div className="flex items-center justify-center gap-1">
                  {getReliabilityIcon()}
                  <span className="capitalize">{reliability}</span>
                </div>
              </div>
              <div className="text-center">
                <div className="font-medium text-muted-foreground">Confidence</div>
                <div>{Math.round(confidence * 100)}%</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}