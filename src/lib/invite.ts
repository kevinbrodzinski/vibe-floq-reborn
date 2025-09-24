// Platform-agnostic invite functions
// The bundler will resolve to the appropriate .web or .native file

export function buildFloqInviteUrl(floqId: string, params?: { ref?: string }): string {
  // This will be overridden by platform-specific implementations
  const baseUrl = typeof window !== 'undefined' 
    ? (window.location.origin || 'https://app.floq.xyz')
    : 'https://app.floq.xyz';
  
  const url = new URL(`${baseUrl}/floqs/${floqId}`);
  if (params?.ref) url.searchParams.set('ref', params.ref);
  return url.toString();
}

export async function shareInvite(floqId: string, opts?: { title?: string; text?: string; ref?: string }) {
  const url = buildFloqInviteUrl(floqId, { ref: opts?.ref });
  const title = opts?.title ?? 'Join my Floq';
  const text = opts?.text ?? 'Pull up';

  // Web implementation as fallback
  if (typeof navigator !== 'undefined' && navigator.share) {
    try { 
      await navigator.share({ title, text, url }); 
      return { ok: true }; 
    } catch (e) { 
      return { ok: false, error: String(e) }; 
    }
  }
  
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url);
      return { ok: true, copied: true, url };
    } catch (e) {
      return { ok: false, url };
    }
  }
  
  return { ok: false, url };
}