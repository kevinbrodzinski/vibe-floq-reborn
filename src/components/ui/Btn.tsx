import React from "react";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  glow?: boolean;
};

export default function Btn({ 
  children, 
  active, 
  glow = false, 
  className = "", 
  ...props 
}: BtnProps) {
  return (
    <button
      {...props}
      className={`${glow ? "btn-glow" : "rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"} ${
        active ? "!bg-white/15 !border-white/20" : ""
      } px-3 py-1.5 text-[12px] ${className}`}
    >
      {children}
    </button>
  );
}