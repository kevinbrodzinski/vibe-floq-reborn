import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useUpdatePlanSummary, type SummaryMode } from '@/hooks/usePlanSummaries';

interface PlanSummaryEditModalProps {
  planId: string;
  mode: SummaryMode;
  summary?: string;
  onClose: () => void;
}

export function PlanSummaryEditModal({ 
  planId, 
  mode, 
  summary = '', 
  onClose 
}: PlanSummaryEditModalProps) {
  const [value, setValue] = useState(summary);
  const [hasChanged, setHasChanged] = useState(false);
  const updateSummary = useUpdatePlanSummary();

  // Track changes
  useEffect(() => {
    setHasChanged(value.trim() !== summary.trim());
  }, [value, summary]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    if (value.trim() && hasChanged) {
      await updateSummary.mutateAsync({
        planId,
        mode,
        summary: value.trim(),
      });
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit {mode === 'finalized' ? 'Plan Summary' : 'Experience Summary'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'finalized' ? 'Edit the summary for your plan before sharing it.' : 'Edit your experience summary to capture how the plan went.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={6}
            placeholder="Write or refine the plan summary..."
            className="resize-none"
          />
          
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateSummary.isPending || !value.trim() || !hasChanged}
              title={!hasChanged ? "No changes to save" : undefined}
            >
              {updateSummary.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}