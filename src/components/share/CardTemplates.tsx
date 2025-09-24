import React from 'react';
import { AfterglowDetail } from '@/lib/afterglow-helpers';
import { format } from 'date-fns';

interface Props { data: AfterglowDetail['afterglow']; template: 'minimal' | 'gradient' }

// Template types for enumeration
export const TEMPLATES = ['minimal', 'gradient'] as const;
export type TemplateType = typeof TEMPLATES[number];

// Hoist className to avoid re-creating on every render
const containerBase = 'w-[1080px] h-[1350px] flex flex-col items-center justify-center text-white p-20';

export const ShareCard = React.forwardRef<HTMLDivElement, Props>(
  ({ data, template }, ref) => {
    const Base = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
      <div
        ref={ref}
        className={`${containerBase} ${className}`}
        role="img"
        aria-label="Shareable Afterglow card"
      >
        {children}
      </div>
    );

    /* ——— Template variants ——— */
    switch (template) {
      case 'gradient':
        return (
          <Base className="bg-gradient-to-br from-emerald-500 via-sky-500 to-purple-600 font-semibold">
            <h2 className="text-6xl mb-10">✨ Afterglow ✨</h2>
            <p className="text-4xl mb-4">{format(new Date(data.date), 'PPP')}</p>

            <div className="flex gap-8 text-5xl my-8">
              <Metric label="Energy" value={data.energy_score} />
              <Metric label="Social" value={data.social_intensity} />
            </div>

            <p className="uppercase tracking-wide text-3xl">
              {data.dominant_vibe || 'chill'}
            </p>
          </Base>
        );
      case 'minimal':
      default:
        return (
          <Base className="bg-slate-900 font-light">
            <p className="text-xl tracking-widest text-slate-400 mb-6">Afterglow</p>
            <h2 className="text-5xl mb-2">{format(new Date(data.date), 'PPP')}</h2>
            <p className="text-3xl text-slate-300 mb-10">{data.summary_text ?? ' '}</p>

            <div className="grid grid-cols-2 gap-8 text-center">
              <Metric label="Energy" value={data.energy_score} />
              <Metric label="Social" value={data.social_intensity} />
              <Metric label="Venues" value={data.total_venues} />
              <Metric label="Moments" value={data.vibe_path.length} />
            </div>
          </Base>
        );
    }
  }
);
ShareCard.displayName = 'ShareCard';

const Metric = ({ label, value }: { label: string; value: number }) => (
  <div className="flex flex-col">
    <span className="text-5xl">{value}</span>
    <span className="text-xl tracking-wide mt-2">{label}</span>
  </div>
);