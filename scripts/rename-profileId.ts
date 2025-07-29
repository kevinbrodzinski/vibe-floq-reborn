import { Project, SyntaxKind } from 'ts-morph';

const p = new Project();
p.addSourceFilesAtPaths('src/**/*.{ts,tsx}');

p.getSourceFiles().forEach(f => {
  f.getDescendantsOfKind(SyntaxKind.Identifier)
   .filter(id => id.getText() === 'userId')
   .forEach(id => {
     console.log(`Renaming userId to profileId in ${f.getFilePath()}:${id.getStartLineNumber()}`);
     id.rename('profileId');
   });
});

await p.save();
console.log('Codemod completed!'); 