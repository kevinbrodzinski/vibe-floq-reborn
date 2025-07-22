import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus, Users, Send, X, Mail, Phone, Search } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { usePlanInvites, GuestData } from '@/hooks/usePlanInvites';
import { usePlanUserSearch } from '@/hooks/usePlanUserSearch';

type Guest = GuestData & { id: string };

interface Props {
  open: boolean;
  onClose: () => void;
  planId: string;
  planTitle: string;
}

export const InvitePeopleModal: React.FC<Props> = ({
  open, onClose, planId, planTitle,
}) => {
  const { toast } = useToast();
  const {
    addGuest, addMember, sendInvites,
  } = usePlanInvites();
  const [tab, setTab] = useState<'members' | 'guests'>('members');

  // Guest form state
  const [guests, setGuests] = useState<Guest[]>([]);
  const [currentGuest, setCurrentGuest] = useState({
    name: '', email: '', phone: '', notes: '',
  });
  const inviteMessageDefault = `Hi! You're invited to join our plan "${planTitle}".`;
  const [inviteMessage, setInviteMessage] = useState(inviteMessageDefault);

  // Member search state
  const [query, setQuery] = useState('');
  const { data: users, isLoading } = usePlanUserSearch(planId, query);

  const canAddGuest = currentGuest.name.trim()
    && (currentGuest.email.trim() || currentGuest.phone.trim());

  const handleAddGuest = () => {
    if (!canAddGuest) return;
    const g: Guest = {
      id: Date.now().toString(),
      name: currentGuest.name.trim(),
      email: currentGuest.email.trim() || undefined,
      phone: currentGuest.phone.trim() || undefined,
      notes: currentGuest.notes.trim() || undefined,
    };
    addGuest.mutate({ planId, guest: g });
    setGuests((prev) => [...prev, g]);
    setCurrentGuest({ name: '', email: '', phone: '', notes: '' });
  };

  const handleInviteMember = (userId: string) => {
    addMember.mutate({ planId, userId });
  };

  const handleRemoveGuest = (id: string) =>
    setGuests((prev) => prev.filter((g) => g.id !== id));

  const handleSend = () => {
    sendInvites.mutate({ planId, customMessage: inviteMessage });
    setGuests([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite People
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'members' | 'guests')} className="space-y-6">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="members">App users</TabsTrigger>
            <TabsTrigger value="guests">External guests</TabsTrigger>
          </TabsList>

          {/* Members TAB */}
          <TabsContent value="members" className="space-y-4">
            <div>
              <Label htmlFor="user-search" className="sr-only">
                Search users
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="user-search"
                  placeholder="Search by name…"
                  className="pl-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            {isLoading && <Skeleton className="h-10" />}
            {users?.length === 0 && query.length >= 2 && (
              <p className="text-muted-foreground text-sm">
                No matching users.
              </p>
            )}

            {users?.map((u) => (
              <Card
                key={u.id}
                className="p-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Avatar className="w-8 h-8">
                    {u.avatar_url && (
                      <AvatarImage src={u.avatar_url} alt="" />
                    )}
                    <AvatarFallback className="text-xs">
                      {(u.display_name || u.username || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="truncate">
                    <p className="text-sm font-medium truncate">
                      {u.display_name || u.username}
                    </p>
                    {u.username && (
                      <p className="text-xs text-muted-foreground truncate">
                        @{u.username}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  disabled={addMember.isPending}
                  aria-label={`Invite ${u.display_name || u.username}`}
                  onClick={() => handleInviteMember(u.id)}
                >
                  Invite
                </Button>
              </Card>
            ))}
          </TabsContent>

          {/* Guests TAB */}
          <TabsContent value="guests" className="space-y-6">
            <Card className="p-4 space-y-4">
              <h3 className="font-medium text-sm">Add Guest</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="g-name">Name *</Label>
                  <Input
                    id="g-name"
                    value={currentGuest.name}
                    onChange={(e) =>
                      setCurrentGuest({ ...currentGuest, name: e.target.value })}
                    placeholder="Guest name"
                  />
                </div>
                <div>
                  <Label htmlFor="g-email">Email</Label>
                  <Input
                    id="g-email"
                    type="email"
                    value={currentGuest.email}
                    onChange={(e) =>
                      setCurrentGuest({ ...currentGuest, email: e.target.value })}
                    placeholder="guest@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="g-phone">Phone</Label>
                  <Input
                    id="g-phone"
                    type="tel"
                    value={currentGuest.phone}
                    onChange={(e) =>
                      setCurrentGuest({ ...currentGuest, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="g-notes">Notes</Label>
                  <Input
                    id="g-notes"
                    value={currentGuest.notes}
                    onChange={(e) =>
                      setCurrentGuest({ ...currentGuest, notes: e.target.value })}
                    placeholder="Any special notes…"
                  />
                </div>
              </div>

              <Button
                onClick={handleAddGuest}
                disabled={!canAddGuest || addGuest.isPending}
                className="w-full"
              >
                {addGuest.isPending ? 'Adding…' : 'Add Guest'}
              </Button>
            </Card>

            {/* list of newly-added guests (local only) */}
            {guests.length > 0 && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4" />
                  Guests to invite ({guests.length})
                </h3>
                {guests.map((g) => (
                  <Card key={g.id} className="p-3 flex items-start justify-between">
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{g.name}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {g.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {g.email}
                          </span>
                        )}
                        {g.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {g.phone}
                          </span>
                        )}
                      </div>
                      {g.notes && (
                        <p className="italic text-xs text-muted-foreground">
                          {g.notes}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveGuest(g.id)}
                      aria-label="Remove guest"
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            {guests.length > 0 && (
              <div className="space-y-3">
                <Label htmlFor="invite-msg">Invitation message</Label>
                <Textarea
                  id="invite-msg"
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ACTIONS */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          {guests.length > 0 && (
            <Button
              onClick={handleSend}
              disabled={sendInvites.isPending}
              className="flex-1"
            >
              {sendInvites.isPending ? 'Sending…' : (
                <span className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Send Invites ({guests.length})
                </span>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};