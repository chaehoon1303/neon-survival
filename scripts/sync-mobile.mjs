import {copyFile,cp,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mobile=path.join(root,'mobile-web');
const webFiles=['index.html','style.css','ui-depth.css','gear-arsenal.css','longplay.css','coop.css','account.css','operation-ux.css','mobile-layout.css','ui-icons.css','account-config.js','coop-config.js','game.js','base.js','modes.js','characters.js','orientation.js','variety.js','lobby.js','battle-select.js','player-level.js','arsenal.js','ui-depth.js','gear-arsenal.js','longplay.js','coop.js','account.js','operation-ux.js','sw.js'];

await mkdir(mobile,{recursive:true});
for(const file of webFiles)await copyFile(path.join(root,file),path.join(mobile,file));
await cp(path.join(root,'assets'),path.join(mobile,'assets'),{recursive:true,force:true});
console.log(`모바일 웹 동기화 완료: ${webFiles.length}개 파일 + assets/`);
