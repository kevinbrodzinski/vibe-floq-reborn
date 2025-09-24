import React from 'react'

type ToastKind = 'success' | 'error' | 'warn' | 'info'
type ToastItem = { id: string; kind: ToastKind; text: string; ttl: number }

type ToastContextValue = {
  push: (kind: ToastKind, text: string, ttl?: number) => void
}

const ToastCtx = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])

  const push = React.useCallback((kind: ToastKind, text: string, ttl = 2200) => {
    const id = Math.random().toString(36).slice(2)
    setItems(prev => [...prev, { id, kind, text, ttl }])
    // schedule auto remove
    setTimeout(() => {
      setItems(prev => prev.filter(t => t.id !== id))
    }, ttl + 100)
  }, [])

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <ToastHost items={items} />
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  const success = React.useCallback((text: string, ttl?: number) => ctx.push('success', text, ttl), [ctx])
  const error   = React.useCallback((text: string, ttl?: number) => ctx.push('error', text, ttl), [ctx])
  const warn    = React.useCallback((text: string, ttl?: number) => ctx.push('warn', text, ttl), [ctx])
  const info    = React.useCallback((text: string, ttl?: number) => ctx.push('info', text, ttl), [ctx])
  return { success, error, warn, info }
}

/** Host renders toasts; you can theme it with your tokens */
function ToastHost({ items }: { items: ToastItem[] }) {
  return (
    <div
      role="region" aria-live="polite" aria-label="Notifications"
      className="pointer-events-none fixed left-1/2 -translate-x-1/2 bottom-4 z-[9999] flex flex-col gap-2"
      style={{ minWidth: 220, maxWidth: 420 }}
    >
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-lg px-3 py-2 text-sm shadow-lg backdrop-blur"
          style={{
            background: bgFor(t.kind), color: '#fff',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
          role="status"
        >
          {iconFor(t.kind)} <span className="ml-1.5 align-middle">{t.text}</span>
        </div>
      ))}
    </div>
  )
}

function bgFor(kind: ToastKind) {
  switch (kind) {
    case 'success': return 'rgba(34,197,94,0.25)'   // green
    case 'error':   return 'rgba(239,68,68,0.30)'   // red
    case 'warn':    return 'rgba(245,158,11,0.28)'  // amber
    case 'info':    return 'rgba(59,130,246,0.25)'  // blue
  }
}
function iconFor(kind: ToastKind) {
  const style: React.CSSProperties = { fontWeight: 700 }
  return (
    <span aria-hidden style={style}>
      {kind === 'success' ? '✓' : kind === 'error' ? '!' : kind === 'warn' ? '⚠︎' : 'ℹ︎'}
    </span>
  )
}