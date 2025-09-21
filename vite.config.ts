import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';

// NEW: catch codegen native imports early
function rnCodegenShim() {
  const CGNC_RN    = 'react-native/Libraries/Utilities/codegenNativeComponent';
  const CGNC_RNWEB = 'react-native-web/Libraries/Utilities/codegenNativeComponent';
  const CMDS_RN    = 'react-native/Libraries/Utilities/codegenNativeCommands';
  const CMDS_RNWEB = 'react-native-web/Libraries/Utilities/codegenNativeCommands';

  return {
    name: 'rn-codegen-shim',
    enforce: 'pre' as const,
    resolveId(id: string) {
      if (id === CGNC_RN || id === CGNC_RNWEB) {
        return path.resolve(__dirname, 'src/lib/stubs/codegenNativeComponent.js');
      }
      if (id === CMDS_RN || id === CMDS_RNWEB) {
        return path.resolve(__dirname, 'src/lib/stubs/codegenNativeCommands.js');
      }
      // Some packages normalize .js explicitly
      if (id === `${CGNC_RN}.js`)    return path.resolve(__dirname, 'src/lib/stubs/codegenNativeComponent.js');
      if (id === `${CMDS_RN}.js`)    return path.resolve(__dirname, 'src/lib/stubs/codegenNativeCommands.js');
      return null;
    },
  };
}

/** RN AssetRegistry shim - handles all import variants */
function postgrestFix() {
  const CJS = /^@supabase\/postgrest-js\/dist\/cjs\/index\.(js|cjs|mjs)$/;
  const WRAP = '@supabase/postgrest-js/dist/esm/wrapper.mjs';
  return {
    name: 'postgrest-fix',
    enforce: 'pre' as const,
    resolveId(id: string) {
      if (id === WRAP || CJS.test(id)) return '@supabase/postgrest-js';
      return null;
    },
  };
}

function rnWebCompatibilityShim() {
  return {
    name: 'rn-web-compatibility-shim',
    enforce: 'pre' as const,
    resolveId(id: string) {
      // Handle direct react-native imports
      if (id === 'react-native') {
        return path.resolve(__dirname, 'src/lib/stubs/ReactNativeWebEnhanced.js');
      }
      
      // Handle ALL react-native deep imports that don't exist in react-native-web
      if (id.startsWith('react-native/Libraries/')) {
        // Specific deep imports we have stubs for
        if (id === 'react-native/Libraries/Utilities/codegenNativeComponent') {
          return path.resolve(__dirname, 'src/lib/stubs/codegenNativeComponent.js');
        }
        if (id === 'react-native/Libraries/Utilities/codegenNativeCommands') {
          return path.resolve(__dirname, 'src/lib/stubs/codegenNativeCommands.js');
        }
        if (id === 'react-native/Libraries/Image/AssetRegistry') {
          try {
            return require.resolve('react-native-web/dist/cjs/modules/AssetRegistry/index.js', { paths: [__dirname] });
          } catch {
            return path.resolve(__dirname, 'src/lib/stubs/AssetRegistry.js');
          }
        }
        // For any other deep imports, return null to let other plugins/aliases handle
        return null;
      }

      // Handle AssetRegistry imports
      if (/^@react-native\/assets-registry\/registry(?:\.js)?$/.test(id)) {
        return path.resolve(__dirname, 'src/lib/stubs/AssetRegistry.js');
      }

      // Handle react-native-svg fabric components that try to import TurboModuleRegistry
      if (/^react-native-svg\/lib\/module\/fabric\//.test(id)) {
        return path.resolve(__dirname, 'src/shims/react-native-svg-fabric.js');
      }

      return null;
    },
  };
}

/** RN Web legacy deep imports used by react-native-svg (Fabric) */
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
        return path.resolve(__dirname, 'src/lib/stubs/codegenNativeComponent.js');
      }
      if (source === LEGACY_CMDS_RNWEB || source === LEGACY_CMDS_RN) {
        return path.resolve(__dirname, 'src/lib/stubs/codegenNativeCommands.js');
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
      rnCodegenShim(),                 // 👈 add this first to catch codegen imports
      rnwLegacyShims(),
      postgrestFix(),                  // 👈 fix postgrest deep imports
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@entry': path.resolve(__dirname, 'src/main.web.tsx'),

        // IMPORTANT: react-native → our shim that re-exports RN Web + TurboModuleRegistry
        'react-native': path.resolve(__dirname, 'src/shims/react-native-web-plus.js'),

        // Vendor Animated modules look up TurboModuleRegistry via RN Web vendor path → send to stub
        'react-native-web/dist/vendor/react-native/Utilities/TurboModuleRegistry':
          path.resolve(__dirname, 'src/lib/stubs/TurboModuleRegistry.js'),

        // Some bundles reference this alt vendor path; include both:
        'react-native-web/dist/vendor/react-native/Animated/TurboModuleRegistry':
          path.resolve(__dirname, 'src/lib/stubs/TurboModuleRegistry.js'),

        // Asset registry alias for expo-asset compatibility
        '@react-native/assets-registry/registry': path.resolve(__dirname, 'src/lib/stubs/AssetRegistry.js'),

        // Keep your other RN-web/svg/AssetRegistry shims:
        'react/jsx-runtime.js': 'react/jsx-runtime',
        'react-native-web/Libraries/Utilities/codegenNativeComponent':
          path.resolve(__dirname, 'src/lib/stubs/codegenNativeComponent.js'),
        'react-native/Libraries/Utilities/codegenNativeComponent':
          path.resolve(__dirname, 'src/lib/stubs/codegenNativeComponent.js'),
        'react-native-web/Libraries/Utilities/codegenNativeCommands':
          path.resolve(__dirname, 'src/lib/stubs/codegenNativeCommands.js'),
        'react-native/Libraries/Utilities/codegenNativeCommands':
          path.resolve(__dirname, 'src/lib/stubs/codegenNativeCommands.js'),
        // AssetRegistry direct alias (plugin also covers this)
        'react-native/Libraries/Image/AssetRegistry':
          'react-native-web/dist/cjs/modules/AssetRegistry/index.js',
        'react-native-svg/lib/module/fabric': 'react-native-svg/lib/module',
        
        // React Native MMKV stub
        'react-native-mmkv': path.resolve(__dirname, 'src/lib/stubs/mmkv.js'),

        // Normalize rare ".js" specifier
        // 'react/jsx-runtime.js': 'react/jsx-runtime', // Already handled above

        // IMPORTANT: REMOVE postgrest deep path aliases - let prebundling handle it
      },
      dedupe: ['react', 'react-dom', 'react-native-web'],
    },
    optimizeDeps: {
      noDiscovery: true,
      include: [
        'react', 'react-dom', 'react/jsx-runtime', 'react-native-web',
        '@supabase/postgrest-js',                 // ✅ let esbuild wrap CJS → ESM
      ],
      exclude: [
        'react-native',                              // ✅ handled by our shim
        'react-native-svg',                          // ✅ let plugin/aliases handle deep RN paths
        '@react-native/assets-registry',             // ✅ handled by alias
      ],
      esbuildOptions: {
        mainFields: ['browser', 'module', 'main'],
        conditions: ['browser', 'module', 'default'],
      },
    },
    build: {
      // Ensure commonjs default interop in the production bundle
      commonjsOptions: {
        defaultIsModuleExports: true,
        transformMixedEsModules: true,
      },
    },
  };
});
