import path from 'path';

export function rnWebSafetyPlugin() {
  const RE_CODEGEN_NATIVE =
    /^(react-native|react-native-web)\/Libraries\/Utilities\/codegenNativeComponent(?:\.js)?$/;
  const RE_CODEGEN_COMMANDS =
    /^(react-native|react-native-web)\/Libraries\/Utilities\/codegenNativeCommands(?:\.js)?$/;
  const RE_ASSET_REGISTRY =
    /^(react-native\/Libraries\/Image\/AssetRegistry|@react-native\/assets-registry\/registry(?:\.js)?)$/;
  const RE_RNSVG_FABRIC_NATIVE =
    /^react-native-svg\/lib\/module\/fabric\/.*NativeComponent\.js$/;

  return {
    name: 'rn-web-safety-plugin',
    enforce: 'pre' as const,
    resolveId(id: string) {
      if (RE_CODEGEN_NATIVE.test(id)) {
        return path.resolve(__dirname, '../lib/stubs/codegenNativeComponent.js');
      }
      if (RE_CODEGEN_COMMANDS.test(id)) {
        return path.resolve(__dirname, '../lib/stubs/codegenNativeCommands.js');
      }
      if (RE_ASSET_REGISTRY.test(id)) {
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
      if (RE_RNSVG_FABRIC_NATIVE.test(id)) {
        return path.resolve(__dirname, '../lib/stubs/Noop.js');
      }
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