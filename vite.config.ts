import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';

/** RN Web legacy deep imports used by react-native-svg (Fabric) */
function rnwLegacyShims() {
  const LEGACY_CGNC_RNWEB = 'react-native-web/Libraries/Utilities/codegenNativeComponent';
  const LEGACY_CGNC_RN    = 'react-native/Libraries/Utilities/codegenNativeComponent';
  const LEGACY_CMDS_RNWEB = 'react-native-web/Libraries/Utilities/codegenNativeCommands';
  const LEGACY_CMDS_RN    = 'react-native/Libraries/Utilities/codegenNativeCommands';
  const RNSVG_FABRIC_NATIVE = /^react-native-svg\/lib\/module\/fabric\/.*NativeComponent\.js$/;
  const RN_ASSETS_REGISTRY = '@react-native/assets-registry/registry';

  return {
    name: 'rnw-legacy-shims',
    enforce: 'pre' as const,
    resolveId(source: string) {
      if (source === LEGACY_CGNC_RNWEB || source === LEGACY_CGNC_RN) {
        return path.resolve(__dirname, 'src/lib/stubs/codegenNativeComponent.js');
      }
      if (source === LEGACY_CMDS_RNWEB || source === LEGACY_CMDS_RN) {
        return path.resolve(__dirname, 'src/lib/stubs/codegenNativeCommands.js');
      }
      if (source === RN_ASSETS_REGISTRY) {
        return path.resolve(__dirname, 'src/lib/stubs/assetsRegistry.js');
      }
      if (RNSVG_FABRIC_NATIVE.test(source)) {
        return path.resolve(__dirname, 'src/shims/rns-fabric-native-component.web.ts');
      }
      // normalize rare ".js" specifier to module id so optimizeDeps include hits
      if (source === 'react/jsx-runtime.js') return 'react/jsx-runtime';
      return null;
    },
  };
}

/** Collapse any deep postgrest-js import to the package root (which we can control). */
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

// HMR helpers for Lovable cloud
const PREVIEW_HMR_HOST  = process.env.VITE_HMR_HOST;
const DISABLE_HMR_FLAG  = process.env.VITE_DEV_SOCKET === 'false';
const IS_HOSTED_PREVIEW =
  process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_HOSTED_PREVIEW === 'true';
const IS_SANDBOX =
  process.env.VITE_SANDBOX === '1' || /sandbox\.lovable\.dev$/.test(process.env.HOST ?? '');

export default defineConfig(({ mode, command }) => {
  const hmr =
    process.env.TARGET === 'native' || command === 'build'
      ? false
      : DISABLE_HMR_FLAG
        ? false
        : IS_SANDBOX || IS_HOSTED_PREVIEW
          ? false
          : PREVIEW_HMR_HOST
            ? { protocol: 'wss', host: PREVIEW_HMR_HOST, port: 443, clientPort: 443, overlay: false }
            : true;

  return {
    server: { host: '0.0.0.0', port: 8080, strictPort: true, hmr },
    define: {
      __DEV__: process.env.NODE_ENV !== 'production',
      global: 'globalThis',
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    },
    plugins: [
      rnwLegacyShims(),
      postgrestCollapse(),
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@entry': path.resolve(__dirname, 'src/main.web.tsx'),

        // RN → RN Web in ALL cases (no $ suffix so CJS requires are caught too)
        'react-native': 'react-native-web',

        // react-native-svg fabric → non-fabric handled by the plugin above; also keep direct aliases
        'react-native-web/Libraries/Utilities/codegenNativeComponent':
          path.resolve(__dirname, 'src/lib/stubs/codegenNativeComponent.js'),
        'react-native/Libraries/Utilities/codegenNativeComponent':
          path.resolve(__dirname, 'src/lib/stubs/codegenNativeComponent.js'),
        'react-native-web/Libraries/Utilities/codegenNativeCommands':
          path.resolve(__dirname, 'src/lib/stubs/codegenNativeCommands.js'),
        'react-native/Libraries/Utilities/codegenNativeCommands':
          path.resolve(__dirname, 'src/lib/stubs/codegenNativeCommands.js'),
        '@react-native/assets-registry/registry':
          path.resolve(__dirname, 'src/lib/stubs/assetsRegistry.js'),
        'react-native-svg/lib/module/fabric': 'react-native-svg/lib/module',
        
        // React Native MMKV stub
        'react-native-mmkv': path.resolve(__dirname, 'src/lib/stubs/mmkv.js'),

        // Normalize rare ".js" specifier
        'react/jsx-runtime.js': 'react/jsx-runtime',

        // IMPORTANT: DO NOT ALIAS the postgrest package root to a deep path.
        // We will intercept specific deep paths (ESM wrapper and CJS) and route them to our wrapper shim:
        '@supabase/postgrest-js/dist/esm/wrapper.mjs':
          path.resolve(__dirname, 'src/shims/postgrest-wrapper-shim.js'),
        '@supabase/postgrest-js/dist/cjs/index.js':
          path.resolve(__dirname, 'src/shims/postgrest-wrapper-shim.js'),
        '@supabase/postgrest-js/dist/cjs/index.cjs':
          path.resolve(__dirname, 'src/shims/postgrest-wrapper-shim.js'),
      },
      dedupe: ['react', 'react-dom', 'react-native-web'],
    },
    optimizeDeps: {
      noDiscovery: true,
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react-native-web'],
      exclude: [
        'react-native',
        'react-native-svg',
        '@supabase/postgrest-js', // let the package resolve at runtime; deep paths are handled by aliases above
      ],
      esbuildOptions: {
        mainFields: ['browser', 'module', 'main'],
        conditions: ['browser', 'module', 'default'],
      },
    },
  };
});
