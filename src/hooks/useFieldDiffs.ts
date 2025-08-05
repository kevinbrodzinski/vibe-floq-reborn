import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface FieldChange {
  tile_id: string
  old_data: any
  new_data: any
  timestamp: number
}

export function useFieldDiffs() {
  const [fieldChanges, setFieldChanges] = useState<FieldChange[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const channel = supabase
      .channel('field-changes')
      .on('broadcast', { event: 'field_updated' }, (payload) => {
        const data = payload.payload
        
        // Safely access properties with type checking
        if (data && typeof data === 'object' && 'tile_id' in data) {
          const change: FieldChange = {
            tile_id: data.tile_id as string,
            old_data: 'old_data' in data ? data.old_data as any : {},
            new_data: 'new_data' in data ? data.new_data as any : {},
            timestamp: Date.now()
          }
          
          setFieldChanges(prev => [...prev.slice(-49), change]) // Keep last 50
        }
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { fieldChanges, isConnected }
}
