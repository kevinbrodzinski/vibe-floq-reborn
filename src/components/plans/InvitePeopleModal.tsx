// components/plans/InvitePeopleModal.tsx
import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  UserPlus, Users, X, Send, Search, Mail, Phone,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import { usePlanInvites, GuestData } from '@/hooks/usePlanInvites';
import { usePlanUserSearch } from '@/hooks/usePlanUserSearch';   // <— NEW isolated search hook
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Guest extends GuestData { id: string }

interface Props {
  open: boolean;
  onClose: () => void;
  planId: string;
  planTitle: string;
}

export const InvitePeopleModal: React.FC<Props> = ({
  open, onClose, planId, planTitle,
}) => {
  /* toast & hooks ------------------------------------------------------- */
  const { toast } = useToast();
  const {
    addGuest, addMember, sendInvites,
  } = usePlanInvites();

  /* UI state ------------------------------------------------------------ */
  const [tab, setTab] = useState<'members' | 'guests'>('members');

  /* —— Guests ---------------------------------------------------------- */
  const [guests, setGuests] = useState<Guest[]>([]);
  const [currentGuest, setCurrentGuest] = useState({ name: '', email: '', phone: '', notes: '' });

  const canAddGuest = currentGuest.name.trim()
    && (currentGuest.email.trim() || currentGuest.phone.trim());

  const addGuestLocal = () => {
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

  const removeGuest = (guestId: string) => {
    setGuests((prev) => prev.filter(g => g.id !== guestId));
  };

  /* —— Member search --------------------------------------------------- */
  const [rawQuery, setRawQuery] = useState('');
  const query = useDebounce(rawQuery, 300);
  const { data: users, isLoading, isError } = usePlanUserSearch(planId, query);

  /* Invitation message -------------------------------------------------- */
  const [inviteMessage, setInviteMessage] = useState(
    `Hi! You’re invited to join our plan “${planTitle}”.`,
  );

  /* Actions ------------------------------------------------------------- */
  const sendAllInvites = () => {
    sendInvites.mutate({ planId, customMessage: inviteMessage }, {
      onSuccess: () => setGuests([]),
    });
    onClose();
  };

  /* render helpers ------------------------------------------------------ */
  const placeholder = useMemo(() => (
    query.length < 2
      ? 'Type at least 2 characters'
      : 'No matching users'
  ), [query]);

  /* -------------------------------------------------------------------- */
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Invite people
          </DialogTitle>
        </DialogHeader>

        {/* ---------------------- Tabs ---------------------------------- */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'members' | 'guests')}>
          <TabsList className="mb-6">
            <TabsTrigger value="members">App users</TabsTrigger>
            <TabsTrigger value="guests">External guests</TabsTrigger>
          </TabsList>

          {/* ---------- App-user tab ------------------------------------ */}
          <div hidden={tab !== 'members'}>
            <Label htmlFor="user-search">Search users</Label>
            <div className="relative mt-1">
              <Input
                id="user-search"
                value={rawQuery}
                placeholder="Kevin … or @username"
                onChange={(e) => setRawQuery(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>

            {isLoading && <p className="mt-4 text-sm text-muted-foreground">Searching…</p>}
            {isError && <p className="mt-4 text-sm text-destructive">Search failed. Try again.</p>}

            {users?.length === 0 && !isLoading && (
              <p className="mt-4 text-sm text-muted-foreground">{placeholder}</p>
            )}

            {users?.map((u) => (
              <Card key={u.id} className="mt-3 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {u.avatar_url ? (
                      <AvatarImage src={u.avatar_url} alt="" />
                    ) : null}
                    <AvatarFallback>
                      {(u.display_name ?? u.username ?? 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {u.display_name || u.username}
                    </p>
                    {u.username && (
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  disabled={addMember.isPending}
                  onClick={() => addMember.mutate({ planId, userId: u.id })}
                >
                  Invite
                </Button>
              </Card>
            ))}
          </div>

          {/* ---------- Guest tab --------------------------------------- */}
          <div hidden={tab !== 'guests'}>
            <Card className="p-4">
              <h3 className="font-medium text-sm mb-3">Add guest</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/** Name */}
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={currentGuest.name}
                    onChange={(e) => setCurrentGuest({ ...currentGuest, name: e.target.value })}
                    placeholder="Guest name"
                    className="mt-1"
                  />
                </div>
                {/** Email */}
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={currentGuest.email}
                    onChange={(e) => setCurrentGuest({ ...currentGuest, email: e.target.value })}
                    placeholder="guest@example.com"
                    className="mt-1"
                  />
                </div>
                {/** Phone */}
                <div>
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    value={currentGuest.phone}
                    onChange={(e) => setCurrentGuest({ ...currentGuest, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="mt-1"
                  />
                </div>
                {/** Notes */}
                <div>
                  <Label>Notes</Label>
                  <Input
                    value={currentGuest.notes}
                    onChange={(e) => setCurrentGuest({ ...currentGuest, notes: e.target.value })}
                    placeholder="Any notes…"
                    className="mt-1"
                  />
                </div>
              </div>

              <Button
                onClick={addGuestLocal}
                disabled={!canAddGuest || addGuest.isPending}
                className="mt-4 w-full"
              >
                {addGuest.isPending ? 'Adding…' : 'Add guest'}
              </Button>
            </Card>

            {/* Local list ------------------------------------------------ */}
            {guests.length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" /> Guests to invite ({guests.length})
                </h3>

                {guests.map((g) => (
                  <Card key={g.id} className="p-3 flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{g.name}</p>
                      <div className="text-xs text-muted-foreground space-x-2">
                        {g.email && (<span><Mail className="inline h-3 w-3 mr-0.5" />{g.email}</span>)}
                        {g.phone && (<span><Phone className="inline h-3 w-3 mr-0.5" />{g.phone}</span>)}
                      </div>
                      {g.notes && <p className="text-xs italic mt-0.5">{g.notes}</p>}
                    </div>
                    <Button
                      onClick={() => removeGuest(g.id)}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </Card>
                ))}

                <div>
                  <Label>Invitation message</Label>
                  <Textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    className="mt-1 min-h-[80px]"
                  />
                </div>
              </div>
            )}
          </div>
        </Tabs>

        {/* ------------ Footer buttons ---------------------------------- */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>

          {!!guests.length && (
            <Button
              className="flex-1"
              disabled={sendInvites.isPending}
              onClick={sendAllInvites}
            >
              {sendInvites.isPending
                ? 'Sending…'
                : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Send invites&nbsp;({guests.length})
                  </>
                )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};