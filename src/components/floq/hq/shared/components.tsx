import React from "react";

export function Pill({ children, glow = true }: { children: React.ReactNode; glow?: boolean }) {
  return (
    <span className={glow ? "chip-glow" : "px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white/80 border border-white/10"}>
      {children}
    </span>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; ariaLabel?: string; glow?: boolean };
export function Btn({ children, active, ariaLabel, glow = false, className = "", ...props }: BtnProps) {
  return (
    <button
      type="button"
      aria-pressed={active ?? undefined}
      aria-label={ariaLabel}
      className={`${
        glow 
          ? "btn-glow px-3 py-1.5 text-[12px]" 
          : `px-3 py-1.5 rounded-xl border text-[12px] transition ${
              active ? "bg-white/15 border-white/20" : "bg-white/5 border-white/10 hover:bg-white/10"
            }`
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Section({ title, icon, right, children }: { title: string; icon: React.ReactNode; right?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-white/10 grid place-items-center text-white/80">{icon}</div>
          <h3 className="text-[13px] tracking-wide font-semibold text-white/90 uppercase">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500" style={{ width: `${value}%` }} />
    </div>
  );
}