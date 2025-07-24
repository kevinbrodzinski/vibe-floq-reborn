import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { useMyActiveFloqs } from '@/hooks/useMyActiveFloqs';
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
}

export function PlanFloqStep({ value, onChange, onNext, combinedName, onCombinedNameChange }: Props) {
  const { data: myFloqs = [], isLoading } = useMyActiveFloqs();
  const [newName, setNewName] = useState('');

  const toggleExisting = (floq: any) => {
    const exists = value.find((v) => v.type === 'existing' && v.floqId === floq.id);
    const displayName = floq.title || floq.name || 'Untitled Floq';
    
    onChange(
      exists
        ? value.filter((v) => !(v.type === 'existing' && v.floqId === floq.id))
        : [...value, { type: 'existing', floqId: floq.id, name: displayName, autoDisband: false }]
    );
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
    // Allow proceeding with 0 selections for solo plans
    if (value.length > 1 && !combinedName.trim()) {
      toast.error('Name your combined floq');
      return;
    }
    
    onNext();
  };


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

      {/* Your Active Floqs - 3 Column Grid */}
      {myFloqs.length > 0 ? (
        <div className="space-y-4">
          <h4 className="font-medium">Your Active Floqs</h4>
          <div className="grid grid-cols-3 gap-3">
            {myFloqs.map((floq) => {
              const isSelected = !!value.find((v) => v.type === 'existing' && v.floqId === floq.id);
              const displayName = floq.title || floq.name || 'Untitled Floq';
              
              return (
                <div
                  key={floq.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleExisting(floq)}
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox checked={isSelected} />
                    <span className="text-sm font-medium truncate">{displayName}</span>
                  </div>
                </div>
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

      {/* Combined Floq Name - only show when >1 selected */}
      {value.length > 1 && (
        <div className="space-y-3">
          <Label htmlFor="combined-name">Combined Floq Name</Label>
          <Input
            id="combined-name"
            placeholder="e.g. Weekend Warriors Planning"
            value={combinedName}
            onChange={(e) => onCombinedNameChange(e.target.value)}
          />
        </div>
      )}

      <Button
        className="w-full"
        onClick={handleNext}
        disabled={value.length > 1 && !combinedName.trim()}
      >
        {value.length === 0 ? 'Create Solo Plan' : 'Continue'}
      </Button>
    </div>
  );
}