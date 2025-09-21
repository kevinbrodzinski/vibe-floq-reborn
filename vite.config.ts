// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';
import { postgrestFixPlugin } from './src/vite/postgrest-fix-plugin';

/**
 * Catch React-Native deep imports that break web builds and route them
 * to web-safe stubs BEFORE Vite tries to resolve/transform them.
 */
function rnWebSafetyPlugin() {
  const CGNC_RNWEB = 'react-native-web/Libraries/Utilities/codegenNativeComponent';
  const CGNC_RN    = 'react-native/Libraries/Utilities/codegenNativeComponent';
  const CMDS_RNWEB = 'react-native-web/Libraries/Utilities/codegenNativeCommands';
  const CMDS_RN    = 'react-native/Libraries/Utilities/codegenNativeCommands';

  // Flow-based AssetRegistry & the RN package version
  const ASSET_REG_RN   = 'react-native/Libraries/Image/AssetRegistry';
  const ASSET_REG_PKG  = '@react-native/assets-registry/registry';
  const RNSVG_FABRIC_NATIVE = /^react-native-svg\/lib\/module\/fabric\/.*NativeComponent\.js$/;

  return {
    name: 'rn-web-safety-plugin',
    enforce: 'pre' as const,
    resolveId(source: string) {
      // RN codegen (native components / commands) → local stubs
      if (source === CGNC_RNWEB || source === CGNC_RN) {
        return path.resolve(__dirname, 'src/shims/codegenNativeComponent.web.ts');
      }
      if (source === CMDS_RNWEB || source === CMDS_RN) {
        return path.resolve(__dirname, 'src/shims/codegenNativeCommands.web.ts');
      }

      // RN svg fabric native components → no-op (do not attempt codegen in web)
      if (RNSVG_FABRIC_NATIVE.test(source)) {
        return path.resolve(__dirname, 'src/shims/rns-fabric-native-component.web.ts');
      }

      // AssetRegistry → prefer RNW CJS impl, else fall back to local stub
      if (source === ASSET_REG_RN || source === `${ASSET_REG_RN}.js` || source === ASSET_REG_PKG) {
        try {
          // @ts-ignore - resolve from project root
          return require.resolve(
            'react-native-web/dist/cjs/modules/AssetRegistry/index.js',
            { paths: [process.cwd()] }
          );
        } catch {
          return path.resolve(__dirname, 'src/lib/stubs/AssetRegistry.js');
        }
      }

      // Normalize rare ".js" variant of jsx-runtime
      if (source === 'react/jsx-runtime.js') return 'react/jsx-runtime';

      return null;
    },
  };
}

/* ─────────────────────── Env / HMR helpers ─────────────────────── */
const PREVIEW_HMR_HOST  = process.env.VITE_HMR_HOST;
const DISABLE_HMR       = process.env.VITE_DEV_SOCKET;
const IS_HOSTED_PREVIEW =
  process.env.NODE_ENV === 'production' ||
  process.env.NEXT_PUBLIC_HOSTED_PREVIEW === 'true';

export default defineConfig(({ mode, command }) => {
  const getHMRConfig = () => {
    if (process.env.TARGET === 'native' || command === 'build') return false;
    if (DISABLE_HMR === 'false') return false;

    const isSandbox =
      process.env.VITE_SANDBOX === '1' ||
      /sandbox\.lovable\.dev$/.test(process.env.HOST ?? '') ||
      IS_HOSTED_PREVIEW;

    if (isSandbox) {
      console.log('[Vite] Disabling HMR in sandbox/hosted preview');
      return false;
    }

    if (PREVIEW_HMR_HOST) {
      return {
        protocol: 'wss',
        host: PREVIEW_HMR_HOST,
        port: 443,
        clientPort: 443,
        overlay: false,
      };
    }
    return true; // local dev
  };

  return {
    server: {
      host: '0.0.0.0',
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
      postgrestFixPlugin(), // collapse deep postgrest imports → package root
      rnWebSafetyPlugin(),  // intercept RN deep imports (codegen, AssetRegistry, rns-svg fabric)
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),

    resolve: {
      alias: {
        // Project roots
        '@': path.resolve(__dirname, 'src'),
        '@entry': path.resolve(__dirname, 'src/main.web.tsx'),

        /**
         * IMPORTANT:
         *  - Exact-match 'react-native' → shim that re-exports RN Web and adds a named TurboModuleRegistry.
         *  - Also catch explicit entry imports ('react-native/index'|'.js').
         *  - Do NOT rewrite deep RN subpaths here; the pre-plugin handles those.
         */
        'react-native$': path.resolve(__dirname, 'src/shims/react-native-web-plus.js'),
        'react-native/index.js': path.resolve(__dirname, 'src/shims/react-native-web-plus.js'),
        'react-native/index':    path.resolve(__dirname, 'src/shims/react-native-web-plus.js'),

        // RN codegen stubs (belt & suspenders; pre-plugin already handles these)
        'react-native/Libraries/Utilities/codegenNativeComponent':
          path.resolve(__dirname, 'src/shims/codegenNativeComponent.web.ts'),
        'react-native/Libraries/Utilities/codegenNativeCommands':
          path.resolve(__dirname, 'src/shims/codegenNativeCommands.web.ts'),

        // RNW vendor TurboModuleRegistry callsites → stub (used by Animated & sometimes rns-svg)
        'react-native-web/dist/vendor/react-native/Utilities/TurboModuleRegistry':
          path.resolve(__dirname, 'src/lib/stubs/TurboModuleRegistry.js'),
        'react-native-web/dist/vendor/react-native/Animated/TurboModuleRegistry':
          path.resolve(__dirname, 'src/lib/stubs/TurboModuleRegistry.js'),

        // Normalize rare ".js" specifier for jsx-runtime
        'react/jsx-runtime.js': 'react/jsx-runtime',

        // Expo/native-only web stubs (keep as needed)
        'expo-application': 'expo-application/web',
        'expo-constants': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
        'expo-device': 'expo-device/build/Device.web',
        'expo-asset': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
        '@rnmapbox/maps': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
        'react-native-mmkv': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
        '@react-native-async-storage/async-storage': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
        'expo-haptics': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
      },

      dedupe: ['react', 'react-dom', 'react-native-web', 'use-sync-external-store'],
    },

    /** Prebundle the right things so jsx-runtime + postgrest interop exist in dev */
    optimizeDeps: {
      noDiscovery: true,
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react-native-web',
        '@supabase/postgrest-js',   // prebundle PACKAGE ROOT (not deep files)
        // add other CJS micro-libs here if needed:
        // 'lodash.throttle',
      ],
      exclude: [
        'react-native',
        'react-native-svg',
        '@react-native/assets-registry',
      ],
      esbuildOptions: {
        mainFields: ['browser', 'module', 'main'],
        conditions: ['browser', 'module', 'default'],
      },
    },

    /** Ensure CJS default interop in prod build */
    build: {
      commonjsOptions: {
        defaultIsModuleExports: true,
        transformMixedEsModules: true,
      },
    },
  };
});