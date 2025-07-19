import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, Mail, Users, X, Send, Search, Star, Sparkles } from 'lucide-react';
import { callSendInvitations } from '@/lib/api/callSendInvitations';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { VibeRing } from '@/components/VibeRing';
import { useSuggestedInvitees } from '@/hooks/useSuggestedInvitees';
import { safeVibe } from '@/utils/safeVibe';

interface InviteOverlayProps {
  open: boolean;
  onClose: () => void;
  planId?: string;
  floqId?: string;
  planVibe?: string;
  planLocation?: { lat: number; lng: number };
}

interface FloqMember {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

interface Friend {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

export function InviteOverlay({ 
  open, 
  onClose, 
  planId, 
  floqId, 
  planVibe, 
  planLocation 
}: InviteOverlayProps) {
  const [activeTab, setActiveTab] = useState<'suggested' | 'floq' | 'friends' | 'email'>('suggested');
  const [floqMembers, setFloqMembers] = useState<FloqMember[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [emailList, setEmailList] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Hook up smart friend suggestions
  const { suggestions, loading: suggestionsLoading } = useSuggestedInvitees({
    planId,
    floqId,
    targetVibe: planVibe,
    planLocation,
  });

  useEffect(() => {
    if (open) {
      loadFloqMembers();
      loadFriends();
    }
  }, [open, floqId]);

  const loadFloqMembers = async () => {
    if (!floqId) return;

    try {
      const { data, error } = await supabase
        .from('floq_participants')
        .select(`
          user_id,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('floq_id', floqId);

      if (error) throw error;

      const members = data
        ?.map(p => p.profiles)
        .filter(Boolean)
        .map(profile => ({
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url
        })) || [];

      setFloqMembers(members);
    } catch (error) {
      console.error('Error loading floq members:', error);
    }
  };

  const loadFriends = async () => {
    try {
      const { data: friendshipsData, error } = await supabase
        .from('friendships')
        .select('friend_id');

      if (error) throw error;

      if (!friendshipsData || friendshipsData.length === 0) {
        setFriends([]);
        return;
      }

      const friendIds = friendshipsData.map(f => f.friend_id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', friendIds);

      if (profilesError) throw profilesError;

      const friendsList = profilesData?.map(profile => ({
        id: profile.id,
        username: profile.username || '',
        display_name: profile.display_name,
        avatar_url: profile.avatar_url
      })) || [];

      setFriends(friendsList);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const sendInternalInvites = async () => {
    if (!floqId || selectedUsers.length === 0) return;

    setLoading(true);
    try {
      await callSendInvitations('internal', {
        floq_id: floqId,
        invitee_ids: selectedUsers
      });

      toast({
        title: "Invites sent!",
        description: `Sent invitations to ${selectedUsers.length} people.`,
      });

      setSelectedUsers([]);
      onClose();
    } catch (error: any) {
      toast({
        title: "Error sending invites",
        description: error.message || "Failed to send invitations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendEmailInvites = async () => {
    if (!planId || !emailList.trim()) return;

    const emails = emailList
      .split(',')
      .map(email => email.trim())
      .filter(email => email.includes('@'));

    if (emails.length === 0) {
      toast({
        title: "Invalid emails",
        description: "Please enter valid email addresses separated by commas.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await callSendInvitations('external', {
        plan_id: planId,
        emails
      });

      toast({
        title: "Email invites sent!",
        description: `Sent invitations to ${emails.length} email addresses.`,
      });

      setEmailList('');
      setCustomMessage('');
      onClose();
    } catch (error: any) {
      toast({
        title: "Error sending email invites",
        description: error.message || "Failed to send email invitations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredFloqMembers = floqMembers.filter(member =>
    member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFriends = friends.filter(friend =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite People
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="suggested" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                Smart
              </TabsTrigger>
              <TabsTrigger value="floq" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                Floq
              </TabsTrigger>
              <TabsTrigger value="friends" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                Friends
              </TabsTrigger>
              <TabsTrigger value="email" className="text-xs">
                <Mail className="w-3 h-3 mr-1" />
                Email
              </TabsTrigger>
            </TabsList>

            <TabsContent value="suggested" className="space-y-3">
              {suggestionsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
                  <p className="text-sm">Finding perfect matches...</p>
                </div>
              ) : suggestions.length > 0 ? (
                <>
                  <div className="text-xs text-muted-foreground mb-2">
                    Smart suggestions based on shared interests and vibe compatibility
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {suggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer border border-primary/20"
                        onClick={() => toggleUserSelection(suggestion.id)}
                      >
                        <Checkbox
                          checked={selectedUsers.includes(suggestion.id)}
                          onChange={() => toggleUserSelection(suggestion.id)}
                        />
                        <VibeRing 
                          vibe={safeVibe(suggestion.current_vibe || planVibe)}
                          className="w-10 h-10"
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={suggestion.avatar_url} />
                            <AvatarFallback>
                              {suggestion.display_name?.[0] || suggestion.username[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </VibeRing>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {suggestion.display_name || suggestion.username}
                            </p>
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {suggestion.suggestion_reason}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {selectedUsers.map((userId) => {
                        const user = suggestions.find(s => s.id === userId) || 
                                    floqMembers.find(m => m.id === userId) ||
                                    friends.find(f => f.id === userId);
                        if (!user) return null;
                        return (
                          <Badge key={userId} variant="secondary" className="text-xs">
                            {user.display_name || user.username}
                            <X
                              className="w-3 h-3 ml-1 cursor-pointer"
                              onClick={() => toggleUserSelection(userId)}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  <Button
                    onClick={sendInternalInvites}
                    disabled={selectedUsers.length === 0 || loading}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {loading ? 'Sending...' : `Invite ${selectedUsers.length} Smart Picks`}
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No smart suggestions available</p>
                  <p className="text-xs">Try the other tabs to invite manually</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="floq" className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search floq members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2">
                {filteredFloqMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleUserSelection(member.id)}
                  >
                    <Checkbox
                      checked={selectedUsers.includes(member.id)}
                      onChange={() => toggleUserSelection(member.id)}
                    />
                    <VibeRing vibe={safeVibe(planVibe)} className="w-10 h-10">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback>
                          {member.display_name?.[0] || member.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </VibeRing>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {member.display_name || member.username}
                      </p>
                      {member.display_name && (
                        <p className="text-xs text-muted-foreground">
                          @{member.username}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {selectedUsers.map((userId) => {
                    const user = floqMembers.find(m => m.id === userId);
                    if (!user) return null;
                    return (
                      <Badge key={userId} variant="secondary" className="text-xs">
                        {user.display_name || user.username}
                        <X
                          className="w-3 h-3 ml-1 cursor-pointer"
                          onClick={() => toggleUserSelection(userId)}
                        />
                      </Badge>
                    );
                  })}
                </div>
              )}

              <Button
                onClick={sendInternalInvites}
                disabled={selectedUsers.length === 0 || loading}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {loading ? 'Sending...' : `Invite ${selectedUsers.length} People`}
              </Button>
            </TabsContent>

            <TabsContent value="friends" className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => toggleUserSelection(friend.id)}
                  >
                    <Checkbox
                      checked={selectedUsers.includes(friend.id)}
                      onChange={() => toggleUserSelection(friend.id)}
                    />
                    <VibeRing vibe={safeVibe(planVibe)} className="w-10 h-10">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={friend.avatar_url} />
                        <AvatarFallback>
                          {friend.display_name?.[0] || friend.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </VibeRing>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {friend.display_name || friend.username}
                      </p>
                      {friend.display_name && (
                        <p className="text-xs text-muted-foreground">
                          @{friend.username}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={sendInternalInvites}
                disabled={selectedUsers.length === 0 || loading}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {loading ? 'Sending...' : `Invite ${selectedUsers.length} Friends`}
              </Button>
            </TabsContent>

            <TabsContent value="email" className="space-y-3">
              <div>
                <Label htmlFor="emails">Email Addresses</Label>
                <Textarea
                  id="emails"
                  placeholder="user1@example.com, user2@example.com"
                  value={emailList}
                  onChange={(e) => setEmailList(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separate multiple emails with commas
                </p>
              </div>

              <div>
                <Label htmlFor="message">Custom Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Join me for this awesome plan!"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>

              <Button
                onClick={sendEmailInvites}
                disabled={!emailList.trim() || loading}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {loading ? 'Sending...' : 'Send Email Invites'}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}