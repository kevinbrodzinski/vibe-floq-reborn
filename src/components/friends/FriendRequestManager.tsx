import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export function FriendRequestManager() {
  const { pendingIn, pendingOut, accept, block, updating } = useUnifiedFriends();
  const { toast } = useToast();

  const handleAccept = async (friendId: string) => {
    try {
      await accept(friendId);
      toast({
        title: "Friend request accepted! 🎉",
        description: "You're now connected and can see each other's activities.",
      });
    } catch (error) {
      toast({
        title: "Failed to accept request",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDecline = async (friendId: string) => {
    try {
      await block(friendId);
      toast({
        title: "Friend request declined",
        description: "The request has been removed.",
      });
    } catch (error) {
      toast({
        title: "Failed to decline request",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const totalRequests = pendingIn.length + pendingOut.length;

  if (totalRequests === 0) {
    return (
      <div className="text-center py-8">
        <User className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-muted-foreground">No pending friend requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Incoming Requests */}
      {pendingIn.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Incoming Requests</h3>
            <Badge variant="secondary">{pendingIn.length}</Badge>
          </div>
          
          <AnimatePresence>
            {pendingIn.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={request.avatar_url || ''} />
                        <AvatarFallback>
                          {request.display_name?.[0] || request.username?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">
                          {request.display_name || request.username}
                        </h4>
                        {request.username && request.display_name && (
                          <p className="text-sm text-muted-foreground">
                            @{request.username}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {request.created_at && formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAccept(request.id)}
                          disabled={updating}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDecline(request.id)}
                          disabled={updating}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Outgoing Requests */}
      {pendingOut.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Sent Requests</h3>
            <Badge variant="outline">{pendingOut.length}</Badge>
          </div>
          
          <div className="space-y-2">
            {pendingOut.map((request) => (
              <Card key={request.id} className="border-muted">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={request.avatar_url || ''} />
                      <AvatarFallback>
                        {request.display_name?.[0] || request.username?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">
                        {request.display_name || request.username}
                      </h4>
                      {request.username && request.display_name && (
                        <p className="text-sm text-muted-foreground">
                          @{request.username}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Pending</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}