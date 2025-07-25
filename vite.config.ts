import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// HMR configuration for Lovable cloud environment
const PREVIEW_HMR_HOST = process.env.VITE_HMR_HOST;
const DISABLE_HMR = process.env.VITE_DEV_SOCKET === 'false';
const IS_HOSTED_PREVIEW = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_HOSTED_PREVIEW === 'true';

export default defineConfig(({ mode, command }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: process.env.TARGET === 'native'
      ? false
      : command === 'build'
        ? false  
        : PREVIEW_HMR_HOST
          ? { protocol: 'wss', host: PREVIEW_HMR_HOST, port: 443 }
          : true,
  },
  // Remove all deck.gl externalization - just use normal bundling with pinned earcut@2.2.4
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@entry": path.resolve(__dirname, "./src/main.web.tsx"),
      // React-Native on web
      'react-native': 'react-native-web',
      // Stub native-only libs so Roll-up doesn't bundle them
      '@rnmapbox/maps': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
      '@posthog/react-native': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
      'expo-application': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
      'expo-device': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
      'sentry-expo': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
      'react-native/Libraries/Core/ReactNativeVersion': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
      'react-native/Libraries/Core/Devtools/parseErrorStack': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
      'react-native/Libraries/Core/Devtools/symbolicateStackTrace': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
      'react-native/Libraries/Core/Devtools/getDevServer': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
      'react-native/Libraries/Promise': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
      'react-native/Libraries/Utilities/PolyfillFunctions': path.resolve(__dirname, 'src/web-stubs/emptyModule.ts'),
    },
    dedupe: ['react', 'react-dom', 'react-native-web'],
  },
  optimizeDeps: {
    exclude: [
      'expo-application',
      'expo-device',
      'sentry-expo',
      '@posthog/react-native',
      '@rnmapbox/maps',
      'react-native/Libraries/Core/ReactNativeVersion',
      'react-native/Libraries/Core/Devtools/parseErrorStack',
      'react-native/Libraries/Core/Devtools/symbolicateStackTrace',
      'react-native/Libraries/Core/Devtools/getDevServer',
      'react-native/Libraries/Promise',
      'react-native/Libraries/Utilities/PolyfillFunctions'
    ]
  },
  build: {
    rollupOptions: {
      external: [
        'expo-application',
        'expo-device',
        'sentry-expo',
        '@posthog/react-native',
        '@rnmapbox/maps',
        'react-native/Libraries/Core/ReactNativeVersion',
        'react-native/Libraries/Core/Devtools/parseErrorStack',
        'react-native/Libraries/Core/Devtools/symbolicateStackTrace',
        'react-native/Libraries/Core/Devtools/getDevServer',
        'react-native/Libraries/Promise',
        'react-native/Libraries/Utilities/PolyfillFunctions'
      ]
    }
  }
}));