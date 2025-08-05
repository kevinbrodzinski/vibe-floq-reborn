import { Project, SyntaxKind } from 'ts-morph';

const p = new Project();
p.addSourceFilesAtPaths('src/**/*.{ts,tsx}');

p.getSourceFiles().forEach(f => {
  f.getDescendantsOfKind(SyntaxKind.StringLiteral)
   .filter(literal => literal.getText().includes('user_id'))
   .forEach(literal => {
     const text = literal.getText();
     if (text.includes('user_id')) {
       console.log(`Renaming user_id to profile_id in ${f.getFilePath()}:${literal.getStartLineNumber()}`);
       literal.replaceWithText(text.replace(/user_id/g, 'profile_id'));
     }
   });
});

await p.save();
console.log('Database field rename completed!'); 