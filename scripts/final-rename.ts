import { Project, SyntaxKind } from 'ts-morph';

const p = new Project();
p.addSourceFilesAtPaths('src/**/*.{ts,tsx}');

p.getSourceFiles().forEach(f => {
  // Handle property access patterns like p.user_id
  f.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
   .filter(prop => prop.getName() === 'user_id')
   .forEach(prop => {
     console.log(`Renaming property user_id to profile_id in ${f.getFilePath()}:${prop.getStartLineNumber()}`);
     prop.rename('profile_id');
   });

  // Handle object property patterns like { user_id: value }
  f.getDescendantsOfKind(SyntaxKind.PropertyAssignment)
   .filter(prop => prop.getName() === 'user_id')
   .forEach(prop => {
     console.log(`Renaming object property user_id to profile_id in ${f.getFilePath()}:${prop.getStartLineNumber()}`);
     prop.rename('profile_id');
   });

  // Handle destructuring patterns like { user_id } = obj
  f.getDescendantsOfKind(SyntaxKind.ObjectBindingPattern)
   .forEach(binding => {
     binding.getElements().forEach(element => {
       if (element.getName() === 'user_id') {
         console.log(`Renaming destructuring user_id to profile_id in ${f.getFilePath()}:${element.getStartLineNumber()}`);
         element.rename('profile_id');
       }
     });
   });

  // Handle route parameters like :userId
  f.getDescendantsOfKind(SyntaxKind.StringLiteral)
   .filter(literal => literal.getText().includes(':userId'))
   .forEach(literal => {
     console.log(`Renaming route param :userId to :profileId in ${f.getFilePath()}:${literal.getStartLineNumber()}`);
     literal.replaceWithText(literal.getText().replace(':userId', ':profileId'));
   });
});

await p.save();
console.log('Final rename completed!'); 