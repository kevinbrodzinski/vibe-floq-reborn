export function toastOk(msg: string) {
  try { (window as any).__toast?.success?.(msg); } catch {}
  console.info('✅', msg);
}

export function toastWarn(msg: string) {
  try { (window as any).__toast?.warning?.(msg); } catch {}
  console.warn('⚠️', msg);
}

export function toastErr(msg: string) {
  try { (window as any).__toast?.error?.(msg); } catch {}
  console.error('❌', msg);
}