import { 
  Sparkles, Zap, Users2, Waves, Target, Compass, 
  Hexagon, Star, Circle, Triangle, Flame, Gamepad2,
  Music2, Crown, Gem
} from 'lucide-react';

const iconMap = [
  Sparkles, Target, Flame, Music2, Waves, Circle, 
  Zap, Hexagon, Crown, Gem, Gamepad2, Star,
  Triangle, Compass, Users2
];

export function pickEmojiForId(id: string) {
  const emojis = ["🪩","🎯","🔥","🎧","🌊","🌙","⚡️","🥏","🎳","🍹","🎮","🛼","🎭","🪄","🏄‍♀️"];
  const n = hash(id) % emojis.length;
  return emojis[n];
}

export function pickIconForId(id: string) {
  const n = hash(id) % iconMap.length;
  return iconMap[n];
}

function hash(s: string) {
  let h = 2166136261;
  for (let i=0;i<s.length;i++) { h ^= s.charCodeAt(i); h += (h<<1) + (h<<4) + (h<<7) + (h<<8) + (h<<24); }
  return Math.abs(h >>> 0);
}