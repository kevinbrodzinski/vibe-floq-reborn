import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

type ExistingFloq = { id: string; title: string; name?: string };
type Selection =
  | { type: 'existing'; floqId: string; name: string; autoDisband: boolean }
  | { type: 'new'; name: string; autoDisband: boolean };

interface Props {
  value: Selection[];
  onChange: (v: Selection[]) => void;
  onNext: () => void;
}

export function PlanFloqStep({ value, onChange, onNext }: Props) {
  const [myFloqs, setMyFloqs] = useState<ExistingFloq[]>([]);
  const [newName, setNewName] = useState('');
  const [superName, setSuperName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyFloqs = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;

        // Fetch floqs user participates in (both created and joined)
        const { data, error } = await supabase
          .from('floq_participants')
          .select(`
            floq:floqs!inner(
              id, 
              title, 
              name
            )
          `)
          .eq('user_id', user.user.id)
          .is('floq.deleted_at', null);

        if (error) {
          console.error('Error fetching floqs:', error);
          return;
        }

        // Transform the data to get the floq objects
        const floqs = data?.map(item => item.floq).filter(Boolean) || [];
        setMyFloqs(floqs);
      } catch (error) {
        console.error('Error in fetchMyFloqs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyFloqs();
  }, []);

  const toggleExisting = (f: ExistingFloq) => {
    const exists = value.find((v) => v.type === 'existing' && v.floqId === f.id);
    const displayName = f.title || f.name || 'Untitled Floq';
    
    onChange(
      exists
        ? value.filter((v) => !(v.type === 'existing' && v.floqId === f.id))
        : [...value, { type: 'existing', floqId: f.id, name: displayName, autoDisband: false }]
    );
  };

  const addNew = () => {
    if (!newName.trim()) return;
    
    // Case-insensitive name check
    const nameLC = newName.trim().toLowerCase();
    const nameExists = myFloqs.some(f => (f.title || f.name)?.toLowerCase() === nameLC) ||
                      value.some(v => v.type === 'new' && v.name.toLowerCase() === nameLC);
    
    if (nameExists) {
      alert('A Floq with this name already exists');
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

  const updateAutoDisband = (index: number, autoDisband: boolean) => {
    const newValue = [...value];
    newValue[index] = { ...newValue[index], autoDisband };
    onChange(newValue);
  };

  const handleNext = () => {
    const selCount = value.length;
    if (selCount === 0) {
      alert('Please select at least one Floq or create a new one');
      return;
    }
    
    // Final de-dupe: const deduped = value.filter((v,i,a) => i === a.findIndex(x => x.type === v.type && x.name.toLowerCase() === v.name.toLowerCase())); onChange(deduped);
    const deduped = value.filter((v, i, a) => i === a.findIndex(x => x.type === v.type && x.name.toLowerCase() === v.name.toLowerCase()));
    onChange(deduped);
    
    // Add super-Floq as a new selection if multiple floqs selected
    if (selCount > 1 && superName.trim()) {
      const hasSuperFloq = deduped.some(v => v.type === 'new' && v.name.toLowerCase() === superName.trim().toLowerCase());
      if (!hasSuperFloq) {
        onChange([...deduped, { type: 'new', name: superName.trim(), autoDisband: false }]);
      }
    } else if (selCount > 1 && !superName.trim()) {
      alert('Please name your combined Floq');
      return;
    }
    
    setSubmitting(true);
    onNext();
    // Reset submitting after a brief delay to prevent UI issues
    setTimeout(() => setSubmitting(false), 100);
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center p-6">
        <p className="text-muted-foreground">Loading your Floqs...</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-screen">
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Choose the Floq(s) for this Plan</h2>
          <p className="text-sm text-muted-foreground">
            Select existing Floqs or create new ones. Everyone invited to the plan will be added to these Floqs.
          </p>
        </div>

        {myFloqs.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium text-foreground">Your Existing Floqs</h3>
            {myFloqs.map((f) => {
              const checked = !!value.find((v) => v.type === 'existing' && v.floqId === f.id);
              const displayName = f.title || f.name || 'Untitled Floq';
              
              return (
                <div key={f.id} className="flex items-center space-x-3 py-2">
                  <Checkbox checked={checked} onCheckedChange={() => toggleExisting(f)} />
                  <Label className="flex-1">{displayName}</Label>
                </div>
              );
            })}
          </div>
        )}

        <Separator />
        <div className="space-y-4">
          <h3 className="font-medium text-foreground">Create a New Floq</h3>
          <div className="flex items-center space-x-3">
            <Input
              placeholder="New Floq name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" onClick={addNew} disabled={!newName.trim()}>Add</Button>
          </div>
        </div>

        {value.length > 0 && (
          <div className="space-y-4">
            <Separator />
            <h3 className="font-medium text-foreground">Selected Floqs</h3>
            {value.map((selection, idx) => (
              <div key={idx} className="flex items-center space-x-3 py-2">
                <p className="flex-1 text-muted-foreground">
                  {selection.name}{selection.type === 'new' && ' (New)'}
                </p>
                {selection.type === 'new' && (
                  <div className="flex items-center space-x-2">
                    <Label className="text-xs text-muted-foreground">Disband after?</Label>
                    <Switch
                      checked={selection.autoDisband}
                      onCheckedChange={(checked) => updateAutoDisband(idx, checked)}
                    />
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={() => removeSelection(idx)}>Remove</Button>
              </div>
            ))}
          </div>
        )}

        {value.length > 1 && (
          <div className="space-y-4">
            <Separator />
            <h3 className="font-medium text-foreground">Combined Floq Name</h3>
            <p className="text-xs text-muted-foreground">
              Since you've selected multiple Floqs, give your combined group a name:
            </p>
            <Input
              placeholder="e.g., 'Weekend Warriors Planning Group'"
              value={superName}
              onChange={(e) => setSuperName(e.target.value)}
            />
          </div>
        )}

        <Button
          className="w-full mt-6"
          disabled={value.length === 0 || submitting || (value.length > 1 && !superName.trim())}
          onClick={handleNext}
        >
          {submitting ? 'Processing...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}