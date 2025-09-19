import React from "react";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  ariaLabel?: string;
  glow?: boolean;
};

export default function Btn({
  children,
  active,
  ariaLabel,
  glow = false,
  className = "",
  ...props
}: BtnProps) {
  const base = "px-3 py-1.5 text-[12px] transition inline-flex items-center gap-1.5";
  const surface = active 
    ? "bg-white/15 border-white/20" 
    : "bg-white/5 border-white/10 hover:bg-white/10";
  const style = glow ? "btn-glow" : "rounded-xl border";
  
  return (
    <button
      type="button"
      aria-pressed={active ?? undefined}
      aria-label={ariaLabel}
      className={`${base} ${style} ${surface} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}