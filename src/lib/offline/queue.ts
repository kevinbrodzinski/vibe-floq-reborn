import { Platform } from 'react-native';
import { uploadAvatar } from '@/lib/avatar';

// Only import native dependencies when not on web
let MMKV: any = null;
let NetInfo: any = null;

if (Platform.OS !== 'web') {
  try {
    MMKV = require('react-native-mmkv').MMKV;
    NetInfo = require('@react-native-community/netinfo').default;
  } catch (e) {
    console.warn('Native storage/network modules not available:', e);
  }
}

let storage: any = null;

if (Platform.OS !== 'web' && MMKV) {
  storage = new MMKV();
}

const KEY = 'pendingUploads';

export interface PendingUpload {
  localUri: string;
  ts: number;
}

export function enqueueUpload(item: PendingUpload) {
  if (!storage) return; // No-op on web
  const list: PendingUpload[] = JSON.parse(storage.getString(KEY) || '[]');
  list.push(item);
  storage.set(KEY, JSON.stringify(list));
}

export async function flushQueue() {
  if (!storage) return; // No-op on web
  const list: PendingUpload[] = JSON.parse(storage.getString(KEY) || '[]');
  if (list.length === 0) return;

  const stillPending: PendingUpload[] = [];
  for (const item of list) {
    try {
      const file = await uriToFile(item.localUri, `${crypto.randomUUID()}.jpg`);
      const { error } = await uploadAvatar(file);
      if (error) throw new Error(error);
    } catch {
      stillPending.push(item); // keep for next try
    }
  }
  storage.set(KEY, JSON.stringify(stillPending));
}

// Auto-flush whenever we come back online (only on native)
if (Platform.OS !== 'web' && NetInfo) {
  NetInfo.addEventListener((state: any) => {
    if (state.isInternetReachable) flushQueue();
  });
}

/* helper */
async function uriToFile(uri: string, filename: string) {
  const res = await fetch(uri);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}