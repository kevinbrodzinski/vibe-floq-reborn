import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// HMR configuration for Lovable cloud environment
const PREVIEW_HMR_HOST = process.env.VITE_HMR_HOST;
const DISABLE_HMR = process.env.VITE_DEV_SOCKET === 'false';
const IS_HOSTED_PREVIEW = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_HOSTED_PREVIEW === 'true';
const IS_SANDBOX = process.env.VITE_SANDBOX === '1' || /sandbox\.lovable\.dev$/.test(process.env.HOST ?? '');

export default defineConfig(({ mode, command }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: process.env.TARGET === 'native'
      ? false
      : command === 'build'
        ? false
        : IS_SANDBOX
          ? false  // No HMR in sandbox to prevent 502s
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
    },
    dedupe: ['react', 'react-dom'],
  },
}));