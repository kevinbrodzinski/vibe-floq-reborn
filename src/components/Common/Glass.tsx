import React from "react";

interface GlassProps {
  children: React.ReactNode;
  className?: string;
}

export function Glass({ children, className = "" }: GlassProps) {
  return (
    <div className={`glass glass-ink noise ${className}`}>
      {children}
    </div>
  );
}