import React from 'react'
import { useFieldLens } from './FieldLensProvider'
import clsx from 'clsx'

type Props = {
  insight?: string;
  inline?: boolean;
  className?: string;
};

export function LensStatusHUD({ insight, inline = false, className }: Props) {
  const { lens } = useFieldLens()
  const label = lens === 'explore' ? 'Explore' : lens === 'constellation' ? 'Constellation' : 'Temporal'
  
  // Don't show if no insight to display
  if (!insight) return null;

  const baseClasses = "px-3 py-2 rounded-md bg-black/35 backdrop-blur text-white/90 text-xs";
  const content = <><b>{label}</b> • {insight}</>;

  if (inline) {
    return (
      <div className={clsx(baseClasses, "pointer-events-auto", className)}>
        {content}
      </div>
    );
  }
  
  return (
    <div className={clsx(baseClasses, "fixed left-6 z-[560] pointer-events-none top-after-topbar", className)}>
      {content}
    </div>
  )
}