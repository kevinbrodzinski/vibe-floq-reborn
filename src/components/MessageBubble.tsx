import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Smile, Reply, Copy } from 'lucide-react';
import { useMessageReactions } from '@/hooks/messaging/useMessageReactions';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { format, isToday, isYesterday } from 'date-fns';
import { getAvatarUrl } from '@/lib/avatar';

interface DirectMessage {
  id: string;
  thread_id: string;
  sender_id?: string;
  profile_id: string; // Updated to use profile_id as primary field
  content: string;
  created_at: string;
  metadata?: any;
  reply_to_id?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

interface MessageBubbleProps {
  message: DirectMessage;
  isOwn: boolean;
  showAvatar?: boolean;
  isConsecutive?: boolean;
  senderProfile?: {
    display_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

const COMMON_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎'];

export function MessageBubble({ 
  message, 
  isOwn, 
  showAvatar = true, 
  isConsecutive = false,
  senderProfile 
}: MessageBubbleProps) {
  const currentUserId = useCurrentUserId();
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  
  // Use profile_id as primary, fall back to sender_id for compatibility
  const senderId = message.profile_id || message.sender_id;
  const threadId = message.thread_id;
  
  const { reactionsByMessage, toggleReaction, isToggling } = useMessageReactions(threadId, 'dm');
  const messageReactions = reactionsByMessage[message.id] || [];

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  const handleReaction = (emoji: string) => {
    toggleReaction({ messageId: message.id, emoji });
    setShowReactionPicker(false);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
  };

  const getStatusIcon = () => {
    if (!isOwn) return null;
    
    switch (message.status) {
      case 'sending':
        return <div className="w-3 h-3 rounded-full bg-gray-300 animate-pulse" />;
      case 'sent':
        return <div className="w-3 h-3 rounded-full bg-blue-500" />;
      case 'delivered':
        return <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />;
      case 'read':
        return <div className="w-3 h-3 rounded-full bg-green-500" />;
      default:
        return <div className="w-3 h-3 rounded-full bg-blue-500" />;
    }
  };

  return (
    <div className={cn(
      "flex gap-3 group relative",
      isOwn ? "flex-row-reverse" : "flex-row",
      isConsecutive ? "mt-1" : "mt-4"
    )}>
      {/* Avatar */}
      {showAvatar && !isConsecutive && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={senderProfile?.avatar_url ? getAvatarUrl(senderProfile.avatar_url) : undefined} />
          <AvatarFallback className="text-xs">
            {senderProfile?.display_name?.[0] || senderProfile?.username?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
      )}
      
      {/* Spacer for consecutive messages */}
      {!showAvatar && isConsecutive && <div className="w-8" />}

      <div className={cn(
        "flex flex-col max-w-[70%] relative",
        isOwn ? "items-end" : "items-start"
      )}>
        {/* Sender name (for non-own messages, non-consecutive) */}
        {!isOwn && !isConsecutive && senderProfile && (
          <div className="text-xs text-gray-600 mb-1 px-1">
            {senderProfile.display_name || senderProfile.username || 'Unknown'}
          </div>
        )}

        {/* Message bubble */}
        <div className={cn(
          "relative px-4 py-2 rounded-2xl max-w-full break-words",
          isOwn 
            ? "bg-blue-500 text-white rounded-br-md" 
            : "bg-gray-100 text-gray-900 rounded-bl-md",
          message.status === 'sending' && "opacity-70"
        )}>
          {/* Reply context */}
          {message.reply_to_id && (
            <div className={cn(
              "text-xs opacity-75 mb-2 pl-2 border-l-2",
              isOwn ? "border-blue-300" : "border-gray-400"
            )}>
              Replying to message...
            </div>
          )}

          {/* Message content */}
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>

          {/* Message actions (visible on hover) */}
          <div className={cn(
            "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity",
            "flex items-center gap-1 bg-white shadow-lg rounded-full p-1",
            isOwn ? "-left-20" : "-right-20"
          )}>
            <DropdownMenu open={showReactionPicker} onOpenChange={setShowReactionPicker}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Smile className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-auto">
                <div className="flex gap-1 p-1">
                  {COMMON_REACTIONS.map((emoji) => (
                    <Button
                      key={emoji}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-lg hover:bg-gray-100"
                      onClick={() => handleReaction(emoji)}
                      disabled={isToggling}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Reply className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopyMessage}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Reactions */}
        {messageReactions.length > 0 && (
          <div className={cn(
            "flex flex-wrap gap-1 mt-1 px-1",
            isOwn ? "justify-end" : "justify-start"
          )}>
            {messageReactions.map((reaction) => (
              <Button
                key={reaction.emoji}
                variant={reaction.hasReacted ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs rounded-full",
                  reaction.hasReacted 
                    ? "bg-blue-100 text-blue-700 border-blue-200" 
                    : "bg-gray-50 text-gray-700 border-gray-200"
                )}
                onClick={() => handleReaction(reaction.emoji)}
                disabled={isToggling}
              >
                <span className="mr-1">{reaction.emoji}</span>
                {reaction.count > 1 && (
                  <span className="text-xs">{reaction.count}</span>
                )}
              </Button>
            ))}
          </div>
        )}

        {/* Timestamp and status */}
        <div className={cn(
          "flex items-center gap-2 mt-1 px-1",
          isOwn ? "flex-row-reverse" : "flex-row"
        )}>
          <div className="text-xs text-gray-500">
            {formatTime(message.created_at)}
          </div>
          {isOwn && (
            <div className="flex items-center">
              {getStatusIcon()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}