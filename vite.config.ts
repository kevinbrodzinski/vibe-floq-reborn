import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// HMR configuration for Lovable cloud environment
const PREVIEW_HMR_HOST = process.env.VITE_HMR_HOST;
const DISABLE_HMR = process.env.VITE_DEV_SOCKET;
const IS_HOSTED_PREVIEW = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_HOSTED_PREVIEW === 'true';

export default defineConfig(({ mode, command }) => {
  // Configure HMR based on environment
  const getHMRConfig = () => {
    if (process.env.TARGET === 'native' || command === 'build') {
      return false;
    }
    
    if (DISABLE_HMR === 'false') {
      return false;
    }
    
    // If we have a preview HMR host (Lovable cloud), use secure WebSocket
    if (PREVIEW_HMR_HOST) {
      return { 
        protocol: 'wss', 
        host: PREVIEW_HMR_HOST, 
        port: 443,
        clientPort: 443
      };
    }
    
    // For local development, use default HMR
    return true;
  };

  return {
    server: {
      host: "0.0.0.0", // listen on all interfaces inside the sandbox
      port: 8080,
      hmr: getHMRConfig(),
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
      },
      dedupe: ['react', 'react-dom', 'react-native-web'],
    },
  };
});