import { Project, SyntaxKind } from 'ts-morph';

const p = new Project();
p.addSourceFilesAtPaths('src/**/*.{ts,tsx}');

let totalChanges = 0;

p.getSourceFiles().forEach(f => {
  // Handle object property access like p.user_id
  f.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
   .forEach(prop => {
     if (prop.getName() === 'user_id') {
       const parent = prop.getParent();
       // Skip if it's already been handled or is in a comment
       if (parent && !prop.getText().includes('//')) {
         console.log(`Updating object property access in ${f.getFilePath()}:${prop.getStartLineNumber()}`);
         prop.rename('profile_id');
         totalChanges++;
       }
     }
   });

  // Handle destructuring patterns like { user_id } = obj
  f.getDescendantsOfKind(SyntaxKind.ObjectBindingPattern)
   .forEach(binding => {
     binding.getElements().forEach(element => {
       if (element.getName() === 'user_id') {
         console.log(`Updating destructuring in ${f.getFilePath()}:${element.getStartLineNumber()}`);
         element.rename('profile_id');
         totalChanges++;
       }
     });
   });

  // Handle object property assignments like { user_id: value }
  f.getDescendantsOfKind(SyntaxKind.PropertyAssignment)
   .forEach(prop => {
     if (prop.getName() === 'user_id') {
       console.log(`Updating object property assignment in ${f.getFilePath()}:${prop.getStartLineNumber()}`);
       prop.rename('profile_id');
       totalChanges++;
     }
   });
});

await p.save();
console.log(`\n✅ Final cleanup completed!`);
console.log(`📊 Total changes made: ${totalChanges}`);
console.log(`\n🔍 Run 'npm run typecheck' to verify no breaking changes`); 