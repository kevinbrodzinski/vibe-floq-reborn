export interface SharedActivityContext {
  targetProfileId: string;
  currentProfileId: string;
  vibeScore: number;                    // 0-100
  topCommonVenues: { id: string; name: string }[];
  sharedTags: string[];                 // e.g. ["coffee", "live-music"]
  lastHangDays: number | null;          // days since last hang, or null
}

export interface ActivitySuggestion {
  emoji: string;
  title: string;
  body: string;
  venue_id?: string;
  vibe?: string;
}

export const buildSharedActivitySuggestionsPrompt = (
  c: SharedActivityContext
) => `
You are Floq's social-match engine.
Return **1-3** JSON objects (no markdown) describing meet-up ideas for TWO users.

Keys per object:
  emoji        – single emoji
  title        – ≤ 50 chars
  body         – ≤ 160 chars, two sentences max
  venue_id     – optional
  vibe         – optional short vibe tag

Inputs:
• Compatibility ${c.vibeScore} %
• Shared tags: ${c.sharedTags.join(", ") || "none"}
• Top venues:  ${c.topCommonVenues.map(v=>v.name).join(", ") || "none"}
• Last hang:   ${
    c.lastHangDays === null
      ? "never met"
      : `${c.lastHangDays} days ago`
  }

Guidelines:
1. Mention a top common venue when relevant.
2. Tailor tone to vibeScore (higher → more adventurous).
3. No AI, model, or JSON jargon in copy.
4. Output valid JSON array ONLY.`;