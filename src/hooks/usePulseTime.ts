import {useEffect, useState} from 'react'

/**
 * Returns a value 0‥1 that loops at `speed` seconds.
 * The value is a smooth sinusoid: 0 → 1 → 0.
 */
export const usePulseTime = (speedSeconds = 4) => {
  const [t, setT] = useState(0)

  useEffect(() => {
    let id: number
    const loop = () => {
      const now = performance.now() / 1000 // → seconds
      setT((now / speedSeconds) % 1)      // 0‥1 loop
      id = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(id)
  }, [speedSeconds])

  return t                           // 0‥1
}