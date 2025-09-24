export type VoiceState =
  | 'idle'
  | 'listening'
  | 'parsing'
  | 'creating'
  | 'error'

export interface ParsedStop {
  title: string
  startTime: string
  endTime?: string
  venue?: string
  description?: string
}

export interface VoiceError {
  code: string
  message: string
}