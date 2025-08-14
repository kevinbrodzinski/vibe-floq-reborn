import * as React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Heart, Bookmark, MessageSquare, Camera, Clock, MapPin, Navigation, Car, Calendar, Users, Sparkles, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVenueExtras } from '@/hooks/useVenueExtras';

export type VenueLite = {
  id: string;
  name: string;
  photo_url?: string | null;
  provider?: string | null;
  categories?: string[] | null;
  canonical_tags?: string[] | null;
  distance_m?: number | null;
  lat?: number | null;
  lng?: number | null;
  website?: string | null;
  reservation_url?: string | null;
  rating?: number | null;
  price_tier?: string | null; // From price_enum: "$" | "$$" | "$$$" | "$$$$"
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venue: VenueLite | null;
  userLat?: number | null;
  userLng?: number | null;
  onCreatePlan?: (v: VenueLite) => void; // ← wire this to your plan/floq builder
};

const km = (m?: number | null) => (m ?? 0) / 1000;
const mi = (m?: number | null) => (m ?? 0) / 1609.34;
const clamp1 = (n: number) => Math.round(n * 10) / 10;

const walkMins = (m?: number | null) => Math.max(1, Math.round((m ?? 0) / (1.4 * 60)));   // ~5km/h
const driveMins = (m?: number | null) => Math.max(1, Math.round((m ?? 0) / (13.9 * 60))); // ~50km/h

// Price tier is already formatted as a string from the enum

function uberDeepLink(userLat?: number | null, userLng?: number | null, v?: VenueLite | null) {
  if (!v?.lat || !v?.lng) return null;
  const base = 'https://m.uber.com/ul/?action=setPickup';
  const pick = userLat && userLng ? `pickup[latitude]=${userLat}&pickup[longitude]=${userLng}` : 'pickup=my_location';
  const drop = `dropoff[latitude]=${v.lat}&dropoff[longitude]=${v.lng}&dropoff[nickname]=${encodeURIComponent(v.name)}`;
  return `${base}&${pick}&${drop}`;
}
function lyftDeepLink(_: number | null | undefined, __: number | null | undefined, v?: VenueLite | null) {
  if (!v?.lat || !v?.lng) return null;
  return `https://lyft.com/ride?id=lyft&destination[latitude]=${v.lat}&destination[longitude]=${v.lng}`;
}
function reservationLink(v?: VenueLite | null) {
  if (!v) return null;
  if (v.reservation_url) return v.reservation_url;
  return v.website ?? null;
}

export function VenueDetailSheet({ open, onOpenChange, venue, userLat, userLng, onCreatePlan }: Props) {
  const contentId = React.useId();
  const { data, toggles, submitReview, uploadPhoto, submitting } = useVenueExtras(venue?.id ?? null);

  const distanceText = venue
    ? `${clamp1(km(venue.distance_m))} km • ${walkMins(venue.distance_m)}m walk • ${driveMins(venue.distance_m)}m drive`
    : '';

  const openNow = data?.openNow;
  const nextOpen = data?.nextOpenText;
  const deals = data?.deals ?? [];
  const friends = data?.friends ?? [];
  const hasVisited = !!data?.hasVisited;

  // CTA helpers
  const reserveHref = reservationLink(venue) ?? undefined;
  const uberHref = uberDeepLink(userLat, userLng, venue) ?? undefined;
  const lyftHref = lyftDeepLink(userLat, userLng, venue) ?? undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[92vh] p-0 overflow-hidden"
        aria-describedby={contentId}
      >
        <SheetHeader>
          <VisuallyHidden>
            <SheetTitle id="venue-detail-title">{venue?.name ?? "Venue details"}</SheetTitle>
          </VisuallyHidden>
          <VisuallyHidden>
            <SheetDescription id={contentId}>
              Details, hours, deals, travel times, and actions for this venue.
            </SheetDescription>
          </VisuallyHidden>
        </SheetHeader>
        {venue && (
          <div className="flex flex-col h-full">
            {/* HERO */}
            <div className="relative h-[42vh]">
              <img
                src={venue.photo_url || '/placeholder/venue.jpg'}
                alt={venue.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/0" />
              <div className="absolute left-4 right-4 bottom-4">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl bg-black/50 backdrop-blur-md border border-white/12 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-white text-[17px] font-semibold truncate">{venue.name}</div>
                      <div className="text-white/80 text-[11px] truncate">
                        {(venue.categories ?? []).slice(0, 1).join(', ') || '—'}
                      </div>
                      
                      {/* Rating and Price Row */}
                      <div className="flex items-center gap-3 mt-1">
                        {venue.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current text-amber-400" />
                            <span className="text-white/90 text-[11px] font-medium">
                              {venue.rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                        {venue.price_tier && (
                          <div className="flex items-center gap-1">
                            <span className="text-green-400 text-[11px] font-medium">
                              {venue.price_tier}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {openNow === true && <Badge className="bg-emerald-500 text-white">Open</Badge>}
                      {openNow === false && (
                        <Badge variant="secondary" className="bg-white/15 text-white">
                          Closed{nextOpen ? ` • ${nextOpen}` : ''}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-white/80 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> {distanceText}
                    </span>
                  </div>

                  {venue.canonical_tags?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {venue.canonical_tags.slice(0, 6).map((t) => (
                        <Badge key={t} variant="secondary" className="bg-white/14 text-white">
                          {t.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </motion.div>
              </div>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-12">
              {/* Friends */}
              <section>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-white/70" />
                    Friends recently
                  </div>
                  {!!friends.length && (
                    <div className="text-xs text-white/60">{friends.length} in last 30d</div>
                  )}
                </div>
                {!friends.length ? (
                  <div className="text-xs text-white/60 mt-2">No recent friend activity.</div>
                ) : (
                  <div className="mt-3 flex -space-x-2">
                    {friends.slice(0, 8).map((f) => (
                      <img
                        key={f.id}
                        src={f.avatar_url || '/placeholder/avatar.png'}
                        className="h-8 w-8 rounded-full ring-2 ring-background object-cover"
                        title={f.display_name || f.username || 'friend'}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Hours + Specials */}
              <section>
                <div className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-white/70" />
                  Hours
                </div>
                <div className="text-xs text-white/80 truncate">
                  {data?.hoursDisplay || 'Hours unavailable'}
                </div>

                {!!deals.length && (
                  <>
                    <Separator className="my-4 bg-white/10" />
                    <div className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-white/70" />
                      Specials
                    </div>
                    <ul className="space-y-2">
                      {deals.map((d) => (
                        <li
                          key={d.id}
                          className="text-xs text-white/90 rounded-xl bg-white/6 border border-white/10 p-3"
                        >
                          <div className="font-medium truncate">{d.title}</div>
                          {d.subtitle && <div className="text-white/70 truncate">{d.subtitle}</div>}
                          {d.endsAtText && <div className="text-white/50 mt-1">{d.endsAtText}</div>}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>

              {/* Why go */}
              <section>
                <div className="text-sm font-medium mb-2">Why you'll like it</div>
                <p className="text-sm text-white/80">
                  {data?.aiSummary ||
                    `Close by (${clamp1(mi(venue.distance_m))} mi) and matches your vibe — ${(venue.canonical_tags ?? [])[0]?.replace(/_/g, ' ') || 'good energy'}.`}
                </p>
              </section>

              {/* Utility actions (secondary) */}
              <section>
                <div className="text-sm font-medium mb-3">Quick actions</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <ActionLink href={reserveHref} icon={<Calendar className="h-4 w-4" />} label="Reserve" />
                  <ActionLink href={uberHref} icon={<Car className="h-4 w-4" />} label="Uber" />
                  <ActionLink href={lyftHref} icon={<Navigation className="h-4 w-4" />} label="Lyft" />
                  <ActionButton onClick={toggles.toggleFavorite} icon={<Heart className={`h-4 w-4 ${toggles.favorite ? 'fill-white' : ''}`} />} label={toggles.favorite ? 'Favorited' : 'Add to favorites'} />
                  <ActionButton onClick={toggles.toggleWatch} icon={<Bookmark className={`h-4 w-4 ${toggles.watch ? 'fill-white' : ''}`} />} label={toggles.watch ? 'Watching' : 'Add to watchlist'} />
                  {hasVisited && (
                    <>
                      <ActionButton onClick={toggles.openReview} icon={<MessageSquare className="h-4 w-4" />} label="Write a review" />
                      <ActionButton onClick={toggles.openPhoto} icon={<Camera className="h-4 w-4" />} label="Add a photo" />
                    </>
                  )}
                </div>

                {/* Inline review composer */}
                {toggles.reviewOpen && hasVisited && (
                  <div className="mt-4 rounded-xl bg-white/6 border border-white/10 p-3">
                    <div className="text-sm font-medium mb-2">Your review</div>
                    <textarea
                      className="w-full rounded-md bg-black/30 border border-white/10 p-2 text-sm outline-none"
                      rows={4}
                      placeholder="Quick thoughts to help others…"
                      value={toggles.reviewText}
                      onChange={(e) => toggles.setReviewText(e.target.value)}
                    />
                    <div className="mt-2 flex justify-end">
                      <Button size="sm" onClick={submitReview} disabled={submitting}>
                        {submitting ? 'Saving…' : 'Save review'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Hidden photo input */}
                {toggles.photoOpen && hasVisited && (
                  <div className="mt-4">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={toggles.photoInputRef}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadPhoto(f);
                      }}
                    />
                    <Button size="sm" variant="secondary" onClick={() => toggles.photoInputRef.current?.click()} disabled={submitting}>
                      {submitting ? 'Uploading…' : 'Choose a photo'}
                    </Button>
                  </div>
                )}
              </section>
            </div>

            {/* STICKY PRIMARY CTA BAR */}
            <div className="sticky bottom-0 left-0 right-0 backdrop-blur-xl bg-black/40 border-t border-white/10 p-3">
              <div className="flex gap-2">
                <Button
                  className="flex-1 h-11 rounded-xl text-base font-semibold"
                  onClick={() => venue && (onCreatePlan ? onCreatePlan(venue) : (window.location.href = `/plans/new?venue_id=${venue.id}`))}
                >
                  Create plan / floq
                </Button>
                <Button variant="secondary" className="h-11 rounded-xl" asChild disabled={!reserveHref}>
                  <a href={reserveHref}>Reserve</a>
                </Button>
              </div>
            </div>

            {/* Pull handle */}
            <div className="py-3 flex items-center justify-center">
              <div className="h-1.5 w-12 rounded-full bg-white/15" />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ActionLink({ href, icon, label }: { href?: string; icon: React.ReactNode; label: string }) {
  const disabled = !href;
  return (
    <a
      href={disabled ? undefined : href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 rounded-xl border p-3 text-sm transition ${
        disabled
          ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/30'
          : 'border-white/10 bg-white/10 hover:bg-white/15 text-white'
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </a>
  );
}
function ActionButton({ onClick, icon, label }: { onClick?: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 text-white p-3 text-sm transition"
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}