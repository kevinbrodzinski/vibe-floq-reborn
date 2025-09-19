import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useHQProximity } from "@/hooks/useHQProximity";
import { useHQAvailability } from "@/hooks/useHQAvailability";
import { useHQVibes } from "@/hooks/useHQVibes";
import { useHQDigest } from "@/hooks/useHQDigest";
import { useFloqStream } from "@/hooks/useFloqStream";
import { usePostStream } from "@/hooks/usePostStream";
import { useFloqStreamRealtime } from "@/hooks/useFloqStreamRealtime";
import { Glass } from "@/components/Common/Glass";
import { NeonPill } from "@/components/Common/NeonPill";
import { vibeToGradientClass } from "@/components/Common/vibeTokens";
import {
  MapPin,
  MessageSquare,
  CalendarCheck,
  Camera,
  Radio,
  BarChart3,
  Shield,
  Sparkles,
  Navigation2,
  Target,
  Users,
  Gauge,
  Settings,
  Bell,
  Layers,
  Thermometer,
  UserPlus,
  Star,
  Check,
  MoreHorizontal,
  Trophy,
  Flame,
} from "lucide-react";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2.5 py-1 rounded-full bg-white/10 text-[11px] text-white/80 border border-white/10">
      {children}
    </span>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  ariaLabel?: string;
};
function Btn({ children, active, ariaLabel, className = "", ...props }: BtnProps) {
  return (
    <button
      type="button"
      aria-pressed={active ?? undefined}
      aria-label={ariaLabel}
      className={`px-3 py-1.5 rounded-xl border text-[12px] transition ${
        active ? "bg-white/15 border-white/20" : "bg-white/5 border-white/10 hover:bg-white/10"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Section({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-4 shadow-glass">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-white/10 grid place-items-center text-white/80">{icon}</div>
          <h3 className="text-[13px] tracking-wide font-semibold text-white/90 uppercase">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

const TABS = [
  { k: "map", l: "Map", i: <MapPin className="h-4 w-4" /> },
  { k: "stream", l: "Stream", i: <MessageSquare className="h-4 w-4" /> },
  { k: "plan", l: "Plan", i: <CalendarCheck className="h-4 w-4" /> },
  { k: "moments", l: "Moments", i: <Camera className="h-4 w-4" /> },
  { k: "pulse", l: "Pulse", i: <Radio className="h-4 w-4" /> },
  { k: "venues", l: "Venues", i: <MapPin className="h-4 w-4" /> },
  { k: "analytics", l: "Analytics", i: <BarChart3 className="h-4 w-4" /> },
  { k: "wing", l: "Wing", i: <Sparkles className="h-4 w-4" /> },
  { k: "privacy", l: "Privacy", i: <Shield className="h-4 w-4" /> },
] as const;

type TabKey = typeof TABS[number]["k"];

const PEOPLE = [
  { n: "Sarah", d: "Café • Chill", v: 60 },
  { n: "Tom", d: "Downtown • Hype", v: 85 },
  { n: "Alex", d: "Beach→Venice", v: 80 },
  { n: "You", d: "Home • Neutral", v: 45 },
];

const VENUES = [
  { r: 1, name: "Gran Blanco", meta: "Bar • Downtown · Last: 2 days", note: "Our unofficial headquarters", badge: "47× 👑" },
  { r: 2, name: "Café Nero", meta: "Coffee • Venice · Last: 1 week", note: "Perfect for hangover recovery", badge: "31×" },
  { r: 3, name: "Venice Beach", meta: "Outdoor • Beach · Last: 2 weeks", note: "Beach volleyball crew", badge: "28×" },
];

interface FloqHQTabbedProps {
  floqId?: string;
}

export default function FloqHQTabbed({ floqId = "test-floq-id" }: FloqHQTabbedProps) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<TabKey>("map");
  
  // Live HQ hooks
  const { data: proximity, isLoading: proxLoading } = useHQProximity(floqId);
  const { data: availability } = useHQAvailability(floqId);
  const { data: vibes } = useHQVibes(floqId);
  const { data: digest } = useHQDigest(floqId, undefined);
  const { data: messages } = useFloqStream(floqId);
  const post = usePostStream(floqId);
  
  // Real-time subscriptions
  useFloqStreamRealtime(floqId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 backdrop-blur-xl bg-zinc-950/70">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg grid place-items-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold flex items-center gap-2">
                Chaos<span className="sr-only">Private Floq</span>
              </div>
              <div className="text-[11px] text-white/60">"Spontaneous convergence specialists since 2022"</div>
              <div className="text-[11px] text-white/60">8 members • Social-Hype</div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Btn ariaLabel="Settings"><Settings className="h-4 w-4" /></Btn>
            <div className="relative">
              <Btn ariaLabel="Notifications"><Bell className="h-4 w-4" /></Btn>
              <span className="absolute -top-1 -right-1 text-[10px] bg-rose-500 text-white rounded-full px-1">3</span>
            </div>
            <Btn ariaLabel="Invite"><UserPlus className="h-4 w-4" /></Btn>
            <Btn ariaLabel="More options"><MoreHorizontal className="h-4 w-4" /></Btn>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pb-2 flex flex-wrap gap-2">
          <NeonPill><Trophy className="inline h-3.5 w-3.5 mr-1" /> Thursday Legends</NeonPill>
          <NeonPill><Flame className="inline h-3.5 w-3.5 mr-1" /> 5-Week Streak</NeonPill>
          <NeonPill><MapPin className="inline h-3.5 w-3.5 mr-1" /> Gran Regulars</NeonPill>
        </div>

        <div className="max-w-6xl mx-auto px-2 pb-2">
          <div role="tablist" aria-label="Floq sections" className="flex gap-2 overflow-x-auto scrollbar-none">
            {TABS.map((t, idx) => {
              const selected = active === t.k;
              return (
                <button
                  key={t.k}
                  role="tab"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(t.k)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight") setActive(TABS[(idx + 1) % TABS.length].k);
                    if (e.key === "ArrowLeft") setActive(TABS[(idx - 1 + TABS.length) % TABS.length].k);
                  }}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] border transition ${
                    selected ? "bg-white/15 border-white/20" : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {t.i}<span>{t.l}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5">
        <AnimatePresence mode="wait">
          {active === "map" && (
            <motion.div
              key="map"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <Section title="Living Proximity Map" icon={<MapPin className="h-4 w-4" />} right={<Btn>Meet-Halfway</Btn>}>
                <div className="relative h-72 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 grid place-items-center text-xs text-white/60">
                  {proxLoading ? "Loading member locations..." : "(Map preview)"}
                </div>

                <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-4 text-[12px] text-white/80">
                  {proxLoading ? (
                    <>
                      <div>Loading member locations…</div>
                      <div>—</div>
                      <div>—</div>
                    </>
                  ) : proximity && proximity.members.length ? (
                    <>
                      <div>
                        Center: {proximity.center_lat.toFixed(4)}, {proximity.center_lng.toFixed(4)}
                      </div>
                      <div>
                        Convergence: {Math.round(proximity.convergence_score * 100)}%
                      </div>
                      <div>
                        Online: {proximity.members.filter(m => m.status === "online").length}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>No member locations yet</div>
                      <div>Ask members to share location</div>
                      <div>—</div>
                    </>
                  )}
                </div>

                {proximity?.meet_halfway && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-[13px]">
                    Optimal Meeting Point
                    <div className="text-[12px] text-white/80">
                      {proximity.meet_halfway.name ?? "Center"} · {proximity.meet_halfway.lat.toFixed(4)}, {proximity.meet_halfway.lng.toFixed(4)}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Btn>Navigate</Btn><Btn>Suggest to Group</Btn><Btn>Find Venue</Btn>
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between text-[12px] text-white/70">
                  <div className="flex-1 h-1 rounded-full bg-white/10 mx-3" />
                  <div className="flex gap-2">
                    <Btn ariaLabel="Target"><Target className="h-4 w-4" /></Btn>
                    <Btn ariaLabel="Thermal"><Thermometer className="h-4 w-4" /></Btn>
                    <Btn ariaLabel="Members"><Users className="h-4 w-4" /></Btn>
                    <Btn ariaLabel="Pin"><MapPin className="h-4 w-4" /></Btn>
                  </div>
                </div>
              </Section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Section title="Live Status" icon={<Radio className="h-4 w-4" />}>
                  <div className="space-y-3 text-[13px]">
                    {PEOPLE.map((p) => (
                      <div key={p.n} className="flex items-center justify-between">
                        <div className="text-white/90">
                          {p.n} <span className="text-white/60">• {p.d}</span>
                        </div>
                        <div className="w-40 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500"
                            style={{ width: `${p.v}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>

                <Section title="Smart Layers" icon={<Layers className="h-4 w-4" />}>
                  <div className="grid grid-cols-2 gap-3 text-[12px]">
                    <div>Venues (warm/cool)</div>
                    <div>Energy fields</div>
                    <div className="opacity-70">Friend floqs</div>
                    <div className="opacity-70">Events</div>
                  </div>
                </Section>
              </div>
            </motion.div>
          )}

          {active === "stream" && (
            <motion.div
              key="stream"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Btn active>Crew (2)</Btn>
                  <Btn>Plans (1)</Btn>
                  <Btn>Live</Btn>
                  <Btn>Memories</Btn>
                </div>
                <div className="flex gap-2">
                  <Btn>Wing</Btn>
                  <Btn>Filter</Btn>
                </div>
              </div>

              {digest?.summary && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-[12px] mb-5">
                  What you missed: decisions {digest.summary.decisions?.length ?? 0}, rallies {digest.summary.rallies?.length ?? 0}, moments {digest.summary.moments?.length ?? 0}
                </div>
              )}

              {/* Message List */}
              {messages?.length ? (
                <div className="space-y-3">
                  {messages.slice(0, 10).map(m => (
                    <Section 
                      key={m.id} 
                      title={m.emoji ? `${m.emoji} Message` : "💬 Message"} 
                      icon={<MessageSquare className="h-4 w-4" />}
                    >
                      <div className="text-[12px] text-white/80">
                        {m.body}
                      </div>
                      <div className="text-[10px] text-white/60 mt-1">
                        {new Date(m.created_at).toLocaleDateString()} • {m.sender_id}
                      </div>
                    </Section>
                  ))}
                </div>
              ) : (
                <Section title="Rally" icon={<Navigation2 className="h-4 w-4" />}>
                  <div className="text-sm font-medium mb-1">No recent activity</div>
                  <div className="text-[13px] text-white/80 mb-2">Start a rally or send a message to get things going</div>
                </Section>
              )}

              {/* Message Composer */}
              <Glass className="p-3 flex items-center gap-2">
                <input
                  aria-label="Message"
                  className="flex-1 bg-transparent outline-none text-[13px] placeholder-white/40"
                  placeholder="Type message…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value.trim()) {
                      post.mutate({ body: e.currentTarget.value.trim() });
                      e.currentTarget.value = "";
                    }
                  }}
                />
                <Btn ariaLabel="Mention">@</Btn>
                <Btn ariaLabel="Attach photo">
                  <Camera className="h-4 w-4" />
                </Btn>
                <Btn ariaLabel="Attach location">
                  <MapPin className="h-4 w-4" />
                </Btn>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 border border-white/10 text-[12px]"
                  onClick={() => {
                    const el = document.querySelector<HTMLInputElement>('input[aria-label="Message"]');
                    const v = el?.value.trim(); 
                    if (!v) return;
                    post.mutate({ body: v }); 
                    if (el) el.value = "";
                  }}
                >
                  Send
                </button>
    </div>
            </motion.div>
          )}

          {active === "plan" && (
            <motion.div
              key="plan"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <div className="flex flex-wrap gap-2">
                <Btn>+ Solo Plan</Btn>
                <Btn>+ Group Plan</Btn>
                <Btn>View Calendar</Btn>
                <Btn>Wingman Help</Btn>
              </div>

              <Section title="Thursday Tradition @ Gran" icon={<Check className="h-4 w-4" />} right={<NeonPill>Locked</NeonPill>}>
                <div className="text-[13px]">8:30pm • 6/8 confirmed • Recurring weekly</div>
                <div className="text-[12px] text-white/70">Energy: Social-Hype • Friction: Low</div>
              </Section>

              <Section title="Dinner @ Koi Sushi" icon={<CalendarCheck className="h-4 w-4" />} right={<NeonPill>Building</NeonPill>}>
                <div className="text-[13px]">7:30pm • 5 confirmed, 2 pending · Organizer: Sarah</div>
                <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3 text-[12px]">
                  Live Planning: 3 active • "I can pick up Tom and Alex" • "Jake is vegetarian"
                </div>
              </Section>

              <Section title="Beach Day" icon={<CalendarCheck className="h-4 w-4" />} right={<NeonPill>Tentative</NeonPill>}>
                <div className="text-[13px]">All day • Flexible • Weather dependent</div>
                <div className="text-[12px] text-white/70">Forecast: Perfect • Backup: Indoor climbing</div>
              </Section>

              <Glass className="p-3 text-[13px]">
                Suggested by Wingman: Sunday Brunch? 4 usually free
                <div className="mt-2 flex gap-2">
                  <Btn>Create Plan</Btn>
                  <Btn>Not This Week</Btn>
                  <Btn>Never Suggest</Btn>
                </div>
              </div>
            </motion.div>
          )}

          {active === "moments" && (
            <motion.div
              key="moments"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <Section title="Tonight — Thu Sept 12" icon={<Camera className="h-4 w-4" />} right={<Pill>Live Now</Pill>}>
                <div className="text-[13px]">"Thursday Tradition #5" • Now →</div>
                <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-2/3 bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500" />
                </div>
                <div className="text-[12px] text-white/80 mt-2">Current: Gran Blanco • Building to peak</div>
              </Section>

              <Section title="Last Thursday — Sept 5" icon={<Star className="h-4 w-4" />} right={<Pill>Score 5/5</Pill>}>
                <div className="text-[13px]">"Legendary Karaoke Night" • 4h 13m</div>
                <div className="text-[12px] text-white/80">Highlights: Rap battle win • 27 moments • Convergence 94/100</div>
              </Section>

              <Section title="Aug 28 — Beach Birthday Bash" icon={<Star className="h-4 w-4" />} right={<Pill>Score 4/5</Pill>}>
                <div className="text-[13px]">8/8 attended • 6h • Perfect weather</div>
              </Section>

              <div className="text-[12px] text-white/80">Pattern: Thursday Tradition (5 weeks)</div>
            </motion.div>
          )}

          {active === "pulse" && (
            <motion.div
              key="pulse"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* Neon Pulse Hero Title */}
              <div className="text-center mb-8">
                <div className={`text-5xl font-extrabold bg-gradient-to-r ${vibeToGradientClass("Chill")} text-transparent bg-clip-text drop-shadow-neon`}>
                  pulse
                </div>
                <NeonPill className="mt-2 inline-block">current vibe: "CHILL"</NeonPill>
              </div>

              <Section title="Group Pulse" icon={<Gauge className="h-4 w-4" />} right={<Btn>Activate Convergence</Btn>}>
                <div className="text-[13px]">
                  {availability 
                    ? `${availability.availability.filter(a => a.status === 'free').length} free now • ${
                        availability.availability.filter(a => a.status === 'soon').length
                      } free soon`
                    : "Loading availability…"}
                  {vibes?.consensus?.vibe && (
                    <> • Consensus: {vibes.consensus.vibe} {Math.round((vibes.consensus.match_pct ?? 0) * 100)}%</>
                  )}
                </div>
              </Section>

              {PEOPLE.slice(0, 3).map((p, i) => (
                <Section
                  key={p.n}
                  title={`${p.n}`}
                  icon={<Users className="h-4 w-4" />}
                  right={<Pill>{i === 0 ? "Energy 92" : i === 1 ? "Energy 45" : "Ghost"}</Pill>}
                >
                  <div className="text-[12px] text-white/80">Status details</div>
                  <div className="mt-2 grid sm:grid-cols-2 gap-3 text-[12px] text-white/80">
                    <div>Location info</div>
                    <div>Vibe info</div>
                  </div>
                </Section>
              ))}
            </motion.div>
          )}

          {active === "venues" && (
            <motion.div
              key="venues"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  <Btn active>All</Btn>
                  <Btn>Day</Btn>
                  <Btn>Night</Btn>
                  <Btn>Food</Btn>
                  <Btn>Bars</Btn>
                  <Btn>Activities</Btn>
                </div>
                <Btn>All Time</Btn>
              </div>

              <Section title="Our Top Spots" icon={<MapPin className="h-4 w-4" />}>
                {VENUES.map((v) => (
                  <div key={v.r} className="rounded-xl border border-white/10 bg-white/5 p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">
                        {v.r}. {v.name}
                      </div>
                      <Pill>{v.badge}</Pill>
                    </div>
                    <div className="text-[12px] text-white/70">{v.meta}</div>
                    <div className="text-[12px] text-white/80 mt-1 italic">"{v.note}"</div>
                    <div className="mt-2 flex gap-2">
                      <Btn>Navigate</Btn>
                      <Btn>Rally Here</Btn>
                      <Btn>History</Btn>
                    </div>
                  </div>
                ))}
              </Section>
            </motion.div>
          )}

          {active === "analytics" && (
            <motion.div
              key="analytics"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <div className="flex flex-wrap gap-2">
                <Btn active>Overview</Btn>
                <Btn>Dynamics</Btn>
                <Btn>Patterns</Btn>
                <Btn>Archetypes</Btn>
                <Btn>Export</Btn>
              </div>

              <Section title="Tribe Health" icon={<BarChart3 className="h-4 w-4" />}>
                <div className="text-[13px]">Score 87/100 • Momentum building • 12 convergences</div>
                <div className="mt-2">
                  <Bar value={87} />
                </div>
              </Section>

              <div className="grid lg:grid-cols-2 gap-5">
                <Section title="Your Role" icon={<Users className="h-4 w-4" />}>
                  <div className="text-[13px]">Catalyst • Initiate 42% • +15% vibe lift</div>
                  <div className="text-[12px] text-white/80">Strongest: You↔Sarah • Needs: You↔Jake</div>
                </Section>

                <Section title="Weekly Rhythm" icon={<Gauge className="h-4 w-4" />}>
                  <div className="text-[12px] text-white/80">
                    Mon recovery • Tue build • Wed social • Thu peak • Fri high • Sat var • Sun recharge
                  </div>
                  <div className="mt-2 h-20 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-white/60 text-xs">
                    (Heatmap)
                  </div>
                </Section>
              </div>

              <Section title="Insights" icon={<Target className="h-4 w-4" />}>
                <div className="grid md:grid-cols-2 gap-3 text-[13px]">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    Thu tradition at risk
                    <div className="mt-2">
                      <Btn>Rally the Crew</Btn>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    Jake engagement dropping
                    <div className="mt-2 flex gap-2">
                      <Btn>Reach Out</Btn>
                      <Btn>View Relationship</Btn>
                    </div>
                  </div>
                </div>
              </Section>
            </motion.div>
          )}

          {active === "wing" && (
            <motion.div
              key="wing"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <Section title="Suggestions" icon={<Sparkles className="h-4 w-4" />}>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-[13px]">
                    Thursday Tradition at risk
                    <div className="mt-2 flex gap-2">
                      <Btn>Create Rally</Btn>
                      <Btn>Send Reminder</Btn>
                      <Btn>Skip</Btn>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-[13px]">
                    Jake needs attention
                    <div className="mt-2 flex gap-2">
                      <Btn>Suggest 1-on-1</Btn>
                      <Btn>Add to next plan</Btn>
                      <Btn>Let it be</Btn>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Ask Wingman" icon={<MessageSquare className="h-4 w-4" />}>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[12px] text-white/60">
                    Try: find common time • best venue for 10 • who hasn't converged • chill Sunday plan
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      aria-label="Ask Wingman"
                      className="flex-1 bg-transparent outline-none text-[13px] placeholder-white/40"
                      placeholder="Ask Wingman…"
                    />
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 border border-white/10 text-[12px]"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </Section>

              <Section title="Chat" icon={<MessageSquare className="h-4 w-4" />}>
                <div className="text-[13px]">You: Find us a new bar to try</div>

                <div className="mt-2 rounded-xl bg-white/5 border border-white/10 p-3 text-[12px] text-white/80">
                  <ol className="list-decimal ml-5 space-y-1">
                    <li>The Brig — 0.5mi • live music</li>
                    <li>Townhouse — dive • pool tables</li>
                    <li>Rooftop at Erwin — sunset views</li>
                  </ol>
                  <div className="mt-2 flex gap-2">
                    <Btn>Create Poll</Btn>
                    <Btn>Directions</Btn>
                    <Btn>More</Btn>
                  </div>
                </div>
              </Section>
            </motion.div>
          )}

          {active === "privacy" && (
            <motion.div
              key="privacy"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <Section title="Privacy Controls" icon={<Shield className="h-4 w-4" />}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["Precise", "Neighborhood", "Status Only", "Ghost"].map((l) => (
                    <button
                      key={l}
                      className="rounded-xl border border-white/10 bg-white/5 py-2 text-[12px] hover:bg-white/10"
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-[11px] text-white/60">
                  Auto-rules: Ghost after 11pm • Precise during rallies • Status at work
                </div>
              </Section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}