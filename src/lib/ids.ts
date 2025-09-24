export function normalizeId(id?: string | null): string | null {
  const v = (id ?? '').trim().toLowerCase();
  if (!v || v === 'null' || v === 'undefined' || v === 'nan') return null;
  return id!;
}

export function assertUuid(id: string | null | undefined, ctx = 'id'): string {
  const v = normalizeId(id);
  if (!v) throw new Error(`[ids] Missing UUID for ${ctx}`);
  return v;
}