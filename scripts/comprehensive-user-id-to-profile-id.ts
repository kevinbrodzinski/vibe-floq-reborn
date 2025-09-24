#!/usr/bin/env tsx
import { Project, SyntaxKind } from 'ts-morph';

// Execute the migration
async function main() {
  const p = new Project();
  p.addSourceFilesAtPaths('src/**/*.{ts,tsx}');

  let totalChanges = 0;

  p.getSourceFiles().forEach(f => {
    console.log(`Processing file: ${f.getFilePath()}`);
    
    // 1. Replace all identifiers named 'user_id' with 'profile_id'
    f.getDescendantsOfKind(SyntaxKind.Identifier)
     .filter(id => id.getText() === 'user_id')
     .forEach(id => {
       console.log(`  Renaming identifier user_id to profile_id at line ${id.getStartLineNumber()}`);
       id.rename('profile_id');
       totalChanges++;
     });

    // 2. Replace string literals containing 'user_id' 
    f.getDescendantsOfKind(SyntaxKind.StringLiteral)
     .forEach(literal => {
       const text = literal.getText();
       if (text.includes('user_id')) {
         console.log(`  Updating string literal at line ${literal.getStartLineNumber()}: ${text}`);
         literal.replaceWithText(text.replace(/user_id/g, 'profile_id'));
         totalChanges++;
       }
     });

    // 3. Replace template literals containing 'user_id'
    f.getDescendantsOfKind(SyntaxKind.TemplateExpression)
     .forEach(template => {
       const text = template.getText();
       if (text.includes('user_id')) {
         console.log(`  Updating template literal at line ${template.getStartLineNumber()}: ${text}`);
         template.replaceWithText(text.replace(/user_id/g, 'profile_id'));
         totalChanges++;
       }
     });

    // 4. Replace property access like obj.user_id
    f.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
     .forEach(prop => {
       if (prop.getName() === 'user_id') {
         console.log(`  Updating property access at line ${prop.getStartLineNumber()}`);
         prop.rename('profile_id');
         totalChanges++;
       }
     });

    // 5. Replace object property assignments like { user_id: value }
    f.getDescendantsOfKind(SyntaxKind.PropertyAssignment)
     .forEach(prop => {
       if (prop.getName() === 'user_id') {
         console.log(`  Updating property assignment at line ${prop.getStartLineNumber()}`);
         prop.rename('profile_id');
         totalChanges++;
       }
     });

    // 6. Replace destructuring patterns like { user_id } = obj
    f.getDescendantsOfKind(SyntaxKind.ObjectBindingPattern)
     .forEach(binding => {
       binding.getElements().forEach(element => {
         if (element.getName() === 'user_id') {
           console.log(`  Updating destructuring at line ${element.getStartLineNumber()}`);
           element.rename('profile_id');
           totalChanges++;
         }
       });
     });
  });

  await p.save();
  console.log(`\n✅ Comprehensive user_id to profile_id migration completed!`);
  console.log(`📊 Total changes made: ${totalChanges}`);
  console.log(`\n🔍 Run 'npm run typecheck' to verify no breaking changes`);
}

// Run the script
main().catch(console.error);