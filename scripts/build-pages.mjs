import {copyFile,cp,mkdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'_site');
// GitHub Pages must contain every dynamically loaded web layer.  Keeping this
// list alongside the mobile sync list prevents a newer local build from
// silently falling back to older scripts on a phone.
const webFiles=['index.html','style.css','ui-depth.css','gear-arsenal.css','longplay.css','coop.css','account.css','account-config.js','coop-config.js','game.js','base.js','modes.js','characters.js','orientation.js','variety.js','lobby.js','battle-select.js','player-level.js','arsenal.js','ui-depth.js','gear-arsenal.js','longplay.js','coop.js','account.js','sw.js'];

await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const file of webFiles)await copyFile(path.join(root,file),path.join(output,file));
await cp(path.join(root,'assets'),path.join(output,'assets'),{recursive:true,force:true});
console.log(`GitHub Pages 빌드 완료: ${output}`);
