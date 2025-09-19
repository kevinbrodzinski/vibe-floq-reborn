import React from "react";

export default function Section(
  { title, right, children }:
  { title: string; right?: React.ReactNode; children?: React.ReactNode }
){
  return (
    <section className="glass p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] tracking-wide font-semibold text-white/90 uppercase">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}