import { useState, useEffect, useRef } from "react";
import { Send, Users, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUserId } from "@/hooks/useCurrentUser";
import { formatTime } from "@/lib/timeUtils";
import { zIndex } from "@/constants/z";
import { useMessages } from "@/hooks/messaging/useMessages";
import { useSendMessage } from "@/hooks/messaging/useSendMessage";
import { MessageList } from "@/components/chat/MessageList";
import { supabase } from "@/integrations/supabase/client";

// Using unified messaging system - types handled by hooks

interface PlanChatSidebarProps {
  planId: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const PlanChatSidebar = ({
  planId,
  isOpen,
  onClose,
  className = ""
}: PlanChatSidebarProps) => {
  const [newMessage, setNewMessage] = useState("");
  const currentUserId = useCurrentUserId();
  const { toast } = useToast();
  
  // Unified messaging hooks
  const messages = useMessages(planId, 'plan');
  const { mutate: sendMessage, isPending: isSending } = useSendMessage('plan');

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    try {
      await sendMessage({
        threadId: planId,
        content: newMessage.trim()
      });
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: "Please try again"
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-y-0 right-0 w-80 bg-background border-l border-border shadow-lg flex flex-col ${className}`} {...zIndex('modal')}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          <h3 className="font-medium">Plan Chat</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        className="flex-1"
      />

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isSending}
            maxLength={500}
          />
          <Button 
            type="submit" 
            size="sm" 
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        {newMessage.length > 450 && (
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {500 - newMessage.length} characters remaining
          </p>
        )}
      </form>
    </div>
  );
};