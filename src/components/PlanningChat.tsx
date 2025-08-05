import { useState, useRef, useEffect } from "react";
import { Send, Smile, Image, MapPin } from "lucide-react";
import { safeNotificationType, type NotificationType } from '@/types/enums/notification';

interface ChatMessage {
  id: string;
  profileId: string;
  userName: string;
  avatar: string;
  message: string;
  timestamp: number;
  type: 'message' | NotificationType | 'suggestion';
  stopId?: string;
}

interface PlanningChatProps {
  planId: string;
  currentUserId: string;
}

export const PlanningChat = ({ planId, currentUserId }: PlanningChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      profileId: "system",
      userName: "System",
      avatar: "",
      message: "Planning session started! Use this chat to coordinate while building your night.",
      timestamp: Date.now() - 600000,
      type: safeNotificationType("system")
    },
    {
      id: "msg-2", 
      profileId: "alex",
      userName: "Alex",
      avatar: "/placeholder.svg",
      message: "EP & LP looks perfect for cocktails! Great city views 🌃",
      timestamp: Date.now() - 300000,
      type: "message"
    },
    {
      id: "msg-3",
      profileId: "sam",
      userName: "Sam", 
      avatar: "/placeholder.svg",
      message: "I'm down! Should we do dinner first?",
      timestamp: Date.now() - 180000,
      type: "message"
    },
    {
      id: "msg-4",
      profileId: "system",
      userName: "System",
      avatar: "",
      message: "Alex added EP & LP to the timeline",
      timestamp: Date.now() - 120000,
      type: safeNotificationType("system")
    }
  ]);

  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mock typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        const users = ["alex", "sam"];
        const randomUser = users[Math.floor(Math.random() * users.length)];
        
        setIsTyping(prev => 
          prev.includes(randomUser) ? prev.filter(u => u !== randomUser) : [...prev, randomUser]
        );
        
        setTimeout(() => {
          setIsTyping(prev => prev.filter(u => u !== randomUser));
        }, 2000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      profileId: currentUserId,
      userName: "You",
      avatar: "/placeholder.svg",
      message: newMessage,
      timestamp: Date.now(),
      type: "message"
    };

    setMessages(prev => [...prev, message]);
    setNewMessage("");
    inputRef.current?.focus();

    // Mock response from other users
    setTimeout(() => {
      if (Math.random() > 0.5) {
        const responses = [
          { user: "alex", message: "Sounds good!" },
          { user: "sam", message: "I'm in 👍" },
          { user: "alex", message: "Perfect timing" },
          { user: "sam", message: "Let's do it!" }
        ];
        const response = responses[Math.floor(Math.random() * responses.length)];
        
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}`,
          profileId: response.user,
          userName: response.user === "alex" ? "Alex" : "Sam",
          avatar: "/placeholder.svg",
          message: response.message,
          timestamp: Date.now(),
          type: "message"
        }]);
      }
    }, 1000 + Math.random() * 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageStyle = (message: ChatMessage) => {
    switch (message.type) {
      case safeNotificationType('system'):
        return 'bg-muted/30 text-muted-foreground text-center text-xs py-2 px-3 rounded-full';
      case 'suggestion':
        return 'bg-accent/20 border border-accent/30 text-accent-foreground';
      default:
        return message.profileId === currentUserId 
          ? 'bg-gradient-primary text-primary-foreground ml-auto' 
          : 'bg-card/90 text-card-foreground border border-border/30';
    }
  };

  return (
    <div className="bg-card/90 backdrop-blur-xl rounded-2xl border border-border/30 h-80 flex flex-col">
      {/* Chat header */}
      <div className="p-4 border-b border-border/30">
        <h3 className="font-semibold text-foreground">Planning Chat</h3>
        <p className="text-xs text-muted-foreground">Coordinate with your group</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {messages.map((message) => (
          <div key={message.id} className={`${message.type === safeNotificationType('system') ? 'flex justify-center' : 'flex'}`}>
            <div className={`max-w-xs lg:max-w-md ${getMessageStyle(message)} rounded-2xl p-3 ${
              message.profileId === currentUserId ? 'rounded-br-sm' : 'rounded-bl-sm'
            }`}>
              {message.type !== safeNotificationType('system') && message.profileId !== currentUserId && (
                <div className="text-xs text-muted-foreground mb-1 font-medium">
                  {message.userName}
                </div>
              )}
              <div className={message.type === safeNotificationType('system') ? 'text-xs' : 'text-sm'}>
                {message.message}
              </div>
              {message.type !== safeNotificationType('system') && (
                <div className="text-xs opacity-70 mt-1">
                  {formatTime(message.timestamp)}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Typing indicators */}
        {isTyping.map((profileId) => (
          <div key={profileId} className="flex">
            <div className="bg-card/90 border border-border/30 rounded-2xl rounded-bl-sm p-3 max-w-xs">
              <div className="text-xs text-muted-foreground mb-1 font-medium">
                {profileId === "alex" ? "Alex" : "Sam"}
              </div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-border/30">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full bg-background/50 border border-border/30 rounded-2xl py-2 px-4 pr-20 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-300"
            />
            
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <button className="p-1 rounded-full hover:bg-secondary/50 transition-colors">
                <Smile className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-1 rounded-full hover:bg-secondary/50 transition-colors">
                <Image className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-1 rounded-full hover:bg-secondary/50 transition-colors">
                <MapPin className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="p-2 bg-gradient-primary text-primary-foreground rounded-full hover:scale-110 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};