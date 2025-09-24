
import { Plus } from "lucide-react";

interface AddStopButtonProps {
  timeSlot: string;
  onAdd: (timeSlot: string) => void;
  isDragOver?: boolean;
  disabled?: boolean;
  className?: string;
}

export const AddStopButton = ({ 
  timeSlot, 
  onAdd, 
  isDragOver = false,
  disabled = false,
  className = "" 
}: AddStopButtonProps) => {
  
  const handleClick = () => {
    console.log('🔍 AddStopButton clicked for timeSlot:', timeSlot)
    if (!disabled) {
      onAdd(timeSlot)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      console.log('🔍 AddStopButton key pressed for timeSlot:', timeSlot)
      onAdd(timeSlot)
    }
  }

  return (
    <div
      className={`
        border-2 border-dashed rounded-2xl p-6 
        transition-all duration-300
        ${disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'cursor-pointer hover:border-border hover:bg-card/30'
        }
        ${isDragOver 
          ? 'border-primary bg-primary/10 glow-primary animate-pulse' 
          : 'border-border/50'
        }
        ${className}
      `}
      onClick={handleClick}
      role="button"
      aria-label={`Add stop at ${timeSlot}`}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
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
