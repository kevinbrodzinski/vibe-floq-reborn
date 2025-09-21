import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';
import { postgrestFixPlugin } from './src/vite/postgrest-fix-plugin';

/** Intercept RN deep imports (codegen & rns-svg fabric) BEFORE Vite resolves them. */
function rnWebSafetyPlugin() {
  const CGNC_RNWEB = 'react-native-web/Libraries/Utilities/codegenNativeComponent';
  const CGNC_RN    = 'react-native/Libraries/Utilities/codegenNativeComponent';
  const CMDS_RNWEB = 'react-native-web/Libraries/Utilities/codegenNativeCommands';
  const CMDS_RN    = 'react-native/Libraries/Utilities/codegenNativeCommands';
  const RNSVG_FABRIC_NATIVE = /^react-native-svg\/lib\/module\/fabric\/.*NativeComponent\.js$/;

  return {
    name: 'rn-web-safety-plugin',
    enforce: 'pre' as const,
    resolveId(source: string) {
      if (source === CGNC_RNWEB || source === CGNC_RN) {
        return path.resolve(__dirname, 'src/shims/codegenNativeComponent.web.ts');
      }
      if (source === CMDS_RNWEB || source === CMDS_RN) {
        return path.resolve(__dirname, 'src/shims/codegenNativeCommands.web.ts');
      }
      if (RNSVG_FABRIC_NATIVE.test(source)) {
        return path.resolve(__dirname, 'src/shims/rns-fabric-native-component.web.ts');
      }
      if (source === 'react/jsx-runtime.js') return 'react/jsx-runtime';
      return null;
    },
  };
}

/* HMR helpers */
const PREVIEW_HMR_HOST  = process.env.VITE_HMR_HOST;
const DISABLE_HMR       = process.env.VITE_DEV_SOCKET;
const IS_HOSTED_PREVIEW =
  process.env.NODE_ENV === 'production' ||
  process.env.NEXT_PUBLIC_HOSTED_PREVIEW === 'true';

export default defineConfig(({ mode, command }) => {
  const getHMR = () => {
    if (process.env.TARGET === 'native' || command === 'build') return false;
    if (DISABLE_HMR === 'false') return false;
    const isSandbox =
      process.env.VITE_SANDBOX === '1' ||
      /sandbox\.lovable\.dev$/.test(process.env.HOST ?? '') ||
      IS_HOSTED_PREVIEW;
    if (isSandbox) return false;
    if (PREVIEW_HMR_HOST) {
      return { protocol: 'wss', host: PREVIEW_HMR_HOST, port: 443, clientPort: 443, overlay: false };
    }
    return true;
  };

  return {
    server: { host: '0.0.0.0', port: 8080, strictPort: true, hmr: getHMR() },

    define: {
      __DEV__: process.env.NODE_ENV !== 'production',
      global: 'globalThis',
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    },

    plugins: [
      postgrestFixPlugin(), // collapse deep postgrest imports → package root
      rnWebSafetyPlugin(),  // intercept RN deep imports
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),

    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@entry': path.resolve(__dirname, 'src/main.web.tsx'),

        // Exact-match 'react-native' → RNW shim (adds TurboModuleRegistry)
        'react-native$': path.resolve(__dirname, 'src/shims/react-native-web-plus.js'),
        // Catch explicit entry imports too
        'react-native/index.js': path.resolve(__dirname, 'src/shims/react-native-web-plus.js'),
        'react-native/index':    path.resolve(__dirname, 'src/shims/react-native-web-plus.js'),

        // RN codegen stubs (belt & suspenders)
        'react-native/Libraries/Utilities/codegenNativeComponent':
          path.resolve(__dirname, 'src/shims/codegenNativeComponent.web.ts'),
        'react-native/Libraries/Utilities/codegenNativeCommands':
          path.resolve(__dirname, 'src/shims/codegenNativeCommands.web.ts'),

        // RNW vendor TurboModuleRegistry callsites → stub
        'react-native-web/dist/vendor/react-native/Utilities/TurboModuleRegistry':
          path.resolve(__dirname, 'src/lib/stubs/TurboModuleRegistry.js'),
        'react-native-web/dist/vendor/react-native/Animated/TurboModuleRegistry':
          path.resolve(__dirname, 'src/lib/stubs/TurboModuleRegistry.js'),

        'react/jsx-runtime.js': 'react/jsx-runtime',

        // Optional native stubs you already had
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

    optimizeDeps: {
      noDiscovery: true,
      include: [
        'react', 'react-dom', 'react/jsx-runtime', 'react-native-web',
        '@supabase/postgrest-js',
      ],
      exclude: ['react-native', 'react-native-svg', '@react-native/assets-registry'],
      esbuildOptions: {
        mainFields: ['browser', 'module', 'main'],
        conditions: ['browser', 'module', 'default'],
      },
    },

    build: {
      commonjsOptions: {
        defaultIsModuleExports: true,
        transformMixedEsModules: true,
      },
    },
  };
});