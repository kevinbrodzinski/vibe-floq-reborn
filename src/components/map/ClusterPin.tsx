interface ClusterPinProps {
  count: number;
  onClick?: () => void;
}

export const ClusterPin = ({ count, onClick }: ClusterPinProps) => (
  <button 
    className="relative cursor-pointer transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
    onClick={onClick}
    aria-label={`Cluster of ${count} venues. Click to zoom in and expand.`}
    type="button"
  >
    <div className="h-8 w-8 rounded-full bg-accent/70 backdrop-blur-md border border-accent/30 glow-secondary" />
    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-accent-foreground pointer-events-none">
      {count}
    </span>
  </button>
);