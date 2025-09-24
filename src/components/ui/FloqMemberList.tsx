import React from 'react';
import { motion } from 'framer-motion';
import { Users, Crown, Activity, MessageSquare, MapPin, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface FloqMember {
  id: string;
  name: string;
  avatar?: string;
  role: 'host' | 'member' | 'moderator';
  status: 'online' | 'offline' | 'away' | 'busy';
  lastActivity: string;
  currentVibe?: string;
  location?: string;
  messageCount: number;
  isTyping?: boolean;
}

interface FloqMemberListProps {
  members: FloqMember[];
  currentUserId: string;
  onMessageMember?: (memberId: string) => void;
  onViewProfile?: (memberId: string) => void;
  onManageRole?: (memberId: string, role: string) => void;
  className?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online': return 'bg-green-500';
    case 'away': return 'bg-yellow-500';
    case 'busy': return 'bg-red-500';
    case 'offline': return 'bg-gray-500';
    default: return 'bg-gray-500';
  }
};

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'host': return <Crown className="w-3 h-3 text-yellow-500" />;
    case 'moderator': return <Activity className="w-3 h-3 text-blue-500" />;
    default: return null;
  }
};

export const FloqMemberList: React.FC<FloqMemberListProps> = ({
  members,
  currentUserId,
  onMessageMember,
  onViewProfile,
  onManageRole,
  className = ''
}) => {
  const onlineMembers = members.filter(m => m.status === 'online');
  const activeMembers = members.filter(m => m.status !== 'offline');

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Stats */}
      <div className="flex items-center justify-between p-4 bg-card/40 rounded-xl">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-semibold">{members.length} members</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{onlineMembers.length} online</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="w-4 h-4" />
            <span>{activeMembers.length} active</span>
          </div>
        </div>
      </div>

      {/* Member List */}
      <div className="space-y-2">
        {members.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
              "hover:bg-card/60 cursor-pointer",
              member.isTyping && "bg-blue-500/10 border border-blue-500/20"
            )}
            onClick={() => onViewProfile?.(member.id)}
          >
            {/* Avatar with Status */}
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarImage src={member.avatar} />
                <AvatarFallback className="text-sm">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
                getStatusColor(member.status)
              )} />
            </div>

            {/* Member Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm truncate">{member.name}</span>
                {getRoleIcon(member.role)}
                {member.isTyping && (
                  <Badge variant="secondary" className="text-xs">
                    typing...
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>{member.messageCount} messages</span>
                </div>
                
                {member.currentVibe && (
                  <div className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    <span className="capitalize">{member.currentVibe}</span>
                  </div>
                )}
                
                {member.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{member.location}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(member.lastActivity), { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              {member.id !== currentUserId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMessageMember?.(member.id);
                  }}
                  className="w-8 h-8 p-0"
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {members.length === 0 && (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No members yet</h3>
          <p className="text-muted-foreground text-sm">
            Invite friends to join your Floq and start the conversation!
          </p>
        </div>
      )}
    </div>
  );
}; 