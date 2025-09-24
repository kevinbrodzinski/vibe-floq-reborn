#!/usr/bin/env ts-node

// Quick migration script to fix remaining getVibeColor calls
import { promises as fs } from 'fs';
import { glob } from 'glob';

async function migrateFile(filePath: string): Promise<boolean> {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let changed = false;

    // Skip if already has the new imports
    if (content.includes('vibeToHex') && content.includes('safeVibe')) {
      return false;
    }

    // Add imports if getVibeColor is used
    if (content.includes('getVibeColor(')) {
      // Check if imports section exists
      const importMatch = content.match(/^(import.*?;[\r\n]*)+/m);
      if (importMatch) {
        const importsEnd = importMatch.index! + importMatch[0].length;
        const newImports = `import { vibeToHex } from '@/lib/vibe/color';\nimport { safeVibe } from '@/lib/vibes';\n`;
        content = content.slice(0, importsEnd) + newImports + content.slice(importsEnd);
        changed = true;
      }

      // Replace getVibeColor calls
      content = content.replace(/getVibeColor\(([^)]+)\)/g, 'vibeToHex(safeVibe($1))');
      changed = true;

      // Remove old imports
      content = content.replace(/import.*?getVibeColor.*?from.*?;[\r\n]*/g, '');
    }

    if (changed) {
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✅ Migrated: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error migrating ${filePath}:`, error);
    return false;
  }
}

async function main() {
  const files = await glob('src/**/*.{ts,tsx}', { ignore: ['src/**/*.test.*', 'src/**/*.spec.*'] });
  let migratedCount = 0;

  for (const file of files) {
    const migrated = await migrateFile(file);
    if (migrated) migratedCount++;
  }

  console.log(`\n🎯 Migration complete: ${migratedCount} files updated`);
  console.log('ℹ️  Run npm run typecheck to verify');
}

main().catch(console.error);