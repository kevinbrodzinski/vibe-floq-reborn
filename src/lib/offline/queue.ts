import { MMKV } from 'react-native-mmkv';
import NetInfo from '@react-native-community/netinfo';
import { uploadAvatar } from '@/lib/avatar';

const storage = new MMKV();
const KEY = 'pendingUploads';

export interface PendingUpload {
  localUri: string;
  ts: number;
}

export function enqueueUpload(item: PendingUpload) {
  const list: PendingUpload[] = JSON.parse(storage.getString(KEY) || '[]');
  list.push(item);
  storage.set(KEY, JSON.stringify(list));
}

export async function flushQueue() {
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

// Auto-flush whenever we come back online
NetInfo.addEventListener(state => {
  if (state.isInternetReachable) flushQueue();
});

/* helper */
async function uriToFile(uri: string, filename: string) {
  const res = await fetch(uri);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}