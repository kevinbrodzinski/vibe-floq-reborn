import { cn } from '@/lib/utils';

interface IconButtonProps {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function IconButton({
  label, 
  onClick, 
  children, 
  className = ''
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center w-10 h-10 rounded-lg",
        "bg-white/10 hover:bg-white/15 text-white/90 transition-colors",
        className
      )}
    >
      {children}
    </button>
  );
}