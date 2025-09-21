import type { Plugin } from 'vite';

export function postgrestFixPlugin(): Plugin {
  const CJS = /^@supabase\/postgrest-js\/dist\/cjs\/index\.(js|cjs|mjs)$/;
  const WRAP = '@supabase/postgrest-js/dist/esm/wrapper.mjs';
  return {
    name: 'postgrest-fix-plugin',
    enforce: 'pre',
    resolveId(id) {
      if (id === WRAP || CJS.test(id)) {
        // Always resolve deep paths to the package root; Vite/esbuild will prebundle the root.
        return '@supabase/postgrest-js';
      }
      return null;
    },
  };
}