import { Trash2 } from "lucide-react";

interface StopCardActionsProps {
  vibeMatch: number;
  onRemove: () => void;
}

export const StopCardActions = ({ vibeMatch, onRemove }: StopCardActionsProps) => {
  return (
    <div className="flex items-center space-x-2">
      <div className="text-right text-sm">
        <div className="text-primary font-medium">{vibeMatch}% match</div>
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="p-1 rounded-full hover:bg-destructive/20 transition-colors"
        aria-label="Remove stop"
      >
        <Trash2 className="w-4 h-4 text-destructive" />
      </button>
    </div>
  );
};