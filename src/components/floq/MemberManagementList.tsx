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

interface MemberManagementListProps {
  floqDetails: FloqDetails;
}

export const MemberManagementList: React.FC<MemberManagementListProps> = ({ floqDetails }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<FloqParticipant | null>(null);
  const queryClient = useQueryClient();

  const filteredParticipants = floqDetails.participants.filter(participant =>
    participant.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    participant.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('floq_participants')
        .update({ role: newRole })
        .eq('floq_id', floqDetails.id)
        .eq('user_id', userId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['floq-details', floqDetails.id] });
      toast.success('Role updated successfully');
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update role');
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
                  className="pl-9 w-48"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            {filteredParticipants.map((participant) => (
              <div key={participant.user_id} className="flex items-center justify-between p-3 rounded-lg border">
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

                <div className="flex items-center gap-2">
                  {participant.role !== 'creator' && (
                    <>
                      <Select
                        value={participant.role}
                        onValueChange={(newRole) => handleRoleChange(participant.user_id, newRole)}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="co-admin">Co-admin</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmRemove(participant)}
                        disabled={removingUserId === participant.user_id}
                        className="text-destructive hover:text-destructive"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredParticipants.length === 0 && searchQuery && (
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