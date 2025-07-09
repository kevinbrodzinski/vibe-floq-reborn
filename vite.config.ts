import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// READ the host once so dev & cloud builds behave
const PREVIEW_HMR_HOST = process.env.VITE_HMR_HOST;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",            // keep IPv6 wildcard
    port: 8080,            // keep local dev port
    hmr: PREVIEW_HMR_HOST
      ? {
          protocol: 'wss',           // secure WS (Lovable runs on https)
          host: PREVIEW_HMR_HOST,    // 👉 cloud preview host
          port: 443,
        }
      : true,                        // fall back to default localhost HMR
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
