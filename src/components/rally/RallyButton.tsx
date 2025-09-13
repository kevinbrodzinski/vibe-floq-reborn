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
  /** render even without a "natural" moment (explicit CTA) */
  allowSolo?: boolean
}

export function RallyButton({
  lastPingAtMs, recipientIds, ttlMin = 60, note, className, onCreated, allowSolo = false
}: Props) {
  const { toast } = useToast();
  const map = getCurrentMap();
  const [busy, setBusy] = React.useState(false);

  // TODO: wire actual counts
  const nearby = 3
  const cohesion01 = 0.6
  
  const ok = allowSolo
    ? true
    : shouldOfferGroupPing({
        nearbyFriends: nearby,
        cohesion01,
        convergenceProb: undefined,
        lastPingAtMs: lastPingAtMs ?? null,
        localHour: new Date().getHours(),
        userActive: true,
      })

  if (!ok) return null

  const isSolo = allowSolo && nearby < 2
  const baseLabel = groupPingLabel(nearby, cohesion01)
  const computedLabel = isSolo ? 'Start Rally' : baseLabel
  const computedAria = isSolo
    ? 'Start a Rally'
    : `${baseLabel} - Start rally with ${nearby} nearby friends`
  const inferredRecipients: string[] = Array.isArray(recipientIds) ? recipientIds : []
  const computedNote =
    typeof note === 'string'
      ? note
      : (isSolo ? 'Solo rally' : (inferredRecipients.length ? 'Friends rally' : 'Rally'))

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const c = map?.getCenter?.()
      if (!c) throw new Error('Map not ready')
      const { rallyId, invited } = await createRally({
        center: { lng: c.lng, lat: c.lat },
        ttlMin,
        recipients: inferredRecipients,
        note: computedNote
      })
      onCreated?.(rallyId)
      toast({ title: 'Rally created', description: invited ? `Invited ${invited} friends` : 'Rally is live' })
    } catch (e:any) {
      toast({ title: 'Could not create rally', description: e?.message ?? 'Try again', variant: 'destructive' })
    } finally {
      setBusy(false);
    }
  }

  return (
    <Chip
      color="indigo"
      onClick={onClick}
      className={className}
      icon={<span aria-hidden>⚡</span>}
      aria-label={computedAria}
      aria-busy={busy || undefined}
      type="button"
      disabled={busy}
    >
      {busy ? 'Starting…' : computedLabel}
    </Chip>
  )
}