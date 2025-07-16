import { useState, useCallback, useContext, createContext, ReactNode } from 'react'

interface InvitesDrawerContextType {
  showInvites: boolean
  setShowInvites: (show: boolean) => void
  toggleInvites: () => void
}

const InvitesDrawerContext = createContext<InvitesDrawerContextType | null>(null)

export function InvitesDrawerProvider({ children }: { children: ReactNode }) {
  const [showInvites, setShowInvites] = useState(false)
  
  const toggleInvites = useCallback(() => {
    setShowInvites(prev => !prev)
  }, [])

  return (
    <InvitesDrawerContext.Provider value={{ showInvites, setShowInvites, toggleInvites }}>
      {children}
    </InvitesDrawerContext.Provider>
  )
}

export function useInvitesDrawer() {
  const context = useContext(InvitesDrawerContext)
  if (!context) {
    throw new Error('useInvitesDrawer must be used within InvitesDrawerProvider')
  }
  return context
}