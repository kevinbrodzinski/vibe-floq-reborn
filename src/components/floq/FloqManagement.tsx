import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Crown, Settings, UserPlus, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

type FloqRole = 'creator' | 'co_admin' | 'member';

interface FloqMember {
  profile_id: string;
  role: FloqRole;
  joined_at: string;
  profile: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

interface Floq {
  id: string;
  title: string;
  description?: string;
  member_count: number;
  created_by: string;
  created_at: string;
  members?: FloqMember[];
}

interface FloqManagementProps {
  floqId: string;
}

export const FloqManagement: React.FC<FloqManagementProps> = ({ floqId }) => {
  const currentUserId = useCurrentUserId();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Fetch floq details - placeholder implementation
  const { data: floq, isLoading } = useQuery({
    queryKey: ['floq-management', floqId],
    queryFn: async (): Promise<Floq> => {
      // Return mock data for now
      return {
        id: floqId,
        title: 'Sample Floq',
        description: 'A sample floq for testing',
        member_count: 5,
        created_by: currentUserId || '',
        created_at: new Date().toISOString(),
        members: []
      } as Floq;
    },
  });

  // Update member role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ profileId, newRole }: { profileId: string; newRole: FloqRole }) => {
      const { error } = await supabase
        .from('floq_participants')
        .update({ role: newRole })
        .eq('floq_id', floqId)
        .eq('profile_id', profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floq-management', floqId] });
      toast.success('Member role updated');
    },
    onError: () => {
      toast.error('Failed to update member role');
    }
  });

  // Remove member
  const removeMemberMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase
        .from('floq_participants')
        .delete()
        .eq('floq_id', floqId)
        .eq('profile_id', profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floq-management', floqId] });
      toast.success('Member removed');
    },
    onError: () => {
      toast.error('Failed to remove member');
    }
  });

  // Invite member
  const inviteMemberMutation = useMutation({
    mutationFn: async (email: string) => {
      // Placeholder - direct insert not available
      toast.success('Invitation would be sent');
    },
    onSuccess: () => {
      setInviteEmail('');
      setIsInviteOpen(false);
      toast.success('Invitation sent');
    },
    onError: () => {
      toast.error('Failed to send invitation');
    }
  });

  if (isLoading) {
    return <div className="p-4">Loading floq details...</div>;
  }

  if (!floq) {
    return <div className="p-4">Floq not found</div>;
  }

  const currentUserMember = floq.members?.find(m => m.profile_id === currentUserId);
  const canManage = currentUserMember?.role === 'creator' || currentUserMember?.role === 'co_admin';

  const getRoleIcon = (role: FloqRole) => {
    switch (role) {
      case 'creator': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'co_admin': return <Settings className="w-4 h-4 text-blue-500" />;
      default: return <Users className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleBadge = (role: FloqRole) => {
    const variants = {
      creator: 'default',
      co_admin: 'secondary',
      member: 'outline'
    } as const;

    return (
      <Badge variant={variants[role]} className="gap-1">
        {getRoleIcon(role)}
        {role.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{floq.title}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{floq.member_count} members</Badge>
              {canManage && (
                <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="member@example.com"
                        />
                      </div>
                      <Button 
                        onClick={() => inviteMemberMutation.mutate(inviteEmail)}
                        disabled={!inviteEmail || inviteMemberMutation.isPending}
                        className="w-full"
                      >
                        Send Invitation
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {floq.members?.map((member) => (
              <div key={member.profile_id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={member.profile?.avatar_url || ''} />
                    <AvatarFallback>
                      {member.profile?.display_name?.[0] || member.profile?.username?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {member.profile?.display_name || member.profile?.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getRoleBadge(member.role)}
                  
                  {canManage && member.profile_id !== currentUserId && member.role !== 'creator' && (
                    <div className="flex gap-1">
                      <Select
                        value={member.role}
                        onValueChange={(newRole: FloqRole) => 
                          updateRoleMutation.mutate({ profileId: member.profile_id, newRole })
                        }
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="co_admin">Co-Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeMemberMutation.mutate(member.profile_id)}
                        disabled={removeMemberMutation.isPending}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                  
                  <Button size="sm" variant="ghost">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};