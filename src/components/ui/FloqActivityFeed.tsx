import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Users, MapPin, Calendar, Heart, Share2, Image, Video, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'message' | 'join' | 'plan_created' | 'media_shared' | 'reaction' | 'location_update';
  user: {
    name: string;
    avatar?: string;
  };
  content: string;
  timestamp: string;
  metadata?: {
    planId?: string;
    planTitle?: string;
    mediaUrl?: string;
    location?: string;
    reaction?: string;
  };
}

interface FloqActivityFeedProps {
  activities: ActivityItem[];
  onSendMessage?: (message: string) => void;
  onJoinPlan?: (planId: string) => void;
  onReact?: (activityId: string, reaction: string) => void;
  onShare?: (activityId: string) => void;
  className?: string;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'message': return <MessageSquare className="w-4 h-4" />;
    case 'join': return <Users className="w-4 h-4" />;
    case 'plan_created': return <Calendar className="w-4 h-4" />;
    case 'media_shared': return <Image className="w-4 h-4" />;
    case 'reaction': return <Heart className="w-4 h-4" />;
    case 'location_update': return <MapPin className="w-4 h-4" />;
    default: return <MessageSquare className="w-4 h-4" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'message': return 'bg-blue-500/20 text-blue-500';
    case 'join': return 'bg-green-500/20 text-green-500';
    case 'plan_created': return 'bg-purple-500/20 text-purple-500';
    case 'media_shared': return 'bg-orange-500/20 text-orange-500';
    case 'reaction': return 'bg-pink-500/20 text-pink-500';
    case 'location_update': return 'bg-cyan-500/20 text-cyan-500';
    default: return 'bg-gray-500/20 text-gray-500';
  }
};

export const FloqActivityFeed: React.FC<FloqActivityFeedProps> = ({
  activities,
  onSendMessage,
  onJoinPlan,
  onReact,
  onShare,
  className = ''
}) => {
  const [message, setMessage] = useState('');
  const [showEmptyState, setShowEmptyState] = useState(activities.length === 0);

  useEffect(() => {
    setShowEmptyState(activities.length === 0);
  }, [activities.length]);

  const handleSendMessage = () => {
    if (message.trim() && onSendMessage) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Activity Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {showEmptyState ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full text-center"
            >
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to start the conversation! Share what's on your mind.
              </p>
              <Button onClick={() => setShowEmptyState(false)}>
                Start Chatting
              </Button>
            </motion.div>
          ) : (
            activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-card/40 hover:bg-card/60 transition-colors"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={activity.user.avatar} />
                  <AvatarFallback className="text-xs">
                    {activity.user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{activity.user.name}</span>
                    <Badge className={cn("text-xs", getActivityColor(activity.type))}>
                      {getActivityIcon(activity.type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </span>
                  </div>

                  <div className="text-sm">
                    {activity.content}
                    
                    {/* Plan Reference */}
                    {activity.metadata?.planId && activity.metadata?.planTitle && (
                      <div className="mt-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="font-medium">{activity.metadata.planTitle}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onJoinPlan?.(activity.metadata.planId!)}
                            className="ml-auto text-xs"
                          >
                            View Plan
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Media Preview */}
                    {activity.metadata?.mediaUrl && (
                      <div className="mt-2">
                        <img
                          src={activity.metadata.mediaUrl}
                          alt="Shared media"
                          className="w-full max-w-xs rounded-lg"
                        />
                      </div>
                    )}

                    {/* Location Update */}
                    {activity.metadata?.location && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{activity.metadata.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onReact?.(activity.id, '❤️')}
                      className="text-xs h-6 px-2"
                    >
                      <Heart className="w-3 h-3 mr-1" />
                      React
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onShare?.(activity.id)}
                      className="text-xs h-6 px-2"
                    >
                      <Share2 className="w-3 h-3 mr-1" />
                      Share
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border/30">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Share what's on your mind..."
              className="w-full p-3 pr-12 rounded-xl bg-card/60 border border-border/30 resize-none"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <div className="absolute right-2 top-2 flex items-center gap-1">
              <Button size="sm" variant="ghost" className="w-6 h-6 p-0">
                <Image className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" className="w-6 h-6 p-0">
                <Video className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" className="w-6 h-6 p-0">
                <Mic className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="px-4"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}; 