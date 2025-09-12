import * as React from 'react'
import { Chip } from '@/components/ui/Chip'
import { useToast } from '@/hooks/use-toast'
import { getCurrentMap } from '@/lib/geo/mapSingleton'
import { createRally } from '@/lib/api/rally'

// Simple eligibility functions - inline for now
function shouldOfferGroupPing(args: {
  nearbyFriends: number
  cohesion01?: number
  convergenceProb?: number
  lastPingAtMs?: number | null
  localHour?: number
  userActive?: boolean
}): boolean {
  const { nearbyFriends, cohesion01 = 0, convergenceProb = 0, lastPingAtMs, userActive = true } = args
  if (!userActive) return false
  if (nearbyFriends < 2) return false
  const natural = cohesion01 >= 0.55 || convergenceProb >= 0.65
  if (!natural) return false
  if (typeof lastPingAtMs === 'number' && Date.now() - lastPingAtMs < 600000) return false // 10 min
  return true
}

function groupPingLabel(nearby: number, cohesion01 = 0): string {
  if (nearby >= 4 && cohesion01 >= 0.7) return 'Rally the crew'
  if (nearby >= 3) return 'Rally nearby friends'
  return 'Rally here'
}

type Props = {
  lastPingAtMs?: number | null
  recipientIds?: string[]          // optional override
  ttlMin?: number
  note?: string
  className?: string
  onCreated?: (rallyId: string) => void
}

export function RallyButton({
  lastPingAtMs, recipientIds, ttlMin = 60, note, className, onCreated
}: Props) {
  const { toast } = useToast()
  const map = getCurrentMap()

  // Mock data for now
  const nearby = 3
  const cohesion01 = 0.6
  
  const ok = shouldOfferGroupPing({
    nearbyFriends: nearby,
    cohesion01,
    convergenceProb: undefined,
    lastPingAtMs: lastPingAtMs ?? null,
    localHour: new Date().getHours(),
    userActive: true
  })

  if (!ok) return null

  const label = groupPingLabel(nearby, cohesion01)

  // Use provided recipients or mock for now
  const inferredRecipients: string[] = recipientIds ?? []

  const onClick = async () => {
    try {
      const c = map?.getCenter?.()
      if (!c) throw new Error('Map not ready')
      const { rallyId, invited } = await createRally({
        center: { lng: c.lng, lat: c.lat },
        ttlMin,
        recipients: inferredRecipients,
        note
      })
      onCreated?.(rallyId)
      toast({ title: 'Rally created', description: invited ? `Invited ${invited} friends` : 'Rally is live' })
    } catch (e:any) {
      toast({ title: 'Could not create rally', description: e?.message ?? 'Try again', variant: 'destructive' })
    }
  }

  return (
    <Chip 
      color="indigo" 
      onClick={onClick} 
      className={className} 
      icon={<span aria-hidden>⚡</span>}
      aria-label={`${label} - Start rally with ${nearby} nearby friends`}
      type="button"
    >
      {label}
    </Chip>
  )
}