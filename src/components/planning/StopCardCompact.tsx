import React from 'react'
import { Clock, MapPin, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PlanStop } from '@/types/plan'

interface StopCardCompactProps {
  stop: PlanStop
  onLongPress?: () => void
  active?: boolean
  draggable?: boolean
  style?: React.CSSProperties
}

function StopCardCompactInner({ 
  stop, 
  onLongPress, 
  active = false, 
  draggable = false,
  style,
  ...rest 
}: StopCardCompactProps) {
  return (
    <Card 
      className={`transition-all duration-200 ${
        active ? 'shadow-lg scale-105 border-primary' : 'shadow-sm'
      }`}
      style={style}
      {...rest}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate text-foreground">
              {stop.title || 'Untitled Stop'}
            </h3>
            
            <div className="flex items-center gap-2 mt-1">
              {stop.start_time && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {stop.start_time}
                </div>
              )}
              
              {stop.venue && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-20">{stop.venue}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 ml-2">
            {stop.status && (
              <Badge 
                variant={stop.status === 'confirmed' ? 'default' : 'secondary'}
                className="text-xs px-1.5 py-0.5"
              >
                {stop.status}
              </Badge>
            )}
            
            {draggable && (
              <div className="w-6 h-6 flex items-center justify-center text-muted-foreground">
                <div className="w-1 h-1 bg-current rounded-full"></div>
                <div className="w-1 h-1 bg-current rounded-full ml-0.5"></div>
                <div className="w-1 h-1 bg-current rounded-full ml-0.5"></div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const StopCardCompact = React.memo(
  StopCardCompactInner,
  (prev, next) =>
    prev.stop.id === next.stop.id &&
    prev.stop.stop_order === next.stop.stop_order &&
    prev.active === next.active
)