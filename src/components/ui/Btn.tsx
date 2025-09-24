import React from "react";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  glow?: boolean;
  active?: boolean;
  ariaLabel?: string;
};

export default function Btn({
  glow = false,
  active,
  ariaLabel,
  className = "",
  children,
  ...props
}: BtnProps) {
  const base = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] transition";
  const surface = active ? "bg-white/12 border-white/20" : "bg-white/5 border-white/10 hover:bg-white/10";
  const neon = glow ? "ring-neon" : "";
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`${base} ${surface} ${neon} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}