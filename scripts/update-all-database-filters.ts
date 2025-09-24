import { Project, SyntaxKind } from 'ts-morph';

const p = new Project();
p.addSourceFilesAtPaths('src/**/*.{ts,tsx}');

let totalChanges = 0;

p.getSourceFiles().forEach(f => {
  // Handle template literals like `user_id=eq.${user.id}`
  f.getDescendantsOfKind(SyntaxKind.TemplateExpression)
   .forEach(template => {
     const text = template.getText();
     if (text.includes('user_id=eq.')) {
       console.log(`Updating template filter in ${f.getFilePath()}:${template.getStartLineNumber()}`);
       template.replaceWithText(text.replace(/user_id=eq\./g, 'profile_id=eq.'));
       totalChanges++;
     }
   });

  // Handle string literals with database filters
  f.getDescendantsOfKind(SyntaxKind.StringLiteral)
   .forEach(literal => {
     const text = literal.getText();
     if (text.includes('user_id') && (text.includes('eq.') || text.includes('filter'))) {
       console.log(`Updating string filter in ${f.getFilePath()}:${literal.getStartLineNumber()}`);
       literal.replaceWithText(text.replace(/user_id/g, 'profile_id'));
       totalChanges++;
     }
   });

  // Handle property access in database queries like .eq('user_id', value)
  f.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
   .forEach(prop => {
     if (prop.getName() === 'user_id') {
       const parent = prop.getParent();
       if (parent && parent.getKind() === SyntaxKind.CallExpression) {
         console.log(`Updating database query in ${f.getFilePath()}:${prop.getStartLineNumber()}`);
         prop.rename('profile_id');
         totalChanges++;
       }
     }
   });
});

await p.save();
console.log(`\n✅ Database filter update completed!`);
console.log(`📊 Total changes made: ${totalChanges}`);
console.log(`\n🔍 Run 'npm run typecheck' to verify no breaking changes`); 