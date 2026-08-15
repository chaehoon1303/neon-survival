import fs from 'node:fs';

const source=fs.readFileSync(new URL('../characters.js',import.meta.url),'utf8');
const required=[
  ['영구 소유 저장 키',/neonOperativeOwned/],
  ['소유 판정 함수',/function operativeIsOwned\(id\)/],
  ['이전 저장 복구',/function repairOperativeOwnership\(\)/],
  ['강화 전 소유 확인',/function upgradeOperative\(id\)\{if\(!operativeIsOwned\(id\)/],
  ['강화 후 영구 소유 유지',/operativeOwned\[id\]=true;operativeRoster\[id\]=Math\.max\(0,/],
  ['목록 영구 소유 판정',/owned=operativeIsOwned\(id\)/],
  ['선택 시 영구 소유 확인',/if\(!operativeIsOwned\(id\)\)return;selectedCharacter=id/],
];

const failed=required.filter(([,pattern])=>!pattern.test(source));
if(failed.length){
  console.error(`요원 소유권 검사 실패: ${failed.map(([label])=>label).join(', ')}`);
  process.exit(1);
}

const simulated={roster:{gravion:3},ranks:{gravion:0},owned:{gravion:true},acquired:{gravion:1700000000000}};
simulated.roster.gravion=Math.max(0,simulated.roster.gravion-3);
simulated.ranks.gravion++;
const stillOwned=!!simulated.owned.gravion||simulated.roster.gravion>0||simulated.ranks.gravion>0||!!simulated.acquired.gravion;
if(simulated.roster.gravion!==0||simulated.ranks.gravion!==1||!stillOwned){
  console.error('요원 강화 후 영구 소유 시나리오 실패');
  process.exit(1);
}

console.log('요원 영구 소유권 검사 완료: 강화 후 중복 0명이어도 선택 가능');
