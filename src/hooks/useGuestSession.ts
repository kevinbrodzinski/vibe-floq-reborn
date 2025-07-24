import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '@/lib/storage'

interface GuestSession {
  guestId: string
  guestName: string
  createdAt: string
  isAnonymous: boolean
}

export function useGuestSession() {
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize guest session
  useEffect(() => {
    const initializeGuestSession = async () => {
      try {
        // Check for existing session first
        const stored = await storage.getItem('floq_guest_session')
        const oldName = await storage.getItem('floq_guest_name')
        const oldId = await storage.getItem('guest_participant_id')
        
        if (stored) {
          const parsed = JSON.parse(stored)
          // Validate session (expire after 24 hours)
          const createdAt = new Date(parsed.createdAt)
          const now = new Date()
          const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 3600)
          
          if (hoursDiff < 24) {
            setGuestSession(parsed)
            setIsLoading(false)
            return
          }
        }

        // Migrate old session if exists
        if (oldId && oldName) {
          const migratedSession: GuestSession = {
            guestId: oldId,
            guestName: oldName,
            createdAt: new Date().toISOString(),
            isAnonymous: true
          }
          await storage.setJSON('floq_guest_session', migratedSession)
          await storage.removeItem('floq_guest_name')
          await storage.removeItem('guest_participant_id')
          setGuestSession(migratedSession)
          setIsLoading(false)
          return
        }

        // Create new guest session
        const newSession: GuestSession = {
          guestId: uuidv4(),
          guestName: generateGuestName(),
          createdAt: new Date().toISOString(),
          isAnonymous: true
        }

        await storage.setJSON('floq_guest_session', newSession)
        setGuestSession(newSession)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to initialize guest session:', error)
        setIsLoading(false)
      }
    }

    initializeGuestSession()
  }, [])

  // Generate a friendly guest name
  const generateGuestName = () => {
    const adjectives = ['Cool', 'Awesome', 'Happy', 'Smart', 'Kind', 'Bright', 'Swift', 'Bold']
    const nouns = ['Explorer', 'Traveler', 'Planner', 'Adventurer', 'Wanderer', 'Visitor', 'Friend', 'Guest']
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    const number = Math.floor(Math.random() * 1000)
    
    return `${adjective}${noun}${number}`
  }

  // Update guest name
  const updateGuestName = useCallback(async (newName: string) => {
    if (!guestSession) return

    const updated = { ...guestSession, guestName: newName }
    setGuestSession(updated)
    await storage.setJSON('floq_guest_session', updated)
  }, [guestSession])

  // Clear guest session
  const clearGuestSession = useCallback(async () => {
    await storage.removeItem('floq_guest_session')
    await storage.removeItem('floq_guest_name')
    await storage.removeItem('guest_participant_id')
    setGuestSession(null)
  }, [])

  // Regenerate guest session
  const regenerateGuestSession = useCallback(async () => {
    const newSession: GuestSession = {
      guestId: uuidv4(),
      guestName: generateGuestName(),
      createdAt: new Date().toISOString(),
      isAnonymous: true
    }

    await storage.setJSON('floq_guest_session', newSession)
    setGuestSession(newSession)
  }, [])

  // Legacy setGuestName for compatibility
  const setGuestName = useCallback(async (name: string) => {
    await updateGuestName(name)
  }, [updateGuestName])

  // Legacy saveGuestSession for compatibility
  const saveGuestSession = useCallback(async (participantId: string, name: string) => {
    const newSession: GuestSession = {
      guestId: participantId,
      guestName: name,
      createdAt: new Date().toISOString(),
      isAnonymous: true
    }
    
    await storage.setJSON('floq_guest_session', newSession)
    setGuestSession(newSession)
  }, [])

  return {
    // New enhanced API
    guestSession,
    isLoading,
    updateGuestName,
    regenerateGuestSession,
    
    // Backward compatibility
    guestName: guestSession?.guestName || null,
    guestId: guestSession?.guestId || null,
    isGuest: !!guestSession?.guestId,
    setGuestName,
    saveGuestSession,
    clearGuestSession
  }
}