
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getAvatarUrl, getInitials } from '@/lib/avatar';
import { useFloqMembers } from '@/hooks/useFloqMembers';
import { useFloqMemberVibes } from '@/hooks/useFloqMemberVibes';
import { vibeEmoji } from '@/utils/vibe';
import { vibeToBorder } from '@/utils/vibeColors';
import { Crown, Shield } from 'lucide-react';

interface FloqMemberListProps {
  floqId: string;
}

export const FloqMemberList: React.FC<FloqMemberListProps> = ({ floqId }) => {
  const navigate = useNavigate();
  const { data: members = [], isLoading: membersLoading } = useFloqMembers(floqId);
  const { data: vibes = [], isLoading: vibesLoading } = useFloqMemberVibes(floqId);

  const handleMemberClick = (username: string) => {
    if (username) {
      navigate(`/u/${username}`);
    }
  };

  const getMemberVibe = (userId: string) => {
    return vibes.find(v => v.user_id === userId);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'creator':
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case 'co-admin':
        return <Shield className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'creator':
        return <Badge variant="secondary" className="text-xs">Host</Badge>;
      case 'co-admin':
        return <Badge variant="outline" className="text-xs">Co-admin</Badge>;
      default:
        return null;
    }
  };

  if (membersLoading || vibesLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-24" />
                <div className="h-3 bg-muted animate-pulse rounded w-16" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No members yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {members.map((member) => {
        const memberVibe = getMemberVibe(member.user_id);
        const vibeRingClass = memberVibe?.vibe_tag ? vibeToBorder(memberVibe.vibe_tag as any) : 'border-border';
        
        return (
          <Card 
            key={member.user_id}
            className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => handleMemberClick(member.profile.username)}
          >
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className={`w-10 h-10 ring-2 ${vibeRingClass}`}>
                    <AvatarImage src={getAvatarUrl(member.profile.avatar_url, 40)} />
                    <AvatarFallback>
                      {getInitials(member.profile.display_name || member.profile.username)}
                    </AvatarFallback>
                  </Avatar>
                  {memberVibe && (
                    <div className="absolute -bottom-1 -right-1 text-xs bg-background rounded-full p-0.5">
                      {vibeEmoji(memberVibe.vibe_tag)}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {member.profile.display_name || member.profile.username}
                    </span>
                    {getRoleIcon(member.role)}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    {getRoleBadge(member.role)}
                    {memberVibe && (
                      <span className="text-xs text-muted-foreground capitalize">
                        {memberVibe.vibe_tag}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
