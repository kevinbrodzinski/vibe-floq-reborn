import React from "react";

type Props = {
  children: React.ReactNode;
  glow?: boolean;
  className?: string;
};

export default function Pill({ children, glow = true, className = "" }: Props) {
  const base = "inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] border";
  const surface = glow
    ? "chip-glow bg-white/8 border-white/20"
    : "bg-white/6 border-white/12";
  
  return <span className={`${base} ${surface} ${className}`}>{children}</span>;
}