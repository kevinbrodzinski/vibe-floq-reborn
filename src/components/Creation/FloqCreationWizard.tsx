import React, { useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import Btn from "@/components/Common/Btn";
import { useCreateFloq } from "@/hooks/useCreateFloq";
import { vibeRingClass, normalizeVibe } from "@/components/Common/vibeTokens";
import { type Vibe } from "@/components/Floqs/Create/vibeGlow";

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-4 shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-6 rounded-md bg-white/10 grid place-items-center text-white/80">{icon}</div>
        <h3 className="text-[13px] tracking-wide font-semibold text-white/90 uppercase">{title}</h3>
      </div>
      {children}
    </div>
  );
}

type Props = { onCreated: (id: string) => void };

export default function FloqCreationWizard({ onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"open"|"request"|"invite">("request");
  const [vibe, setVibe] = useState<Vibe>("social");
  const create = useCreateFloq();

  const canCreate = name.trim().length > 0 && !create.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 backdrop-blur-xl bg-zinc-950/70">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button 
            type="button"
            className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 grid place-items-center hover:bg-white/10 transition"
            onClick={() => window.history.back()}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg grid place-items-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="text-lg font-semibold">Create a Floq</div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <Section title="Basics" icon={<span>🎯</span>}>
          <div className="space-y-3">
            <div>
              <label htmlFor="floq-name" className="block text-[12px] text-white/70 mb-1">Name</label>
              <input 
                id="floq-name"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-[13px] outline-none focus:border-white/20 transition"
                value={name} 
                onChange={e=>setName(e.target.value)} 
                placeholder="e.g. Weekend Warriors, Coffee Club, Beach Crew..."
                maxLength={50}
              />
            </div>
            <div>
              <label htmlFor="floq-description" className="block text-[12px] text-white/70 mb-1">Description (optional)</label>
              <textarea 
                id="floq-description"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-[13px] outline-none focus:border-white/20 transition resize-none"
                value={description} 
                onChange={e=>setDescription(e.target.value)} 
                placeholder="What's this floq about? What brings you together?"
                rows={3}
                maxLength={200}
              />
            </div>
          </div>
        </Section>

        <Section title="Privacy & Vibe" icon={<span>🔒</span>}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="mb-2 text-[12px] text-white/80 font-medium">Who can join?</div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setPrivacy("open")}
                  className={`w-full text-left rounded-lg px-2 py-1.5 text-[11px] transition ${
                    privacy === "open" ? "bg-white/15 border border-white/20" : "hover:bg-white/5"
                  }`}
                >
                  <div className="font-medium">Open</div>
                  <div className="text-white/60">Anyone can join instantly</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPrivacy("request")}
                  className={`w-full text-left rounded-lg px-2 py-1.5 text-[11px] transition ${
                    privacy === "request" ? "bg-white/15 border border-white/20" : "hover:bg-white/5"
                  }`}
                >
                  <div className="font-medium">Request</div>
                  <div className="text-white/60">People request to join</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPrivacy("invite")}
                  className={`w-full text-left rounded-lg px-2 py-1.5 text-[11px] transition ${
                    privacy === "invite" ? "bg-white/15 border border-white/20" : "hover:bg-white/5"
                  }`}
                >
                  <div className="font-medium">Invite Only</div>
                  <div className="text-white/60">Members invite others</div>
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="mb-2 text-[12px] text-white/80 font-medium">Primary Vibe</div>
              <div className="grid grid-cols-2 gap-1.5">
                {(["Social","Chill","Active","Hype","Productive","Quiet"] as const).map(v => {
                  const isActive = vibe === v.toLowerCase() as Vibe;
                  const ring = isActive ? `ring-2 ${vibeRingClass[normalizeVibe(v)]} btn-glow` : "";
                  return (
                    <Btn
                      key={v}
                      tone={isActive ? "primary" : "subtle"}
                      className={`text-[10px] py-1 ring-offset-0 ${ring}`}
                      onClick={() => setVibe(v.toLowerCase() as Vibe)}
                      aria-label={`Select ${v} vibe`}
                    >
                      {v}
                    </Btn>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>

        <div className="flex gap-3 pt-2">
        <Btn
          onClick={() => {
            if (!canCreate) return;
            create.mutate({ 
              name: name.trim(), 
              description: description.trim(), 
              privacy, 
              vibe 
            }, {
              onSuccess: (result) => onCreated(result.id)
            });
          }}
          className={`flex-1 ${canCreate ? '' : 'opacity-50 cursor-not-allowed'}`}
          disabled={!canCreate}
        >
            {create.isPending ? 'Creating...' : 'Create Floq'}
          </Btn>
          <Btn 
            aria-label="Cancel" 
            onClick={() => window.history.back()}
            className="px-6"
          >
            Cancel
          </Btn>
        </div>

        {create.error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-[12px] text-red-400">
            {create.error.message}
          </div>
        )}
      </main>
    </div>
  );
}