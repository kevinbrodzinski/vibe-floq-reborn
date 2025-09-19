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
    <div className="mx-auto max-w-[900px] px-4 pb-28">
      {/* Header */}
      <div className="mb-6">
        <button 
          className="chip-compact aura-sm"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Floqs
        </button>
      </div>

      <div className="create-hero flex flex-col items-center mb-6">
        <div className="relative icon h-24 w-24 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center shadow-[0_0_40px_rgba(139,92,246,.35)]">
          <Sparkles className="text-white text-2xl" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-white">Create a New Floq</h1>
        <p className="mt-2 text-white/70">Start your own circle and connect with like-minded people</p>
      </div>

      {/* Name + Description */}
      <Section title="Details">
        <div className="grid gap-4">
          <label className="block">
            <div className="text-white font-semibold mb-2">Floq Name *</div>
            <Input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call your floq?"
              maxLength={50}
            />
          </label>

          <label className="block">
            <div className="text-white font-semibold mb-2">Description</div>
            <Textarea 
              rows={3} 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's your floq about? What brings you together?"
              maxLength={200}
            />
          </label>
        </div>
      </Section>

      {/* Primary Vibe */}
      <Section title="Primary Vibe" className="mt-5">
        <div className="grid sm:grid-cols-2 gap-3">
          {VIBES.map(v => (
            <button
              key={v.id}
              onClick={() => setVibe(v.id as Vibe)}
              className={`text-left glass-subtle p-3 rounded-2xl border transition ${
                vibe === v.id 
                  ? "border-white/20 bg-white/10" 
                  : "border-white/10 hover:bg-white/8"
              }`}
            >
              <div className="text-white font-semibold">{v.title}</div>
              <div className="text-white/70 text-sm">{v.desc}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* Privacy */}
      <Section title="Privacy" className="mt-5">
        <div className="grid sm:grid-cols-3 gap-3">
          {PRIVACY_OPTIONS.map(p => (
            <button
              key={p.id}
              onClick={() => setPrivacy(p.id as typeof privacy)}
              className={`text-left glass-subtle p-3 rounded-2xl border transition ${
                privacy === p.id 
                  ? "border-white/20 bg-white/10" 
                  : "border-white/10 hover:bg-white/8"
              }`}
            >
              <div className="text-white font-semibold">{p.title}</div>
              <div className="text-white/70 text-sm">{p.desc}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* Actions */}
      <div className="mt-6 flex gap-2 justify-end">
        <Btn onClick={() => window.history.back()}>Cancel</Btn>
        <Btn 
          variant="primary" 
          glow 
          onClick={handleCreate}
          disabled={!canCreate}
          className={!canCreate ? "opacity-50" : ""}
        >
          {create.isPending ? "Creating..." : "Create Floq"}
        </Btn>
      </div>

      {create.error && (
        <div className="mt-4 glass-subtle p-3 border border-red-500/20 bg-red-500/10">
          <div className="text-red-400 text-sm">{create.error.message}</div>
        </div>
      )}
    </div>
  );
}