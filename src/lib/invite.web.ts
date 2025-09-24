const APP_BASE = (import.meta as any).env.VITE_APP_BASE_URL || 'https://app.floq.xyz';

export function buildFloqInviteUrl(floqId: string, params?: { ref?: string }) {
  const url = new URL(`${APP_BASE}/floq/${floqId}`);
  if (params?.ref) url.searchParams.set('ref', params.ref);
  return url.toString();
}

export async function shareInvite(floqId: string, opts?: { title?: string; text?: string; ref?: string }) {
  const url = buildFloqInviteUrl(floqId, { ref: opts?.ref });
  const title = opts?.title ?? 'Join my Floq';
  const text = opts?.text ?? 'Pull up';

  if (navigator.share) {
    try { await navigator.share({ title, text, url }); return { ok: true }; } catch (e) { return { ok: false, error: String(e) }; }
  }
  try {
    await navigator.clipboard.writeText(url);
    return { ok: true, copied: true, url };
  } catch (e) {
    return { ok: false, url };
  }
}