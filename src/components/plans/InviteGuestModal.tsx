import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { UserPlus, Mail, Phone, X, Send, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGuestInvites, GuestData } from '@/hooks/useGuestInvites';

interface Guest extends GuestData {
  id: string;
}

interface InviteGuestModalProps {
  open: boolean;
  onClose: () => void;
  planId: string;
  planTitle: string;
}

export function InviteGuestModal({ open, onClose, planId, planTitle }: InviteGuestModalProps) {
  const { toast } = useToast();
  const { addGuest, sendInvites } = useGuestInvites();
  
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

    addGuest.mutate({ planId, guest });
    setGuests(prev => [...prev, guest]);
    setCurrentGuest({ name: '', email: '', phone: '', notes: '' });
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

    sendInvites.mutate({ planId, customMessage: inviteMessage });
    setGuests([]);
    onClose();
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
              disabled={!canAddGuest || addGuest.isPending}
              className="w-full"
            >
              {addGuest.isPending ? 'Adding...' : 'Add Guest'}
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
                disabled={sendInvites.isPending}
                className="flex-1"
              >
                {sendInvites.isPending ? (
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