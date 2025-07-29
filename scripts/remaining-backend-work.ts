import { Project, SyntaxKind } from 'ts-morph';

const p = new Project();
p.addSourceFilesAtPaths('src/**/*.{ts,tsx}');

console.log('🔍 Identifying remaining work that needs backend coordination:\n');

// Find type definitions
p.getSourceFiles().forEach(f => {
  f.getDescendantsOfKind(SyntaxKind.PropertySignature)
   .forEach(prop => {
     if (prop.getName() === 'user_id') {
       console.log(`📝 Type Definition: ${f.getFilePath()}:${prop.getStartLineNumber()}`);
       console.log(`   ${prop.getText()}`);
       console.log(`   → Should be: profile_id: string;`);
       console.log('');
     }
   });
});

// Find SQL queries
p.getSourceFiles().forEach(f => {
  f.getDescendantsOfKind(SyntaxKind.StringLiteral)
   .forEach(literal => {
     const text = literal.getText();
     if (text.includes('profiles:user_id') || text.includes('user_id=')) {
       console.log(`🗄️  SQL Query: ${f.getFilePath()}:${literal.getStartLineNumber()}`);
       console.log(`   ${text}`);
       console.log(`   → Should be: ${text.replace(/user_id/g, 'profile_id')}`);
       console.log('');
     }
   });
});

// Find object property access that might need backend data structure updates
p.getSourceFiles().forEach(f => {
  f.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
   .forEach(prop => {
     if (prop.getName() === 'user_id') {
       const parent = prop.getParent();
       if (parent && parent.getKind() === SyntaxKind.BinaryExpression) {
         console.log(`🔗 Object Property Access: ${f.getFilePath()}:${prop.getStartLineNumber()}`);
         console.log(`   ${prop.getText()}`);
         console.log(`   → Should be: ${prop.getText().replace('user_id', 'profile_id')}`);
         console.log('');
       }
     }
   });
});

console.log('✅ Analysis complete!');
console.log('📋 These items need backend coordination before updating.'); 