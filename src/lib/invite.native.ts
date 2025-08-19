// Native invite implementation - web-safe fallback
const APP_SCHEME = 'floq://'; // ensure this matches your Expo scheme
const APP_UNIVERSAL = 'https://app.floq.xyz'; // fallback universal link

export function buildFloqInviteUrl(floqId: string, params?: { ref?: string }) {
  // Use universal links for web builds
  const url = `${APP_UNIVERSAL}/floqs/${floqId}${params?.ref ? `?ref=${encodeURIComponent(params.ref)}` : ''}`;
  return url;
}

export async function shareInvite(floqId: string, opts?: { title?: string; text?: string; ref?: string }) {
  const url = buildFloqInviteUrl(floqId, { ref: opts?.ref });
  const message = `${opts?.text ?? 'Join my Floq'}\n${url}`;
  
  // Web fallback - copy to clipboard
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      return { ok: true, copied: true };
    }
  } catch (e) {
    return { ok: false, error: String(e) };
  }
  
  return { ok: false, error: 'Share not available on web', url };
}