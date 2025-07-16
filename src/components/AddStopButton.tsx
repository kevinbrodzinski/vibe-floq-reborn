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
        border-2 border-dashed border-border/50 rounded-2xl p-6 
        transition-all duration-300 cursor-pointer
        ${isDragOver 
          ? 'border-primary bg-primary/10 glow-primary' 
          : 'hover:border-border hover:bg-card/30'
        }
        ${className}
      `}
      onClick={() => onAdd(timeSlot)}
    >
      <div className="text-center text-muted-foreground">
        <div className="flex items-center justify-center mb-2">
          <Plus className="w-5 h-5" />
        </div>
        <div className="text-sm">Drop venue here or</div>
        <button 
          className="text-primary hover:text-primary/80 transition-colors font-medium text-sm"
        >
          Add stop
        </button>
      </div>
    </div>
  );
};