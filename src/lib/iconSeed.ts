export function pickEmojiForId(id: string) {
  const emojis = ["🪩","🎯","🔥","🎧","🌊","🌙","⚡️","🥏","🎳","🍹","🎮","🛼","🎭","🪄","🏄‍♀️"];
  const n = hash(id) % emojis.length;
  return emojis[n];
}

function hash(s: string) {
  let h = 2166136261;
  for (let i=0;i<s.length;i++) { h ^= s.charCodeAt(i); h += (h<<1) + (h<<4) + (h<<7) + (h<<8) + (h<<24); }
  return Math.abs(h >>> 0);
}