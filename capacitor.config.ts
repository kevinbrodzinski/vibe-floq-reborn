import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.11986cc974734e3383ddacd244d83d3e',
  appName: 'vibe-flow-orb',
  webDir: 'dist',
  server: {
    url: process.env.TARGET === 'native' ? undefined : 'https://11986cc9-7473-4e33-83dd-acd244d83d3e.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Geolocation: {
      permissions: ['location']
    }
  }
};

export default config;