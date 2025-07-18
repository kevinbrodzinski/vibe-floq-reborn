import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  MapPin, 
  Users, 
  Activity, 
  Zap, 
  Clock,
  Hash,
  Database,
  Sparkles,
  Navigation,
  Wifi
} from 'lucide-react'
import { motion } from 'framer-motion'

interface MomentMetadataExpandedProps {
  metadata: Record<string, any>
}

export function MomentMetadataExpanded({ metadata }: MomentMetadataExpandedProps) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No metadata available</p>
        <p className="text-sm">This moment has minimal technical data</p>
      </div>
    )
  }

  const renderValue = (value: any, key: string): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">null</span>
    }
    
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'} className="text-xs">
          {value ? 'true' : 'false'}
        </Badge>
      )
    }
    
    if (typeof value === 'number') {
      if (key.includes('lat') || key.includes('lng') || key.includes('coordinate')) {
        return <span className="font-mono text-sm">{value.toFixed(6)}</span>
      }
      if (key.includes('distance') || key.includes('accuracy')) {
        return <span className="font-mono text-sm">{value.toFixed(2)}</span>
      }
      return <span className="font-mono text-sm">{value}</span>
    }
    
    if (typeof value === 'string') {
      if (value.includes('http')) {
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm break-all"
          >
            {value}
          </a>
        )
      }
      if (value.length > 100) {
        return (
          <details className="cursor-pointer">
            <summary className="text-sm text-muted-foreground">
              {value.substring(0, 100)}... (click to expand)
            </summary>
            <div className="mt-2 p-2 bg-muted/50 rounded text-sm font-mono">
              {value}
            </div>
          </details>
        )
      }
      return <span className="text-sm">{value}</span>
    }
    
    if (Array.isArray(value)) {
      return (
        <div className="space-y-1">
          {value.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">#{index}</span>
              {renderValue(item, `${key}[${index}]`)}
            </div>
          ))}
        </div>
      )
    }
    
    if (typeof value === 'object') {
      return (
        <div className="space-y-2 pl-4 border-l-2 border-muted">
          {Object.entries(value).map(([subKey, subValue]) => (
            <div key={subKey} className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">{subKey}</div>
              {renderValue(subValue, subKey)}
            </div>
          ))}
        </div>
      )
    }
    
    return <span className="text-sm">{String(value)}</span>
  }

  const getIconForKey = (key: string) => {
    const lowerKey = key.toLowerCase()
    
    if (lowerKey.includes('location') || lowerKey.includes('coord') || lowerKey.includes('lat') || lowerKey.includes('lng')) {
      return <MapPin className="w-4 h-4" />
    }
    if (lowerKey.includes('people') || lowerKey.includes('user') || lowerKey.includes('social')) {
      return <Users className="w-4 h-4" />
    }
    if (lowerKey.includes('activity') || lowerKey.includes('action')) {
      return <Activity className="w-4 h-4" />
    }
    if (lowerKey.includes('intensity') || lowerKey.includes('energy') || lowerKey.includes('power')) {
      return <Zap className="w-4 h-4" />
    }
    if (lowerKey.includes('time') || lowerKey.includes('duration') || lowerKey.includes('timestamp')) {
      return <Clock className="w-4 h-4" />
    }
    if (lowerKey.includes('vibe') || lowerKey.includes('mood') || lowerKey.includes('emotion')) {
      return <Sparkles className="w-4 h-4" />
    }
    if (lowerKey.includes('distance') || lowerKey.includes('direction') || lowerKey.includes('bearing')) {
      return <Navigation className="w-4 h-4" />
    }
    if (lowerKey.includes('network') || lowerKey.includes('connection') || lowerKey.includes('signal')) {
      return <Wifi className="w-4 h-4" />
    }
    if (lowerKey.includes('id') || lowerKey.includes('hash') || lowerKey.includes('key')) {
      return <Hash className="w-4 h-4" />
    }
    
    return <Database className="w-4 h-4" />
  }

  const getSectionColor = (key: string) => {
    const lowerKey = key.toLowerCase()
    
    if (lowerKey.includes('location')) return 'hsl(var(--primary))'
    if (lowerKey.includes('people') || lowerKey.includes('social')) return 'hsl(var(--secondary))'
    if (lowerKey.includes('activity')) return 'hsl(var(--accent))'
    if (lowerKey.includes('vibe')) return 'hsl(var(--primary))'
    
    return 'hsl(var(--muted-foreground))'
  }

  const metadataEntries = Object.entries(metadata)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Technical Metadata</h3>
        <p className="text-sm text-muted-foreground">
          Raw data captured with this moment
        </p>
      </div>

      <div className="space-y-4">
        {metadataEntries.map(([key, value], index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center mt-1 flex-shrink-0"
                  style={{ backgroundColor: `${getSectionColor(key)}20`, color: getSectionColor(key) }}
                >
                  {getIconForKey(key)}
                </div>
                
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{key}</h4>
                    <Badge variant="outline" className="text-xs">
                      {typeof value === 'object' && value !== null 
                        ? Array.isArray(value) ? 'array' : 'object'
                        : typeof value
                      }
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {renderValue(value, key)}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Separator />

      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Location data includes GPS coordinates and venue information</p>
        <p>• Social context tracks interactions and nearby people</p>
        <p>• Activity data captures movement and engagement patterns</p>
        <p>• Temporal data records precise timing and duration</p>
      </div>
    </div>
  )
}