import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/* ─────────────────────── Env helpers ─────────────────────── */
const PREVIEW_HMR_HOST  = process.env.VITE_HMR_HOST;
const DISABLE_HMR       = process.env.VITE_DEV_SOCKET;
const IS_HOSTED_PREVIEW =
  process.env.NODE_ENV === "production" ||
  process.env.NEXT_PUBLIC_HOSTED_PREVIEW === "true";

/* ───────────────────── Main export ───────────────────────── */
export default defineConfig(({ mode, command }) => {
  /* HMR logic */
  const getHMRConfig = () => {
    if (process.env.TARGET === "native" || command === "build") return false;
    if (DISABLE_HMR === "false") return false;

    if (PREVIEW_HMR_HOST) {
      return { protocol: "wss", host: PREVIEW_HMR_HOST, port: 443, clientPort: 443 };
    }
    return true; // local dev
  };

  return {
    server: {
      host: "0.0.0.0",
      port: 8080,
      hmr: getHMRConfig(),
    },

    plugins: [
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),

    /* --------------- alias rules --------------- */
    resolve: {
      alias: [
        /* project roots (string-to-string) */
        { find: "@",      replacement: path.resolve(__dirname, "src") },
        { find: "@entry", replacement: path.resolve(__dirname, "src/main.web.tsx") },

        /* RN core shim */
        { find: "react-native", replacement: "react-native-web" },

        /* expo shims used by sentry-expo & friends */
        { find: "expo-application", replacement: "expo-application/web" },
        { find: "expo-constants",   replacement: "expo-constants/build/Constants.web" },
        { find: "expo-device",      replacement: "expo-device/build/Device.web" },

        /* fully stub sentry-expo on web */
        { find: "sentry-expo", replacement: path.resolve(__dirname, "src/web-stubs/emptyModule.ts") },

        /* regex: deep RN → vendor copies in RN-web */
        {
          find: /^react-native\/Libraries\/(.*)$/,
          replacement: "react-native-web/dist/vendor/react-native/Libraries/$1",
        },

        /* native-only libs we never want in the browser bundle */
        { find: "@rnmapbox/maps", replacement: path.resolve(__dirname, "src/web-stubs/emptyModule.ts") },
      ],

      // ensure singletons
      dedupe: ["react", "react-dom", "react-native-web"],
    },
  };
});