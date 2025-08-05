interface VenuePinProps {
  vibe?: string;
  name?: string;
  onClick?: () => void;
}

export const VenuePin = ({ vibe, name, onClick }: VenuePinProps) => {
  const getVibeColor = (vibe?: string) => {
    switch (vibe) {
      case 'nightlife': return 'hsl(280 70% 60%)';
      case 'cafe': return 'hsl(30 70% 60%)';
      case 'park': return 'hsl(120 70% 60%)';
      case 'transit': return 'hsl(200 70% 60%)';
      case 'creative': return 'hsl(320 70% 60%)';
      case 'wellness': return 'hsl(160 70% 60%)';
      default: return 'hsl(var(--accent))';
    }
  };

  return (
    <button 
      className="relative cursor-pointer transition-transform hover:scale-110 group focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
      onClick={onClick}
      title={name}
      aria-label={name ? `${name} venue (${vibe || 'mixed'} vibe)` : `Venue with ${vibe || 'mixed'} vibe`}
      type="button"
    >
      <div 
        className="h-3 w-3 rounded-full animate-pulse pointer-events-none"
        style={{
          backgroundColor: getVibeColor(vibe),
          boxShadow: `0 0 12px ${getVibeColor(vibe)}80`,
        }}
      />
      {name && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-card/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-foreground whitespace-nowrap border border-border pointer-events-none">
          {name}
        </div>
      )}
    </button>
  );
};