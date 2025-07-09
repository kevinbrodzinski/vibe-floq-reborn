interface ClusterPinProps {
  count: number;
  onClick?: () => void;
}

export const ClusterPin = ({ count, onClick }: ClusterPinProps) => (
  <div 
    className="relative cursor-pointer transition-transform hover:scale-110"
    onClick={onClick}
  >
    <div className="h-8 w-8 rounded-full bg-accent/70 backdrop-blur-md border border-accent/30 glow-secondary" />
    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-accent-foreground">
      {count}
    </span>
  </div>
);