import { Project, SyntaxKind } from 'ts-morph';

const p = new Project();
p.addSourceFilesAtPaths('src/**/*.{ts,tsx}');

p.getSourceFiles().forEach(f => {
  // Handle database filter strings like `user_id=eq.${user.id}`
  f.getDescendantsOfKind(SyntaxKind.TemplateExpression)
   .forEach(template => {
     const text = template.getText();
     if (text.includes('user_id=eq.')) {
       console.log(`Found database filter in ${f.getFilePath()}:${template.getStartLineNumber()}`);
       console.log(`  ${text}`);
       console.log(`  → Should be: ${text.replace(/user_id=eq\./g, 'profile_id=eq.')}`);
       console.log('');
     }
   });

  // Handle other database filter patterns
  f.getDescendantsOfKind(SyntaxKind.StringLiteral)
   .forEach(literal => {
     const text = literal.getText();
     if (text.includes('user_id') && (text.includes('eq.') || text.includes('filter'))) {
       console.log(`Found database filter in ${f.getFilePath()}:${literal.getStartLineNumber()}`);
       console.log(`  ${text}`);
       console.log(`  → Should be: ${text.replace(/user_id/g, 'profile_id')}`);
       console.log('');
     }
   });
});

console.log('Database filter audit completed!');
console.log('Manually update these filters as the backend migrates.'); 