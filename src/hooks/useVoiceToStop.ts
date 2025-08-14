import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import * as chrono from 'chrono-node'
import { supabase } from '@/integrations/supabase/client'
import { useUnifiedPlanStops } from './useUnifiedPlanStops'
import { VoiceError, VoiceState, ParsedStop } from '@/types/voice'

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult
  length: number
}

type Listener = (transcript: string, isFinal: boolean) => void

let webRecognizer: any = null

const startWebRecognition = (onResult: Listener, onErr: (e: any) => void) => {
  // SSR guard
  if (typeof window === 'undefined') {
    return onErr('SpeechRecognition not available on server')
  }
  
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return onErr('SpeechRecognition not supported')
  
  // Clean up any existing recognizer
  if (webRecognizer) {
    webRecognizer.abort()
    webRecognizer = null
  }
  
  webRecognizer = new SR()
  webRecognizer.lang = 'en-US'
  webRecognizer.interimResults = true
  webRecognizer.continuous = false
  webRecognizer.maxAlternatives = 1
  
  webRecognizer.onresult = (ev: SpeechRecognitionEvent) => {
    const res = ev.results[ev.results.length - 1]
    onResult(res[0].transcript, res.isFinal)
  }
  
  webRecognizer.onerror = (e: any) => onErr(e.error)
  webRecognizer.start()
  
  return () => webRecognizer?.stop()
}

export function useVoiceToStop(planId: string, planDate: string) {
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const stopFuncRef = useRef<(() => void) | undefined>()
  const { createStop } = useUnifiedPlanStops(planId)

  // Start listening
  const start = useCallback(() => {
    if (state === 'listening') return
    setState('listening')
    setTranscript('')

    const handleResult = (text: string, isFinal: boolean) => {
      setTranscript(text)
      if (isFinal) {
        stop() // clean listeners
        handleTranscript(text)
      }
    }
    
    const handleError = (err: any) => {
      console.warn('voice-error', err)
      setState('error')
      toast.error('Microphone error. Please try again.')
    }

    const cleanup = startWebRecognition(handleResult, handleError)
    if (cleanup) {
      stopFuncRef.current = cleanup
    }
  }, [state])

  const stop = useCallback(async () => {
    // Platform-specific cleanup for parity
    if (typeof window !== 'undefined') {
      webRecognizer?.stop()
    } else {
      // RN cleanup with proper stop before destroy
      try {
        await (window as any).rnVoice?.stop?.()
      } catch {}
      await (window as any).rnVoice?.destroy?.()
    }
    stopFuncRef.current?.()
    setState('idle')
  }, [])

  // Parse transcript and create stop
  const handleTranscript = async (text: string) => {
    setState('parsing')
    let parsed: ParsedStop | null = null

    // Try simple regex parsing first
    parsed = regexParse(text, planDate)
    
    if (!parsed) {
      // Fall back to OpenAI parsing
      try {
        const { data, error } = await supabase.functions.invoke('parse-voice-to-stop', {
          body: { transcript: text, planDate }
        })
        
        if (error) throw error
        parsed = data.parsed
      } catch (err) {
        console.error('Voice parsing error:', err)
      }
    }

    if (!parsed) {
      toast.error('Sorry, couldn\'t understand that')
      setState('idle')
      return
    }

    setState('creating')
    
    try {
      await createStop.mutateAsync({
        plan_id: planId,
        title: parsed.title,
        start_time: parsed.startTime,
        end_time: parsed.endTime,
        description: parsed.description || `Added via voice: "${text}"`,
        duration_minutes: parsed.endTime ? undefined : 60,
      })
      
      toast.success('Stop added 🎤')
      setState('idle')
    } catch (err) {
      console.error('Failed to add stop:', err)
      toast.error('Failed to add stop')
      setState('error')
    }
  }

  // Cleanup on unmount
  useEffect(() => () => stopFuncRef.current?.(), [])

  return { state, transcript, start, stop }
}

// Parse using chrono-node first, then regex fallback
function regexParse(text: string, planDate: string): ParsedStop | null {
  const baseDate = new Date(planDate)
  
  // Try chrono-node first for better time parsing
  const chronoDate = chrono.parseDate(text, baseDate)
  if (chronoDate) {
    // Extract title by removing time-related phrases
    const title = text
      .replace(/\b(?:at|from|to|until)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi, '')
      .replace(/\b(?:add|go to|visit|meet at)\b/gi, '')
      .trim()
    
    if (title) {
      const startTime = `${chronoDate.getHours().toString().padStart(2, '0')}:${chronoDate.getMinutes().toString().padStart(2, '0')}`
      return {
        title: title.trim(),
        startTime,
        endTime: undefined,
        venue: title.trim(),
      }
    }
  }

  // Fallback to regex patterns for more complex cases
  const patterns = [
    /(?:add|go to|visit|meet at)\s+(.+?)\s+(?:at|from)\s+(.+?)(?:\s+to\s+(.+?))?$/i,
    /(.+?)\s+at\s+(.+?)(?:\s+to\s+(.+?))?$/i,
    /at\s+(.+?)\s+(.+?)(?:\s+to\s+(.+?))?$/i
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match) continue

    let title: string, timeStr: string, endTimeStr: string | undefined

    if (match.length === 4) {
      [, title, timeStr, endTimeStr] = match
    } else {
      continue
    }

    const parsedStart = chrono.parseDate(timeStr, baseDate)
    if (!parsedStart) continue

    const startTime = `${parsedStart.getHours().toString().padStart(2, '0')}:${parsedStart.getMinutes().toString().padStart(2, '0')}`
    
    let endTime: string | undefined
    if (endTimeStr) {
      const parsedEnd = chrono.parseDate(endTimeStr, baseDate)
      if (parsedEnd) {
        endTime = `${parsedEnd.getHours().toString().padStart(2, '0')}:${parsedEnd.getMinutes().toString().padStart(2, '0')}`
      }
    }

    return {
      title: title.trim(),
      startTime,
      endTime,
      venue: title.trim(),
    }
  }

  return null
}