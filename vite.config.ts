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

    // Detect sandbox environment and disable HMR to avoid 502s
    const isSandbox = process.env.VITE_SANDBOX === '1'
                   || /sandbox\.lovable\.dev$/.test(process.env.HOST ?? '')
                   || IS_HOSTED_PREVIEW;

    if (isSandbox) {
      console.log('[Vite] Disabling HMR in sandbox environment');
      return false;
    }

    if (PREVIEW_HMR_HOST) {
      return { 
        protocol: "wss", 
        host: PREVIEW_HMR_HOST, 
        port: 443, 
        clientPort: 443,
        overlay: false // silence error overlay in iframe
      };
    }
    return true; // local dev
  };

  return {
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: true,
      hmr: getHMRConfig(),
    },

    /* --------------- define globals --------------- */
    define: {
      // Expose the flag exactly like Metro does for React Native
      __DEV__: process.env.NODE_ENV !== 'production',
      // Polyfill global for Expo packages
      global: 'globalThis',
      // Polyfill process for Expo packages
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    },

    plugins: [
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),

    /* --------------- build optimizations --------------- */
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React libraries
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            
            // UI Libraries (Radix UI components)
            'ui-vendor': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-popover',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-accordion',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-radio-group',
              '@radix-ui/react-switch',
              '@radix-ui/react-slider',
              '@radix-ui/react-progress',
              '@radix-ui/react-avatar',
              '@radix-ui/react-separator',
              '@radix-ui/react-scroll-area'
            ],
            
            // Map and visualization libraries
            'maps-vendor': [
              'mapbox-gl',
              'deck.gl',
              '@deck.gl/layers',
              '@deck.gl/react',
              '@deck.gl/aggregation-layers'
            ],
            
            // Data libraries
            'data-vendor': [
              '@tanstack/react-query',
              '@supabase/supabase-js',
              'swr',
              'zustand'
            ],
            
            // Animation and interaction libraries
            'animation-vendor': [
              'framer-motion',
              '@use-gesture/react',
              'react-use-gesture'
            ],
            
            // Utility libraries
            'utils-vendor': [
              'date-fns',
              'dayjs',
              'lodash-es',
              'lodash.debounce',
              'lodash.throttle',
              'uuid',
              'nanoid',
              'zod',
              'clsx',
              'class-variance-authority',
              'tailwind-merge'
            ],
            
            // Graphics and rendering libraries
            'graphics-vendor': [
              'pixi.js',
              'canvas-confetti',
              'chroma-js',
              'd3-scale',
              'd3-scale-chromatic',
              'stats.js'
            ],
            
            // Development and debugging
            'dev-vendor': [
              '@tanstack/react-query-devtools',
              'comlink'
            ]
          }
        }
      },
      // Increase chunk size warning limit since we're splitting manually
      chunkSizeWarningLimit: 1000
    },

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
        { find: "expo-constants",   replacement: path.resolve(__dirname, "src/web-stubs/emptyModule.ts") },
        { find: "expo-device",      replacement: "expo-device/build/Device.web" },
        { find: "expo-asset",       replacement: path.resolve(__dirname, "src/web-stubs/emptyModule.ts") },

/* sentry-expo removed for better Lovable compatibility */

        /* regex: deep RN → vendor copies in RN-web */
        {
          find: /^react-native\/Libraries\/(.*)$/,
          replacement: "react-native-web/dist/vendor/react-native/Libraries/$1",
        },

        /* react-native-svg fabric stubs - must come before the regex rule */
        { find: /^react-native-web\/Libraries\/Utilities\/codegenNativeComponent$/, replacement: path.resolve(__dirname, "src/lib/stubs/codegenNativeComponent.js") },
        { find: /^react-native\/Libraries\/Utilities\/codegenNativeComponent$/, replacement: path.resolve(__dirname, "src/lib/stubs/codegenNativeComponent.js") },
        { find: /^react-native-web\/Libraries\/Utilities\/codegenNativeCommands$/, replacement: path.resolve(__dirname, "src/lib/stubs/codegenNativeCommands.js") },
        { find: /^react-native\/Libraries\/Utilities\/codegenNativeCommands$/, replacement: path.resolve(__dirname, "src/lib/stubs/codegenNativeCommands.js") },

        /* native-only libs we never want in the browser bundle */
        { find: "@rnmapbox/maps", replacement: path.resolve(__dirname, "src/web-stubs/emptyModule.ts") },
        { find: "react-native-mmkv", replacement: path.resolve(__dirname, "src/web-stubs/emptyModule.ts") },
        { find: "@react-native-async-storage/async-storage", replacement: path.resolve(__dirname, "src/web-stubs/emptyModule.ts") },
        { find: "expo-haptics", replacement: path.resolve(__dirname, "src/web-stubs/emptyModule.ts") },
      ],

      // ensure singletons
      dedupe: ["react", "react-dom", "react-native-web"],
    },
  };
});