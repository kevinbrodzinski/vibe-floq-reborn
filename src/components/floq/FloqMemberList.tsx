
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFloqMembers } from '@/hooks/useFloqMembers';

export function FloqMemberList({ floqId }: { floqId: string }) {
  const { data: members = [], isLoading, error } = useFloqMembers(floqId);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  // Simplified member status - stable and deterministic
  const getMemberStatus = (member: any) => {
    const memberId = member.profile_id || member.id || 'default';
    
    // Simple hash for consistent values
    const hash = memberId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const statuses = ['online', 'away', 'busy', 'offline'];
    const locations = [
      { name: 'Work Office', type: 'work' as const },
      { name: 'Home', type: 'home' as const },
      { name: 'Blue Bottle Coffee', type: 'venue' as const }
    ];

    return {
      status: statuses[Math.abs(hash) % statuses.length],
      location: locations[Math.abs(hash >> 8) % locations.length],
      distance: Math.abs(hash) % 5000,
      device: (hash & 0x1) === 1 ? 'mobile' : 'desktop',
      battery: Math.abs(hash) % 100,
      lastActive: new Date(Date.now() - (Math.abs(hash) % 3600000))
    };
  };

  const formatDistance = (distance: number) => {
    if (distance < 1000) return `${distance}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const formatLastActive = (date: Date) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load members</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No members found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Members ({members.length})</h3>
      </div>
      
      <div className="space-y-3">
        {members.map((member) => {
          const memberStatus = getMemberStatus(member);
          const isSelected = selectedMember === member.profile_id;
          
          return (
            <motion.div
              key={member.profile_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card 
                className={`cursor-pointer transition-all duration-200 hover:bg-accent/5 ${
                  isSelected ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedMember(isSelected ? null : member.profile_id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profiles?.avatar_url} />
                      <AvatarFallback>
                        {member.profiles?.display_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium truncate">
                          {member.profiles?.display_name || member.profiles?.username || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {memberStatus.status === 'online' ? '🟢 Online' : 
                           memberStatus.status === 'away' ? '🟡 Away' :
                           memberStatus.status === 'busy' ? '🔴 Busy' : '⚫ Offline'}
                        </span>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mt-1">
                        <div className="flex items-center space-x-2">
                          <span>{memberStatus.location.name}</span>
                          <span>•</span>
                          <span>{formatDistance(memberStatus.distance)} away</span>
                          <span>•</span>
                          <span>{memberStatus.device}</span>
                          <span>•</span>
                          <span>{memberStatus.battery}%</span>
                        </div>
                        <div className="text-xs mt-1">
                          {formatLastActive(memberStatus.lastActive)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t"
                    >
                      <div className="space-y-3">
                        <div>
                          <h5 className="text-xs font-medium mb-2">What they're up to</h5>
                          <div className="text-sm text-muted-foreground">
                            {memberStatus.status === 'online' ? 'Active and available' :
                             memberStatus.status === 'away' ? 'Away from device' :
                             memberStatus.status === 'busy' ? 'Busy or in a meeting' : 'Not available'}
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="text-xs font-medium mb-2">Location</h5>
                          <div className="text-sm text-muted-foreground">
                            {memberStatus.location.name} ({formatDistance(memberStatus.distance)} away)
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
