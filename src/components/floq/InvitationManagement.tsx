import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { InvitationsSkeleton } from './InvitationsSkeleton';
import { UserPlus, Search, Mail, X, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { FloqDetails } from '@/hooks/useFloqDetails';
import { formatDistance } from '@/utils/formatDistance';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useIsMobile } from '@/hooks/use-mobile';

interface InvitationManagementProps {
  floqDetails: FloqDetails;
}

interface PendingInvitation {
  id: string;
  invitee_id: string;
  invitee_username?: string;
  invitee_display_name: string;
  invitee_avatar_url?: string;
  status: string;
  sent_at: string;
}

interface UserSearchResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

export const InvitationManagement: React.FC<InvitationManagementProps> = ({ floqDetails }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [cachedSearchResults, setCachedSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [selectedInvitation, setSelectedInvitation] = useState<PendingInvitation | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const searchRequestId = useRef(0);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const isMobile = useIsMobile();

  // Load pending invitations on mount
  React.useEffect(() => {
    loadPendingInvitations();
  }, [floqDetails.id]);

  const loadPendingInvitations = async () => {
    setLoadingInvitations(true);
    try {
      const { data, error } = await supabase
        .from('floq_invitations')
        .select(`
          id,
          invitee_id,
          status,
          created_at,
          profiles!floq_invitations_invitee_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('floq_id', floqDetails.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const invitations = data?.map(inv => ({
        id: inv.id,
        invitee_id: inv.invitee_id,
        invitee_username: inv.profiles?.username,
        invitee_display_name: inv.profiles?.display_name || 'Unknown User',
        invitee_avatar_url: inv.profiles?.avatar_url,
        status: inv.status,
        sent_at: inv.created_at,
      })) || [];

      setPendingInvitations(invitations);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    } finally {
      setLoadingInvitations(false);
    }
  };

  // Debounced search effect
  React.useEffect(() => {
    searchUsers(debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  // Handle immediate search on Enter key
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
      searchUsers(searchQuery.trim());
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    // Increment request ID to handle concurrent requests
    const currentRequestId = ++searchRequestId.current;
    setIsSearching(true);
    
    try {
      const { data, error } = await supabase.rpc('search_users', {
        search_query: query.trim()
      });

      // Discard stale responses
      if (currentRequestId !== searchRequestId.current) return;

      if (error) throw error;

      // Filter out existing participants and pending invitations
      const participantIds = floqDetails.participants.map(p => p.user_id);
      const invitationIds = pendingInvitations.map(inv => inv.invitee_id);
      const filteredResults = data?.filter(
        user => !participantIds.includes(user.id) && !invitationIds.includes(user.id)
      ) || [];

      setSearchResults(filteredResults);
      // Cache non-empty results to prevent flashing during debounce
      if (filteredResults.length > 0) {
        setCachedSearchResults(filteredResults);
      }
    } catch (error) {
      if (currentRequestId === searchRequestId.current) {
        console.error('User search failed:', error);
        toast.error('Failed to search users');
      }
    } finally {
      if (currentRequestId === searchRequestId.current) {
        setIsSearching(false);
      }
    }
  };

  const sendInvitation = async (userId: string) => {
    setInvitingUserId(userId);
    try {
      const { error } = await supabase.functions.invoke('invite-to-floq', {
        body: {
          floq_id: floqDetails.id,  // Use snake_case as expected by edge function
          invitee_ids: [userId]     // Use snake_case plural as expected
        }
      });

      if (error) throw error;

      toast.success('Invitation sent successfully');
      
      // Clear search for fresh UX and refresh invitations
      setSearchQuery('');
      setSearchResults([]);
      await loadPendingInvitations();
    } catch (error) {
      console.error('Failed to send invitation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invitation';
      toast.error(errorMessage);
    } finally {
      setInvitingUserId(null);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('floq_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Invitation cancelled');
      await loadPendingInvitations();
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel invitation';
      toast.error(errorMessage);
    } finally {
      setShowCancelConfirm(false);
      setSelectedInvitation(null);
    }
  };

  const confirmCancelInvitation = (invitation: PendingInvitation) => {
    setSelectedInvitation(invitation);
    setShowCancelConfirm(true);
  };

  // Show loading skeleton on initial load
  if (loadingInvitations) {
    return <InvitationsSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Send Invitations Section */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            <h4 className="font-medium">Invite Members</h4>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className={`pl-9 ${isMobile ? 'h-12 text-base' : ''}`}
            aria-label="Search for users to invite"
          />
          </div>

          {/* Search Results */}
          {searchQuery && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {isSearching ? (
                <div className="text-center py-4 text-muted-foreground">
                  Searching...
                </div>
              ) : (searchResults.length > 0 || (cachedSearchResults.length > 0 && isSearching)) ? (
                (searchResults.length > 0 ? searchResults : cachedSearchResults).map((user) => (
                  <div key={user.id} className={`${isMobile ? 'flex-col items-start gap-3' : 'flex items-center justify-between'} p-3 rounded-lg border`}>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>
                          {user.display_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <div className="font-medium">{user.display_name}</div>
                        <div className="text-sm text-muted-foreground">@{user.username}</div>
                      </div>
                    </div>

                    <Button
                      size={isMobile ? "default" : "sm"}
                      onClick={() => sendInvitation(user.id)}
                      disabled={invitingUserId === user.id}
                      className={`gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                        isMobile ? "w-full h-12" : ""
                      }`}
                    >
                      <Send className="w-3 h-3" />
                      {invitingUserId === user.id ? 'Sending...' : 'Invite'}
                    </Button>
                  </div>
                ))
              ) : searchQuery.length >= 2 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No users found matching "{searchQuery}"
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Card>

      {/* Pending Invitations Section */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <h4 className="font-medium">Pending Invitations ({pendingInvitations.length})</h4>
            </div>
          </div>

          {loadingInvitations ? (
            <div className="text-center py-4 text-muted-foreground">
              Loading invitations...
            </div>
          ) : pendingInvitations.length > 0 ? (
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} className={`${isMobile ? 'flex-col items-start gap-3' : 'flex items-center justify-between'} p-3 rounded-lg border`}>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={invitation.invitee_avatar_url} />
                      <AvatarFallback>
                        {invitation.invitee_display_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{invitation.invitee_display_name}</span>
                        {invitation.invitee_username && (
                          <span className="text-sm text-muted-foreground">@{invitation.invitee_username}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Pending
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Sent {formatDistance(new Date(invitation.sent_at))} ago
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size={isMobile ? "default" : "sm"}
                    onClick={() => confirmCancelInvitation(invitation)}
                    className={`text-destructive hover:text-destructive ${
                      isMobile ? "w-full h-12" : ""
                    }`}
                  >
                    <X className="w-4 h-4" />
                    {isMobile && <span className="ml-2">Cancel Invitation</span>}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No pending invitations</p>
              <p className="text-sm">Search for users above to send invitations</p>
            </div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Cancel invitation?"
        description={`Are you sure you want to cancel the invitation for ${selectedInvitation?.invitee_display_name}? They won't be able to join using this invitation.`}
        confirmLabel="Cancel Invitation"
        cancelLabel="Keep"
        onConfirm={() => selectedInvitation && cancelInvitation(selectedInvitation.id)}
      />
    </div>
  );
};