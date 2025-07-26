import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFriends, useFriendRequests, useSendFriendRequest, useRespondToFriendRequest } from '@/hooks/useNewFriends';
import { useAuth } from '@/providers/AuthProvider';

export function FriendsTab() {
  const { user } = useAuth();
  const { data: friends = [] } = useFriends();
  const { data: requests = [] } = useFriendRequests();
  const { mutate: sendRequest, isPending: isSending } = useSendFriendRequest();
  const { mutate: respondToRequest, isPending: isResponding } = useRespondToFriendRequest();

  const pendingRequests = requests.filter(r => r.status === 'pending' && r.friend_id === user?.id);

  return (
    <div className="space-y-6">
      {/* Pending Friend Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Friend Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.map(request => (
              <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {request.user_id.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Friend Request</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => respondToRequest({ id: request.id, status: 'accepted' })}
                    disabled={isResponding}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => respondToRequest({ id: request.id, status: 'declined' })}
                    disabled={isResponding}
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
              {friends.map(friend => {
                const otherUserId = friend.user_a === user?.id ? friend.user_b : friend.user_a;
                return (
                  <div key={friend.id || `${friend.user_a}-${friend.user_b}`} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {otherUserId.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">Friend</p>
                        <p className="text-sm text-muted-foreground">
                          Connected since {new Date(friend.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Message
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}