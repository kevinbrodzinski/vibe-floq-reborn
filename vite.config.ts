import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';

function rnwLegacyShims() {
  const LEGACY_CGNC_RNWEB = 'react-native-web/Libraries/Utilities/codegenNativeComponent';
  const LEGACY_CGNC_RN    = 'react-native/Libraries/Utilities/codegenNativeComponent';
  const LEGACY_CMDS_RNWEB = 'react-native-web/Libraries/Utilities/codegenNativeCommands';
  const LEGACY_CMDS_RN    = 'react-native/Libraries/Utilities/codegenNativeCommands';
  const RNSVG_FABRIC_NATIVE = /^react-native-svg\/lib\/module\/fabric\/.*NativeComponent\.js$/;

  return {
    name: 'rnw-legacy-shims',
    enforce: 'pre' as const,
    resolveId(source: string) {
      if (source === LEGACY_CGNC_RNWEB || source === LEGACY_CGNC_RN) {
        return path.resolve(__dirname, 'src/shims/codegenNativeComponent.web.ts');
      }
      if (source === LEGACY_CMDS_RNWEB || source === LEGACY_CMDS_RN) {
        return path.resolve(__dirname, 'src/shims/codegenNativeCommands.web.ts');
      }
      if (RNSVG_FABRIC_NATIVE.test(source)) {
        return path.resolve(__dirname, 'src/shims/rns-fabric-native-component.web.ts');
      }
      // normalize rare ".js" variant to module id so optimizeDeps include hits
      if (source === 'react/jsx-runtime.js') return 'react/jsx-runtime';
      return null;
    },
  };
}

function postgrestCollapse() {
  const re = /^@supabase\/postgrest-js\/dist\/.+/;
  return {
    name: 'postgrest-collapse',
    enforce: 'pre' as const,
    resolveId(id: string) {
      if (re.test(id)) return '@supabase/postgrest-js';
      return null;
    },
  };
}

/* ─────────────────────── Env helpers ─────────────────────── */
const PREVIEW_HMR_HOST  = process.env.VITE_HMR_HOST;
const DISABLE_HMR       = process.env.VITE_DEV_SOCKET;
const IS_HOSTED_PREVIEW =
  process.env.NODE_ENV === "production" ||
  process.env.NEXT_PUBLIC_HOSTED_PREVIEW === "true";

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

    define: {
      __DEV__: process.env.NODE_ENV !== 'production',
      global: 'globalThis',
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    },

    plugins: [
      rnwLegacyShims(), // 👈 intercept legacy ids before Vite resolves
      postgrestCollapse(), // 👈 collapse any deep postgrest imports to root
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),

    resolve: {
      alias: {
        // Project roots
        '@': path.resolve(__dirname, 'src'),
        '@entry': path.resolve(__dirname, 'src/main.web.tsx'),

        // 1) Force RN → RN Web in ALL cases (no `$` suffix; works for CJS too)
        'react-native': 'react-native-web',

        // 2) react-native-svg 🤝 RN-Web (prefer real exports if present; shims are below)
        'react-native-web/Libraries/Utilities/codegenNativeComponent':
          path.resolve(__dirname, 'src/shims/codegenNativeComponent.web.ts'),
        'react-native/Libraries/Utilities/codegenNativeComponent':
          path.resolve(__dirname, 'src/shims/codegenNativeComponent.web.ts'),

        'react-native-web/Libraries/Utilities/codegenNativeCommands':
          path.resolve(__dirname, 'src/shims/codegenNativeCommands.web.ts'),
        'react-native/Libraries/Utilities/codegenNativeCommands':
          path.resolve(__dirname, 'src/shims/codegenNativeCommands.web.ts'),

        // Some deps deep-require svg/fabric → force non-fabric
        'react-native-svg/lib/module/fabric': 'react-native-svg/lib/module',

        // Normalize the rare ".js" specifier to the module id
        'react/jsx-runtime.js': 'react/jsx-runtime',

        // Expo/native-only web stubs
        'expo-application': 'expo-application/web',
        'expo-constants': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
        'expo-device': 'expo-device/build/Device.web',
        'expo-asset': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
        '@rnmapbox/maps': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
        'react-native-mmkv': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
        '@react-native-async-storage/async-storage': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
        'expo-haptics': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
      },

      dedupe: ['react', 'react-dom', 'react-native-web'],
    },

    /** 🔥 Prebundle the right things so jsx-runtime exports exist */
    optimizeDeps: {
      // We control what's prebundled; don't auto-discover
      noDiscovery: true,
      // MUST include jsx-runtime so esbuild wraps CJS → ESM with named exports 'jsx'/'jsxs'
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react-native-web'],
      // Never prebundle RN nor RNSVG (we shim them), exclude postgrest-js so package resolves at runtime
      exclude: ['react-native', 'react-native-svg', '@supabase/postgrest-js'],
      esbuildOptions: {
        mainFields: ['browser', 'module', 'main'],
        // pick the browser condition if provided by deps
        conditions: ['browser', 'module', 'default'],
      },
    },
  };
});