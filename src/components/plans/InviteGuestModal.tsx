import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Mail, Phone, X, Send, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';

interface Guest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
}

interface InviteGuestModalProps {
  open: boolean;
  onClose: () => void;
  planId: string;
  planTitle: string;
}

export function InviteGuestModal({ open, onClose, planId, planTitle }: InviteGuestModalProps) {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [guests, setGuests] = useState<Guest[]>([]);
  const [currentGuest, setCurrentGuest] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [inviteMessage, setInviteMessage] = useState(
    `Hi! You're invited to join our plan "${planTitle}". Looking forward to seeing you there!`
  );

  const addGuestMutation = useMutation({
    mutationFn: async (guest: Omit<Guest, 'id'>) => {
      if (!session?.user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('plan_participants')
        .insert({
          plan_id: planId,
          user_id: null, // Guest has no user account
          is_guest: true,
          guest_name: guest.name,
          guest_email: guest.email || null,
          guest_phone: guest.phone || null,
          notes: guest.notes || null,
          role: 'participant',
          rsvp_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-participants', planId] });
      toast({
        title: "Guest added",
        description: "Guest has been added to the plan",
      });
      
      // Reset form
      setCurrentGuest({ name: '', email: '', phone: '', notes: '' });
    },
    onError: (error) => {
      toast({
        title: "Failed to add guest",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendInvitesMutation = useMutation({
    mutationFn: async () => {
      // In a real implementation, you'd call an edge function to send emails/SMS
      // For now, just simulate the process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { sent: guests.length };
    },
    onSuccess: (data) => {
      toast({
        title: "Invites sent!",
        description: `Successfully sent ${data.sent} invitation${data.sent !== 1 ? 's' : ''}`,
      });
      setGuests([]);
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Failed to send invites",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddGuest = () => {
    if (!currentGuest.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the guest",
        variant: "destructive",
      });
      return;
    }

    if (!currentGuest.email.trim() && !currentGuest.phone.trim()) {
      toast({
        title: "Contact info required",
        description: "Please provide either an email or phone number",
        variant: "destructive",
      });
      return;
    }

    const guest: Guest = {
      id: Date.now().toString(),
      name: currentGuest.name.trim(),
      email: currentGuest.email.trim() || undefined,
      phone: currentGuest.phone.trim() || undefined,
      notes: currentGuest.notes.trim() || undefined
    };

    addGuestMutation.mutate(guest);
    setGuests(prev => [...prev, guest]);
  };

  const handleRemoveGuest = (guestId: string) => {
    setGuests(prev => prev.filter(g => g.id !== guestId));
  };

  const handleSendInvites = () => {
    if (guests.length === 0) {
      toast({
        title: "No guests to invite",
        description: "Add some guests first",
        variant: "destructive",
      });
      return;
    }

    sendInvitesMutation.mutate();
  };

  const canAddGuest = currentGuest.name.trim() && (currentGuest.email.trim() || currentGuest.phone.trim());

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite Guests
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Guest Form */}
          <Card className="p-4 space-y-4">
            <h3 className="font-medium text-sm">Add Guest</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="guest-name">Name *</Label>
                <Input
                  id="guest-name"
                  value={currentGuest.name}
                  onChange={(e) => setCurrentGuest(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Guest's name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="guest-email">Email</Label>
                <Input
                  id="guest-email"
                  type="email"
                  value={currentGuest.email}
                  onChange={(e) => setCurrentGuest(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="guest@example.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="guest-phone">Phone</Label>
                <Input
                  id="guest-phone"
                  type="tel"
                  value={currentGuest.phone}
                  onChange={(e) => setCurrentGuest(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="guest-notes">Notes</Label>
                <Input
                  id="guest-notes"
                  value={currentGuest.notes}
                  onChange={(e) => setCurrentGuest(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special notes..."
                  className="mt-1"
                />
              </div>
            </div>

            <Button
              onClick={handleAddGuest}
              disabled={!canAddGuest || addGuestMutation.isPending}
              className="w-full"
            >
              {addGuestMutation.isPending ? 'Adding...' : 'Add Guest'}
            </Button>
          </Card>

          {/* Guest List */}
          {guests.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Guests to Invite ({guests.length})
                </h3>
              </div>

              <div className="space-y-2">
                {guests.map((guest) => (
                  <Card key={guest.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{guest.name}</div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {guest.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {guest.email}
                            </div>
                          )}
                          {guest.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {guest.phone}
                            </div>
                          )}
                        </div>
                        {guest.notes && (
                          <div className="text-xs text-muted-foreground italic">
                            {guest.notes}
                          </div>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveGuest(guest.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Invite Message */}
          {guests.length > 0 && (
            <div className="space-y-3">
              <Label htmlFor="invite-message">Invitation Message</Label>
              <Textarea
                id="invite-message"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Customize your invitation message..."
                className="min-h-[80px]"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            {guests.length > 0 && (
              <Button
                onClick={handleSendInvites}
                disabled={sendInvitesMutation.isPending}
                className="flex-1"
              >
                {sendInvitesMutation.isPending ? (
                  'Sending...'
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Send Invites ({guests.length})
                  </div>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}