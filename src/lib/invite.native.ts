import { Share, Platform } from 'react-native';

const APP_SCHEME = 'floq://'; // ensure this matches your Expo scheme
const APP_UNIVERSAL = 'https://app.floq.xyz'; // fallback universal link

export function buildFloqInviteUrl(floqId: string, params?: { ref?: string }) {
  const base = Platform.select({ ios: APP_UNIVERSAL, android: APP_UNIVERSAL, default: APP_UNIVERSAL });
  const url = `${base}/floq/${floqId}${params?.ref ? `?ref=${encodeURIComponent(params.ref)}` : ''}`;
  return url;
}

export async function shareInvite(floqId: string, opts?: { title?: string; text?: string; ref?: string }) {
  const url = buildFloqInviteUrl(floqId, { ref: opts?.ref });
  const message = `${opts?.text ?? 'Join my Floq'}\n${url}`;
  try {
    await Share.share({ title: opts?.title ?? 'Floq invite', message, url });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}