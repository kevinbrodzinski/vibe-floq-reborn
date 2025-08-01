import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserPlus } from 'lucide-react';
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends';
import { useAuth } from '@/providers/AuthProvider';
import { DiscoverTab } from './DiscoverTab';

export function FriendsTab() {
  const { user } = useAuth();
  const { rows, pendingIn, accept, updating, friendIds } = useUnifiedFriends();
  const [activeTab, setActiveTab] = useState('friends');

  // Filter for accepted friends
  const friends = rows.filter(r => r.friend_state === 'accepted');

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="friends" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Friends ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="discover" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Discover
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="mt-6">
          <div className="space-y-6">
            {/* Pending Friend Requests */}
            {pendingIn.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Pending Friend Requests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendingIn.map(request => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={request.avatar_url || undefined} />
                          <AvatarFallback>
                            {(request.display_name || request.username || 'U').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{request.display_name || request.username}</p>
                          <p className="text-sm text-muted-foreground">
                            Wants to be friends
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => accept(request.id)}
                          disabled={updating}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => accept(request.id)}
                          disabled={updating}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Friends List */}
            <Card>
              <CardHeader>
                <CardTitle>Your Friends ({friends.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {friends.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No friends yet. Start connecting with people!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {friends.map(friend => (
                      <div key={friend.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={friend.avatar_url || undefined} />
                            <AvatarFallback>
                              {(friend.display_name || friend.username || 'U').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{friend.display_name || friend.username}</p>
                            <p className="text-sm text-muted-foreground">
                              {friend.online ? '🟢 Online' : '⚫ Offline'}
                              {friend.vibe_tag && ` • ${friend.vibe_tag}`}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Message
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="discover" className="mt-6">
          <DiscoverTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}