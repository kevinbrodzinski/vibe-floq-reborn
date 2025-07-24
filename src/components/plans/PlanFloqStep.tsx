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

/**
 * Step UI:
 * 1. List user's Floqs with checkboxes
 * 2. "+ New Floq" input
 * 3. If >1 selected → ask for super-Floq name
 * 4. Auto-disband toggle (per newly-created or super-Floq)
 */
export function PlanFloqStep({ value, onChange, onNext }: Props) {
  const [myFloqs, setMyFloqs] = useState<ExistingFloq[]>([]);
  const [newName, setNewName] = useState('');
  const [superName, setSuperName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  /* fetch user floqs once */
  useEffect(() => {
    const fetchMyFloqs = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;

        const { data, error } = await supabase
          .from('floqs')
          .select('id, title, name')
          .eq('creator_id', user.user.id)
          .is('deleted_at', null);

        if (error) {
          console.error('Error fetching floqs:', error);
          return;
        }

        setMyFloqs(data || []);
      } catch (error) {
        console.error('Error in fetchMyFloqs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyFloqs();
  }, []);

  /* helpers */
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
    onChange([...value, { type: 'new', name: newName.trim(), autoDisband: true }]);
    setNewName('');
  };

  const removeSelection = (index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  const handleNext = () => {
    /* require super-Floq name if >1 selected */
    const selCount = value.length;
    if (selCount === 0) {
      alert('Please select at least one Floq or create a new one');
      return;
    }
    if (selCount > 1 && !superName.trim()) {
      alert('Please name your combined Floq');
      return;
    }
    setSubmitting(true);
    onNext();
  };

  const updateAutoDisband = (index: number, autoDisband: boolean) => {
    const newValue = [...value];
    newValue[index] = { ...newValue[index], autoDisband };
    onChange(newValue);
  };

  if (loading) {
    return (
      <div className="flex flex-1 justify-center items-center p-6">
        <p className="text-muted-foreground">Loading your Floqs...</p>
      </div>
    );
  }

  /* UI */
  return (
    <div className="overflow-auto max-h-screen">
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Choose the Floq(s) for this Plan
          </h2>
          <p className="text-sm text-muted-foreground">
            Select existing Floqs or create new ones. Everyone invited to the plan will be added to these Floqs.
          </p>
        </div>

        {/* existing floqs */}
        {myFloqs.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium text-foreground">Your Existing Floqs</h3>
            {myFloqs.map((f) => {
              const checked = !!value.find((v) => v.type === 'existing' && v.floqId === f.id);
              const displayName = f.title || f.name || 'Untitled Floq';
              
              return (
                <div key={f.id} className="flex items-center space-x-3 py-2">
                  <Checkbox 
                    checked={checked} 
                    onCheckedChange={() => toggleExisting(f)} 
                  />
                  <Label className="flex-1">{displayName}</Label>
                </div>
              );
            })}
          </div>
        )}

        {/* add new floq */}
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
            <Button 
              size="sm" 
              onClick={addNew}
              disabled={!newName.trim()}
            >
              Add
            </Button>
          </div>
        </div>

        {/* show current selections */}
        {value.length > 0 && (
          <div className="space-y-4">
            <Separator />
            <h3 className="font-medium text-foreground">Selected Floqs</h3>
            {value.map((selection, idx) => (
              <div key={idx} className="flex items-center space-x-3 py-2">
                <p className="flex-1 text-muted-foreground">
                  {selection.name}
                  {selection.type === 'new' && ' (New)'}
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
                
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => removeSelection(idx)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* if multiple selections → need super floq name */}
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

        {/* Next button */}
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
