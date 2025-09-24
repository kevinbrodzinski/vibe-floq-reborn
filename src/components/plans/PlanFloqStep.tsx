import React, { useState, startTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, X } from 'lucide-react';
import { useMyActiveFloqs } from '@/hooks/useMyActiveFloqs';
import { FloqCardMini } from './FloqCardMini';
import { FriendPicker } from '@/components/new-plan/FriendPicker';
import { useUnifiedFriends } from '@/hooks/useUnifiedFriends';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

type Selection =
  | { type: 'existing'; floqId: string; name: string; autoDisband: boolean }
  | { type: 'new'; name: string; autoDisband: boolean };

interface Props {
  value: Selection[];
  onChange: (v: Selection[]) => void;
  onNext: () => void;
  combinedName: string;
  onCombinedNameChange: (name: string) => void;
  invitedIds: string[];
  onInvitedChange: (ids: string[]) => void;
}

export function PlanFloqStep({ value, onChange, onNext, combinedName, onCombinedNameChange, invitedIds, onInvitedChange }: Props) {
  const { data: myFloqs = [], isLoading } = useMyActiveFloqs();
  const { rows } = useUnifiedFriends();
  const [newName, setNewName] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const toggleExisting = (floq: any) => {
    const exists = value.find((v) => v.type === 'existing' && v.floqId === floq.id);
    const displayName = floq.title || floq.name || 'Untitled Floq';
    
    startTransition(() => {
      onChange(
        exists
          ? value.filter((v) => !(v.type === 'existing' && v.floqId === floq.id))
          : [...value, { type: 'existing', floqId: floq.id, name: displayName, autoDisband: false }]
      );
    });
  };

  const addNew = () => {
    if (!newName.trim()) return;
    
    // Check for duplicate names
    const nameLC = newName.trim().toLowerCase();
    const nameExists = myFloqs.some(f => (f.title || f.name)?.toLowerCase() === nameLC) ||
                      value.some(v => v.name.toLowerCase() === nameLC);
    
    if (nameExists) {
      toast.error('A Floq with this name already exists');
      return;
    }
    
    onChange([...value, { type: 'new', name: newName.trim(), autoDisband: true }]);
    setNewName('');
  };

  const removeSelection = (index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  const handleNext = () => {
    // Validation rules per Phase 2 spec
    const isSolo = value.length === 0
    const isSingleExisting = value.length === 1 && value[0].type === 'existing'
    const hasInvites = invitedIds.length > 0
    
    // Case: Single existing + invites (disallow - forces combined floq)
    if (isSingleExisting && hasInvites) {
      toast.error("You invited friends that aren't in the selected Floq – please add them as a new group or remove the Floq.")
      return
    }
    
    // Case: Multiple or new floqs (require combined name)
    const needsSuper = value.length > 1 || value.some(sel => sel.type === 'new')
    if (needsSuper && (!combinedName || !combinedName.trim())) {
      toast.error('Give your new group a name')
      return
    }

    onNext()
  }

  const removeFriend = (friendId: string) => {
    const updated = invitedIds.filter(id => id !== friendId)
    onInvitedChange(updated)
  }

  const getInvitedFriends = () => {
    return rows.filter(row => invitedIds.includes(row.id)).map(row => ({
      id: row.id,
      display_name: row.display_name,
      username: row.username,
      avatar_url: row.avatar_url
    }))
  }


  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center items-center p-6">
        <p className="text-muted-foreground">Loading your Floqs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Choose Floqs (Optional)</h3>
        <p className="text-muted-foreground">
          Link this plan to existing Floqs or leave empty for a solo plan
        </p>
      </div>

      {/* Your Active Floqs - Card Grid */}
      {myFloqs.length > 0 ? (
        <div className="space-y-4">
          <h4 className="font-medium">Your Active Floqs</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {myFloqs.map((floq) => {
              const isSelected = !!value.find((v) => v.type === 'existing' && v.floqId === floq.id);
              
              return (
                <FloqCardMini
                  key={floq.id}
                  floq={floq}
                  selected={isSelected}
                  onToggle={() => toggleExisting(floq)}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h4 className="font-medium">Your Active Floqs</h4>
          <p className="text-sm text-muted-foreground">
            You haven't joined any Floqs yet. Create a new one below or proceed with a solo plan.
          </p>
        </div>
      )}

      {/* Invite Friends Section */}
      <div className="space-y-3">
        <Label className="text-base font-medium flex items-center gap-2">
          <Users className="w-4 h-4" />
          Invite friends to this plan
        </Label>
        <div className="rounded-xl border border-dashed border-muted p-4">
          {invitedIds.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-3">
              Nobody invited yet – add friends below
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-3">
              {getInvitedFriends().map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-2 bg-accent rounded-full pl-1 pr-3 py-1"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={friend.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {friend.display_name?.charAt(0)?.toUpperCase() || friend.username?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {friend.display_name || friend.username}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive/20"
                    onClick={() => removeFriend(friend.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPickerOpen(true)}
          >
            + Invite friends
          </Button>
        </div>
      </div>

      <FriendPicker
        open={pickerOpen}
        initial={invitedIds}
        onClose={() => setPickerOpen(false)}
        onConfirm={onInvitedChange}
      />

      {/* Create a new floq */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="font-medium">Create a new floq</span>
        </div>
        <div className="flex items-center space-x-3">
          <Input
            placeholder="New name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && addNew()}
          />
          <Button size="sm" onClick={addNew} disabled={!newName.trim()}>
            Add
          </Button>
        </div>
      </div>

      {/* Selected (chips) */}
      {value.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Selected</h4>
          <div className="flex flex-wrap gap-2">
            {value.map((selection, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="flex items-center gap-2 px-3 py-1"
              >
                {selection.name}
                {selection.type === 'new' && ' (New)'}
                <button
                  onClick={() => removeSelection(idx)}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            ))}
            {value.length > 1 && (
              <Badge variant="outline" className="px-3 py-1">
                +{value.length - 1} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Combined Floq Name - show when >1 floqs OR any new floqs */}
      {(value.length > 1 || value.some(sel => sel.type === 'new')) && (
        <div className="space-y-3">
          <Label htmlFor="combined-name">Combined Floq Name *</Label>
          <Input
            id="combined-name"
            placeholder="e.g. Weekend Warriors Planning"
            value={combinedName}
            onChange={(e) => onCombinedNameChange(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Required when linking multiple floqs or inviting people outside existing floqs
          </p>
        </div>
      )}

      <Button
        className="w-full"
        onClick={handleNext}
        disabled={(value.length > 1 || value.some(sel => sel.type === 'new')) && !(combinedName ?? '').trim()}
      >
        {value.length === 0 ? 'Create Solo Plan' : 'Continue'}
      </Button>
    </div>
  );
}