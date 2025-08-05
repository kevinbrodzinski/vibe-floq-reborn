import React from 'react';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ConfirmDialogContentProps {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialogContent: React.FC<ConfirmDialogContentProps> = ({
  title,
  description,
  confirmLabel,
  cancelLabel,
  isLoading = false,
  onConfirm,
  onCancel
}) => {
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {description}
        </DialogDescription>
      </DialogHeader>
      
      <DialogFooter className="gap-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          {cancelLabel}
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={isLoading}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-destructive"
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};