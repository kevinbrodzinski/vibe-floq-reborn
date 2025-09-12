import * as React from 'react'

export function RallyInboxBridge() {
  React.useEffect(() => {
    const onNew = (e: WindowEventMap['floq:rally:inbox:new']) => {
      // For now, just log the new thread - can be extended to show notifications or navigate
      console.log('New rally thread created:', e.detail)
      
      // Could dispatch a badge update event or trigger a toast
      // window.dispatchEvent(new CustomEvent('floq:badge:inbox', { detail: { delta: +1 } }))
    }

    window.addEventListener('floq:rally:inbox:new', onNew as EventListener)
    return () => window.removeEventListener('floq:rally:inbox:new', onNew as EventListener)
  }, [])

  return null
}