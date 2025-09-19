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
  return (
    <button
      type="button"
      aria-pressed={active ?? undefined}
      aria-label={ariaLabel}
      className={`${glow ? "btn-glow" : "px-3 py-1.5 rounded-xl border text-[12px] transition bg-white/5 border-white/10 hover:bg-white/10"} ${
        active ? "bg-white/15 border-white/20" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}