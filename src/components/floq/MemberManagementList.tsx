import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UserMinus, Search, Crown, Shield, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { FloqDetails, FloqParticipant } from '@/hooks/useFloqDetails';
import { formatDistance } from '@/utils/formatDistance';
import { useIsMobile } from '@/hooks/use-mobile';

interface MemberManagementListProps {
  floqDetails: FloqDetails;
}

export const MemberManagementList: React.FC<MemberManagementListProps> = ({ floqDetails }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<FloqParticipant | null>(null);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const filteredParticipants = floqDetails.participants.filter(participant =>
    participant.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    participant.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate pending invitations and active members
  const activeMembers = filteredParticipants.filter(p => p.joined_at);
  const pendingInvites = []; // TODO: Add pending invitations logic

  // Count co-admins to prevent demoting the last one
  const coAdminCount = floqDetails.participants.filter(p => p.role === 'co-admin').length;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'creator':
        return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'co-admin':
        return <Shield className="w-3 h-3 text-blue-500" />;
      default:
        return <User className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'creator':
        return 'default';
      case 'co-admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleRoleChange = async (userId: string, newRole: string, currentRole: string) => {
    // Prevent demoting the last co-admin
    if (currentRole === 'co-admin' && newRole === 'member' && coAdminCount === 1) {
      toast.error('Cannot demote the last co-admin. Promote another member first.');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage-participant-role', {
        body: {
          floqId: floqDetails.id,
          userId,
          newRole
        }
      });

      if (error) throw error;

      // Optimistically update local data first
      queryClient.setQueryData(['floq-details', floqDetails.id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          participants: oldData.participants.map((p: any) => 
            p.user_id === userId ? { ...p, role: newRole } : p
          )
        };
      });

      toast.success(
        newRole === 'co-admin' 
          ? 'User promoted to co-admin' 
          : currentRole === 'co-admin' 
            ? 'Co-admin role revoked' 
            : 'Role updated successfully'
      );
    } catch (error) {
      console.error('Failed to update role:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update role';
      toast.error(errorMessage);
      // Invalidate queries on error to restore correct state
      await queryClient.invalidateQueries({ queryKey: ['floq-details', floqDetails.id] });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setRemovingUserId(userId);
    try {
      const { error } = await supabase
        .from('floq_participants')
        .delete()
        .eq('floq_id', floqDetails.id)
        .eq('user_id', userId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['floq-details', floqDetails.id] });
      toast.success('Member removed successfully');
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    } finally {
      setRemovingUserId(null);
      setShowRemoveConfirm(false);
      setSelectedUser(null);
    }
  };

  const confirmRemove = (participant: FloqParticipant) => {
    setSelectedUser(participant);
    setShowRemoveConfirm(true);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Members ({floqDetails.participant_count})</h4>
            {floqDetails.participant_count > 5 && (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-9 ${isMobile ? 'w-full h-12 text-base' : 'w-48'}`}
                />
              </div>
            )}
          </div>

          {/* Pending Invitations Section */}
          {pendingInvites.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-muted-foreground">Pending Invitations</h5>
              {/* TODO: Render pending invitations */}
            </div>
          )}

          {/* Active Members Section */}
          <div className="space-y-3">
            {activeMembers.length > 0 && pendingInvites.length > 0 && (
              <h5 className="text-sm font-medium text-muted-foreground">Active Members</h5>
            )}
            {activeMembers.map((participant) => (
              <div key={participant.user_id} className={`${isMobile ? 'flex-col items-start gap-3' : 'flex items-center justify-between'} p-3 rounded-lg border`}>
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={participant.avatar_url} />
                    <AvatarFallback>
                      {participant.display_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{participant.display_name}</span>
                      {participant.username && (
                        <span className="text-sm text-muted-foreground">@{participant.username}</span>
                      )}
                      {getRoleIcon(participant.role)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={getRoleBadgeVariant(participant.role)}
                        className="text-xs"
                      >
                        {participant.role === 'creator' ? 'Host' : participant.role.replace('-', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Joined {new Date(participant.joined_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={`flex ${isMobile ? 'flex-col w-full gap-2' : 'items-center gap-2'}`}>
                  {participant.role !== 'creator' && (
                    <>
                      <Select
                        value={participant.role}
                        onValueChange={(newRole) => handleRoleChange(participant.user_id, newRole, participant.role)}
                      >
                        <SelectTrigger 
                          className={isMobile ? "w-full h-12" : "w-28 h-8"} 
                          aria-label="Change role"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem 
                            value="co-admin"
                            disabled={participant.role === 'co-admin' && coAdminCount === 1}
                          >
                            Co-admin
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {participant.role === 'co-admin' && !isMobile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRoleChange(participant.user_id, 'member', participant.role)}
                          disabled={coAdminCount === 1}
                          className="text-muted-foreground hover:text-foreground"
                          title={coAdminCount === 1 ? 'Cannot revoke the last co-admin' : 'Revoke co-admin'}
                        >
                          Revoke
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size={isMobile ? "default" : "sm"}
                        onClick={() => confirmRemove(participant)}
                        disabled={removingUserId === participant.user_id}
                        className={`text-destructive hover:text-destructive ${
                          isMobile ? "w-full h-12" : ""
                        }`}
                      >
                        <UserMinus className="w-4 h-4" />
                        {isMobile && <span className="ml-2">Remove Member</span>}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {activeMembers.length === 0 && searchQuery && (
            <div className="text-center py-4 text-muted-foreground">
              No members found matching "{searchQuery}"
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4 bg-muted/30">
        <div className="space-y-2">
          <h5 className="font-medium text-sm">Role Permissions</h5>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <Crown className="w-3 h-3 text-yellow-500" />
              <span><strong>Host:</strong> Full management access, can transfer ownership</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3 text-blue-500" />
              <span><strong>Co-admin:</strong> Can manage members and settings</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-3 h-3 text-muted-foreground" />
              <span><strong>Member:</strong> Can participate and chat</span>
            </div>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={showRemoveConfirm}
        onOpenChange={setShowRemoveConfirm}
        title="Remove member?"
        description={`Are you sure you want to remove ${selectedUser?.display_name} from this floq? They won't be able to access the chat or activities.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        isLoading={removingUserId === selectedUser?.user_id}
        onConfirm={() => selectedUser && handleRemoveMember(selectedUser.user_id)}
      />
    </div>
  );
};