import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, User, Check, X, Mail } from 'lucide-react';
import { usePendingInvitations, PendingInvitation } from '@/hooks/usePendingInvitations';
import { useRespondToInvitation } from '@/hooks/useRespondToInvitation';
import { formatDistanceToNow } from 'date-fns';

interface InvitationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvitationsModal({ open, onOpenChange }: InvitationsModalProps) {
  const { data: invitations = [], isLoading } = usePendingInvitations();
  const { mutate: respond, isPending } = useRespondToInvitation();
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const handleResponse = async (invitationId: string, status: 'accepted' | 'declined') => {
    setRespondingTo(invitationId);
    respond(
      { invitationId, status },
      {
        onSettled: () => setRespondingTo(null),
        onSuccess: () => {
          // Close modal if this was the last invitation
          if (invitations.length === 1) {
            onOpenChange(false);
          }
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Plan Invitations ({invitations.length})
          </DialogTitle>
          <DialogDescription>
            Review and respond to your pending plan invitations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading invitations...
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No pending invitations</p>
              <p className="text-sm">You're all caught up!</p>
            </div>
          ) : (
            invitations.map((invitation) => (
              <InvitationCard
                key={invitation.id}
                invitation={invitation}
                onAccept={() => handleResponse(invitation.id, 'accepted')}
                onDecline={() => handleResponse(invitation.id, 'declined')}
                isResponding={respondingTo === invitation.id}
                disabled={isPending}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface InvitationCardProps {
  invitation: PendingInvitation;
  onAccept: () => void;
  onDecline: () => void;
  isResponding: boolean;
  disabled: boolean;
}

function InvitationCard({ 
  invitation, 
  onAccept, 
  onDecline, 
  isResponding, 
  disabled 
}: InvitationCardProps) {
  const planDate = new Date(invitation.plan_date);
  const invitedAgo = formatDistanceToNow(new Date(invitation.invited_at), { addSuffix: true });

  return (
    <Card className="p-4 animate-fade-in">
      <div className="space-y-3">
        {/* Inviter info */}
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={invitation.inviter_avatar || undefined} />
            <AvatarFallback className="text-xs">
              {invitation.inviter_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm">
              <span className="font-medium">{invitation.inviter_name}</span> invited you
            </p>
            <p className="text-xs text-muted-foreground">
              {invitedAgo}
            </p>
          </div>
        </div>

        {/* Plan details */}
        <div className="space-y-2 pl-11">
          <h3 className="font-medium text-sm">{invitation.plan_title}</h3>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {planDate.toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {planDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pl-11">
          <Button
            size="sm"
            onClick={onAccept}
            disabled={disabled}
            className="flex-1"
          >
            {isResponding ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-3 h-3 mr-1" />
                Accept
              </>
            )}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={onDecline}
            disabled={disabled}
            className="flex-1"
          >
            <X className="w-3 h-3 mr-1" />
            Decline
          </Button>
        </div>
      </div>
    </Card>
  );
}