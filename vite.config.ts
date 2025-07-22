import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// HMR configuration for Lovable cloud environment
const PREVIEW_HMR_HOST = process.env.VITE_HMR_HOST;
const DISABLE_HMR = process.env.VITE_DEV_SOCKET === 'false';
const IS_HOSTED_PREVIEW = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_HOSTED_PREVIEW === 'true';

export default defineConfig(({ mode, command }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: process.env.TARGET === 'native'
      ? false
      : command === 'build'
        ? false  
        : PREVIEW_HMR_HOST
          ? { protocol: 'wss', host: PREVIEW_HMR_HOST, port: 443 }
          : true,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@entry": path.resolve(__dirname, "./src/main.web.tsx"),
      // Tell Vite to use react-native-web whenever something imports react-native
      'react-native': 'react-native-web',
      // Stub out the native Mapbox bridge so Rollup stops complaining
      '@rnmapbox/maps': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
    },
    dedupe: ['react', 'react-dom'],
  },
}));