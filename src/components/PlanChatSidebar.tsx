import { useState, useEffect, useRef } from "react";
import { Send, Users, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatTime } from "@/lib/timeUtils";
import { zIndex } from "@/constants/z";

interface ChatMessage {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  user?: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Load initial messages
  useEffect(() => {
    if (!planId) return;
    
    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('plan_comments')
          .select(`
            id,
            content,
            user_id,
            created_at,
            profiles!plan_comments_user_id_fkey(username, display_name, avatar_url)
          `)
          .eq('plan_id', planId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) throw error;

        const formattedMessages = data?.map(msg => ({
          ...msg,
          user: {
            username: (msg.profiles as any)?.username || '',
            display_name: (msg.profiles as any)?.display_name || '',
            avatar_url: (msg.profiles as any)?.avatar_url || ''
          }
        })) || [];

        setMessages(formattedMessages);
      } catch (error) {
        console.error('Error loading messages:', error);
        toast({
          variant: "destructive",
          title: "Failed to load chat",
          description: "Please try refreshing the page"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [planId, toast]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!planId) return;

    const channel = supabase
      .channel(`plan-chat-${planId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'plan_comments',
          filter: `plan_id=eq.${planId}`
        },
        async (payload) => {
          // Fetch the new message with user details
          const { data } = await supabase
            .from('plan_comments')
            .select(`
              id,
              content,
              user_id,
              created_at,
              profiles!plan_comments_user_id_fkey(username, display_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const newMessage = {
              ...data,
              user: {
                username: (data.profiles as any)?.username || '',
                display_name: (data.profiles as any)?.display_name || '',
                avatar_url: (data.profiles as any)?.avatar_url || ''
              }
            };

            setMessages(prev => [...prev, newMessage]);
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineUsers(Object.keys(state));
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => [...prev, key]);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => prev.filter(id => id !== key));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await channel.track({ profile_id: user.id, timestamp: Date.now() });
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [planId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('plan_comments')
        .insert({
          plan_id: planId,
          content: newMessage.trim(),
          profile_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: "Please try again"
      });
    } finally {
      setIsSending(false);
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
          {onlineUsers.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span>{onlineUsers.length} online</span>
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <Avatar className="w-6 h-6 mt-1">
                  <AvatarImage src={message.user?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {message.user?.display_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {message.user?.display_name || message.user?.username || 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground break-words">
                    {message.content}
                  </p>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-border">
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