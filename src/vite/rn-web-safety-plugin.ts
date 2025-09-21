import path from 'path';

export function rnWebSafetyPlugin() {
  return {
    name: 'rn-web-safety-plugin',
    enforce: 'pre' as const,
    resolveId(id: string) {
      // Catch any RN codegen imports before alias resolution
      if (id.includes('Libraries/Utilities/codegenNativeComponent')) {
        return path.resolve(__dirname, '../lib/stubs/codegenNativeComponent.js');
      }
      if (id.includes('Libraries/Utilities/codegenNativeCommands')) {
        return path.resolve(__dirname, '../lib/stubs/codegenNativeCommands.js');
      }
      
      // Asset registry imports
      if (id.includes('AssetRegistry') || id.includes('@react-native/assets-registry')) {
        try {
          // @ts-ignore
          return require.resolve(
            'react-native-web/dist/cjs/modules/AssetRegistry/index.js',
            { paths: [process.cwd()] }
          );
        } catch {
          return path.resolve(__dirname, '../lib/stubs/AssetRegistry.js');
        }
      }

      // SVG fabric native components
      if (id.includes('react-native-svg/lib/module/fabric/') && id.includes('NativeComponent')) {
        return path.resolve(__dirname, '../lib/stubs/Noop.js');
      }

      // Normalize rare jsx-runtime suffix
      if (id === 'react/jsx-runtime.js') return 'react/jsx-runtime';

      return null;
    },
  };
}

// Collapse any deep postgrest import back to the package root
export function postgrestFix() {
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