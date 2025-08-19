// Dynamic import to avoid bundling issues on web
let Share: any = null;
let Platform: any = null;

if (typeof window !== 'undefined' && (window as any).Expo) {
  try {
    const RN = require('react-native');
    Share = RN.Share;
    Platform = RN.Platform;
  } catch (e) {
    console.warn('React Native not available:', e);
  }
}

const APP_SCHEME = 'floq://'; // ensure this matches your Expo scheme
const APP_UNIVERSAL = 'https://app.floq.xyz'; // fallback universal link

export function buildFloqInviteUrl(floqId: string, params?: { ref?: string }) {
  const base = Platform?.select ? 
    Platform.select({ ios: APP_UNIVERSAL, android: APP_UNIVERSAL, default: APP_UNIVERSAL }) :
    APP_UNIVERSAL;
  const url = `${base}/floqs/${floqId}${params?.ref ? `?ref=${encodeURIComponent(params.ref)}` : ''}`;
  return url;
}

export async function shareInvite(floqId: string, opts?: { title?: string; text?: string; ref?: string }) {
  const url = buildFloqInviteUrl(floqId, { ref: opts?.ref });
  const message = `${opts?.text ?? 'Join my Floq'}\n${url}`;
  
  if (!Share) {
    // Fallback for web - copy to clipboard
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        return { ok: true, copied: true };
      }
    } catch (e) {
      return { ok: false, error: String(e) };
    }
    return { ok: false, error: 'Share not available' };
  }
  
  try {
    await Share.share({ title: opts?.title ?? 'Floq invite', message, url });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}