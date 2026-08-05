import {access,readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const action=process.argv[2];

if(!['build','run'].includes(action))throw new Error('android.mjs는 build 또는 run 인자가 필요합니다.');

const javaCandidates=[
  '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
  '/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
  process.env.JAVA_HOME
].filter(Boolean);

async function supportedJavaHome(candidate){
  try{
    await access(path.join(candidate,'bin','java'));
    const release=await readFile(path.join(candidate,'release'),'utf8');
    const version=release.match(/^JAVA_VERSION="(\d+)/m);
    const major=Number(version?.[1]);
    return major>=17&&major<=23;
  }catch{
    return false;
  }
}

let javaHome='';
for(const candidate of javaCandidates){
  if(await supportedJavaHome(candidate)){
    javaHome=candidate;
    break;
  }
}

if(!javaHome)throw new Error('Android 빌드에 필요한 JDK 17~23을 찾지 못했습니다. JDK 21을 설치하거나 JAVA_HOME을 지정하세요.');

const environment={...process.env,JAVA_HOME:javaHome};

function run(command,args,cwd=root){
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{cwd,env:environment,stdio:'inherit'});
    child.on('error',reject);
    child.on('exit',code=>code===0?resolve():reject(new Error(`${command} 종료 코드: ${code}`)));
  });
}

console.log(`Android 빌드 JDK: ${javaHome}`);
await run('npm',['run','android:sync']);

if(action==='build'){
  await run(path.join(root,'android','gradlew'),['assembleDebug'],path.join(root,'android'));
}else{
  await run(path.join(root,'node_modules','.bin','cap'),['run','android']);
}
