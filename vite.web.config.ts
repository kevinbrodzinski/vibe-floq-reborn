import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
    rnWebCompatibilityShim(),       // 👈 comprehensive RN Web compatibility
    rnwLegacyShims(),
    postgrestFix(),                  // 👈 fix postgrest deep imports
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@entry": path.resolve(__dirname, "./src/main.web.tsx"),

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
      'react/jsx-runtime.js': 'react/jsx-runtime',

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
        'react-native',
        'react-native-svg',
        '@react-native/assets-registry', // do not prebundle this, let the shim resolve it
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
}));