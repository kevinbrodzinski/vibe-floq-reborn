import { Plugin } from 'vite';

export function postgrestFixPlugin(): Plugin {
  return {
    name: 'postgrest-fix-plugin',
    enforce: 'pre',
    resolveId(id) {
      // Collapse deep postgrest imports to package root
      if (id.includes('@supabase/postgrest-js/') && !id.endsWith('/package.json')) {
        return '@supabase/postgrest-js';
      }
      return null;
    },
  };
}