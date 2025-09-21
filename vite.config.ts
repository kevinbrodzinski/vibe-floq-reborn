import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { rnWebSafetyPlugin, postgrestFix } from './src/vite/rn-web-safety-plugin';

const PREVIEW_HMR_HOST  = process.env.VITE_HMR_HOST;
const IS_SANDBOX = process.env.VITE_SANDBOX === '1' || /sandbox\.lovable\.dev$/.test(process.env.HOST ?? '');
const IS_HOSTED_PREVIEW = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_HOSTED_PREVIEW === 'true';

export default defineConfig(({ mode, command }) => {
  const hmr =
    process.env.TARGET === 'native' || command === 'build'
      ? false
      : (IS_SANDBOX || IS_HOSTED_PREVIEW)
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
      rnWebSafetyPlugin(), // intercept RN deep imports
      postgrestFix(),      // collapse deep postgrest → package root
      react(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@entry': path.resolve(__dirname, 'src/main.web.tsx'),
        'react-native': path.resolve(__dirname, 'src/shims/react-native-web-plus.js'),
        'react/jsx-runtime.js': 'react/jsx-runtime',
      },
      dedupe: ['react', 'react-dom', 'react-native-web'],
    },
    optimizeDeps: {
      noDiscovery: true,
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react-native-web', '@supabase/postgrest-js'],
      exclude: ['react-native', 'react-native-svg', '@react-native/assets-registry'],
      esbuildOptions: {
        mainFields: ['browser','module','main'],
        conditions: ['browser','module','default'],
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