import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  confirmLabel?: string;
  cancelLabel?: string;
  title?: string;
  description?: string;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  title = "Are you sure?",
  description,
  isLoading = false,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader className="space-y-1.5">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p 
              id="confirm-desc"
              className="text-sm text-muted-foreground leading-relaxed"
              aria-describedby={description ? 'confirm-desc' : undefined}
            >
              {description}
            </p>
          )}
        </DialogHeader>

        <DialogFooter className="pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={async () => {
              try {
                await onConfirm();
                onOpenChange(false);
              } catch (error) {
                // Error handling done by parent
                console.error('Confirm action failed:', error);
              }
            }}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};