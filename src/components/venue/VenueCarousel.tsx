import * as React from 'react';
import useEmblaCarousel, { UseEmblaCarouselType } from 'embla-carousel-react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

type Item = {
  id: string;
  name: string;
  photo_url?: string | null;
  distance_m?: number | null;
  rating?: number | null;
  match_score_pct?: number | null;
  canonical_tags?: string[] | null;
};

const cx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(' ');

const metersToMiles = (m?: number | null, dp = 1) => {
  if (m == null) return null;
  const mi = Number(m) / 1609.344;
  const k = Math.pow(10, dp);
  return Math.round(mi * k) / k;
};

type Props = {
  items: Item[];
  loading?: boolean;
  onOpen?: (id: string) => void;
  className?: string;
  /** Make cards a bit taller/shorter */
  aspect?: `${number}/${number}`;
};

export default function VenueCarousel({
  items,
  loading,
  onOpen,
  className,
  aspect = '4/5',
}: Props) {
  // IMPORTANT: snap center after fling
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    dragFree: false,            // <- snap after drag
    align: 'center',            // <- center active card
    containScroll: 'trimSnaps',
    inViewThreshold: 0.75,
  });

  const [selected, setSelected] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on('select', onSelect);
    setCount(emblaApi.scrollSnapList().length);
  }, [emblaApi]);

  const scrollPrev = React.useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = React.useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo   = React.useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  // Subtle coverflow: scale & lift center; lower sides slightly
  const cardAnim = (active: boolean) => ({
    scale: active ? 1 : 0.9,
    y: active ? 0 : 12,
    boxShadow: active
      ? '0 16px 40px rgba(0,0,0,0.38)'
      : '0 10px 24px rgba(0,0,0,0.28)',
    transition: { type: 'spring', stiffness: 240, damping: 22 },
  });

  const data = loading
    ? Array.from({ length: 5 }).map((_, i) => ({ id: `s-${i}`, name: '' }))
    : items;

  return (
    <div className={cx('relative', className)}>
      {/* edge fade mask */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0B0F1A] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0B0F1A] to-transparent z-10" />

      <div className="px-2 sm:px-4">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4 sm:gap-5">
            {data.map((v, i) => {
              const active = i === selected;
              return (
                <div
                  key={v.id}
                  className={cx(
                    // responsive slide widths: large center, smaller sides
                    'basis-[80%] sm:basis-[58%] md:basis-[46%] lg:basis-[36%] xl:basis-[30%]',
                    'shrink-0'
                  )}
                >
                  <motion.button
                    type="button"
                    onClick={() => v.name && onOpen?.(v.id)}
                    whileTap={{ scale: 0.98 }}
                    aria-label={v.name || 'venue'}
                    className={cx(
                      'relative w-full',
                      'rounded-3xl overflow-hidden text-left',
                      'bg-white/5 border border-white/10'
                    )}
                    style={{ aspectRatio: aspect }}
                    animate={cardAnim(active)}
                    disabled={!v.name}
                  >
                    {/* Photo */}
                    <div className="absolute inset-0">
                      {v.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.photo_url}
                          alt={v.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-[radial-gradient(120%_120%_at_10%_0%,#273049_0%,#0b0f1a_60%)]" />
                      )}
                      {/* top + bottom gradients */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/60" />
                    </div>

                    {/* Glass info bar (single-line everything) */}
                    <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                      <div className="backdrop-blur-md bg-white/10 border border-white/15 rounded-2xl px-3.5 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-white font-semibold text-sm sm:text-base truncate">
                              {v.name || '\u00A0'}
                            </div>
                            <div className="flex items-center gap-2 text-white/80 text-xs sm:text-sm truncate">
                              {typeof v.distance_m === 'number' && (
                                <span className="inline-flex items-center gap-1 truncate">
                                  <MapPin className="w-3.5 h-3.5 opacity-80" />
                                  {metersToMiles(v.distance_m)} mi
                                </span>
                              )}
                              {typeof v.rating === 'number' && (
                                <span className="truncate">· ⭐ {v.rating.toFixed(1)}</span>
                              )}
                            </div>
                          </div>

                          {/* Right-side chips in one line */}
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {typeof v.match_score_pct === 'number' && (
                              <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-300/30 whitespace-nowrap">
                                ⚡ {Math.round(v.match_score_pct)}%
                              </span>
                            )}
                            <div className="flex gap-1 max-w-[160px] sm:max-w-[200px] overflow-hidden">
                              {(v.canonical_tags ?? []).slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="text-[10px] sm:text-[11px] px-2 py-[3px] rounded-full bg-white/12 border border-white/15 text-white/90 whitespace-nowrap truncate"
                                  title={t}
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Nav buttons */}
      <div className="pointer-events-none">
        <button
          type="button"
          onClick={scrollPrev}
          className={cx(
            'pointer-events-auto absolute left-3 sm:left-4 top-1/2 -translate-y-1/2',
            'h-10 w-10 rounded-full bg-white/10 border border-white/15',
            'backdrop-blur hover:bg-white/20 transition shadow-lg'
          )}
          aria-label="Previous"
        >
          <ChevronLeft className="m-auto h-5 w-5 text-white" />
        </button>
        <button
          type="button"
          onClick={scrollNext}
          className={cx(
            'pointer-events-auto absolute right-3 sm:right-4 top-1/2 -translate-y-1/2',
            'h-10 w-10 rounded-full bg-white/10 border border-white/15',
            'backdrop-blur hover:bg-white/20 transition shadow-lg'
          )}
          aria-label="Next"
        >
          <ChevronRight className="m-auto h-5 w-5 text-white" />
        </button>
      </div>

      {/* Dots */}
      {count > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={cx(
                'h-1.5 rounded-full transition-all',
                i === selected ? 'w-6 bg-white' : 'w-2.5 bg-white/35'
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

