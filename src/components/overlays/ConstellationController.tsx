import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchConstellation, type ConstellationEdge } from '@/lib/api/constellationClient';
import { ConstellationCanvas } from './ConstellationCanvas';
import { QuickInvitePopover } from './QuickInvitePopover';

type Party = { id: string; mass?: number; vibe?: string };

export function ConstellationController({
  active, party, edges = [], seed,
  onInvite
}: {
  active: boolean;
  party: Party[];
  edges?: ConstellationEdge[];
  seed?: string;
  onInvite?: (userId: string) => void;
}) {
  const q = useQuery({
    queryKey: ['constellation', party.map(p => p.id).join(','), edges.length, seed],
    queryFn: () => fetchConstellation({ party, edges, seed }),
    staleTime: 120_000,
    enabled: active && party.length > 0,
  });

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [showInvite, setShowInvite] = React.useState(false);
  const hitRef = React.useRef<HTMLDivElement | null>(null);

  const onClick = (e: React.MouseEvent) => {
    if (!q.data?.nodes?.length) return;
    const box = hitRef.current?.getBoundingClientRect(); if (!box) return;
    const x = e.clientX - box.left, y = e.clientY - box.top;
    const w = box.width, h = box.height;

    let bestId: string | null = null, bestD = Infinity;
    for (const n of q.data.nodes) {
      const nx = n.pos[0] * w, ny = n.pos[1] * h;
      const r = 12 + (n.mass ?? 1) * 4;
      const d = (nx - x) ** 2 + (ny - y) ** 2;
      if (d <= r * r && d < bestD) { bestD = d; bestId = n.id; }
    }
    if (bestId) { setSelectedId(bestId); setShowInvite(true); }
  };

  const closePopover = () => setShowInvite(false);
  const sendInvite = (id: string) => { onInvite?.(id); setShowInvite(false); };

  return (
    <>
      <ConstellationCanvas
        active={active}
        party={party}
        edges={edges}
        seed={seed}
        highlightId={selectedId ?? undefined}
      />
      <div
        ref={hitRef}
        onClick={active ? onClick : undefined}
        style={{ position:'absolute', inset:0, zIndex:590, pointerEvents: active ? 'auto' : 'none', background:'transparent' }}
      />
      {showInvite && selectedId && (
        <QuickInvitePopover
          userId={selectedId}
          onClose={closePopover}
          onInvite={sendInvite}
        />
      )}
    </>
  );
}