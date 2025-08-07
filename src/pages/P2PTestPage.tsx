import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { useMessageReactions } from '@/hooks/messaging/useMessageReactions';
import { useThreads } from '@/hooks/messaging/useThreads';
import { useTypingIndicators, useTypingIndicatorText } from '@/hooks/messaging/useTypingIndicators';
import { useAtomicFriendships } from '@/hooks/useAtomicFriendships';
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { realtimeManager } from '@/lib/realtime/manager';
import { 
  MessageSquare, 
  Users, 
  Heart, 
  Zap, 
  Search,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Generate proper UUIDs for mock data
const MOCK_THREAD_ID = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
const MOCK_USER_ID = 'f1e2d3c4-b5a6-9870-5432-109876fedcba';
const MOCK_CURRENT_USER_ID = 'c1d2e3f4-a5b6-7890-3456-789012345678';

// Mock data for testing with proper UUIDs
const MOCK_MESSAGES = [
  {
    id: 'msg-' + crypto.randomUUID(),
    content: 'Hey! How are you doing?',
    profile_id: MOCK_USER_ID,
    created_at: new Date(Date.now() - 300000).toISOString(),
    threadId: MOCK_THREAD_ID,
    thread_id: MOCK_THREAD_ID,
    senderProfile: {
      display_name: 'Alice Johnson',
      username: 'alice',
      avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612c42e?w=100&h=100&fit=crop&crop=face'
    },
    status: 'read' as const
  },
  {
    id: 'msg-' + crypto.randomUUID(), 
    content: 'I\'m great! Just working on some new features 🚀',
    profile_id: MOCK_CURRENT_USER_ID,
    created_at: new Date(Date.now() - 240000).toISOString(),
    threadId: MOCK_THREAD_ID,
    thread_id: MOCK_THREAD_ID,
    senderProfile: {
      display_name: 'You',
      username: 'you',
      avatar_url: null
    },
    status: 'delivered' as const
  },
  {
    id: 'msg-' + crypto.randomUUID(),
    content: 'That sounds exciting! What kind of features?',
    profile_id: MOCK_USER_ID,
    created_at: new Date(Date.now() - 180000).toISOString(),
    threadId: MOCK_THREAD_ID,
    thread_id: MOCK_THREAD_ID,
    senderProfile: {
      display_name: 'Alice Johnson',
      username: 'alice', 
      avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612c42e?w=100&h=100&fit=crop&crop=face'
    },
    status: 'read' as const
  },
  {
    id: 'msg-' + crypto.randomUUID(),
    content: 'Real-time messaging improvements, friend system enhancements, and better performance monitoring!',
    profile_id: MOCK_CURRENT_USER_ID,
    created_at: new Date(Date.now() - 120000).toISOString(),
    threadId: MOCK_THREAD_ID,
    thread_id: MOCK_THREAD_ID,
    senderProfile: {
      display_name: 'You',
      username: 'you',
      avatar_url: null
    },
    status: 'sent' as const
  }
];

// Test wrapper for MessageBubble that handles mock data
function TestMessageBubble({ message, showAvatar, isConsecutive, onReactionClick }: {
  message: any;
  showAvatar: boolean;
  isConsecutive: boolean;
  onReactionClick?: (emoji: string) => void;
}) {
  // In test mode, we'll create a simplified version that doesn't rely on hooks
  const currentUserId = useCurrentUserId();
  const isOwn = message.profile_id === MOCK_CURRENT_USER_ID;
  
  // Mock reactions for demo
  const mockReactions = [
    { emoji: '❤️', count: 2, hasUserReacted: false },
    { emoji: '👍', count: 1, hasUserReacted: isOwn },
  ];

  const formatTime = (timestamp: string) => {
    if (!timestamp) return 'Now';
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Now';
    
    try {
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      
      if (minutes < 60) {
        return `${minutes}m ago`;
      } else if (hours < 24) {
        return `${hours}h ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return 'Now';
    }
  };

  return (
    <div className={`flex gap-3 max-w-[80%] ${isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
      {/* Avatar */}
      {showAvatar && !isConsecutive && (
        <div className="flex-shrink-0">
          {message.senderProfile?.avatar_url ? (
            <img
              src={message.senderProfile.avatar_url}
              alt={message.senderProfile.display_name || 'User'}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium">
              {(message.senderProfile?.display_name || 'U')[0].toUpperCase()}
            </div>
          )}
        </div>
      )}
      
      {/* Message Content */}
      <div className={`flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name (only for non-own messages and first in group) */}
        {!isOwn && showAvatar && !isConsecutive && (
          <div className="text-sm font-medium text-gray-900 px-1">
            {message.senderProfile?.display_name || 'Unknown User'}
          </div>
        )}
        
        {/* Message bubble */}
        <div
          className={`
            relative px-4 py-2 rounded-2xl max-w-md break-words
            ${isOwn 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-900'
            }
            ${isConsecutive ? (isOwn ? 'rounded-tr-md' : 'rounded-tl-md') : ''}
          `}
        >
          <div className="text-sm">{message.content}</div>
          
          {/* Mock reactions */}
          {mockReactions.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {mockReactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  className={`
                    flex items-center gap-1 px-2 py-1 rounded-full text-xs
                    ${reaction.hasUserReacted 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : 'bg-white/20 hover:bg-white/30 border border-white/20'
                    }
                  `}
                                     onClick={() => {
                     onReactionClick?.(reaction.emoji);
                   }}
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Timestamp and status */}
        <div className={`flex items-center gap-2 text-xs text-gray-500 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span>{formatTime(message.created_at)}</span>
          {isOwn && (
            <span className="text-blue-500">
              {message.status === 'read' && '✓✓'}
              {message.status === 'delivered' && '✓'}
              {message.status === 'sent' && '→'}
              {message.status === 'sending' && '⋯'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function P2PTestPage() {
  const [testMessage, setTestMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(MOCK_USER_ID);
  const [connectionStats, setConnectionStats] = useState<any>(null);
  const [realtimeErrors, setRealtimeErrors] = useState<string[]>([]);

  const currentUserId = useCurrentUserId();

  // Use null for hooks when we want to disable realtime subscriptions in test mode
  const isTestMode = true; // Set to true to disable realtime subscriptions
  const realThreadId = (currentUserId && !isTestMode) ? MOCK_THREAD_ID : null;

  // Only initialize hooks if we have a current user and not in test mode
  const { 
    reactions, 
    toggleReaction, 
    isLoading: reactionsLoading,
    error: reactionsError 
  } = useMessageReactions(realThreadId || '', currentUserId || '');

  const { 
    threads, 
    createThread, 
    markThreadRead, 
    searchThreads,
    isLoading: threadsLoading,
    error: threadsError
  } = useThreads();

  const {
    isTyping,
    typingUsers,
    handleTyping,
    handleMessageSent
  } = useTypingIndicators(realThreadId || '');

  const typingText = useTypingIndicatorText(typingUsers);

  const {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    isSending,
    isAccepting,
    isRejecting
  } = useAtomicFriendships();

  const { 
    unifiedFriends, 
    friendsLoading,
    error: friendsError 
  } = useUnifiedFriends();

  // Monitor connection health
  useEffect(() => {
    const updateStats = () => {
      try {
        const stats = realtimeManager.getConnectionStats();
        const activeSubscriptions = realtimeManager.getActiveSubscriptions();
        setConnectionStats({
          ...stats,
          activeSubscriptions: Array.from(activeSubscriptions.keys())
        });
      } catch (error) {
        console.error('Error getting connection stats:', error);
        setRealtimeErrors(prev => [...prev, `Stats error: ${error.message}`]);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, []);

  // Handle realtime errors
  useEffect(() => {
    const errors = [];
    if (reactionsError) errors.push(`Reactions: ${reactionsError.message}`);
    if (threadsError) errors.push(`Threads: ${threadsError.message}`);
    if (friendsError) errors.push(`Friends: ${friendsError.message}`);
    
    // Add test mode explanation
    if (isTestMode) {
      errors.push('Test Mode: Realtime subscriptions are disabled for demo purposes');
    }
    
    setRealtimeErrors(errors);
  }, [reactionsError, threadsError, friendsError, isTestMode]);

  const handleSendTestMessage = async () => {
    if (!testMessage.trim()) return;
    
    try {
      handleMessageSent();
      toast.success('Test message sent!', {
        description: `Message: "${testMessage}"`
      });
      setTestMessage('');
    } catch (error) {
      toast.error('Failed to send message', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      await toggleReaction({ messageId, emoji });
      toast.success('Reaction toggled!', {
        description: `${emoji} on message ${messageId.slice(0, 8)}...`
      });
    } catch (error) {
      toast.error('Failed to toggle reaction', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleSendFriendRequest = async () => {
    if (!selectedUserId) return;
    
    try {
      await sendFriendRequest(selectedUserId);
      toast.success('Friend request sent!');
    } catch (error) {
      toast.error('Failed to send friend request', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleSearchThreads = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const results = await searchThreads(searchQuery);
      toast.success('Search completed!', {
        description: `Found ${results.length} results`
      });
    } catch (error) {
      toast.error('Search failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleCreateThread = async () => {
    try {
      const threadId = await createThread(selectedUserId);
      toast.success('Thread created!', {
        description: `Thread ID: ${threadId.slice(0, 8)}...`
      });
    } catch (error) {
      toast.error('Failed to create thread', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Show loading state if no current user
  if (!currentUserId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Authentication Required
            </CardTitle>
            <CardDescription>
              Please log in to test the P2P features. The enhanced messaging and friend systems require authentication.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Once logged in, you'll be able to test:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
              <li>Real-time message reactions</li>
              <li>Typing indicators</li>
              <li>Atomic friend operations</li>
              <li>Thread search functionality</li>
              <li>Connection health monitoring</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">P2P Systems Test Suite</h1>
          <p className="text-muted-foreground">
            Interactive testing environment for enhanced messaging and friend systems
          </p>
        </div>
        <Badge variant={currentUserId ? "default" : "destructive"}>
          {currentUserId ? `User: ${currentUserId.slice(0, 8)}...` : "Not Authenticated"}
        </Badge>
      </div>

      {/* Test Mode Info */}
      {isTestMode && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Test Mode Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-700 mb-2">
              This page is running in test mode with mock data and disabled realtime subscriptions.
            </p>
            <ul className="space-y-1 text-xs text-blue-600">
              <li>• Realtime subscriptions: Disabled (prevents connection errors)</li>
              <li>• Mock data: Using sample messages and UUIDs</li>
              <li>• Database operations: Will attempt real calls but may fail gracefully</li>
              <li>• UI components: Fully functional for testing interfaces</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {realtimeErrors.length > 0 && !isTestMode && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Realtime Issues Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {realtimeErrors.map((error, index) => (
                <li key={index} className="text-sm text-yellow-700">• {error}</li>
              ))}
            </ul>
            <p className="text-xs text-yellow-600 mt-2">
              These errors indicate connection issues with the realtime system.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Connection Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Connection Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {connectionStats?.totalConnections || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Connections</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {connectionStats?.activeSubscriptions?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Active Subscriptions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {connectionStats?.totalRetries || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Retries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {connectionStats?.healthChecksPassed || 0}
              </div>
              <div className="text-sm text-muted-foreground">Health Checks</div>
            </div>
          </div>
          
          {connectionStats?.activeSubscriptions?.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Active Subscriptions:</h4>
              <div className="flex flex-wrap gap-1">
                {connectionStats.activeSubscriptions.map((sub: string) => (
                  <Badge key={sub} variant="outline" className="text-xs">
                    {sub}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="messaging" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="messaging">Messaging</TabsTrigger>
          <TabsTrigger value="friendships">Friendships</TabsTrigger>
          <TabsTrigger value="reactions">Reactions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="messaging" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Message Testing
                </CardTitle>
                <CardDescription>
                  Test typing indicators and message sending
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={testMessage}
                    onChange={(e) => {
                      setTestMessage(e.target.value);
                      handleTyping();
                    }}
                    placeholder="Type a test message..."
                    className="flex-1"
                  />
                  <Button onClick={handleSendTestMessage} disabled={!testMessage.trim()}>
                    Send
                  </Button>
                </div>
                
                {typingText && (
                  <div className="text-sm text-muted-foreground italic">
                    {typingText}
                  </div>
                )}
                
                <div className="space-y-2">
                  <h4 className="font-medium">Thread Management</h4>
                  <div className="flex gap-2">
                    <Input
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      placeholder="User ID for thread..."
                      className="flex-1"
                    />
                    <Button onClick={handleCreateThread} size="sm">
                      Create Thread
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Thread Search
                </CardTitle>
                <CardDescription>
                  Test enhanced search functionality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search threads..."
                    className="flex-1"
                  />
                  <Button onClick={handleSearchThreads} disabled={!searchQuery.trim()}>
                    Search
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p>Search by:</p>
                  <ul className="list-disc list-inside ml-2">
                    <li>Message content</li>
                    <li>Friend display name</li>
                    <li>Friend username</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mock Messages Display */}
          <Card>
            <CardHeader>
              <CardTitle>Sample Messages (Mock Data)</CardTitle>
              <CardDescription>
                These are sample messages to test the UI components
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {MOCK_MESSAGES.map((message, index) => (
                <TestMessageBubble
                  key={message.id}
                  message={message}
                  showAvatar={index === 0 || MOCK_MESSAGES[index - 1]?.profile_id !== message.profile_id}
                  isConsecutive={index > 0 && MOCK_MESSAGES[index - 1]?.profile_id === message.profile_id}
                  onReactionClick={(emoji) => handleToggleReaction(message.id, emoji)}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="friendships" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Friend Operations
              </CardTitle>
              <CardDescription>
                Test atomic friendship operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  placeholder="User ID to send friend request..."
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendFriendRequest} 
                  disabled={isSending || !selectedUserId}
                  className="flex items-center gap-2"
                >
                  {isSending ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Request'
                  )}
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  disabled={isAccepting}
                  onClick={() => acceptFriendRequest(selectedUserId)}
                  className="flex items-center gap-2"
                >
                  {isAccepting ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Accept Request
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  disabled={isRejecting}
                  onClick={() => rejectFriendRequest(selectedUserId)}
                >
                  {isRejecting ? 'Rejecting...' : 'Reject Request'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Unified Friends Data</CardTitle>
              <CardDescription>
                Real-time friend data with presence information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {friendsLoading ? (
                <div className="text-center py-4">
                  <Clock className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading friends...
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Total friends: {unifiedFriends?.length || 0}
                  </div>
                  {unifiedFriends?.slice(0, 3).map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${friend.online ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="font-medium">{friend.display_name || friend.username}</span>
                        <Badge variant="outline" className="text-xs">
                          {friend.friend_state}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Message Reactions
              </CardTitle>
              <CardDescription>
                Test real-time reaction system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reactionsLoading ? (
                <div className="text-center py-4">
                  <Clock className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading reactions...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Total reactions loaded: {reactions?.length || 0}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['❤️', '👍', '😂', '😮', '😢', '😡', '🎉', '🚀'].map((emoji) => (
                      <Button
                        key={emoji}
                        variant="outline"
                        onClick={() => handleToggleReaction(MOCK_MESSAGES[0].id, emoji)}
                        className="flex items-center gap-2"
                      >
                        <span className="text-lg">{emoji}</span>
                        <span className="text-xs">
                          {reactions?.filter(r => r.emoji === emoji).length || 0}
                        </span>
                      </Button>
                    ))}
                  </div>
                  
                  {reactions && reactions.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Recent Reactions:</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {reactions.slice(0, 5).map((reaction) => (
                          <div key={reaction.id} className="text-xs text-muted-foreground">
                            {reaction.emoji} on message {reaction.message_id.slice(0, 8)}...
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Performance Metrics
              </CardTitle>
              <CardDescription>
                Real-time system performance monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Hook Status</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Reactions:</span>
                      <Badge variant={reactionsError ? "destructive" : "default"}>
                        {reactionsError ? "Error" : "Connected"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Threads:</span>
                      <Badge variant={threadsError ? "destructive" : "default"}>
                        {threadsError ? "Error" : "Connected"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Friends:</span>
                      <Badge variant={friendsError ? "destructive" : "default"}>
                        {friendsError ? "Error" : "Connected"}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Loading States</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Reactions Loading:</span>
                      <Badge variant={reactionsLoading ? "secondary" : "outline"}>
                        {reactionsLoading ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Threads Loading:</span>
                      <Badge variant={threadsLoading ? "secondary" : "outline"}>
                        {threadsLoading ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Friends Loading:</span>
                      <Badge variant={friendsLoading ? "secondary" : "outline"}>
                        {friendsLoading ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              {connectionStats && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Connection Details</h4>
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(connectionStats, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}