import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const updateSummary = useUpdatePlanSummary();

  const handleSave = async () => {
    if (value.trim()) {
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
              disabled={updateSummary.isPending || !value.trim()}
            >
              {updateSummary.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}