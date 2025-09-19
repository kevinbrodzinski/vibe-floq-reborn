import React from "react";

export default function Pill({
  children, 
  glow = false, 
  className = "",
}: { 
  children: React.ReactNode; 
  glow?: boolean; 
  className?: string;
}) {
  return (
    <span className={`${glow ? "chip-glow" : "chip"} ${className}`}>
      {children}
    </span>
  );
}