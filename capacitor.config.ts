import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.11986cc974734e3383ddacd244d83d3e',
  appName: 'vibe-flow-orb',
  webDir: 'dist',
  server: {
    url: process.env.TARGET === 'native' ? undefined : 'https://11986cc9-7473-4e33-83dd-acd244d83d3e.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    minSdkVersion: 24
  },
  env: {
    SUPABASE_URL: 'https://reztyrrafsmlvvlqvsqt.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlenR5cnJhZnNtbHZ2bHF2c3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNTI5MTcsImV4cCI6MjA2NzYyODkxN30.6rCBIkV5Fk4qzSfiAR0I8biCQ-YdfdT-ZnJZigWqSck',
    SUPABASE_EDGE_URL: 'https://reztyrrafsmlvvlqvsqt.supabase.co/functions/v1'
  },
  plugins: {
    Geolocation: {
      permissions: ['location']
    }
  }
};

export default config;