import React, { useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import Section from "@/components/Floqs/HQ/ui/Section";
import Btn from "@/components/Floqs/HQ/ui/Btn";
import { Input, Textarea } from "@/components/Floqs/HQ/ui/Input";
import { useCreateFloq } from "@/hooks/useCreateFloq";
import { type Vibe } from "@/components/Floqs/Create/vibeGlow";

const VIBES = [
  { id: "social", title: "Social", desc: "Meeting new people and networking" },
  { id: "chill", title: "Chill", desc: "Relaxed hangouts and low-key activities" },
  { id: "active", title: "Active", desc: "Sports, workouts, and energetic activities" },
  { id: "hype", title: "Hype", desc: "Parties, events, and high-energy fun" },
  { id: "productive", title: "Productive", desc: "Work, study, and skill-building" },
  { id: "quiet", title: "Quiet", desc: "Cozy, intimate, and low-noise vibes" },
];

const PRIVACY_OPTIONS = [
  { id: "open", title: "Open", desc: "Anyone can join instantly" },
  { id: "request", title: "Request", desc: "People request to join" },
  { id: "invite", title: "Invite Only", desc: "Members invite others" },
];

type Props = { onCreated: (id: string) => void };

export default function FloqCreationWizard({ onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"open"|"request"|"invite">("request");
  const [vibe, setVibe] = useState<Vibe>("social");
  const create = useCreateFloq();

  const canCreate = name.trim().length > 0 && !create.isPending;

  const handleCreate = () => {
    if (!canCreate) return;
    create.mutate({ 
      name: name.trim(), 
      description: description.trim(), 
      privacy, 
      vibe 
    }, {
      onSuccess: (result) => onCreated(result.id)
    });
  };

  return (
    <div className="min-h-screen page-neon text-white neon-surface">
      <div className="mx-auto max-w-[900px] px-4 pb-28">
        {/* Header */}
        <div className="mb-6 pt-6">
          <button 
            className="chip-compact aura-sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Floqs
          </button>
        </div>

        <div className="create-hero flex flex-col items-center mb-6">
          <div className="neon-wrap neon-cyan neon-ring">
            <div className="relative icon h-24 w-24 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center">
              <Sparkles className="text-white text-2xl" />
            </div>
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-white">Create a New Floq</h1>
          <p className="mt-2 text-white/70">Start your own circle and connect with like-minded people</p>
        </div>

        {/* Details Section */}
        <section className="section-glass p-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-[13px] tracking-wide font-semibold text-white/90 uppercase">Details</div>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="floq-name" className="block text-[12px] text-white/70 mb-1">Floq Name *</label>
              <input 
                id="floq-name" 
                className="w-full input-glass px-3 py-2 text-[13px]"
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call your floq?"
                maxLength={50} 
                autoComplete="off" 
                autoCapitalize="none" 
                spellCheck={false} 
              />
              <div className="text-[11px] text-white/45 text-right mt-1">{name.length}/50</div>
            </div>
            <div>
              <label htmlFor="floq-description" className="block text-[12px] text-white/70 mb-1">Description</label>
              <textarea 
                id="floq-description" 
                rows={3} 
                className="w-full input-glass px-3 py-2 text-[13px] resize-none"
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's your floq about? What brings you together?" 
                maxLength={200} 
              />
              <div className="text-[11px] text-white/45 text-right mt-1">{description.length}/200</div>
            </div>
          </div>
        </section>

        {/* Primary Vibe Section */}
        <section className="section-glass p-4 mt-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-[13px] tracking-wide font-semibold text-white/90 uppercase">Primary Vibe</div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {VIBES.map(v => {
              const active = vibe === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setVibe(v.id as Vibe)}
                  className={`tile p-3 text-left transition ${active ? 'bg-white/8 border-white/18' : ''}`}
                  data-selected={active}
                >
                  <div className="font-semibold">{v.title}</div>
                  <div className="text-white/70 text-sm">{v.desc}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Privacy Section */}
        <section className="section-glass p-4 mt-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-[13px] tracking-wide font-semibold text-white/90 uppercase">Privacy</div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {PRIVACY_OPTIONS.map(p => {
              const active = privacy === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPrivacy(p.id as typeof privacy)}
                  className={`tile p-3 text-left transition ${active ? 'bg-white/8 border-white/18' : ''}`}
                  data-selected={active}
                >
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-white/70 text-sm">{p.desc}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Actions */}
        <div className="sticky bottom-0 z-10 mt-6 -mx-4 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]
                        bg-gradient-to-t from-[#0b0d12]/95 via-[#0b0d12]/70 to-transparent">
          <div className="flex gap-2 justify-end neon-surface">
            <div className="neon-wrap neon-cyan neon-ring">
              <Btn 
                className="btn-primary-glass btn-xs" 
                variant="primary" 
                glow
                onClick={handleCreate}
                disabled={!canCreate}
              >
                {create.isPending ? "Creating..." : "Create Floq"}
              </Btn>
            </div>
            <Btn className="btn-xs" onClick={() => window.history.back()}>Cancel</Btn>
          </div>
        </div>

        {create.error && (
          <div className="mt-4 section-glass p-3 border-red-500/20 bg-red-500/10 text-red-400 text-sm">
            {create.error.message}
          </div>
        )}
      </div>
    </div>
  );
}