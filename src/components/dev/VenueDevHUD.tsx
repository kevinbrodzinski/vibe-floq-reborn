import * as React from 'react';
import { useVenueContext } from '@/hooks/useVenueContext';
import { mapCategoriesToVenueType } from '@/core/venues/category-mapper';

type Props = {
  position?: 'bl' | 'br' | 'tl' | 'tr'; // bottom-left, bottom-right, top-left, top-right
};

export function VenueDevHUD({ position = 'bl' }: Props) {
  if (import.meta.env.PROD) return null; // DEV-only

  const { venue, loading } = useVenueContext();
  const [mapped, setMapped] = React.useState<{
    venueType: string;
    confidence: number;
    reasons: string[];
  } | null>(null);

  React.useEffect(() => {
    if (!venue) return setMapped(null);
    try {
      const cats = Array.isArray((venue as any).categories)
        ? ((venue as any).categories as string[])
        : [];
      const googleTypes = cats.filter((c) => !c.includes(' '));
      const fsqCategories = cats.filter((c) => c.includes(' '));
      const res = mapCategoriesToVenueType({
        googleTypes: googleTypes.length ? googleTypes : undefined,
        fsqCategories: fsqCategories.length ? fsqCategories : undefined,
        label: venue.name,
      });
      setMapped({
        venueType: res.venueType,
        confidence: res.confidence,
        reasons: res.reasons,
      });
    } catch {
      setMapped(null);
    }
  }, [venue]);

  if (loading || !venue) return null;

  const posClass =
    position === 'bl'
      ? 'left-3 bottom-3'
      : position === 'br'
      ? 'right-3 bottom-3'
      : position === 'tl'
      ? 'left-3 top-3'
      : 'right-3 top-3';

  const providers = (venue as any).providers
    ? ((venue as any).providers as string[]).join('·')
    : (venue.provider ?? 'gps');

  const categories = ((venue as any).categories as string[] | undefined) ?? [];
  const catStr = categories.slice(0, 2).join(' · ');

  return (
    <div
      className={[
        'fixed z-[110] rounded-xl border border-white/15 bg-black/65 text-white',
        'backdrop-blur px-3 py-2 shadow-xl',
        'text-xs font-medium',
        posClass,
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1">
          <Badge tone="blue">{providers}</Badge>
          <span className="opacity-80">{venue.name ?? '—'}</span>
        </span>
      </div>

      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
        <Row k="Mapped type" v={mapped?.venueType ?? (venue.type ?? 'general')} />
        <Row
          k="Confidence"
          v={
            typeof mapped?.confidence === 'number'
              ? `${Math.round(mapped.confidence * 100)}%`
              : '—'
          }
        />
        <Row k="Energy" v={fmtEnergy((venue as any).energyBase ?? venue.energyBase ?? 0.5)} />
        <Row k="Categories" v={catStr || '—'} />
      </div>

      {mapped?.reasons?.length ? (
        <div className="mt-1 text-[10px] opacity-70">
          {mapped.reasons.slice(0, 1).join(' · ')}
        </div>
      ) : null}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="opacity-60">{k}</span>
      <span className="truncate">{v}</span>
    </div>
  );
}

function fmtEnergy(n: number) {
  const pct = Math.round(n * 100);
  return `${pct}%`;
}

function Badge({
  tone = 'gray',
  children,
}: {
  tone?: 'gray' | 'blue' | 'green';
  children: React.ReactNode;
}) {
  const toneClass =
    tone === 'blue'
      ? 'bg-blue-500/20 text-blue-200 border-blue-500/30'
      : tone === 'green'
      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30'
      : 'bg-white/10 text-white/80 border-white/20';
  return (
    <span className={`inline-flex rounded-md border px-1.5 py-0.5 ${toneClass}`}>
      {children}
    </span>
  );
}