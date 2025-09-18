import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  Settings, 
  Bell, 
  UserPlus, 
  MoreHorizontal,
  Map, 
  MessageCircle, 
  Calendar, 
  Camera, 
  Activity, 
  MapPin, 
  BarChart3, 
  Users 
} from 'lucide-react';
import Section from '../Common/Section';
import Btn from '../Common/Btn';
import Pill from '../Common/Pill';
import SmartMap from '../Common/SmartMap';
import SmartComposer from '../Common/SmartComposer';
import { useHQProximity } from '../../hooks/useHQProximity';
import { useHQAvailability } from '../../hooks/useHQAvailability';
import { useHQVibes } from '../../hooks/useHQVibes';

type TabKey = 'map' | 'stream' | 'plan' | 'moments' | 'pulse' | 'venues' | 'analytics' | 'wing';

const TABS = [
  { k: 'map' as TabKey, l: 'Map', i: <Map className="h-4 w-4" /> },
  { k: 'stream' as TabKey, l: 'Stream', i: <MessageCircle className="h-4 w-4" /> },
  { k: 'plan' as TabKey, l: 'Plan', i: <Calendar className="h-4 w-4" /> },
  { k: 'moments' as TabKey, l: 'Moments', i: <Camera className="h-4 w-4" /> },
  { k: 'pulse' as TabKey, l: 'Pulse', i: <Activity className="h-4 w-4" /> },
  { k: 'venues' as TabKey, l: 'Venues', i: <MapPin className="h-4 w-4" /> },
  { k: 'analytics' as TabKey, l: 'Analytics', i: <BarChart3 className="h-4 w-4" /> },
  { k: 'wing' as TabKey, l: 'Wing', i: <Users className="h-4 w-4" /> },
];

const PEOPLE = [
  { name: 'Alex Chen', status: 'active', avatar: '🧑‍💻' },
  { name: 'Maya Rodriguez', status: 'away', avatar: '👩‍🎨' },
  { name: 'Jordan Kim', status: 'active', avatar: '🧑‍🔬' },
];

const VENUES = [
  { name: 'Café Luna', type: 'Coffee Shop', distance: '0.2 km' },
  { name: 'Park Central', type: 'Park', distance: '0.5 km' },
  { name: 'Tech Hub', type: 'Coworking', distance: '0.8 km' },
];

// Using shared components - local definitions removed

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-white/70">{label}</span>
        <span className="text-white/90">{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full transition-all" style={{ width: `${(value/max)*100}%` }} />
      </div>
    </div>
  );
}

export default function FloqHQTabbed() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<TabKey>('map');
  
  // Mock floq ID for now - will be passed as prop later
  const floqId = "test-floq-id";
  const { data: proximityData } = useHQProximity(floqId);
  const { data: availabilityData } = useHQAvailability(floqId);
  const { data: vibesData } = useHQVibes(floqId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-900/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-lg font-bold truncate">Downtown Explorers HQ</h1>
              <p className="text-[12px] text-white/60 truncate">12 active • Next plan in 2h</p>
            </div>
            <div className="flex items-center gap-2">
              <Btn ariaLabel="Settings"><Settings className="h-4 w-4" /></Btn>
              <div className="relative">
                <Btn ariaLabel="Notifications"><Bell className="h-4 w-4" /></Btn>
                <span className="absolute -top-1 -right-1 text-[10px] bg-rose-500 text-white rounded-full px-1">3</span>
              </div>
              <Btn ariaLabel="Invite"><UserPlus className="h-4 w-4" /></Btn>
              <Btn ariaLabel="More options"><MoreHorizontal className="h-4 w-4" /></Btn>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-2 pb-2">
          <div
            role="tablist"
            aria-label="Floq sections"
            className="flex gap-2 overflow-x-auto scrollbar-none"
          >
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
          {active === 'map' && (
            <motion.div
              key="map"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <Section title="Live Map">
                <SmartMap placeholder="Interactive HQ map view" />
              </Section>
              <Section title="Nearby People">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {PEOPLE.map(p => (
                    <div key={p.name} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                      <span className="text-xl">{p.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[13px] truncate">{p.name}</p>
                        <Pill active={p.status === 'active'}>{p.status}</Pill>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </motion.div>
          )}

          {active === 'stream' && (
            <motion.div
              key="stream"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <Section title="Activity Stream">
                <div className="space-y-3">
                  <SmartComposer placeholder="Share with floq..." />
                  <div className="space-y-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-[13px]">Message {i} content here...</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
            </motion.div>
          )}

          {active === 'plan' && (
            <motion.div
              key="plan"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <Section title="Upcoming Plans">
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <h4 className="font-medium text-[13px]">Plan {i}</h4>
                      <p className="text-[12px] text-white/60 mt-1">Scheduled for later today</p>
                    </div>
                  ))}
                </div>
              </Section>
            </motion.div>
          )}

          {active === 'venues' && (
            <motion.div
              key="venues"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <Section title="Nearby Venues">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {VENUES.map(v => (
                    <div key={v.name} className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <h4 className="font-medium text-[13px]">{v.name}</h4>
                      <p className="text-[11px] text-white/60">{v.type} • {v.distance}</p>
                    </div>
                  ))}
                </div>
              </Section>
            </motion.div>
          )}

          {active === 'analytics' && (
            <motion.div
              key="analytics"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <Section title="Floq Analytics">
                <div className="space-y-4">
                  <Bar label="Activity Level" value={8} max={10} />
                  <Bar label="Engagement" value={6} max={10} />
                  <Bar label="Growth" value={4} max={10} />
                </div>
              </Section>
            </motion.div>
          )}

          {(active === 'moments' || active === 'pulse' || active === 'wing') && (
            <motion.div
              key={active}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <Section title={`${active.charAt(0).toUpperCase() + active.slice(1)} Content`}>
                <div className="h-32 bg-white/5 rounded-2xl border border-white/10 grid place-items-center">
                  <p className="text-white/40">Coming soon...</p>
                </div>
              </Section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}