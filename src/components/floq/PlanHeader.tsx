import { ChevronLeft, Share2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useNavigate } from 'react-router-dom'
import { usePlanPresence } from '@/hooks/usePlanPresence'
import type { Database } from '@/integrations/supabase/Database'
import type { FloqDetails } from '@/hooks/useFloqDetails'

type Plan = Database['public']['Tables']['floq_plans']['Row']

interface Props {
  floq: FloqDetails
  plan: Plan
}

function getStatusBadgeProps(status: string) {
  switch (status) {
    case 'draft':
      return { color: 'bg-yellow-500', label: 'Draft' }
    case 'planning':
      return { color: 'bg-blue-500', label: 'Planning' }
    case 'executing':
      return { color: 'bg-green-500', label: 'Live' }
    case 'completed':
      return { color: 'bg-gray-500', label: 'Done' }
    default:
      return { color: 'bg-gray-400', label: 'Unknown' }
  }
}

export function PlanHeader({ floq, plan }: Props) {
  const navigate = useNavigate()
  const { participants: presenceParticipants } = usePlanPresence(plan.id, { silent: false })
  const onlineCount = presenceParticipants.filter(p => p.isOnline).length
  const { color, label } = getStatusBadgeProps(plan.status || 'draft')

  return (
    <div className="px-4 pt-3 pb-2 flex items-center gap-3 bg-background/95 backdrop-blur-md border-b">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => navigate(-1)}
        className="h-8 w-8"
      >
        <ChevronLeft size={18} />
      </Button>

      <Avatar className="h-8 w-8">
        <AvatarImage src={floq.name || undefined} />
        <AvatarFallback>{floq.title?.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <h2 className="font-medium text-sm truncate">
          {plan.title || 'Untitled Plan'}
        </h2>
        <p className="text-xs text-muted-foreground truncate">
          {floq.title}
        </p>
      </div>

      {onlineCount > 0 && (
        <Badge variant="outline" className="flex items-center gap-1 text-xs">
          <Eye className="w-3 h-3" />
          {onlineCount}
        </Badge>
      )}

      <Badge variant="secondary" className={`${color} text-white text-xs`}>
        {label}
      </Badge>

      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Share2 size={16} />
      </Button>
    </div>
  )
}