import React from "react";

export default function Section({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="section-compact p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon ?? null}
          <h3 className="text-[13px] tracking-wide font-semibold text-white/90 uppercase">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}