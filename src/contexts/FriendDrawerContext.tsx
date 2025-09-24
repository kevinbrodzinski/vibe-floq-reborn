import { createContext, useContext, useState } from 'react'

const FriendDrawerCtx = createContext<{
  open: boolean
  toggle: () => void
}>({ open: false, toggle: () => {} })

export const FriendDrawerProvider: React.FC<{ children: React.ReactNode }> =
  ({ children }) => {
    const [open, setOpen] = useState(false)
    return (
      <FriendDrawerCtx.Provider
        value={{ open, toggle: () => setOpen(o => !o) }}>
        {children}
      </FriendDrawerCtx.Provider>
    )
  }

export const useFriendDrawer = () => useContext(FriendDrawerCtx)