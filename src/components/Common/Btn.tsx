import React from "react";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  ariaLabel?: string;
};

export default function Btn({
  children,
  active,
  ariaLabel,
  className = "",
  ...props
}: BtnProps) {
  return (
    <button
      type="button"
      aria-pressed={active ?? undefined}
      aria-label={ariaLabel}
      className={`px-3 py-1.5 rounded-xl border text-[12px] transition ${
        active
          ? "bg-white/15 border-white/20"
          : "bg-white/5 border-white/10 hover:bg-white/10"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}