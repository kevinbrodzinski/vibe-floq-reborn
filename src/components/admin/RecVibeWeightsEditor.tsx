import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type VibeWeights = {
  vibe: string;
  w_distance: number;
  w_rating: number;
  w_popularity: number;
  w_tag_match: number;
  w_cuisine_match: number;
  w_price_fit: number;
  updated_at?: string;
};

function toNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function RecVibeWeightsEditor() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<VibeWeights[] | null>(null);
  const [filter, setFilter] = useState('');

  const { data, isLoading, isError } = useQuery<VibeWeights[]>({
    queryKey: ['rec_vibe_weights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rec_vibe_weights')
        .select('*')
        .order('vibe');
      if (error) throw new Error(error.message);
      return (data ?? []) as VibeWeights[];
    },
    staleTime: 15_000,
  });

  useEffect(() => {
    if (data && drafts == null) setDrafts(data);
  }, [data]);

  const filtered = useMemo(() => {
    if (!drafts) return [];
    if (!filter.trim()) return drafts;
    const f = filter.toLowerCase();
    return drafts.filter((r) => r.vibe.toLowerCase().includes(f));
  }, [drafts, filter]);

  const saveMutation = useMutation({
    mutationFn: async (rows: VibeWeights[]) => {
      const payload = rows.map((r) => ({
        ...r,
        w_distance: toNum(r.w_distance, 0.25),
        w_rating: toNum(r.w_rating, 0.2),
        w_popularity: toNum(r.w_popularity, 0.2),
        w_tag_match: toNum(r.w_tag_match, 0.15),
        w_cuisine_match: toNum(r.w_cuisine_match, 0.1),
        w_price_fit: toNum(r.w_price_fit, 0.1),
      }));
      const { error } = await supabase.from('rec_vibe_weights').upsert(payload, { onConflict: 'vibe' });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rec_vibe_weights'] });
    },
  });

  const deleteRow = useMutation({
    mutationFn: async (vibe: string) => {
      const { error } = await supabase.from('rec_vibe_weights').delete().eq('vibe', vibe);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setDrafts((d) => (d ? d.filter((r) => r.vibe !== undefined && r.vibe !== '') : d));
      queryClient.invalidateQueries({ queryKey: ['rec_vibe_weights'] });
    },
  });

  if (isLoading) return <div className="p-4 text-sm">Loading weights…</div>;
  if (isError) return <div className="p-4 text-sm text-red-600">Failed to load weights</div>;
  if (!drafts) return null;

  const updateCell = (i: number, key: keyof VibeWeights, val: string) => {
    setDrafts((rows) => {
      if (!rows) return rows;
      const next = rows.slice();
      const row = { ...next[i] } as any;
      row[key] = key === 'vibe' ? val : Number(val);
      next[i] = row;
      return next;
    });
  };

  const addRow = () => {
    setDrafts((rows) => [
      ...(rows ?? []),
      {
        vibe: '',
        w_distance: 0.25,
        w_rating: 0.2,
        w_popularity: 0.2,
        w_tag_match: 0.15,
        w_cuisine_match: 0.1,
        w_price_fit: 0.1,
      },
    ]);
  };

  const saveAll = () => drafts && saveMutation.mutate(drafts);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Vibe weights</h2>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter vibes…"
            className="border rounded px-2 py-1 text-sm"
          />
          <button onClick={addRow} className="px-3 py-1 text-sm border rounded">Add</button>
          <button
            onClick={saveAll}
            disabled={saveMutation.isPending}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save all'}
          </button>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 text-left border">Vibe</th>
              <th className="p-2 text-right border">w_distance</th>
              <th className="p-2 text-right border">w_rating</th>
              <th className="p-2 text-right border">w_popularity</th>
              <th className="p-2 text-right border">w_tag_match</th>
              <th className="p-2 text-right border">w_cuisine_match</th>
              <th className="p-2 text-right border">w_price_fit</th>
              <th className="p-2 text-right border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} className="odd:bg-white even:bg-gray-50">
                <td className="p-2 border">
                  <input
                    value={row.vibe}
                    onChange={(e) => updateCell(i, 'vibe', e.target.value)}
                    className="w-40 border rounded px-2 py-1"
                    placeholder="e.g. hype"
                  />
                </td>
                {(['w_distance','w_rating','w_popularity','w_tag_match','w_cuisine_match','w_price_fit'] as const).map((k) => (
                  <td key={k} className="p-2 border text-right">
                    <input
                      type="number"
                      step="0.01"
                      value={String((row as any)[k] ?? 0)}
                      onChange={(e) => updateCell(i, k, e.target.value)}
                      className="w-24 border rounded px-2 py-1 text-right"
                    />
                  </td>
                ))}
                <td className="p-2 border text-right">
                  <button
                    onClick={() => deleteRow.mutate(row.vibe)}
                    className="px-2 py-1 text-xs text-red-600 border rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RecVibeWeightsEditor;