
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserPlus, MoreHorizontal, Shield, Check, HelpCircle, X, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InviteGuestModal } from './InviteGuestModal';

interface Participant {
  id: string;
  user_id: string | null;
  role: string;
  is_guest: boolean | null;
  guest_name: string | null;
  rsvp_status?: string | null;
  profiles?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface PlanParticipantsListProps {
  participants: Participant[];
  isCreator: boolean;
  isLoading?: boolean;
  planId?: string;
  planTitle?: string;
}

export function PlanParticipantsList({ 
  participants, 
  isCreator, 
  isLoading,
  planId,
  planTitle
}: PlanParticipantsListProps) {
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-2 bg-muted rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const getStatusBadge = (participant: Participant) => {
    if (participant.role === 'organizer') {
      return (
        <Badge variant="outline" className="text-xs">
          <Shield className="w-3 h-3 mr-1" />
          Host
        </Badge>
      );
    }
    
    const status = participant.rsvp_status || 'confirmed';
    switch (status) {
      case 'confirmed':
        return (
          <Badge variant="default" className="text-xs bg-green-500">
            <Check className="w-3 h-3 mr-1" />
            Going
          </Badge>
        );
      case 'maybe':
        return (
          <Badge variant="secondary" className="text-xs">
            <HelpCircle className="w-3 h-3 mr-1" />
            Maybe
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="destructive" className="text-xs">
            <X className="w-3 h-3 mr-1" />
            Can't go
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getDisplayName = (participant: Participant) => {
    if (participant.is_guest) {
      return participant.guest_name || 'Guest';
    }
    return participant.profiles?.display_name || 
           participant.profiles?.username || 
           'Unknown User';
  };

  const getAvatarFallback = (participant: Participant) => {
    const name = getDisplayName(participant);
    return name.charAt(0).toUpperCase();
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium flex items-center gap-2">
          <Users className="w-4 h-4" />
          Going ({participants.length})
        </h3>
         {isCreator && (
           <Button
             variant="ghost"
             size="sm"
             onClick={() => setInviteModalOpen(true)}
             className="text-primary"
           >
             <UserPlus className="w-4 h-4 mr-1" />
             Invite
           </Button>
         )}
      </div>

      <div className="space-y-3">
        {participants.map((participant) => (
          <div key={participant.id} className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              {participant.profiles?.avatar_url ? (
                <AvatarImage 
                  src={participant.profiles.avatar_url} 
                  alt={getDisplayName(participant)} 
                />
              ) : null}
              <AvatarFallback className="text-xs">
                {getAvatarFallback(participant)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">
                  {getDisplayName(participant)}
                </p>
                {getStatusBadge(participant)}
              </div>
              {participant.profiles?.username && (
                <p className="text-xs text-muted-foreground">
                  @{participant.profiles.username}
                </p>
              )}
            </div>

            {isCreator && participant.role !== 'organizer' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    Make Co-host
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>

      {participants.length === 0 && (
        <div className="text-center py-6">
          <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No participants yet</p>
          {isCreator && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInviteModalOpen(true)}
              className="mt-2"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Invite Friends
            </Button>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {inviteModalOpen && planId && planTitle && (
        <InviteGuestModal
          open={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          planId={planId}
          planTitle={planTitle}
        />
      )}
    </Card>
  );
}
