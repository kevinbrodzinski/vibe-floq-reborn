#!/usr/bin/env ts-node

import { Project, QuoteKind, SyntaxKind } from "ts-morph";
import * as path from "path";

const project = new Project({
  tsConfigFilePath: path.resolve("tsconfig.json"),
  manipulationSettings: { quoteKind: QuoteKind.Single }
});

const GLOB = ["src/**/*.ts", "src/**/*.tsx", "src/**/*.mts", "src/**/*.cts"];

const addImportIfMissing = (source: any, spec: string, from: string) => {
  const imp = source.getImportDeclarations().find((d: any) => d.getModuleSpecifierValue() === from);
  if (!imp) {
    source.addImportDeclaration({ namedImports: [spec], moduleSpecifier: from });
    return;
  }
  const names = new Set(imp.getNamedImports().map((ni: any) => ni.getName()));
  if (!names.has(spec)) imp.addNamedImport(spec);
};

const fixFile = (source: any) => {
  let changed = false;

  // Replace getVibeColor(xyz) => vibeToHex(safeVibe(xyz))
  source.forEachDescendant((node: any) => {
    if (node.getKind() !== SyntaxKind.CallExpression) return;
    const call = node;
    const expr = call.getExpression();
    if (expr.getText() !== "getVibeColor") return;

    const args = call.getArguments();
    const argText = args.length ? args.map((a: any) => a.getText()).join(", ") : "";
    call.replaceWithText(`vibeToHex(safeVibe(${argText}))`);
    changed = true;
  });

  if (changed) {
    // ensure imports
    addImportIfMissing(source, "vibeToHex", "@/lib/vibe/color");
    addImportIfMissing(source, "safeVibe", "@/lib/vibes");

    // remove legacy getVibeColor import if present
    source.getImportDeclarations().forEach((d: any) => {
      const ms = d.getModuleSpecifierValue();
      const isLegacy = ms.includes("getVibeColor") || ms.includes("vibeColorResolver") || ms.includes("vibeColors");
      if (isLegacy) d.remove();

      const named = d.getNamedImports();
      d.setNamedImports(named.filter((ni: any) => ni.getName() !== "getVibeColor"));
    });
  }
  return changed;
};

let edits = 0;
project.addSourceFilesAtPaths(GLOB).forEach((sf) => {
  if (sf.getFilePath().includes("node_modules")) return;
  const changed = fixFile(sf);
  if (changed) edits++;
});

project.save().then(() => {
  // eslint-disable-next-line no-console
  console.log(`✅ Updated ${edits} file(s) to use vibeToHex(safeVibe(...))`);
});