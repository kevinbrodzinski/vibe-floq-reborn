import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// HMR configuration for Lovable cloud environment
const PREVIEW_HMR_HOST = process.env.VITE_HMR_HOST;
const DISABLE_HMR = process.env.VITE_DEV_SOCKET === 'false';
const IS_HOSTED_PREVIEW = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_HOSTED_PREVIEW === 'true';

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: mode === 'development' && !IS_HOSTED_PREVIEW ? PREVIEW_HMR_HOST
      ? {
          protocol: 'wss',
          host: PREVIEW_HMR_HOST,
          port: 443,
        }
      : true : false,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
}));