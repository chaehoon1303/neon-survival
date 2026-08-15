import {access,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const checkOnly=process.argv.includes('--check');
const packageData=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const version=String(packageData.version||'').trim();
const versionMatch=version.match(/^(\d+)\.(\d+)\.(\d+)$/);

if(!versionMatch)throw new Error(`앱 버전은 x.y.z 형식이어야 합니다: ${version}`);

const [,major,minor,patch]=versionMatch;
const buildNumber=Number(major)*10000+Number(minor)*100+Number(patch);
const webIndex=await readFile(path.join(root,'index.html'),'utf8');

if(!webIndex.includes(`v${version} · BUILD `)||!webIndex.includes(`buildVersion='${version}-`)){
  throw new Error(`index.html의 게임 버전이 package.json ${version}과 다릅니다.`);
}

async function exists(file){
  try{await access(file);return true}catch{return false}
}

async function syncFile(file,transform,label){
  if(!await exists(file)){
    console.log(`${label}: 생성 프로젝트 없음 · 건너뜀`);
    return;
  }
  const current=await readFile(file,'utf8');
  const next=transform(current);
  if(current===next){
    console.log(`${label}: ${version} (${buildNumber}) 확인`);
    return;
  }
  if(checkOnly)throw new Error(`${label} 버전이 ${version} (${buildNumber})과 다릅니다. npm run native:version-sync를 실행하세요.`);
  await writeFile(file,next);
  console.log(`${label}: ${version} (${buildNumber}) 적용`);
}

await syncFile(
  path.join(root,'ios','App','App.xcodeproj','project.pbxproj'),
  source=>source
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g,`CURRENT_PROJECT_VERSION = ${buildNumber};`)
    .replace(/MARKETING_VERSION = [^;]+;/g,`MARKETING_VERSION = ${version};`),
  'iOS 앱'
);

await syncFile(
  path.join(root,'android','app','build.gradle'),
  source=>source
    .replace(/versionCode\s+\d+/,`versionCode ${buildNumber}`)
    .replace(/versionName\s+"[^"]+"/,`versionName "${version}"`),
  'Android 앱'
);
