
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
        border-2 border-dashed rounded-2xl p-4 min-h-[60px]
        transition-all duration-300
        ${disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'cursor-pointer hover:border-border hover:bg-card/30 active:bg-card/50'
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
      <div className="flex items-center justify-center gap-3 text-muted-foreground">
        <div className={`transition-transform ${isDragOver ? 'scale-110' : ''}`}>
          <Plus className="w-6 h-6 text-primary" />
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-primary">
            Add stop at {timeSlot}
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">
            {isDragOver ? 'Drop venue here' : 'Tap to add or drag venue'}
          </div>
        </div>
      </div>
    </div>
  );
};
