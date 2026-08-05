import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const androidProject=path.join(root,'android');

const command=process.platform==='darwin'?'open':'npx';
const args=process.platform==='darwin'
  ? ['-a','Android Studio',androidProject]
  : ['cap','open','android'];

const child=spawn(command,args,{
  cwd:process.platform==='darwin'?os.tmpdir():root,
  detached:process.platform==='darwin',
  stdio:process.platform==='darwin'?'ignore':'inherit'
});

if(process.platform==='darwin'){
  child.unref();
}else{
  child.on('exit',code=>process.exitCode=code??1);
}
