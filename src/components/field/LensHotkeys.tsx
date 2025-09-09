import { useEffect } from 'react'
import { useFieldLens } from './FieldLensProvider'

export function LensHotkeys() {
  const { setLens } = useFieldLens()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '1') setLens('explore')
      if (e.key === '2') setLens('constellation')
      if (e.key === '3') setLens('temporal')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setLens])
  return null
}