import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Check, Clock, HelpCircle, X, MessageSquare, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/utils';

type RSVPStatus = 'confirmed' | 'maybe' | 'declined' | 'pending';

interface RSVPStatusManagerProps {
  planId: string;
  currentStatus?: RSVPStatus | null;
  isCreator?: boolean;
  showStatusBreakdown?: boolean;
  participantCount?: number;
}

const statusConfig = {
  confirmed: {
    label: 'Going',
    icon: Check,
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    description: 'I\'ll definitely be there'
  },
  maybe: {
    label: 'Maybe',
    icon: HelpCircle,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    description: 'I might be able to make it'
  },
  declined: {
    label: 'Can\'t go',
    icon: X,
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    description: 'I won\'t be able to attend'
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'bg-gray-500',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50',
    description: 'Waiting for response'
  }
};

export function RSVPStatusManager({ 
  planId, 
  currentStatus, 
  isCreator = false,
  showStatusBreakdown = false,
  participantCount = 0
}: RSVPStatusManagerProps) {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const rsvpMutation = useMutation({
    mutationFn: async ({ status, rsvpNote }: { status: RSVPStatus; rsvpNote?: string }) => {
      if (!session?.user?.id) throw new Error('Not authenticated');

      if (status === 'declined') {
        // Remove from participants if declining
        const { error } = await supabase
          .from('plan_participants')
          .delete()
          .eq('plan_id', planId)
          .eq('user_id', session.user.id);
        if (error) throw error;
      } else {
        // Upsert participation with status
        const { error } = await supabase
          .from('plan_participants')
          .upsert({
            plan_id: planId,
            user_id: session.user.id,
            role: 'participant',
            rsvp_status: status,
            notes: rsvpNote || null
          }, {
            onConflict: 'plan_id,user_id'
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['plan-participants', planId] });
      toast({
        title: "RSVP updated",
        description: `You're now marked as "${statusConfig[status].label}"`,
      });
      setShowNoteInput(false);
      setNote('');
    },
    onError: (error) => {
      toast({
        title: "Failed to update RSVP",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (status: RSVPStatus) => {
    if (status === 'declined' || (note.trim() && showNoteInput)) {
      rsvpMutation.mutate({ status, rsvpNote: note.trim() || undefined });
    } else if (status === 'maybe') {
      setShowNoteInput(true);
    } else {
      rsvpMutation.mutate({ status });
    }
  };

  const handleSubmitWithNote = () => {
    const status = currentStatus === 'maybe' ? 'maybe' : 'confirmed';
    rsvpMutation.mutate({ status, rsvpNote: note.trim() || undefined });
  };

  if (isCreator) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>You're the organizer of this plan</span>
        </div>
        {showStatusBreakdown && participantCount > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            {participantCount} participant{participantCount !== 1 ? 's' : ''} so far
          </div>
        )}
      </Card>
    );
  }

  if (!session?.user) {
    return (
      <Card className="p-4 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Sign in to RSVP for this plan
        </p>
        <Button variant="outline" size="sm">
          Sign In
        </Button>
      </Card>
    );
  }

  const currentConfig = currentStatus ? statusConfig[currentStatus] : null;

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Your RSVP</h3>
          {currentConfig && (
            <Badge 
              variant="outline" 
              className={cn("text-xs", currentConfig.textColor)}
            >
              <currentConfig.icon className="w-3 h-3 mr-1" />
              {currentConfig.label}
            </Badge>
          )}
        </div>

        {/* Status Selection */}
        <div className="space-y-2">
          <Select
            value={currentStatus || ''}
            onValueChange={(value) => handleStatusChange(value as RSVPStatus)}
            disabled={rsvpMutation.isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your response..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusConfig).map(([status, config]) => (
                <SelectItem key={status} value={status}>
                  <div className="flex items-center gap-2">
                    <config.icon className="w-4 h-4" />
                    <div>
                      <div className="font-medium">{config.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {config.description}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Note Input */}
        {showNoteInput && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquare className="w-3 h-3" />
              <span>Add a note (optional)</span>
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Let the organizer know anything specific..."
              className="min-h-[60px] text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmitWithNote}
                disabled={rsvpMutation.isPending}
              >
                {rsvpMutation.isPending ? 'Updating...' : 'Update RSVP'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNoteInput(false);
                  setNote('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Status Description */}
        {currentConfig && (
          <div className={cn("p-3 rounded-lg", currentConfig.bgColor)}>
            <div className="flex items-center gap-2">
              <currentConfig.icon className={cn("w-4 h-4", currentConfig.textColor)} />
              <span className={cn("text-sm font-medium", currentConfig.textColor)}>
                {currentConfig.description}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}