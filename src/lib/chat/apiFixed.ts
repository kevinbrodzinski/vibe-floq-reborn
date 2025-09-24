type ApiOk<T> = { ok: true; status: number; data: T }
type ApiErr = { ok: false; status: number; error: unknown }

export async function api<T>(...args: Parameters<typeof fetch>): Promise<ApiOk<T> | ApiErr> {
  const res = await fetch(...args)
  try {
    const json = await res.json()
    return res.ok ? { ok: true, status: res.status, data: json as T }
                  : { ok: false, status: res.status, error: (json as any)?.error ?? json }
  } catch {
    const text = await res.text()
    return res.ok ? { ok: true, status: res.status, data: text as unknown as T }
                  : { ok: false, status: res.status, error: text }
  }
}