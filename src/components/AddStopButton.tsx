import { Plus } from "lucide-react";

interface AddStopButtonProps {
  timeSlot: string;
  onAdd: (timeSlot: string) => void;
  isDragOver?: boolean;
  className?: string;
}

export const AddStopButton = ({ 
  timeSlot, 
  onAdd, 
  isDragOver = false,
  className = "" 
}: AddStopButtonProps) => {
  return (
    <div
      className={`
        border-2 border-dashed rounded-2xl p-6 
        transition-all duration-300 cursor-pointer
        ${isDragOver 
          ? 'border-primary bg-primary/10 glow-primary animate-pulse' 
          : 'border-border/50 hover:border-border hover:bg-card/30'
        }
        ${className}
      `}
      onClick={() => onAdd(timeSlot)}
      role="button"
      aria-label={`Add stop at ${timeSlot}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAdd(timeSlot);
        }
      }}
    >
      <div className="text-center text-muted-foreground">
        <div className={`flex items-center justify-center mb-2 transition-transform ${
          isDragOver ? 'scale-110' : ''
        }`}>
          <Plus className="w-5 h-5" />
        </div>
        <div className="text-sm">Drop venue here or</div>
        <span className="text-primary hover:text-primary/80 transition-colors font-medium text-sm">
          Add stop
        </span>
      </div>
    </div>
  );
};