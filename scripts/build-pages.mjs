import {copyFile,cp,mkdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'_site');
const webFiles=['index.html','style.css','game.js','base.js','modes.js','characters.js','orientation.js','sw.js'];

await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const file of webFiles)await copyFile(path.join(root,file),path.join(output,file));
await cp(path.join(root,'assets'),path.join(output,'assets'),{recursive:true,force:true});
console.log(`GitHub Pages 빌드 완료: ${output}`);
