import React, { PropsWithChildren } from 'react';
import { X } from 'lucide-react';

interface Props {
  title?: string;
  onClose: () => void;

  /** live badge / realtime toggle */
  realtime?: boolean;

  /** cluster stats – show "0 spots • 0 people" when empty */
  spots?: number;
  people?: number;

  /** slot for a _Filter vibes_ button */
  onFilterClick?: () => void;
}

export const VibeDensityShell: React.FC<PropsWithChildren<Props>> = ({
  title = 'Vibe Density Map',
  realtime,
  spots,
  people,
  onFilterClick,
  onClose,
  children,
}) => (
  <div className="relative flex-1 overflow-hidden">

    {/* header row */}
    <header className="sticky top-0 z-20 flex items-center justify-between 
                       bg-background/90 backdrop-blur-md px-4 py-3 border-b border-border/40">
      <h2 className="text-lg font-semibold">{title}</h2>

      <div className="flex items-center gap-3">

        {/* LIVE pill */}
        {realtime != null && (
          <span
            className={`px-3 py-1 text-xs rounded-full font-medium 
                       ${realtime ? 'bg-emerald-600/20 text-emerald-400'
                                   : 'bg-muted text-muted-foreground'}`}
          >
            LIVE
          </span>
        )}

        {/* filter button */}
        {onFilterClick && (
          <button
            onClick={onFilterClick}
            className="bg-muted/50 hover:bg-muted px-3 py-1 rounded-full
                       text-sm font-medium transition-colors"
          >
            Filter vibes
          </button>
        )}

        <button
          onClick={onClose}
          className="ml-4 grid place-items-center rounded-full w-8 h-8
                     hover:bg-muted/40 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>

    {/* map / overlay slot */}
    {children}

    {/* footer stats */}
    {(spots != null || people != null) && (
      <footer className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2
                         text-sm font-medium text-muted-foreground">
        {spots ?? 0} spots&nbsp;•&nbsp;{people ?? 0} people
      </footer>
    )}
  </div>
);