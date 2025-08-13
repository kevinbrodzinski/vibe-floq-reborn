import * as React from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight, MapPin, Star } from 'lucide-react'
import { motion } from 'framer-motion'

// Minimal pill — replace with shadcn Badge if you have it in your design system
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2.5 py-1 rounded-full text-[10px] leading-none font-medium bg-white/15 text-white/90 border border-white/20">
      {children}
    </span>
  )
}

export type VenueCarouselItem = {
  id: string
  name: string
  photo_url?: string | null
  distance_m?: number | string | null
  match_score_pct?: number | null // 0-100 expected; format upstream
  rating?: number | null
  canonical_tags?: string[] | null
}

export default function VenueCarousel({
  items,
  onOpen,
  loading,
  className,
}: {
  items: VenueCarouselItem[]
  onOpen?: (id: string) => void
  loading?: boolean
  className?: string
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
    skipSnaps: false,
    dragFree: false,
  })
  const [selected, setSelected] = React.useState(0)

  React.useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    onSelect()
  }, [emblaApi])

  const scrollPrev = React.useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi])
  const scrollNext = React.useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi])

  const size = items.length

  const diffWrap = (i: number, j: number) => {
    // minimal circular distance between slide i and j
    const d = Math.abs(i - j)
    return Math.min(d, size - d)
  }

  if (loading) {
    return (
      <div className={`relative w-full ${className ?? ''}`}>
        <div className="flex items-center justify-center h-96">
          <div className="text-white/70 text-sm">Loading venues...</div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className={`relative w-full ${className ?? ''}`}>
        <div className="flex items-center justify-center h-96">
          <div className="text-white/60 text-sm">No venues found. Try adjusting your filters.</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-full ${className ?? ''}`}>
      {/* Arrows */}
      <button
        type="button"
        aria-label="Previous"
        onClick={scrollPrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white/15 border border-white/20 backdrop-blur hover:bg-white/25 text-white flex items-center justify-center transition-all duration-200"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={scrollNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white/15 border border-white/20 backdrop-blur hover:bg-white/25 text-white flex items-center justify-center transition-all duration-200"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Viewport */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y -ml-4">
          {items.map((v, i) => {
            const d = diffWrap(i, selected)
            const isActive = d === 0
            const scale = isActive ? 1 : d === 1 ? 0.9 : 0.85
            const y = isActive ? 0 : d === 1 ? 10 : 22
            const opacity = isActive ? 1 : 0.75

            return (
              <motion.div
                key={v.id}
                className="pl-4 flex-[0_0_80%] sm:flex-[0_0_420px]"
                animate={{ scale, y, opacity }}
                transition={{ type: 'spring', stiffness: 220, damping: 24 }}
              >
                <Card v={v} onOpen={onOpen} active={isActive} />
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Dots */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === selected ? 'w-5 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function Card({ v, onOpen, active }: { v: VenueCarouselItem; onOpen?: (id: string) => void; active: boolean }) {
  const distance = React.useMemo(() => {
    const m = Number(v.distance_m ?? 0)
    if (!Number.isFinite(m) || m <= 0) return null
    if (m < 1000) return `${Math.round(m)} m`
    return `${(m / 1000).toFixed(1)} km`
  }, [v.distance_m])

  const bg = v.photo_url || 'https://images.unsplash.com/photo-1541534401786-2077eed87a72?q=80&w=1200&auto=format&fit=crop'

  return (
    <div
      role="button"
      onClick={() => onOpen?.(v.id)}
      className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/5 shadow-xl cursor-pointer group transition-all duration-300 hover:border-white/25"
      style={{ aspectRatio: '3/4' }}
    >
      {/* Photo */}
      <img
        src={bg}
        alt={v.name}
        className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
        draggable={false}
        loading="lazy"
      />

      {/* Darken edges */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-black/20" />

      {/* Content at bottom */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3
            className={`truncate font-semibold ${active ? 'text-white text-[17px]' : 'text-white/95 text-[16px]'}`}
            title={v.name}
          >
            {v.name}
          </h3>
          {typeof v.match_score_pct === 'number' && (
            <Pill>
              ⚡ {Math.max(0, Math.min(100, Math.round(v.match_score_pct)))}%
            </Pill>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-white/85">
          {typeof v.rating === 'number' && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-[12px] w-[12px] fill-current" /> {v.rating.toFixed(1)}
            </span>
          )}
          {distance && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-[12px] w-[12px]" /> {distance}
            </span>
          )}
        </div>

        {/* Tags */}
        {v.canonical_tags && v.canonical_tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(v.canonical_tags.slice(0, 3)).map((t) => (
              <Pill key={t}>{t.replaceAll('_', ' ')}</Pill>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}