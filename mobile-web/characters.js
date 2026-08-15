/* 오리지널 요원 시스템: 외부 이미지 없이 Canvas 도형과 파티클만 사용한다. */
const CHARACTER_DATA={
  recruit:{name:'훈련 요원',role:'기본 전투원',tier:'starter',color:'#7892ad',accent:'#d7e8f7',hp:100,damage:10,speed:250,charge:0,passive:'요원 신호를 기다리는 중',q:{name:'잠김',cd:99},e:{name:'잠김',cd:99},r:{name:'잠김'}},
  kairos:{name:'카이로스',role:'근접 밸런스',tier:'common',color:'#4fb9ff',accent:'#c5f2ff',hp:110,damage:12,speed:260,charge:9,passive:'전투 가속',q:{name:'블레이드 러시',cd:5},e:{name:'회전 베기',cd:7},r:{name:'천공참'}},
  lumina:{name:'루미나',role:'회복 원거리',tier:'rare',color:'#78f0a1',accent:'#ffd76a',hp:120,damage:8,speed:260,charge:7.5,passive:'생명의 잔광',q:{name:'생명의 빛',cd:8},e:{name:'광휘 탄환',cd:6},r:{name:'생명의 성역'}},
  volt:{name:'볼트',role:'빠른 암살자',tier:'hero',color:'#ffe259',accent:'#8fefff',hp:88,damage:14,speed:300,charge:10,passive:'과전류',q:{name:'전광 돌진',cd:5},e:{name:'연쇄 번개',cd:8},r:{name:'뇌전 폭풍'}},
  gravion:{name:'그라비온',role:'탱커 제어',tier:'legend',color:'#b98cff',accent:'#573d9c',hp:135,damage:10,speed:220,charge:7,passive:'중력 장갑',q:{name:'중력 응축',cd:7},e:{name:'반중력 폭발',cd:9},r:{name:'특이점 붕괴'}},
  frost:{name:'프로스트',role:'원거리 제어',tier:'hero',color:'#8ceaff',accent:'#eefcff',hp:96,damage:11,speed:260,charge:8,passive:'서리 표식',q:{name:'서리창',cd:5},e:{name:'설원의 장막',cd:9},r:{name:'영원의 빙원'}}
 ,nox:{name:'녹스',role:'지속 피해 암살자',tier:'rare',color:'#69e77a',accent:'#b8ff7a',hp:94,damage:11,speed:295,charge:7.2,passive:'맹독 축적',q:{name:'독니 돌진',cd:5},e:{name:'부식 안개',cd:10},r:{name:'맹독 재앙'}}
 ,mirage:{name:'미라주',role:'교란 마법사',tier:'hero',color:'#c68cff',accent:'#f3d5ff',hp:90,damage:10,speed:295,charge:6.5,passive:'흐릿한 잔상',q:{name:'환영 도약',cd:6},e:{name:'거울 미궁',cd:12},r:{name:'환영 군단'}}
 ,blaze:{name:'블레이즈',role:'화염 광역 전사',tier:'hero',color:'#ff743d',accent:'#ffd063',hp:122,damage:13,speed:260,charge:7.5,passive:'불씨 폭발',q:{name:'작열검',cd:6},e:{name:'용광로 분출',cd:9},r:{name:'화염 군주의 각성'}}
 ,iron:{name:'아이언',role:'방어 탱커',tier:'legend',color:'#89a8c8',accent:'#d8eeff',hp:175,damage:9,speed:215,charge:5.5,passive:'강철 장갑',q:{name:'철갑 돌진',cd:7},e:{name:'절대 방벽',cd:12},r:{name:'움직이는 요새'}}
 ,arca:{name:'아르카',role:'정령 소환사',tier:'legend',color:'#5de5da',accent:'#ffd56a',hp:96,damage:9,speed:260,charge:6.3,passive:'정령 계약',q:{name:'정령 호출',cd:8},e:{name:'정령 공명',cd:12},r:{name:'고대 정령왕'}}
};
const OPERATIVE_TIERS={common:'일반',rare:'희귀',hero:'영웅',legend:'전설'};
let operativeRoster=JSON.parse(localStorage.neonOperativeRoster||'{}'),operativeRanks=JSON.parse(localStorage.neonOperativeRanks||'{}'),operativeOwned=JSON.parse(localStorage.neonOperativeOwned||'{}'),operativeAcquiredOrder=JSON.parse(localStorage.neonOperativeAcquiredOrder||'{}'),operativeClears=Number(localStorage.neonOperativeClears||0),operativeSort=localStorage.neonOperativeSort||'tier-desc';
let operativeCrateKeys=Number(localStorage.neonOperativeCrateKeys||0),operativeCrateOpening=false,operativeKeysThisRun=0;
if(localStorage.getItem('neonStarterOperativeKey')===null){
  /* 이전 빌드가 빈 프로필을 먼저 만들었더라도 최초 지급 열쇠는 반드시 보장한다. */
  operativeCrateKeys++;
  localStorage.neonStarterOperativeKey='1';
  localStorage.neonOperativeCrateKeys=String(operativeCrateKeys);
}
if(localStorage.getItem('neonStarterOperativeKeyRepairV2')===null){
  const hasUnlockedOperative=Object.values(operativeOwned).some(Boolean)||Object.values(operativeRoster).some(value=>Number(value)>0)||Object.keys(operativeRanks).length>0||Object.keys(operativeAcquiredOrder).length>0;
  if(operativeCrateKeys<=0&&!hasUnlockedOperative){
    operativeCrateKeys=1;
    localStorage.neonOperativeCrateKeys='1';
  }
  localStorage.neonStarterOperativeKeyRepairV2='1';
}
/*
 * V2 이전에 빈/오래된 요원 기록 때문에 복구가 건너뛰어진 저장 데이터가 있다.
 * 현재 열쇠가 0개인 기존 계정에는 보상 열쇠를 한 번만 보장한다.
 */
if(localStorage.getItem('neonStarterOperativeKeyRepairV3')===null){
  if(operativeCrateKeys<=0){
    operativeCrateKeys=1;
    localStorage.neonOperativeCrateKeys='1';
  }
  localStorage.neonStarterOperativeKeyRepairV3='1';
}
let selectedCharacter=localStorage.neonSelectedCharacter||'recruit';
// roster는 강화에 쓰는 중복 요원 수량이고 owned는 한 번 획득한 요원의 영구 소유권이다.
// 이전 버전에서 강화 후 roster가 0이 되어 잠긴 요원은 강화 단계/획득 기록으로 자동 복구한다.
function operativeIsOwned(id){return id==='recruit'||!!operativeOwned[id]||(operativeRoster[id]||0)>0||(operativeRanks[id]||0)>0||!!operativeAcquiredOrder[id]}
function repairOperativeOwnership(){let changed=false;const ids=new Set([...Object.keys(operativeRoster),...Object.keys(operativeRanks),...Object.keys(operativeAcquiredOrder)]);if(selectedCharacter!=='recruit')ids.add(selectedCharacter);for(const id of ids){if(id!=='recruit'&&operativeIsOwned(id)&&!operativeOwned[id]){operativeOwned[id]=true;changed=true}}if(changed||localStorage.getItem('neonOperativeOwned')===null)localStorage.neonOperativeOwned=JSON.stringify(operativeOwned)}
repairOperativeOwnership();
if(selectedCharacter!=='recruit'&&!operativeIsOwned(selectedCharacter))selectedCharacter='recruit';
function saveOperatives(){localStorage.neonOperativeRoster=JSON.stringify(operativeRoster);localStorage.neonOperativeRanks=JSON.stringify(operativeRanks);localStorage.neonOperativeOwned=JSON.stringify(operativeOwned);localStorage.neonOperativeAcquiredOrder=JSON.stringify(operativeAcquiredOrder);localStorage.neonOperativeClears=String(operativeClears);localStorage.neonOperativeSort=operativeSort;localStorage.neonOperativeCrateKeys=String(operativeCrateKeys);localStorage.neonSelectedCharacter=selectedCharacter}
function operativeRank(id=selectedCharacter){return operativeRanks[id]||0}
function upgradeOperative(id){if(!operativeIsOwned(id)||(operativeRoster[id]||0)<3||operativeRank(id)>=5)return false;operativeOwned[id]=true;operativeRoster[id]=Math.max(0,(operativeRoster[id]||0)-3);operativeRanks[id]=operativeRank(id)+1;saveOperatives();return true}
function grantOperative(source){const roll=Math.random()*100,id=roll<24?'kairos':roll<47?'lumina':roll<69?'nox':roll<76?'frost':roll<81?'mirage':roll<85?'blaze':roll<88?'volt':roll<94?'iron':roll<98?'arca':'gravion';operativeOwned[id]=true;operativeRoster[id]=(operativeRoster[id]||0)+1;operativeAcquiredOrder[id]=Date.now();saveOperatives();return `${source}: ${OPERATIVE_TIERS[CHARACTER_DATA[id].tier]} 요원 ${CHARACTER_DATA[id].name} 획득!`}
function registerMapClear(){operativeClears++;let reward='';if(operativeClears%3===0)reward=grantOperative('정복 보상');else{saveOperatives();reward=`요원 신호 ${operativeClears%3}/3 · 다음 요원까지 ${3-operativeClears%3}회 클리어`}return reward}
function renderOperativeKeyCount(){const keyLabel=$('#operative-key-count'),walletKey=$('#operative-key-wallet');if(keyLabel)keyLabel.innerHTML=`<i class="game-icon icon-key" aria-hidden="true"></i> ${operativeCrateKeys}`;if(walletKey)walletKey.textContent=operativeCrateKeys}
function openOperativeCrate(){
  if(operativeCrateOpening)return;
  if(operativeCrateKeys>0)operativeCrateKeys--;
  else if(wallet>=500){wallet-=500;localStorage.neonCoins=wallet;renderCoins()}
  else{pop('요원 열쇠 1개 또는 코인 500개가 필요합니다.');return}
  operativeCrateOpening=true;saveOperatives();renderOperativeKeyCount();
  const result=$('#shop-result');if(result){result.className='loot-result opening operative-opening';result.innerHTML='<b>요원 신호를 해독하는 중…</b><small>두근… 두근…</small>'}
  if(typeof tone==='function'){tone(76,.1,.07,'sine');setTimeout(()=>tone(58,.11,.08,'sine'),190);setTimeout(()=>tone(88,.1,.08,'triangle'),440);setTimeout(()=>tone(660,.14,.09,'triangle'),810)}
  setTimeout(()=>{const reward=grantOperative('요원 상자'),match=reward.match(/요원 (.+) 획득/),name=match?.[1]||'요원',data=Object.values(CHARACTER_DATA).find(character=>character.name===name);if(result&&data){result.className='loot-result';result.innerHTML=`<div class="loot-texture ${data.tier}"><span class="loot-icon"><span class="simple-item-glyph"><i class="game-icon icon-operative"></i></span></span><b>${data.name}</b><small>${OPERATIVE_TIERS[data.tier]} · ${data.role}</small><small>요원 상자 개봉 완료</small></div>`}operativeCrateOpening=false;pop(reward)},900);
}
let characterEffects=[],characterProjectiles=[],characterFloats=[],characterSummons=[],characterSource=null,characterLastHp=0,characterShake=0;
const characterButtons=[...document.querySelectorAll('[data-character-skill]')],characterPassive=$('#character-passive');
const characterNow=()=>CHARACTER_DATA[selectedCharacter];
let agentSprite=null,agentSpriteId='';
function refreshAgentTexture(){
  if(agentSpriteId===selectedCharacter&&agentSprite){warriorSprite=agentSprite;return}
  const data=characterNow(),sheet=document.createElement('canvas'),ctx=sheet.getContext('2d'),cx=570,cy=590;
  sheet.width=1140;sheet.height=1050;ctx.translate(cx,cy);ctx.lineJoin='round';ctx.lineCap='round';
  const fill=(color,path)=>{ctx.fillStyle=color;ctx.beginPath();path();ctx.fill()},stroke=(color,width,path)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();path();ctx.stroke()};
  ctx.shadowBlur=34;ctx.shadowColor=data.color;fill(data.color+'44',()=>ctx.arc(0,28,245,0,Math.PI*2));ctx.shadowBlur=0;
  if(selectedCharacter==='recruit'){
    fill('#2b3b4f',()=>ctx.roundRect(-125,-92,250,290,48));fill('#b7cadb',()=>ctx.roundRect(-112,-230,224,165,70));fill('#dff7ff',()=>ctx.roundRect(-80,-181,160,37,13));fill('#202c3b',()=>ctx.roundRect(-108,185,82,110,20));fill('#202c3b',()=>ctx.roundRect(26,185,82,110,20));stroke('#8ba9c2',18,()=>{ctx.moveTo(72,8);ctx.lineTo(214,-54)});
  }else if(selectedCharacter==='kairos'){
    fill('#121927',()=>ctx.roundRect(-155,-68,310,280,46));fill('#b9c4d1',()=>ctx.roundRect(-128,-205,256,188,74));fill('#10141e',()=>ctx.roundRect(-96,-153,192,72,25));fill('#61d9ff',()=>ctx.roundRect(-82,-141,164,43,15));fill('#111722',()=>ctx.roundRect(-120,188,92,113,23));fill('#111722',()=>ctx.roundRect(28,188,92,113,23));stroke('#dcecff',23,()=>{ctx.moveTo(85,24);ctx.lineTo(255,-96)});stroke('#4ad6ff',12,()=>{ctx.moveTo(82,24);ctx.lineTo(264,-103)});fill('#0a101a',()=>ctx.roundRect(-92,-263,184,77,43));
  }else if(selectedCharacter==='lumina'){
    fill('#f7f0d8',()=>{ctx.moveTo(0,-245);ctx.lineTo(152,196);ctx.lineTo(-152,196);ctx.closePath()});fill('#d9ac4f',()=>{ctx.moveTo(0,-230);ctx.lineTo(54,170);ctx.lineTo(-54,170);ctx.closePath()});fill('#fff7dd',()=>ctx.arc(0,-188,88,0,Math.PI*2));fill('#6ef2a1',()=>ctx.roundRect(-58,-204,116,32,12));stroke('#b8984f',23,()=>{ctx.moveTo(135,144);ctx.lineTo(198,-205)});fill('#ffe373',()=>ctx.arc(204,-228,34,0,Math.PI*2));
  }else if(selectedCharacter==='volt'){
    fill('#111827',()=>ctx.roundRect(-115,-142,230,305,48));fill('#202b3c',()=>ctx.roundRect(-105,-230,210,160,70));fill('#95f4ff',()=>ctx.roundRect(-76,-186,152,42,15));fill('#171c28',()=>ctx.roundRect(-122,150,85,165,24));fill('#171c28',()=>ctx.roundRect(37,150,85,165,24));stroke('#ffe55b',22,()=>{ctx.moveTo(-148,-24);ctx.lineTo(-216,142);ctx.lineTo(-130,120);ctx.lineTo(-196,283)});stroke('#ffe55b',18,()=>{ctx.moveTo(105,-10);ctx.lineTo(210,-88);ctx.lineTo(164,50);ctx.lineTo(248,16)});
  }else if(selectedCharacter==='gravion'){
    fill('#2a2d3a',()=>ctx.roundRect(-188,-115,376,338,68));fill('#404456',()=>ctx.roundRect(-164,-260,328,185,78));fill('#151723',()=>ctx.roundRect(-114,-204,228,55,18));fill('#b98cff',()=>ctx.roundRect(-92,-191,184,28,10));fill('#1f2130',()=>ctx.roundRect(-169,196,135,132,30));fill('#1f2130',()=>ctx.roundRect(34,196,135,132,30));fill('#6b42a4',()=>ctx.arc(0,34,58,0,Math.PI*2));fill('#e3c7ff',()=>ctx.arc(0,34,24,0,Math.PI*2));for(let i=0;i<4;i++){ctx.save();ctx.rotate(i*Math.PI/2);fill('#8370a7',()=>ctx.roundRect(210,-18,58,36,12));ctx.restore()}
  }else if(['nox','mirage','blaze','iron','arca','astra','solaris','inkra','chronos','rezona','raon','orbis','ner','velkar','morga','harin','seiran','zephyr','varkan','nebel','pebble','stitch','bubblin','root','magno'].includes(selectedCharacter)){
    const body={nox:'#182c22',mirage:'#392451',blaze:'#4b211b',iron:'#243142',arca:'#164244',astra:'#253368',solaris:'#5b2f1c',inkra:'#2d1c4f',chronos:'#174655',rezona:'#451d4e',raon:'#43202a',orbis:'#17395a',ner:'#273b61',velkar:'#4c3019',morga:'#314325',harin:'#253044',seiran:'#263747',zephyr:'#31463d',varkan:'#36233f',nebel:'#34464b',pebble:'#6b4028',stitch:'#162f36',bubblin:'#514064',root:'#29462d',magno:'#242a31'}[selectedCharacter],visor={nox:'#7dff79',mirage:'#dba1ff',blaze:'#ffb04e',iron:'#bde8ff',arca:'#77fff0',astra:'#b5c8ff',solaris:'#ffe47b',inkra:'#dcadff',chronos:'#a9fbff',rezona:'#fbadff',raon:'#ff7899',orbis:'#7de8ff',ner:'#b8d7ff',velkar:'#ffd56a',morga:'#9cff7d',harin:'#ff9b57',seiran:'#bdeaff',zephyr:'#caffb1',varkan:'#dd8cff',nebel:'#b9fff2',pebble:'#ff9b43',stitch:'#58f1df',bubblin:'#8deaff',root:'#72df7c',magno:'#ebc550'}[selectedCharacter];fill(body,()=>ctx.roundRect(-145,-92,290,300,54));fill('#d9e6ef',()=>ctx.roundRect(-120,-230,240,166,70));fill('#182033',()=>ctx.roundRect(-88,-182,176,42,14));fill(visor,()=>ctx.roundRect(-73,-176,146,28,10));fill(body,()=>ctx.roundRect(-128,185,98,120,22));fill(body,()=>ctx.roundRect(30,185,98,120,22));if(['nox','raon','harin','zephyr','nebel'].includes(selectedCharacter)){stroke(visor,17,()=>{ctx.moveTo(58,5);ctx.lineTo(220,-62);ctx.moveTo(60,34);ctx.lineTo(205,105)})}if(['mirage','inkra','orbis','varkan'].includes(selectedCharacter)){for(let i=0;i<3;i++){ctx.save();ctx.rotate(i*2.1);fill(visor,()=>ctx.roundRect(178,-20,60,40,10));ctx.restore()}}if(['blaze','solaris','velkar'].includes(selectedCharacter)){stroke(visor,23,()=>{ctx.moveTo(76,28);ctx.lineTo(245,-108)})}if(selectedCharacter==='iron'||selectedCharacter==='seiran'){fill('#a6c8e8',()=>ctx.roundRect(104,-48,135,184,25));stroke('#e7f7ff',14,()=>{ctx.moveTo(-58,52);ctx.lineTo(-225,52)})}if(['arca','astra','rezona','ner','morga'].includes(selectedCharacter)){for(let i=0;i<3;i++){ctx.save();ctx.rotate(i*2.1);fill([visor,'#86efff','#ffe65c'][i],()=>ctx.arc(175,0,30,0,Math.PI*2));ctx.restore()}}if(selectedCharacter==='chronos'){stroke('#bdfcff',18,()=>{ctx.moveTo(82,18);ctx.lineTo(224,-60)});fill('#eaffff',()=>ctx.arc(188,-68,30,0,Math.PI*2))}if(selectedCharacter==='pebble'){fill('#8b5733',()=>ctx.roundRect(-175,-20,66,150,24));for(let i=0;i<3;i++)fill('#f2a34c',()=>ctx.arc(172,-44+i*42,18,0,Math.PI*2))}if(selectedCharacter==='stitch'){stroke('#69f4e2',12,()=>{ctx.arc(170,25,55,0,Math.PI*2);ctx.moveTo(122,52);ctx.lineTo(230,-60)})}if(selectedCharacter==='bubblin'){for(let i=0;i<5;i++){ctx.save();ctx.translate(Math.cos(i*1.4)*190,Math.sin(i*1.4)*130);stroke('#bdefff',7,()=>ctx.arc(0,0,18+i%2*8,0,Math.PI*2));ctx.restore()}}if(selectedCharacter==='root'){for(let i=0;i<3;i++){ctx.save();ctx.rotate(i*2.1);fill('#84e67c',()=>{ctx.moveTo(150,0);ctx.quadraticCurveTo(205,-55,235,0);ctx.quadraticCurveTo(205,55,150,0)});ctx.restore()}}if(selectedCharacter==='magno'){for(let i=0;i<3;i++){ctx.save();ctx.rotate(i*2.1);fill(i%2?'#64e8dd':'#e9c24f',()=>{ctx.moveTo(185,-25);ctx.lineTo(235,0);ctx.lineTo(185,25);ctx.closePath()});ctx.restore()}}
  }else{
    fill('#172945',()=>{ctx.moveTo(0,-246);ctx.lineTo(158,205);ctx.lineTo(-158,205);ctx.closePath()});fill('#effcff',()=>ctx.arc(0,-182,86,0,Math.PI*2));fill('#8eeeff',()=>ctx.roundRect(-63,-196,126,35,13));fill('#a9f5ff',()=>{ctx.moveTo(0,-345);ctx.lineTo(42,-264);ctx.lineTo(-42,-264);ctx.closePath()});fill('#6ccdf0',()=>ctx.arc(112,34,42,0,Math.PI*2));stroke('#dffcff',18,()=>{ctx.moveTo(94,68);ctx.lineTo(207,-120)});for(let i=-1;i<=1;i++){ctx.save();ctx.translate(i*90,34);fill('#c9f9ff',()=>{ctx.moveTo(0,-48);ctx.lineTo(24,0);ctx.lineTo(0,48);ctx.lineTo(-24,0);ctx.closePath()});ctx.restore()}
  }
  agentSprite=sheet;agentSpriteId=selectedCharacter;warriorSprite=agentSprite;
}
const limit=(n,a,b)=>Math.max(a,Math.min(b,n));
function characterAim(){return player?.angle??0}
function charFloat(text,px=player?.x||W/2,py=(player?.y||H/2)-48,color='#ffffff'){characterFloats.push({text,x:px,y:py,l:.8,color})}
function charBurst(px,py,color,count=9){burst(px,py,color,count);characterEffects.push({type:'flash',x:px,y:py,l:.22,max:.22,r:38,color})}
function healLumina(amount,source,cap){
  const before=player.hp;player.hp=Math.min(player.maxHp,player.hp+amount);const healed=player.hp-before;
  if(!healed||selectedCharacter!=='lumina'||!player.character)return healed;
  const charges=player.character.healCharges||(player.character.healCharges={}),entry=charges[source]||{until:0,earned:0};
  if(time>=entry.until){entry.until=time+1;entry.earned=0}
  const gain=Math.min(Math.max(0,cap-entry.earned),healed*.5);entry.earned+=gain;charges[source]=entry;
  if(gain>0)player.ultimate=Math.min(100,player.ultimate+gain);
  return healed;
}
function withCharacterSource(key,max,fn){const previous=characterSource;characterSource={key,max,count:0};try{fn()}finally{characterSource=previous}}
const coreCharacterHurt=hurt;
hurt=function(enemy,damage){
  const before=enemy?.hp;
  const skillMultiplier=characterSource&&characterSource.key!=='weapon'?(player?.character?.skillMultiplier||1):1;
  coreCharacterHurt(enemy,damage*skillMultiplier);
  if(!player||!run||!Number.isFinite(before)||!characterSource)return;
  if(before>(enemy?.hp??0)&&characterSource.count<characterSource.max&&!player.character?.isTranscending){characterSource.count++;player.ultimate=Math.min(100,player.ultimate+characterNow().charge);characterHitPassive(enemy);}
};
function characterHitPassive(enemy){
  const state=player.character;
  if(!state)return;
  if(selectedCharacter==='kairos'){
    const previous=state.stacks;state.stacks=Math.min(5,state.stacks+1);state.lastHit=time;
    if(previous!==state.stacks)player.speed*=((1+state.stacks*.03)/(1+previous*.03));
  }
  if(selectedCharacter==='lumina')state.fragments=Math.min(4,state.fragments+1);
  if(selectedCharacter==='volt'){
    const now=time,old=state.combo[enemy.id]||{n:0,t:0,ready:0};
    old.n=now-old.t<3?old.n+1:1;old.t=now;
    if(old.n>=3&&now>old.ready){withCharacterSource('volt-passive',1,()=>coreCharacterHurt(enemy,8));old.n=0;old.ready=now+5;state.speedUntil=now+2;charFloat('과전류!',enemy.x,enemy.y-28,'#fff06b');charBurst(enemy.x,enemy.y,'#ffe259',8)}
    state.combo[enemy.id]=old;
  }
  if(selectedCharacter==='nox')applyNoxPoison(enemy,1);
  if(selectedCharacter==='blaze'){
    state.blazeEmbers=Math.min(3,state.blazeEmbers+1);state.lastHit=time;
    if(state.blazeEmbers>=3){withCharacterSource('blaze-passive',1,()=>{for(const targetEnemy of enemies)if(Math.hypot(targetEnemy.x-enemy.x,targetEnemy.y-enemy.y)<82+targetEnemy.r)hurt(targetEnemy,18)});state.blazeEmbers=0;charBurst(enemy.x,enemy.y,'#ff8a3d',12)}
    if(time<(state.blazeAwakenUntil||0)&&time>(state.blazeAwakenHit||0)){state.blazeAwakenHit=time+.8;withCharacterSource('blaze-awaken',0,()=>{for(const targetEnemy of enemies)if(Math.hypot(targetEnemy.x-enemy.x,targetEnemy.y-enemy.y)<66+targetEnemy.r)hurt(targetEnemy,10)});charBurst(enemy.x,enemy.y,'#ff8a3d',7)}
  }
}
function applyNoxPoison(enemy,stacks=1){if(!enemy||!player?.character)return;const status=enemy.noxPoison||{stacks:0,until:0,tick:0,explode:0};if(status.stacks>=5&&time>=status.explode){status.stacks=0;status.explode=time+2;withCharacterSource('nox-poison-burst',1,()=>hurt(enemy,22));charBurst(enemy.x,enemy.y,'#74ef72',12)}else{status.stacks=Math.min(5,status.stacks+stacks);status.until=time+4}enemy.noxPoison=status}
const coreCharacterWeaponAttack=weaponAttack;
weaponAttack=function(dt){
  if(!run||paused||!player)return coreCharacterWeaponAttack(dt);
  withCharacterSource('weapon',1,()=>coreCharacterWeaponAttack(dt));
};
const coreCharacterMakePlayer=makePlayer;
makePlayer=function(){
  coreCharacterMakePlayer();
  const data=characterNow(),rank=operativeRank(),statMultiplier=1+rank*.10;
  refreshAgentTexture();
  player.maxHp=Math.round(data.hp*statMultiplier);player.hp=player.maxHp;player.damage=data.damage*statMultiplier;player.speed=data.speed;
  player.character={id:selectedCharacter,rank,qCd:0,eCd:0,ultimate:0,stacks:0,lastHit:-99,fragments:0,lifeReady:0,combo:{},speedUntil:0,shield:0,shieldReady:5,invulnerableUntil:0,reduceUntil:0,skillMultiplier:1+rank*.12,cooldownMultiplier:Math.max(.7,1-rank*.05),noxTargets:{},mirageDecoys:[],blazeEmbers:0,ironCounter:0,arcaNext:0,arcaAuto:0,healCharges:{}};
  player.ultimate=0;characterEffects.length=0;characterProjectiles.length=0;characterFloats.length=0;characterSummons.length=0;characterLastHp=player.hp;
};
function dash(distance,damage,color,firstOnly=false){
  const a=characterAim(),sx=player.x,sy=player.y,ex=limit(sx+Math.cos(a)*distance,24,W-24),ey=limit(sy+Math.sin(a)*distance,24,H-24),hit=[];
  withCharacterSource('dash',1,()=>{for(const enemy of [...enemies]){const vx=ex-sx,vy=ey-sy,len=vx*vx+vy*vy||1,t=limit(((enemy.x-sx)*vx+(enemy.y-sy)*vy)/len,0,1),px=sx+vx*t,py=sy+vy*t;if(Math.hypot(enemy.x-px,enemy.y-py)<enemy.r+25){hurt(enemy,damage);hit.push(enemy);if(firstOnly)break}}});
  player.x=ex;player.y=ey;characterEffects.push({type:'line',x:sx,y:sy,x2:ex,y2:ey,l:.28,max:.28,color});for(const enemy of hit){charBurst(enemy.x,enemy.y,color,7);if(firstOnly){const u=unit(Math.cos(a),Math.sin(a));player.x=limit(enemy.x+u.x*(enemy.r+35),24,W-24);player.y=limit(enemy.y+u.y*(enemy.r+35),24,H-24)}}
}
function areaDamage(px,py,r,damage,color,source='area',max=99,knock=0){withCharacterSource(source,max,()=>{for(const enemy of [...enemies])if(Math.hypot(enemy.x-px,enemy.y-py)<r+enemy.r){hurt(enemy,damage);if(knock){const u=unit(enemy.x-px,enemy.y-py);enemy.x+=u.x*knock;enemy.y+=u.y*knock}}});characterEffects.push({type:'ring',x:px,y:py,r,l:.34,max:.34,color});charBurst(px,py,color,10)}
function addCharacterProjectile(kind,damage,color,extra={}){const a=characterAim();characterProjectiles.push({kind,x:player.x+Math.cos(a)*22,y:player.y+Math.sin(a)*22,vx:Math.cos(a)*(extra.speed||600),vy:Math.sin(a)*(extra.speed||600),damage,color,l:extra.life||1.1,r:extra.r||13,hit:{},...extra})}
function useCharacterSkill(slot){
  if(!run||paused||!player)return;
  const state=player.character,data=characterNow();
  if(selectedCharacter==='recruit'){pop('요원을 획득하면 고유 스킬을 사용할 수 있습니다.');return}
  if(slot==='r'){if(player.ultimate<100){pop(`궁극기 충전 ${Math.floor(player.ultimate)}%`);return}player.ultimate=0;castUltimate();return}
  const key=slot==='q'?'qCd':'eCd';if(state[key]>0)return;
  if(selectedCharacter==='lumina'&&slot==='q'&&player.hp>=player.maxHp-.1){pop('체력이 최대입니다.');return}
  state[key]=data[slot].cd*state.cooldownMultiplier;
  if(selectedCharacter==='kairos'){
    if(slot==='q'){dash(245,24,'#4fb9ff');player.character.reduceUntil=time+.35}
    else{characterEffects.push({type:'delayedArea',x:player.x,y:player.y,r:98,damage:15,l:.10,max:.10,color:'#4fb9ff',source:'kairos-e1',maxHits:1});characterEffects.push({type:'delayedArea',x:player.x,y:player.y,r:126,damage:17,l:.30,max:.30,color:'#8defff',source:'kairos-e2',maxHits:2,knock:45})}
  }else if(selectedCharacter==='lumina'){
    if(slot==='q'){const healed=healLumina(24,'life-light',12);charFloat(`+${Math.ceil(healed)}`,player.x,player.y-55,'#72ffab');characterEffects.push({type:'heal',x:player.x,y:player.y,r:62,l:.55,max:.55,color:'#78f0a1'})}
    else addCharacterProjectile('lumina',27,'#d9ff72',{speed:520,r:16,explode:15,slow:1.5});
  }else if(selectedCharacter==='volt'){
    if(slot==='q'){player.character.invulnerableUntil=time+.24;dash(300,23,'#ffe259',true)}
    else{let candidates=[...enemies],last=null;withCharacterSource('volt-e',4,()=>{[22,19,16,13].forEach((damage,index)=>{let choices=candidates.filter(e=>e!==last&&(last?Math.hypot(e.x-last.x,e.y-last.y)<230:true));let enemy=choices.sort((a,b)=>Math.hypot(a.x-(last?.x??player.x),a.y-(last?.y??player.y))-Math.hypot(b.x-(last?.x??player.x),b.y-(last?.y??player.y)))[0];if(!enemy)return;hurt(enemy,damage);characterEffects.push({type:'boltLine',x:last?.x??player.x,y:last?.y??player.y,x2:enemy.x,y2:enemy.y,l:.25,max:.25,color:'#ffe259'});charBurst(enemy.x,enemy.y,'#fff1a0',4);last=enemy})})}
  }else if(selectedCharacter==='gravion'){
    const px=limit(player.x+Math.cos(characterAim())*170,45,W-45),py=limit(player.y+Math.sin(characterAim())*170,45,H-45);
    if(slot==='q')characterEffects.push({type:'gravity',x:px,y:py,r:105,l:2,max:2,damage:18,tick:0,source:'gravion-q',maxHits:12,color:'#b98cff'});
    else{areaDamage(player.x,player.y,155,30,'#c790ff','gravion-e',1,110);player.character.reduceUntil=time+1}
  }else if(selectedCharacter==='frost'){
    const px=limit(player.x+Math.cos(characterAim())*185,40,W-40),py=limit(player.y+Math.sin(characterAim())*185,40,H-40);
    if(slot==='q')addCharacterProjectile('frost',24,'#9ceeff',{speed:590,r:12,freezeMark:true});
    else characterEffects.push({type:'blizzard',x:px,y:py,r:128,l:4,max:4,tick:0,damage:9,source:'frost-e',maxHits:4,color:'#8ceaff',marked:{}});
  }else if(selectedCharacter==='nox'){
    if(slot==='q'){dash(275,26,'#72ef78',true);const enemy=target();if(enemy)applyNoxPoison(enemy,2)}
    else{const px=limit(player.x+Math.cos(characterAim())*165,45,W-45),py=limit(player.y+Math.sin(characterAim())*165,45,H-45);characterEffects.push({type:'poisonMist',x:px,y:py,r:130,l:6,max:6,tick:0,hits:{},color:'#62d865'})}
  }else if(selectedCharacter==='mirage'){
    if(slot==='q'){const sx=player.x,sy=player.y;player.character.invulnerableUntil=time+.3;dash(185,0,'#c98cff');characterSummons.push({type:'decoy',x:sx,y:sy,l:3,attacks:2,cd:.35,color:'#c68cff',offense:true})}
    else{state.mirageGuards=4;state.mirageGuardUntil=time+4;characterEffects.push({type:'mirrorMaze',x:player.x,y:player.y,r:76,l:4,max:4,color:'#c68cff'})}
  }else if(selectedCharacter==='blaze'){
    if(slot==='q'){areaDamage(player.x+Math.cos(characterAim())*80,player.y+Math.sin(characterAim())*80,135,30,'#ff743d','blaze-q',1);for(const enemy of enemies)if(Math.hypot(enemy.x-player.x,enemy.y-player.y)<155)enemy.blazeBurn={until:time+3,tick:0}}
    else{const px=limit(player.x+Math.cos(characterAim())*175,50,W-50),py=limit(player.y+Math.sin(characterAim())*175,50,H-50);characterEffects.push({type:'blazeErupt',x:px,y:py,r:118,l:.35,max:.35,color:'#ff743d'});characterEffects.push({type:'blazeFire',x:px,y:py,r:112,l:3.35,max:3,tick:0,hits:{},color:'#ff963d'})}
  }else if(selectedCharacter==='iron'){
    if(slot==='q'){dash(240,25,'#b9ddff',true);player.character.reduceUntil=time+1;}
    else{state.ironGuardUntil=time+3;state.ironCounter=0;characterEffects.push({type:'ironGuard',x:player.x,y:player.y,r:92,l:3,max:3,color:'#9bc9ff'})}
  }else if(selectedCharacter==='arca'){
    if(slot==='q')spawnSpirit(['fire','ice','lightning'][state.arcaNext++%3],20);
    else{if(!characterSummons.some(summon=>summon.type==='spirit')){state.eCd=0;pop('강화할 정령이 없습니다.');return}state.arcaResonanceUntil=time+7;characterEffects.push({type:'resonance',x:player.x,y:player.y,r:110,l:7,max:7,color:'#ffdc65'})}
  }
  pop(`${data[slot].name} 사용`);
}
function castUltimate(){
  const a=characterAim();
  if(selectedCharacter==='kairos'){const px=player.x+Math.cos(a)*55,py=player.y+Math.sin(a)*55;characterEffects.push({type:'delayedArea',x:px,y:py,r:155,l:.28,max:.28,damage:0,color:'#78dfff',ultimate:'kairos'});characterShake=.48;}
  if(selectedCharacter==='lumina')characterEffects.push({type:'sanctuary',x:player.x,y:player.y,r:178,l:8,max:8,tick:0,color:'#ffe075'});
  if(selectedCharacter==='volt')characterEffects.push({type:'storm',x:player.x,y:player.y,r:205,l:6,max:6,tick:0,hits:0,color:'#ffe259'});
  if(selectedCharacter==='gravion'){const px=limit(player.x+Math.cos(a)*165,60,W-60),py=limit(player.y+Math.sin(a)*165,60,H-60);characterEffects.push({type:'singularity',x:px,y:py,r:185,l:5,max:5,tick:0,color:'#b98cff'});characterShake=.28;}
  if(selectedCharacter==='frost'){areaDamage(player.x,player.y,245,48,'#d8faff','frost-r',1);for(const e of enemies){if(Math.hypot(e.x-player.x,e.y-player.y)<245+e.r){e.frozenUntil=time+(e.boss||e.elite?1.25:2.5);hurt(e,34)}}characterEffects.push({type:'iceNova',x:player.x,y:player.y,r:245,l:1,max:1,color:'#baf5ff'});characterShake=.3;}
  if(selectedCharacter==='nox')characterEffects.push({type:'toxicStorm',x:player.x,y:player.y,r:220,l:8,max:8,tick:0,color:'#73e56d'});
  if(selectedCharacter==='mirage'){for(let i=0;i<8;i++)characterSummons.push({type:'legion',x:player.x,y:player.y,l:5,cd:.2+i*.12,attacks:1,color:'#c68cff',angle:i*Math.PI/4});characterEffects.push({type:'legionRing',x:player.x,y:player.y,r:165,l:5,max:5,color:'#d59aff'})}
  if(selectedCharacter==='blaze'){player.character.blazeAwakenUntil=time+12;player.character.qCd*=.7;player.character.eCd*=.7;characterEffects.push({type:'flameAwaken',x:player.x,y:player.y,r:88,l:12,max:12,color:'#ff743d'})}
  if(selectedCharacter==='iron'){player.character.ironFortressUntil=time+10;player.character.fortressAdded=true;player.maxHp+=60;player.hp+=60;characterEffects.push({type:'fortress',x:player.x,y:player.y,r:145,l:10,max:10,color:'#91c9ff'})}
  if(selectedCharacter==='arca'){characterSummons.push({type:'king',x:player.x,y:player.y,l:18,cd:.5,hp:220,color:'#ffbd5a',phase:0,phaseTime:0});characterEffects.push({type:'kingCircle',x:player.x,y:player.y,r:150,l:18,max:18,color:'#63e5df'})}
  pop(`${characterNow().r.name} 발동!`);
}
function frostMark(enemy){const marks=enemy.frostMarks||[];const active=marks.filter(t=>t>time);active.push(time+5);enemy.frostMarks=active;if(active.length>=3&&time>(enemy.frostReady||0)){enemy.frostMarks=[];enemy.frostReady=time+4;enemy.frozenUntil=time+1;coreCharacterHurt(enemy,10);charFloat('빙결!',enemy.x,enemy.y-30,'#bdf6ff')}}
function spawnSpirit(element,lifetime=15){const spirits=characterSummons.filter(summon=>summon.type==='spirit');if(spirits.length>=2)characterSummons.splice(characterSummons.indexOf(spirits[0]),1);characterSummons.push({type:'spirit',element,x:player.x,y:player.y,l:lifetime,cd:.35,color:{fire:'#ff863d',ice:'#8eefff',lightning:'#ffe45c'}[element]})}
function updateSummons(dt){
  for(let i=characterSummons.length-1;i>=0;i--){const summon=characterSummons[i];summon.l-=dt;summon.cd-=dt;if(summon.l<=0){if(summon.type==='king'){areaDamage(summon.x,summon.y,150,42,'#ffe06a','arca-king-end',1);characterShake=.2}characterSummons.splice(i,1);continue}
    const enemy=target(),orbit=(i*1.8+time*(summon.type==='spirit'?2:1));summon.x+=(player.x+Math.cos(orbit)*((summon.type==='king')?95:65)-summon.x)*Math.min(1,dt*4);summon.y+=(player.y+Math.sin(orbit)*((summon.type==='king')?95:65)-summon.y)*Math.min(1,dt*4);
    if(summon.type==='decoy'&&summon.offense&&enemy&&summon.cd<=0&&summon.attacks>0){summon.cd=.8;summon.attacks--;withCharacterSource('mirage-q',2,()=>hurt(enemy,10));characterEffects.push({type:'ring',x:enemy.x,y:enemy.y,r:45,l:.2,max:.2,color:'#c68cff'})}
    if(summon.type==='legion'&&enemy&&summon.cd<=0&&summon.attacks){summon.attacks=0;withCharacterSource('mirage-r',0,()=>hurt(enemy,12));characterEffects.push({type:'ring',x:enemy.x,y:enemy.y,r:36,l:.2,max:.2,color:'#c68cff'})}
    if(summon.type==='spirit'&&enemy&&summon.cd<=0){const boost=player.character.arcaResonanceUntil>time,rate={fire:1.4,ice:1.5,lightning:1.1}[summon.element]/(boost?1.4:1);summon.cd=rate;const damage={fire:12,ice:9,lightning:10}[summon.element]*(boost?1.25:1);withCharacterSource(`arca-${summon.element}`,1,()=>hurt(enemy,damage));if(summon.element==='fire')enemy.blazeBurn={until:time+2,tick:0,damage:boost?3:2};if(summon.element==='ice')enemy.slowUntil=time+(boost?1.5:1);if(summon.element==='lightning'&&(boost||Math.random()<.3)){const other=enemies.find(e=>e!==enemy&&Math.hypot(e.x-enemy.x,e.y-enemy.y)<160);if(other)withCharacterSource('arca-lightning',1,()=>hurt(other,5))}}
    if(summon.type==='king'&&enemy&&summon.cd<=0){summon.cd=1.5;summon.phase=Math.floor((18-summon.l)/5)%3;const damage=22;withCharacterSource('arca-king',0,()=>hurt(enemy,damage));if(summon.phase===0){areaDamage(enemy.x,enemy.y,72,8,'#ff863d','arca-king',0);enemy.blazeBurn={until:time+2,tick:0}}if(summon.phase===1){enemy.slowUntil=time+1.3;enemy.kingFreeze=(enemy.kingFreeze||0)+1;if(enemy.kingFreeze>=3){enemy.frozenUntil=time+.8;enemy.kingFreeze=0}}if(summon.phase===2){for(const other of enemies.filter(e=>e!==enemy&&Math.hypot(e.x-enemy.x,e.y-enemy.y)<180).slice(0,2))withCharacterSource('arca-king',0,()=>hurt(other,13))}}
  }
}
function updateCharacterEffects(dt){
  for(let i=characterProjectiles.length-1;i>=0;i--){const p=characterProjectiles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt;let impact=null;for(const enemy of enemies)if(!p.hit[enemy.id]&&Math.hypot(enemy.x-p.x,enemy.y-p.y)<enemy.r+p.r){impact=enemy;break}if(impact||p.x<0||p.x>W||p.y<0||p.y>H||p.l<=0){if(impact){withCharacterSource(`projectile-${p.kind}`,p.kind==='lumina'?2:1,()=>{hurt(impact,p.damage);if(p.freezeMark)frostMark(impact);if(p.explode)for(const enemy of enemies)if(enemy!==impact&&Math.hypot(enemy.x-p.x,enemy.y-p.y)<70+enemy.r)hurt(enemy,p.explode)});if(p.slow)for(const enemy of enemies)if(Math.hypot(enemy.x-p.x,enemy.y-p.y)<70+enemy.r)enemy.slowUntil=Math.max(enemy.slowUntil||0,time+p.slow);charBurst(p.x,p.y,p.color,8)}characterProjectiles.splice(i,1)}}
  for(let i=characterEffects.length-1;i>=0;i--){const fx=characterEffects[i];fx.l-=dt;
    if(fx.type==='delayedArea'&&fx.l<=0){if(fx.ultimate==='kairos'){withCharacterSource('kairos-r',1,()=>{for(const enemy of enemies){let d=Math.hypot(enemy.x-fx.x,enemy.y-fx.y);if(d<fx.r+enemy.r){hurt(enemy,d<70?78:52);enemy.frozenUntil=time+.25}}});characterEffects.push({type:'ring',x:fx.x,y:fx.y,r:fx.r,l:.7,max:.7,color:'#5ddfff'});charBurst(fx.x,fx.y,'#72dcff',22)}else areaDamage(fx.x,fx.y,fx.r,fx.damage,fx.color,fx.source,fx.maxHits,fx.knock)}
    if(fx.type==='gravity'||fx.type==='singularity'){fx.tick=(fx.tick||0)-dt;for(const enemy of enemies){let d=Math.hypot(enemy.x-fx.x,enemy.y-fx.y);if(d<fx.r+enemy.r){let u=unit(fx.x-enemy.x,fx.y-enemy.y);enemy.x+=u.x*(fx.type==='singularity'?175:80)*dt;enemy.y+=u.y*(fx.type==='singularity'?175:80)*dt;if(fx.type==='gravity'&&fx.tick<=0)withCharacterSource(fx.source,fx.maxHits,()=>hurt(enemy,18));}}if(fx.tick<=0)fx.tick=1;if(fx.type==='singularity'&&fx.l<=0){areaDamage(fx.x,fx.y,fx.r,38,'#c795ff','gravion-r',1);for(const e of enemies)if(Math.hypot(e.x-fx.x,e.y-fx.y)<fx.r+e.r)e.frozenUntil=time+.3;characterShake=.35}}
    if(fx.type==='blizzard'){fx.tick=(fx.tick||0)-dt;if(fx.tick<=0){fx.tick=1;withCharacterSource(fx.source,fx.maxHits,()=>{for(const enemy of enemies)if(Math.hypot(enemy.x-fx.x,enemy.y-fx.y)<fx.r+enemy.r){hurt(enemy,fx.damage);enemy.slowUntil=time+1.1;if(!fx.marked[enemy.id]){fx.marked[enemy.id]=true;frostMark(enemy)}}})}}
    if(fx.type==='sanctuary'){fx.tick=(fx.tick||0)-dt;if(Math.hypot(player.x-fx.x,player.y-fx.y)<fx.r)healLumina(8*dt,'sanctuary',4);if(fx.tick<=0){fx.tick=1;withCharacterSource('lumina-r',3,()=>{for(const enemy of enemies)if(Math.hypot(enemy.x-fx.x,enemy.y-fx.y)<fx.r+enemy.r)hurt(enemy,6)})}}
    if(fx.type==='storm'){fx.x=player.x;fx.y=player.y;fx.tick=(fx.tick||0)-dt;if(fx.tick<=0&&fx.hits<10){fx.tick=.6;let choices=enemies.filter(e=>Math.hypot(e.x-fx.x,e.y-fx.y)<fx.r);let enemy=choices[Math.floor(Math.random()*choices.length)];if(enemy){fx.hits++;withCharacterSource('volt-r',10,()=>hurt(enemy,16));characterEffects.push({type:'boltLine',x:enemy.x,y:0,x2:enemy.x,y2:enemy.y,l:.18,max:.18,color:'#fff5a6'});charBurst(enemy.x,enemy.y,'#ffe259',6);characterShake=.08}}}
    if(fx.type==='poisonMist'||fx.type==='toxicStorm'||fx.type==='blazeFire'){fx.tick=(fx.tick||0)-dt;if(fx.tick<=0){fx.tick=1;const damage=fx.type==='poisonMist'?8:fx.type==='toxicStorm'?13:5,source=fx.type==='poisonMist'?'nox-e':fx.type==='toxicStorm'?'nox-r':'blaze-e',cap=fx.type==='toxicStorm'?0:fx.type==='poisonMist'?3:2;withCharacterSource(source,cap,()=>{for(const enemy of enemies)if(Math.hypot(enemy.x-fx.x,enemy.y-fx.y)<fx.r+enemy.r){hurt(enemy,damage);if(fx.type==='poisonMist'&&!fx.hits[enemy.id]){fx.hits[enemy.id]=true;applyNoxPoison(enemy,1)}if(fx.type==='toxicStorm')applyNoxPoison(enemy,3)}})}}
    if(fx.type==='blazeErupt'&&fx.l<=0){areaDamage(fx.x,fx.y,fx.r,34,'#ff7138','blaze-e-hit',1);for(const enemy of enemies)if(Math.hypot(enemy.x-fx.x,enemy.y-fx.y)<fx.r+enemy.r)enemy.frozenUntil=time+.2;charBurst(fx.x,fx.y,'#ff7138',16)}
    if(fx.l<=0)characterEffects.splice(i,1);
  }
}
function characterTick(dt){
  if(!run||paused||!player)return;
  const s=player.character;if(!s)return;
  s.qCd=Math.max(0,s.qCd-dt);s.eCd=Math.max(0,s.eCd-dt);
  if(selectedCharacter==='kairos'&&s.stacks&&time-s.lastHit>4){player.speed/=1+s.stacks*.03;s.stacks=0;}
  if(selectedCharacter==='volt'){if(s.speedUntil>time)player.speed=Math.max(player.speed,characterNow().speed*1.15);else if(player.speed>characterNow().speed*1.14)player.speed=characterNow().speed;}
  if(selectedCharacter==='gravion'){
    if(s.shield<=0&&time>=s.shieldReady&&time-(s.lastDamage||0)>=5){s.shield=18;charFloat('보호막',player.x,player.y-54,'#c49aff');}
  }
  if(selectedCharacter==='lumina'&&player.hp<=player.maxHp*.5&&s.fragments&&time>=s.lifeReady){let heal=s.fragments*4,healed=healLumina(heal,'life-fragments',8);charFloat(`+${Math.ceil(healed)}`,player.x,player.y-54,'#78f0a1');s.fragments=0;s.lifeReady=time+8;}
  if(selectedCharacter==='arca'&&characterSummons.filter(summon=>summon.type==='spirit').length===0&&time>=s.arcaAuto){spawnSpirit(['fire','ice','lightning'][Math.floor(Math.random()*3)]);s.arcaAuto=time+18}
  if(selectedCharacter==='mirage'&&((keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD)||touchMove.active)&&time>=(s.mirageAfterimageUntil||0)){characterSummons.push({type:'decoy',x:player.x,y:player.y,l:1.2,attacks:0,cd:99,color:'#c68cff'});s.mirageAfterimageUntil=time+3}
  if(selectedCharacter==='iron'&&time>=(s.ironGuardUntil||0)&&s.ironCounter>0&&!s.ironCounterUsed){s.ironCounterUsed=true;areaDamage(player.x+Math.cos(characterAim())*95,player.y+Math.sin(characterAim())*95,130,Math.max(10,Math.min(38,s.ironCounter)),'#bce6ff','iron-counter',3);s.ironCounter=0}
  if(selectedCharacter==='iron'&&time<(s.ironGuardUntil||0))s.ironCounterUsed=false;
  if(characterLastHp>player.hp){let damage=characterLastHp-player.hp;s.lastDamage=time;if(time<s.invulnerableUntil)player.hp=characterLastHp;else {let reduction=time<(s.reduceUntil||0)?0.2:0;if(selectedCharacter==='iron'){reduction=Math.max(reduction,.12);if(damage>player.maxHp*.2&&time>(s.ironBreakUntil||0)){reduction+=.2;s.ironBreakUntil=time+6}if(time<(s.ironGuardUntil||0)){s.ironCounter=Math.min(190,s.ironCounter+damage*.2);reduction=Math.max(reduction,.65)}if(time<(s.ironFortressUntil||0))reduction=Math.max(reduction,.4);player.ultimate=Math.min(100,player.ultimate+Math.min(3,damage/player.maxHp*20))}if(selectedCharacter==='mirage'&&s.mirageGuards>0&&time<(s.mirageGuardUntil||0)){s.mirageGuards--;player.hp=characterLastHp;charBurst(player.x,player.y,'#d69bff',7)}if(s.shield>0){let absorbed=Math.min(s.shield,damage);s.shield-=absorbed;player.hp+=absorbed;if(s.shield<=0)s.shieldReady=time+8;}if(reduction)player.hp+=damage*reduction;}}
  characterLastHp=player.hp;
  for(const enemy of enemies){if(enemy.noxPoison){const poison=enemy.noxPoison;if(time>poison.until)delete enemy.noxPoison;else{poison.tick-=dt;if(poison.tick<=0){poison.tick=1;coreCharacterHurt(enemy,poison.stacks*2)}}}if(enemy.blazeBurn){if(time>enemy.blazeBurn.until)delete enemy.blazeBurn;else{enemy.blazeBurn.tick-=dt;if(enemy.blazeBurn.tick<=0){enemy.blazeBurn.tick=1;coreCharacterHurt(enemy,enemy.blazeBurn.damage||4)}}}if(enemy.slowUntil>time){if(!enemy.characterSlow){enemy.characterSlow=enemy.speed*.75;enemy.speed*=.75}}else if(enemy.characterSlow){enemy.speed/=.75;enemy.characterSlow=0}if(enemy.frozenUntil>time){if(!enemy.characterFrozen){enemy.characterFrozen=enemy.speed;enemy.speed=0}}else if(enemy.characterFrozen!==undefined){enemy.speed=enemy.characterFrozen;delete enemy.characterFrozen}}
  if(selectedCharacter==='blaze'&&time<(s.blazeAwakenUntil||0)){player.damage=Math.max(player.damage,characterNow().damage*(1+operativeRank()*.1)*1.3)}if(selectedCharacter==='iron'&&time>=(s.ironFortressUntil||0)&&s.fortressAdded){player.maxHp-=60;player.hp=Math.min(player.hp,player.maxHp);s.fortressAdded=false}
  updateCharacterEffects(dt);updateSummons(dt);updateCharacterUI();
}
const coreCharacterUpdate=update;
update=function(dt){coreCharacterUpdate(dt);characterTick(dt)};
const coreCharacterEnd=end;
end=function(win){
  characterEffects.length=0;characterProjectiles.length=0;characterFloats.length=0;
  const operativeReward=win?registerMapClear():'';
  coreCharacterEnd(win);
  if(operativeReward&&win){const detail=$('#result-detail');if(detail)detail.textContent+=` · ◈ ${operativeReward}`}
};
const coreRiftReward=grantRiftReward;
grantRiftReward=function(){return Math.random()<.35?grantOperative('균열 보상'):coreRiftReward()};
const coreOperativeKillEnemy=killEnemy;
killEnemy=function(enemy){const valid=!!enemy&&enemies.includes(enemy)&&!enemy.boss;coreOperativeKillEnemy(enemy);if(valid&&run&&operativeKeysThisRun<2&&Math.random()<.004){operativeCrateKeys++;operativeKeysThisRun++;saveOperatives();renderOperativeKeyCount();charFloat('🔑 요원 열쇠',player.x,player.y-72,'#ffe46b');pop(`요원 열쇠 획득! 🔑 ${operativeCrateKeys}`)}};
function updateCharacterUI(){if(!player)return;const data=characterNow(),s=player.character;characterButtons.forEach(button=>{const slot=button.dataset.characterSkill,cd=slot==='q'?s.qCd:slot==='e'?s.eCd:0,ready=slot==='r'&&player.ultimate>=100;button.classList.toggle('ready',ready);button.classList.toggle('cooldown',cd>0);button.querySelector('small').textContent=slot==='r'?`${Math.floor(player.ultimate)}%`:cd>0?`${cd.toFixed(1)}초`:data[slot].name;button.querySelector('i').style.width=slot==='r'?`${player.ultimate}%`:`${Math.max(0,1-cd/data[slot].cd)*100}%`});
  if(characterPassive){let text='';if(selectedCharacter==='kairos')text=`전투 가속 ${s.stacks}/5`;if(selectedCharacter==='lumina')text=`생명 조각 ${s.fragments}/4`;if(selectedCharacter==='volt')text='과전류 · 3연타';if(selectedCharacter==='gravion')text=s.shield>0?`중력 장갑 ${Math.ceil(s.shield)}`:'중력 장갑 재생 중';if(selectedCharacter==='frost')text='서리 표식 · 스킬 적중';if(selectedCharacter==='nox')text='맹독 축적 · 적중 시 중첩';if(selectedCharacter==='mirage')text=`환영 ${characterSummons.filter(summon=>summon.type==='decoy'||summon.type==='legion').length} · 거울 ${s.mirageGuards||0}`;if(selectedCharacter==='blaze')text=`불씨 ${s.blazeEmbers}/3`;if(selectedCharacter==='iron')text=time<(s.ironGuardUntil||0)?`절대 방벽 · 반격 ${Math.floor(s.ironCounter)}`:'강철 장갑 · 피해 -12%';if(selectedCharacter==='arca')text=`정령 ${characterSummons.filter(summon=>summon.type==='spirit').map(summon=>({fire:'화염',ice:'빙결',lightning:'번개'}[summon.element])).join('·')||'대기'} · 다음 ${['화염','빙결','번개'][s.arcaNext%3]}`;characterPassive.textContent=`${data.name} · ${text}`;}
}
function drawCharacterEffects(now){
  const dt=Math.min(.05,(now-(drawCharacterEffects.last||now))/1000);drawCharacterEffects.last=now;if(run&&player){
    refreshAgentTexture();
    x.save();if(characterShake>0){characterShake=Math.max(0,characterShake-dt);x.translate((Math.random()-.5)*10*characterShake/.45,(Math.random()-.5)*10*characterShake/.45)}
    for(const fx of characterEffects){x.save();x.globalAlpha=Math.min(1,fx.l/(fx.max||fx.l));x.strokeStyle=fx.color;x.fillStyle=fx.color+'33';x.shadowBlur=16;x.shadowColor=fx.color;if(['ring','heal','sanctuary','storm','gravity','singularity','blizzard','iceNova','poisonMist','toxicStorm','blazeFire','mirrorMaze','ironGuard','fortress','resonance','kingCircle','legionRing','flameAwaken'].includes(fx.type)){x.lineWidth=fx.type==='sanctuary'?5:3;x.beginPath();x.arc(fx.x,fx.y,fx.r*(fx.type==='ring'?1-fx.l/(fx.max||1)*.15:1),0,Math.PI*2);x.fill();x.stroke()}if(fx.type==='line'||fx.type==='boltLine'){x.lineWidth=fx.type==='boltLine'?5:7;x.beginPath();x.moveTo(fx.x,fx.y);x.lineTo(fx.x2,fx.y2);x.stroke()}if(fx.type==='flash'){x.beginPath();x.arc(fx.x,fx.y,fx.r*(1-fx.l/fx.max),0,Math.PI*2);x.stroke()}x.restore()}
    for(const p of characterProjectiles){x.save();x.translate(p.x,p.y);x.fillStyle=p.color;x.shadowBlur=14;x.shadowColor=p.color;x.beginPath();if(p.kind==='frost'){x.moveTo(18,0);x.lineTo(-14,-9);x.lineTo(-8,0);x.lineTo(-14,9)}else x.arc(0,0,p.r,0,Math.PI*2);x.fill();x.restore()}for(const summon of characterSummons){x.save();x.globalAlpha=summon.type==='decoy'||summon.type==='legion'?.55:1;x.translate(summon.x,summon.y);x.fillStyle=summon.color;x.shadowBlur=16;x.shadowColor=summon.color;x.beginPath();x.arc(0,0,summon.type==='king'?38:summon.type==='spirit'?16:22,0,Math.PI*2);x.fill();x.fillStyle='#fff';x.fillRect(2,-4,6,6);x.restore()}
    const data=characterNow();x.save();x.translate(player.x,player.y-player.r-31);x.fillStyle=data.accent;x.shadowBlur=8;x.shadowColor=data.color;x.beginPath();x.arc(0,0,5,0,Math.PI*2);x.fill();x.restore();
    for(const f of characterFloats){x.globalAlpha=Math.max(0,f.l*1.3);x.fillStyle=f.color;x.font='bold 15px sans-serif';x.textAlign='center';x.fillText(f.text,f.x,f.y);f.y-=18*dt;f.l-=dt}characterFloats=characterFloats.filter(f=>f.l>0);x.restore();
  }requestAnimationFrame(drawCharacterEffects);
}
const operativeTierValue={common:1,rare:2,hero:3,legend:4};
function operativePower(id,data){return operativeTierValue[data.tier]*10000+operativeRank(id)*1000+data.hp*10+data.damage*45+data.speed*.1}
function orderedOperatives(){const entries=Object.entries(CHARACTER_DATA).filter(([id])=>id!=='recruit');const byTier=(a,b)=>operativeTierValue[a[1].tier]-operativeTierValue[b[1].tier],byTime=(a,b)=>(operativeAcquiredOrder[a[0]]||0)-(operativeAcquiredOrder[b[0]]||0),byPower=(a,b)=>operativePower(a[0],a[1])-operativePower(b[0],b[1]);return entries.sort((a,b)=>{if(operativeSort==='tier-desc')return byTier(b,a)||byPower(b,a);if(operativeSort==='tier-asc')return byTier(a,b)||byPower(a,b);if(operativeSort==='recent')return byTime(b,a);if(operativeSort==='oldest')return byTime(a,b);if(operativeSort==='power-desc')return byPower(b,a);return byPower(a,b)})}
function renderCharacterList(){
  const list=$('#character-list');if(!list)return;
  const sortSelect=$('#operative-sort');if(sortSelect)sortSelect.value=operativeSort;
  list.innerHTML=orderedOperatives().map(([id,data])=>{
    const copies=operativeRoster[id]||0,rank=operativeRank(id),owned=operativeIsOwned(id),canUpgrade=owned&&copies>=3&&rank<5,icon=id==='kairos'?'⚔':id==='lumina'?'✦':id==='volt'?'ϟ':id==='gravion'?'◉':'❄';
    return `<article class="character-card ${id===selectedCharacter?'selected':''} ${owned?'':'locked'} ${data.tier}" style="--char:${data.color}"><span>${owned?icon:'<i class="game-icon icon-lock" aria-label="잠김"></i>'}</span><b>${data.name}</b><small>${OPERATIVE_TIERS[data.tier]} · ${data.role}</small><em>HP ${data.hp} · 공격 ${data.damage}<br>강화 ${rank}/5 · 중복 ${copies}명</em><i class="character-skills">Q ${data.q.name}<br>E ${data.e.name}<br>R ${data.r.name}</i><button data-character="${id}" ${owned?'':'disabled'}>${owned?'선택':'미획득'}</button><button data-operative-upgrade="${id}" ${canUpgrade?'':'disabled'}>${canUpgrade?'동일 요원 3명으로 강화':rank>=5?'최대 강화':'강화에 중복 요원 3명 필요'}</button></article>`;
  }).join('');
  list.querySelectorAll('[data-character]').forEach(button=>button.onclick=()=>{const id=button.dataset.character;if(!operativeIsOwned(id))return;selectedCharacter=id;agentSpriteId='';refreshAgentTexture();saveOperatives();renderCharacterList();pop(`${characterNow().name} 선택 완료`)});
  list.querySelectorAll('[data-operative-upgrade]').forEach(button=>button.onclick=()=>{const id=button.dataset.operativeUpgrade;if(!upgradeOperative(id))return;renderCharacterList();pop(`${CHARACTER_DATA[id].name} 강화 ${operativeRank(id)}단계! HP·공격 +10%, 스킬 피해 +12%, 쿨타임 -5%`)});
}
$('#operative-sort')?.addEventListener('change',event=>{operativeSort=event.target.value;saveOperatives();renderCharacterList()});
$('#operative-button')?.addEventListener('click',()=>{$('#equipment').classList.add('hidden');$('#characters').classList.remove('hidden');renderCharacterList()});
$('#buy-operative')?.addEventListener('click',openOperativeCrate);
$('#crate-button')?.addEventListener('click',renderOperativeKeyCount);
const closeCharacters=document.querySelector('[data-close="characters"]');
if(closeCharacters)closeCharacters.onclick=event=>{event.preventDefault();$('#characters').classList.add('hidden');$('#equipment').classList.remove('hidden');drawGear()};
characterButtons.forEach(button=>button.addEventListener('pointerdown',event=>{event.preventDefault();useCharacterSkill(button.dataset.characterSkill)}));
addEventListener('keydown',event=>{if(event.repeat||!run||paused||typingTarget?.(event.target))return;const slot={KeyQ:'q',KeyE:'e',KeyR:'r'}[event.code];if(slot){event.preventDefault();useCharacterSkill(slot)}});
renderOperativeKeyCount();renderCharacterList();requestAnimationFrame(drawCharacterEffects);

/* 초월 요원 확장: 공통 데이터와 F 초월기 상태를 별도 설정으로 관리한다. */
const TRANSCENDENT_CHARACTER_CONFIG={
  astra:{name:'아스트라',role:'성운 제어자',color:'#8ca8ff',accent:'#fff0b3',hp:106,damage:12,speed:260,charge:5.3,transCharge:1.82,q:{name:'별빛 견인',cd:6},e:{name:'성운 파수꾼',cd:8},r:{name:'혜성 난사'},f:{name:'성운의 왕관'}},
  solaris:{name:'솔라리스',role:'태양 수호자',color:'#ff9b4d',accent:'#fff4bc',hp:126,damage:14,speed:260,charge:5.6,transCharge:2,q:{name:'태양 파편',cd:5},e:{name:'일광 장벽',cd:10},r:{name:'항성 폭발'},f:{name:'찬란한 일식'}},
  inkra:{name:'잉크라',role:'그림자 교란자',color:'#7b65dc',accent:'#f3d2ff',hp:100,damage:10,speed:286,charge:4.6,transCharge:1.62,q:{name:'먹물 가르기',cd:6},e:{name:'그림자 분신',cd:9},r:{name:'심연의 폭우'},f:{name:'검은 서고'}},
  chronos:{name:'크로노스',role:'시간 사수',color:'#7de4e8',accent:'#e5fdff',hp:92,damage:13,speed:295,charge:5.9,transCharge:2.09,q:{name:'시간 침',cd:5},e:{name:'되감기 표식',cd:12},r:{name:'순간 난사'},f:{name:'정지된 한 시간'}},
  rezona:{name:'레조나',role:'공명 격투가',color:'#e579ff',accent:'#ffe7ff',hp:116,damage:12,speed:260,charge:5,transCharge:1.73,q:{name:'진동권',cd:5},e:{name:'반향 장막',cd:10},r:{name:'칠중 파동'},f:{name:'무음 세계'}}
};
Object.entries(TRANSCENDENT_CHARACTER_CONFIG).forEach(([id,data])=>{CHARACTER_DATA[id]={...data,tier:'transcendence',passive:'초월기 충전 중'}});
OPERATIVE_TIERS.transcendence='초월';
const transcendButton=document.createElement('button');transcendButton.dataset.characterSkill='f';transcendButton.className='transcendence hidden';transcendButton.innerHTML='<b>F</b><small>초월기</small><i></i>';
$('#skill-controls')?.append(transcendButton);
transcendButton.addEventListener('pointerdown',event=>{event.preventDefault();useCharacterSkill('f')});
function isTranscendent(){return characterNow()?.tier==='transcendence'}
function transArea(px,py,r,damage,color,source,max=2,knock=0){areaDamage(px,py,r,damage,color,source,max,knock)}
function nearestEnemies(count=1,px=player.x,py=player.y){return [...enemies].sort((a,b)=>Math.hypot(a.x-px,a.y-py)-Math.hypot(b.x-px,b.y-py)).slice(0,count)}
function applyResonance(enemy,amount=1){if(!enemy)return;const s=enemy.resonance||(enemy.resonance={n:0,until:0,ready:0});s.n=time<s.until?Math.min(4,s.n+amount):Math.min(4,amount);s.until=time+5;if(s.n>=4&&time>=s.ready){s.n=0;s.ready=time+2.5;const bonus=player.character?.rezonaSilenceUntil>time?28:18;withCharacterSource('rezona-passive',1,()=>{hurt(enemy,bonus);for(const targetEnemy of enemies)if(targetEnemy!==enemy&&Math.hypot(targetEnemy.x-enemy.x,targetEnemy.y-enemy.y)<82)hurt(targetEnemy,bonus*.5)});charBurst(enemy.x,enemy.y,'#ec8aff',10)}}
const coreTransHurt=hurt;
hurt=function(enemy,damage){
  if(player?.character?.chronoFrozenUntil>time&&enemy&&enemies.includes(enemy)){const cap=120,stored=Math.min(Math.max(0,damage),cap-(enemy.chronoStored||0));enemy.chronoStored=(enemy.chronoStored||0)+stored;charFloat(`저장 ${Math.ceil(stored)}`,enemy.x,enemy.y-28,'#b9fbff');return}
  const before=enemy?.hp;coreTransHurt(enemy,damage);
  if(isTranscendent()&&player?.character&&!player.character.isTranscending&&before>(enemy?.hp??0)&&characterSource){const s=player.character,key=`${characterSource.key}:${enemy.id}`;s.transHits=s.transHits||{};const hit=s.transHits[key]||0;if(hit<3){s.transHits[key]=hit+1;player.transcendence=Math.min(100,(player.transcendence||0)+characterNow().transCharge)}}
};
const coreTransPassive=characterHitPassive;
characterHitPassive=function(enemy){coreTransPassive(enemy);if(!player?.character)return;const s=player.character;if(selectedCharacter==='astra'){s.astraHits=(s.astraHits||0)+1;if(s.astraHits>=4){s.astraHits=0;transArea(enemy.x,enemy.y,72,13,'#aebdff','astra-passive',1,28)}}if(selectedCharacter==='solaris'&&time<(s.solarisDawnUntil||0))healLumina(0,'none',0);if(selectedCharacter==='inkra'&&time<(s.inkraVeilUntil||0))enemy.slowUntil=time+1;if(selectedCharacter==='rezona')applyResonance(enemy,time<(s.rezonaSilenceUntil||0)?2:1)};
const coreTransMakePlayer=makePlayer;
makePlayer=function(){coreTransMakePlayer();if(player&&isTranscendent()){player.transcendence=0;Object.assign(player.character,{transHits:{},isTranscending:false,astraR:0,solarisAwakened:false,inkraR:0,chronoR:0,chronoFrozenUntil:0,rezonaR:0,rezonaSilenceUntil:0});}else if(player)player.transcendence=0};
function castTransUltimate(){
  const s=player.character,id=selectedCharacter;s.isTranscending=true;player.transcendence=0;
  if(id==='astra'){s.transEnd=time+6;characterEffects.push({type:'ring',x:player.x,y:player.y,r:240,l:6,max:6,color:'#fff1b6'});}
  if(id==='solaris'){s.transEnd=time+7;s.solarisDawnUntil=time+7;characterEffects.push({type:'ring',x:player.x,y:player.y,r:210,l:7,max:7,color:'#ffe07a'});}
  if(id==='inkra'){s.transEnd=time+7;s.inkraVeilUntil=time+7;characterSummons.push({type:'ink-shade',x:player.x,y:player.y,l:7,cd:.25,color:'#b88aff'});characterEffects.push({type:'ring',x:player.x,y:player.y,r:205,l:7,max:7,color:'#8f68ec'});}
  if(id==='chronos'){s.transEnd=time+5;s.chronoFrozenUntil=time+5;characterEffects.push({type:'ring',x:player.x,y:player.y,r:310,l:5,max:5,color:'#a5f7ff'});}
  if(id==='rezona'){s.transEnd=time+7;s.rezonaSilenceUntil=time+7;characterEffects.push({type:'ring',x:player.x,y:player.y,r:230,l:7,max:7,color:'#e779ff'});}
  pop(`${characterNow().f.name} 발동!`);
}
function useTranscendentSkill(slot){
  const s=player.character,data=characterNow(),a=characterAim(),px=limit(player.x+Math.cos(a)*150,40,W-40),py=limit(player.y+Math.sin(a)*150,40,H-40);
  if(slot==='f'){if(player.transcendence<100){pop(`초월기 충전 ${Math.floor(player.transcendence||0)}%`);return}castTransUltimate();return}
  if(s.isTranscending){pop('초월기 사용 중');return}
  if(slot==='r'){if(player.ultimate<100){pop(`궁극기 충전 ${Math.floor(player.ultimate)}%`);return}player.ultimate=0;if(selectedCharacter==='astra')s.astraR=time+3;if(selectedCharacter==='solaris')transArea(player.x,player.y,220,54,'#ffcd61','solaris-r',2,70);if(selectedCharacter==='inkra')s.inkraR=time+5;if(selectedCharacter==='chronos')s.chronoR=time+2;if(selectedCharacter==='rezona')s.rezonaR=time+1.2;characterEffects.push({type:'ring',x:player.x,y:player.y,r:175,l:.7,max:.7,color:data.color});pop(`${data.r.name} 발동!`);return}
  const key=slot==='q'?'qCd':'eCd';if(s[key]>0)return;s[key]=data[slot].cd*s.cooldownMultiplier;
  if(selectedCharacter==='astra'){if(slot==='q'){transArea(px,py,100,26,'#b7c4ff','astra-q',2,0);for(const e of enemies)if(Math.hypot(e.x-px,e.y-py)<150){const u=unit(px-e.x,py-e.y);e.x+=u.x*55;e.y+=u.y*55}}else characterSummons.push({type:'astra-orb',x:player.x,y:player.y,l:7,cd:.4,color:'#c0c7ff'});}
  if(selectedCharacter==='solaris'){if(slot==='q'){for(const offset of [-.28,0,.28]){const q=a+offset;characterProjectiles.push({kind:'solar',x:player.x,y:player.y,vx:Math.cos(q)*560,vy:Math.sin(q)*560,damage:20,color:'#ffcc6a',l:1,r:15,hit:{}})}}else{s.solarisGuardUntil=time+3;characterEffects.push({type:'ring',x:player.x,y:player.y,r:94,l:3,max:3,color:'#ffe47b'});}}
  if(selectedCharacter==='inkra'){if(slot==='q'){transArea(px,py,105,25,'#a784ff','inkra-q',2,20);characterEffects.push({type:'ring',x:px,y:py,r:125,l:3,max:3,color:'#8a65d8'});s.inkraVeilUntil=time+2.5}else characterSummons.push({type:'ink-shade',x:player.x,y:player.y,l:5,cd:.35,color:'#b88aff'});}
  if(selectedCharacter==='chronos'){if(slot==='q'){const enemy=target();if(enemy){withCharacterSource('chronos-q',1,()=>hurt(enemy,25));enemy.slowUntil=time+2;characterEffects.push({type:'boltLine',x:player.x,y:player.y,x2:enemy.x,y2:enemy.y,l:.25,max:.25,color:'#aefaff'})}}else{s.chronoAnchor={x:player.x,y:player.y,hp:player.hp,until:time+3,used:false};characterEffects.push({type:'ring',x:player.x,y:player.y,r:46,l:3,max:3,color:'#aefaff'});}}
  if(selectedCharacter==='rezona'){if(slot==='q'){transArea(px,py,106,28,'#ee8aff','rezona-q',2,22);for(const enemy of enemies)if(Math.hypot(enemy.x-px,enemy.y-py)<120)applyResonance(enemy,2)}else{s.rezonaBarrierUntil=time+3;characterEffects.push({type:'ring',x:player.x,y:player.y,r:90,l:3,max:3,color:'#f19aff'});}}
  pop(`${data[slot].name} 사용`);
}
const coreTransUseCharacterSkill=useCharacterSkill;
useCharacterSkill=function(slot){if(isTranscendent())return useTranscendentSkill(slot);return coreTransUseCharacterSkill(slot)};
const coreTransCharacterTick=characterTick;
characterTick=function(dt){
  if(player?.character&&isTranscendent()){
    const s=player.character;
    if(s.isTranscending&&selectedCharacter==='astra'&&time>=(s.astraFNext||0)){s.astraFNext=time+.8;transArea(player.x,player.y,240,18,'#fff0b6','astra-f',2,16)}
    if(s.isTranscending&&selectedCharacter==='solaris'&&time>=(s.solarisFNext||0)){s.solarisFNext=time+.7;for(const enemy of nearestEnemies(3))withCharacterSource('solaris-f',2,()=>hurt(enemy,19));healLumina(4*dt,'solaris-dawn',0)}
    if(s.isTranscending&&selectedCharacter==='inkra'&&time>=(s.inkraFNext||0)){s.inkraFNext=time+.6;for(const enemy of nearestEnemies(3))withCharacterSource('inkra-f',2,()=>hurt(enemy,15));}
    if(s.astraR>time&&time>=(s.astraRNext||0)){s.astraRNext=time+.32;for(const enemy of nearestEnemies(3))withCharacterSource('astra-r',3,()=>hurt(enemy,17));}
    if(s.inkraR>time&&time>=(s.inkraRNext||0)){s.inkraRNext=time+.65;for(const enemy of nearestEnemies(4))withCharacterSource('inkra-r',3,()=>hurt(enemy,13));}
    if(s.chronoR>time&&time>=(s.chronoRNext||0)){s.chronoRNext=time+.22;for(const enemy of nearestEnemies(1))withCharacterSource('chronos-r',3,()=>hurt(enemy,11));}
    if(s.rezonaR>time&&time>=(s.rezonaRNext||0)){s.rezonaRNext=time+.16;const damage=s.rezonaR>time+.2?10:24;transArea(player.x+Math.cos(characterAim())*112,player.y+Math.sin(characterAim())*112,130,damage,'#ef93ff','rezona-r',3,15);}
    if(s.isTranscending&&time>=s.transEnd){if(selectedCharacter==='chronos'){for(const enemy of enemies)if(enemy.chronoStored){const stored=enemy.chronoStored;delete enemy.chronoStored;coreTransHurt(enemy,stored*1.2);charBurst(enemy.x,enemy.y,'#c6fbff',12)}}if(selectedCharacter==='rezona'){for(const enemy of enemies){const n=enemy.resonance?.n||0;if(n){withCharacterSource('rezona-f-end',0,()=>hurt(enemy,Math.min(32,n*8)));enemy.resonance.n=0}}}s.isTranscending=false;s.chronoFrozenUntil=0;pop('초월기 종료');}
    if(s.chronoAnchor&&time>=s.chronoAnchor.until)delete s.chronoAnchor;
  }
  const beforeHp=player?.hp||0;coreTransCharacterTick(dt);
  if(!player?.character||!isTranscendent())return;const s=player.character,received=Math.max(0,beforeHp-player.hp);
  if(received>0){if(selectedCharacter==='solaris'&&time<(s.solarisGuardUntil||0))player.hp=Math.min(player.maxHp,player.hp+received*.25);if(selectedCharacter==='solaris'&&!s.solarisAwakened&&player.hp<player.maxHp*.15){s.solarisAwakened=true;player.hp=Math.max(player.hp,player.maxHp*.32);s.solarisDawnUntil=time+5;charFloat('여명 각성',player.x,player.y-55,'#fff1a1')}if(selectedCharacter==='chronos'&&s.chronoAnchor&&!s.chronoAnchor.used&&player.hp<player.maxHp*.35){s.chronoAnchor.used=true;player.x=s.chronoAnchor.x;player.y=s.chronoAnchor.y;player.hp=Math.max(player.hp,s.chronoAnchor.hp);charFloat('시간 되감기',player.x,player.y-55,'#c7fbff')}if(selectedCharacter==='rezona'&&time<(s.rezonaBarrierUntil||0)){for(const enemy of enemies)if(Math.hypot(enemy.x-player.x,enemy.y-player.y)<105)applyResonance(enemy,1)}}
  for(const enemy of enemies){if(s.chronoFrozenUntil>time&&Math.hypot(enemy.x-player.x,enemy.y-player.y)<310){if(enemy.boss){enemy.slowUntil=Math.max(enemy.slowUntil||0,time+.12)}else{enemy.chronoStopped=true;enemy.chronoBaseSpeed=enemy.chronoBaseSpeed||enemy.speed;enemy.speed=0}}else if(enemy.chronoStopped){enemy.speed=enemy.chronoBaseSpeed;delete enemy.chronoStopped;delete enemy.chronoBaseSpeed}}
};
const coreTransUpdateSummons=updateSummons;
updateSummons=function(dt){
  coreTransUpdateSummons(dt);
  for(const summon of [...characterSummons]){
    if(!['astra-orb','ink-shade'].includes(summon.type))continue;
    const enemy=target();if(!enemy||summon.cd>0)continue;summon.cd=summon.type==='astra-orb'?.65:.5;
    withCharacterSource(summon.type,2,()=>hurt(enemy,summon.type==='astra-orb'?12:10));
    if(summon.type==='ink-shade')applyNoxPoison(enemy,1);
    characterEffects.push({type:'ring',x:enemy.x,y:enemy.y,r:summon.type==='astra-orb'?48:38,l:.18,max:.18,color:summon.color});
  }
};
const coreTransUpdateUI=updateCharacterUI;
updateCharacterUI=function(){coreTransUpdateUI();if(!player)return;const data=characterNow(),s=player.character;transcendButton.classList.toggle('hidden',!isTranscendent());if(isTranscendent()){const gauge=Math.floor(player.transcendence||0),ready=gauge>=100;transcendButton.classList.toggle('ready',ready);transcendButton.classList.toggle('cooldown',!ready);transcendButton.querySelector('small').textContent=s.isTranscending?'사용 중':`${gauge}%`;transcendButton.querySelector('i').style.width=`${gauge}%`;if(characterPassive){const extra=selectedCharacter==='astra'?`성운 ${s.astraHits||0}/4`:selectedCharacter==='solaris'?(s.solarisAwakened?'여명 각성':'태양 장갑'):selectedCharacter==='inkra'?`그림자 ${characterSummons.filter(v=>v.type==='ink-shade').length}`:selectedCharacter==='chronos'?'시간 침 · 표식':`공명 · ${[...enemies].filter(v=>v.resonance?.n).length}명`;characterPassive.textContent=`${data.name} · ${extra} · F ${gauge}%`;}}};
const coreTransRenderCharacterList=renderCharacterList;
renderCharacterList=function(){coreTransRenderCharacterList();const list=$('#character-list');if(!list)return;list.querySelectorAll('.character-card.transcendence').forEach(card=>{const details=card.querySelector('.character-skills');if(details)details.innerHTML+=`<br>F ${CHARACTER_DATA[card.querySelector('[data-character]')?.dataset.character||Object.keys(CHARACTER_DATA).find(id=>CHARACTER_DATA[id].name===card.querySelector('b')?.textContent)]?.f?.name||'초월기'}`});};
const originalGrantOperative=grantOperative;
grantOperative=function(source){const roll=Math.random()*100;let id=roll<23.76?'kairos':roll<46.53?'lumina':roll<68.31?'nox':roll<75.24?'frost':roll<80.19?'mirage':roll<84.15?'blaze':roll<87.12?'volt':roll<93.06?'iron':roll<97.02?'arca':roll<99?'gravion':roll<99.2?'astra':roll<99.4?'solaris':roll<99.6?'inkra':roll<99.8?'chronos':'rezona';operativeOwned[id]=true;operativeRoster[id]=(operativeRoster[id]||0)+1;operativeAcquiredOrder[id]=Date.now();saveOperatives();return `${source}: ${OPERATIVE_TIERS[CHARACTER_DATA[id].tier]} 요원 ${CHARACTER_DATA[id].name} 획득!`};
operativeTierValue.transcendence=5;
const operativeProbability=$('.operative-probability');if(operativeProbability)operativeProbability.innerHTML='<b>요원 등급 확률</b><span class="common">일반 23.8%</span><span class="rare">희귀 44.6%</span><span class="hero">영웅 18.8%</span><span class="legend">전설 11.8%</span><span class="transcendence">초월 1%</span>';
addEventListener('keydown',event=>{if(event.repeat||!run||paused||event.code!=='KeyF'||typingTarget?.(event.target))return;event.preventDefault();useCharacterSkill('f')});
renderCharacterList();
// 장비 화면 중앙에는 현재 선택한 요원을 표시하고, 매 전투 시작 때 열쇠 드롭 제한을 초기화한다.
setTimeout(()=>{const drawGearWithOperative=drawGear;drawGear=function(){drawGearWithOperative();const card=$('#equipment .player-card'),data=characterNow();if(card)card.innerHTML=`<span class="agent-preview" style="--agent:${data.color};--agent-accent:${data.accent}">◉</span><b>${data.name}</b><small>${OPERATIVE_TIERS[data.tier]||'기본'} 요원</small>`};drawGear()},0);
const beginWithOperativeKeyLimit=begin;begin=function(){operativeKeysThisRun=0;return beginWithOperativeKeyLimit()};

/* 7일 애니메이션풍 이벤트: 기존 요원 위에 기간 한정 획득과 독립 전투 객체를 추가한다. */
const ANIMATION_STYLE_EVENT={id:'transcendent_anime_week_02',name:'초월자 격돌 컬렉션',durationDays:7,rarity:'초월',eventExclusive:false,characterIds:['raon','orbis','ner','velkar','morga']};
const EVENT_SCHEDULE={startAt:null,endAt:null};
const ANIME_EVENT_CHARACTER_CONFIG={
  raon:{name:'라온',role:'근접 연격가',color:'#ff668e',accent:'#ffe5ed',hp:132,damage:14,speed:291,charge:5.9,transCharge:1.93,passive:'이중 충격',q:{name:'연환권',cd:5},e:{name:'역충격 자세',cd:9},r:{name:'심장 가속'},f:{name:'무간 연격'},description:'연속 타격으로 충격 표식을 쌓고 뒤늦은 추가타를 일으킨다.'},
  orbis:{name:'오르비스',role:'공간 제어자',color:'#65d7ff',accent:'#e0faff',hp:104,damage:12,speed:260,charge:4.8,transCharge:1.67,passive:'좌표 표식',q:{name:'좌표 접기',cd:6},e:{name:'궤도 반사판',cd:10},r:{name:'격자 붕괴'},f:{name:'무좌표실'},description:'좌표를 겹쳐 적을 끌어당기고 투사체를 되돌린다.'},
  ner:{name:'네르',role:'성수 소환사',color:'#91b9ff',accent:'#f2f7ff',hp:102,damage:10,speed:260,charge:4.35,transCharge:1.57,passive:'지휘 표식',q:{name:'각수 돌진',cd:6},e:{name:'유영수',cd:10},r:{name:'쌍성 지휘'},f:{name:'성좌 백수진'},description:'표식이 새겨진 적을 성수들이 우선 공격한다.'},
  velkar:{name:'벨카르',role:'고대 군주',color:'#f6b84f',accent:'#fff1b4',hp:138,damage:15,speed:260,charge:5.6,transCharge:1.82,passive:'왕의 위압',q:{name:'왕압선',cd:5},e:{name:'왕관 추락',cd:9},r:{name:'재앙 칙령'},f:{name:'붕괴 왕좌'},description:'공격할수록 위압이 쌓이며 최대 중첩의 다음 스킬이 폭발한다.'},
  morga:{name:'모르가',role:'표본 수집가',color:'#89dc67',accent:'#edffd8',hp:108,damage:11,speed:260,charge:4.55,transCharge:1.54,passive:'생체 기록',q:{name:'표본 방출',cd:7},e:{name:'강제 변이',cd:11},r:{name:'표본 행진'},f:{name:'대기록 융합체'},description:'전투 기록으로 다양한 표본수를 불러내고 융합한다.'}
};
Object.entries(ANIME_EVENT_CHARACTER_CONFIG).forEach(([id,data])=>{CHARACTER_DATA[id]={...data,tier:'transcendence',eventId:ANIMATION_STYLE_EVENT.id}});
window.ANIMATION_STYLE_EVENT=ANIMATION_STYLE_EVENT;window.EVENT_SCHEDULE=EVENT_SCHEDULE;
const storedAnimeSelection=localStorage.neonSelectedCharacter;if(ANIME_EVENT_CHARACTER_CONFIG[storedAnimeSelection]&&operativeIsOwned(storedAnimeSelection))selectedCharacter=storedAnimeSelection;
const animeEventStartKey='neonAnimeEventStartAt';
function animeEventWindow(){let start=EVENT_SCHEDULE.startAt?Date.parse(EVENT_SCHEDULE.startAt):Number(localStorage[animeEventStartKey]||0);if(!start){start=Date.now();localStorage[animeEventStartKey]=String(start)}const end=EVENT_SCHEDULE.endAt?Date.parse(EVENT_SCHEDULE.endAt):start+ANIMATION_STYLE_EVENT.durationDays*86400000;return{start,end}}
function animeEventActive(now=Date.now()){const window=animeEventWindow();return now>=window.start&&now<window.end}
function animeEventRemaining(){return Math.max(0,animeEventWindow().end-Date.now())}
function animeEventTimeText(){const left=animeEventRemaining();if(!left)return'이벤트 종료';const days=Math.floor(left/86400000),hours=Math.floor(left%86400000/3600000),minutes=Math.floor(left%3600000/60000),seconds=Math.floor(left%60000/1000);return`${days}일 ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`}
function isAnimeEventCharacter(id=selectedCharacter){return ANIMATION_STYLE_EVENT.characterIds.includes(id)}
function awardOperative(id,source){operativeOwned[id]=true;operativeRoster[id]=(operativeRoster[id]||0)+1;operativeAcquiredOrder[id]=Date.now();saveOperatives();return`${source}: ${OPERATIVE_TIERS[CHARACTER_DATA[id].tier]} 요원 ${CHARACTER_DATA[id].name} 획득!`}
grantOperative=function(source){
  const roll=Math.random()*100;let id;
  if(roll<99)id=roll<23.76?'kairos':roll<46.53?'lumina':roll<68.31?'nox':roll<75.24?'frost':roll<80.19?'mirage':roll<84.15?'blaze':roll<87.12?'volt':roll<93.06?'iron':roll<97.02?'arca':'gravion';
  else{const permanent=['astra','solaris','inkra','chronos','rezona'],eventIds=ANIMATION_STYLE_EVENT.characterIds;if(animeEventActive()){const pool=roll<99.5?permanent:eventIds,idRoll=roll<99.5?(roll-99)/.1:(roll-99.5)/.1;id=pool[Math.min(4,Math.floor(idRoll))]}else id=permanent[Math.min(4,Math.floor((roll-99)/.2))]}
  return awardOperative(id,source);
};

function eventTarget(){return nearestEnemies(1)[0]||null}
function eventDamage(enemy,damage,source,max=1){if(!enemy||!enemies.includes(enemy))return;withCharacterSource(source,max,()=>hurt(enemy,damage))}
function eventSchedule(entry){player.character.eventQueue.push(entry)}
function eventArea(px,py,r,damage,color,source,max=2,knock=0){transArea(px,py,r,damage,color,source,max,knock)}
function addCoordinateMark(enemy,amount=1){if(!enemy)return;enemy.orbisMarks=Math.min(3,(enemy.orbisMarks||0)+amount);enemy.orbisMarkUntil=time+6}
function consumeVelkarPressure(s,px,py){if((s.velkarPressure||0)<5)return 1;s.velkarPressure=0;eventArea(px,py,92,18,'#ffd36a','velkar-pressure',0,24);return 1.1}
function spawnEventSummon(type,lifetime,damage,interval,color,extra={}){characterSummons.push({type,ownerId:selectedCharacter,x:player.x,y:player.y,l:lifetime,cd:.12,damage,interval,color,...extra})}

const coreAnimeMakePlayer=makePlayer;
makePlayer=function(){coreAnimeMakePlayer();if(player&&isAnimeEventCharacter()){Object.assign(player.character,{eventQueue:[],raonMarks:new Map(),raonCounterUntil:0,raonBoostUntil:0,orbisReflectUntil:0,orbisFieldUntil:0,nerFStep:0,velkarPressure:0,velkarThroneUntil:0,morgaHits:{},morgaRecords:0,morgaCycle:0,eventBoost:null,eventFResolved:false});player.transcendence=0}};
const coreAnimePassive=characterHitPassive;
characterHitPassive=function(enemy){
  coreAnimePassive(enemy);if(!player?.character||!isAnimeEventCharacter()||!enemy)return;const s=player.character;
  if(selectedCharacter==='raon'){const marks=Math.min(3,(s.raonMarks.get(enemy.id)||0)+1);s.raonMarks.set(enemy.id,marks);eventSchedule({at:time+.18,type:'hit',enemy,damage:marks*2,source:'raon-double'});if(s.raonBoostUntil>time&&++s.raonBoostHits%3===0)eventSchedule({at:time+.06,type:'hit',enemy,damage:10,source:'raon-r-shock'})}
  if(selectedCharacter==='orbis'&&enemy.orbisMarks){const marks=enemy.orbisMarks;enemy.orbisMarks=0;eventDamage(enemy,marks*5+(marks===3&&enemy.boss?8:0),'orbis-coordinate',0);if(marks===3&&!enemy.boss){const angle=Math.random()*Math.PI*2;enemy.x=limit(enemy.x+Math.cos(angle)*42,20,W-20);enemy.y=limit(enemy.y+Math.sin(angle)*42,20,H-20);charBurst(enemy.x,enemy.y,'#7de8ff',8)}}
  if(selectedCharacter==='ner'){enemy.nerCommandUntil=time+5}
  if(selectedCharacter==='velkar')s.velkarPressure=Math.min(5,(s.velkarPressure||0)+1)
  if(selectedCharacter==='morga'){const needed=enemy.boss?8:5;s.morgaHits[enemy.id]=(s.morgaHits[enemy.id]||0)+1;if(s.morgaHits[enemy.id]>=needed){s.morgaHits[enemy.id]=0;s.morgaRecords=Math.min(3,(s.morgaRecords||0)+1);charFloat(`기록 ${s.morgaRecords}/3`,enemy.x,enemy.y-32,'#a8ff8e')}}
};

function castAnimeEventF(){
  const s=player.character,id=selectedCharacter;s.isTranscending=true;s.eventFResolved=false;player.transcendence=0;
  if(id==='raon'){s.transEnd=time+3;s.eventFNext=time;s.eventFHits=0}
  if(id==='orbis'){s.transEnd=time+8;s.orbisFieldUntil=s.transEnd;s.eventFNext=time;player.speed*=1.15;s.eventBoost={speed:1.15}}
  if(id==='ner'){s.transEnd=time+10;s.nerFStep=0;s.eventFNext=time}
  if(id==='velkar'){s.transEnd=time+9;s.velkarThroneUntil=s.transEnd;s.eventFNext=time;player.damage*=1.3;s.eventBoost={damage:1.3}}
  if(id==='morga'){s.transEnd=time+12;characterSummons=characterSummons.filter(v=>v.ownerId!=='morga');spawnEventSummon('morga-fusion',12,24,1.4,'#a4ff7e',{fusion:true});s.eventFusionEnd=true}
  characterEffects.push({type:'ring',x:player.x,y:player.y,r:230,l:s.transEnd-time,max:s.transEnd-time,color:characterNow().color});pop(`${characterNow().f.name} 발동!`);
}
function useAnimeEventSkill(slot){
  if(!run||paused||!player)return;const s=player.character,data=characterNow(),enemy=eventTarget(),a=characterAim(),px=limit(player.x+Math.cos(a)*145,35,W-35),py=limit(player.y+Math.sin(a)*145,35,H-35);
  if(slot==='f'){if(player.transcendence<100){pop(`초월기 충전 ${Math.floor(player.transcendence||0)}%`);return}castAnimeEventF();return}
  if(s.isTranscending&&(selectedCharacter!=='velkar'||slot==='r')){pop('초월기 사용 중');return}
  if(slot==='r'){
    if(player.ultimate<100){pop(`궁극기 충전 ${Math.floor(player.ultimate)}%`);return}player.ultimate=0;
    if(selectedCharacter==='raon'){s.raonBoostUntil=time+9;player.speed*=1.18;player.fireRate*=1.25;player.damage*=1.2;s.eventBoost={speed:1.18,fireRate:1.25,damage:1.2};s.raonBoostHits=0}
    if(selectedCharacter==='orbis'){for(const [delay,damage,radius] of [[0,24,80],[.45,24,115],[.9,36,155]])eventSchedule({at:time+delay,type:'area',x:px,y:py,r:radius,damage,color:data.color,source:'orbis-r'})}
    if(selectedCharacter==='ner'){spawnEventSummon('ner-ram-elite',10,22,.8,data.color,{markedBonus:8});spawnEventSummon('ner-ray-elite',10,14,.6,data.accent,{slow:true})}
    if(selectedCharacter==='velkar'){const targets=nearestEnemies(5);for(const targetEnemy of targets)eventDamage(targetEnemy,42,'velkar-r',2);if(targets.length===1)eventDamage(targets[0],24,'velkar-r-single',0);for(const targetEnemy of targets)eventArea(targetEnemy.x,targetEnemy.y,65,14,data.color,'velkar-r-wave',0)}
    if(selectedCharacter==='morga'){for(const [type,damage,interval,color] of [['morga-predator',17,.75,'#ff9b78'],['morga-lamp',12,.65,'#8eeaff'],['morga-ring',14,.8,'#d8a1ff']])spawnEventSummon(type,10,damage,interval,color,{enhanced:true})}
    pop(`${data.r.name} 발동!`);return;
  }
  const key=slot==='q'?'qCd':'eCd';if(s[key]>0)return;s[key]=data[slot].cd*s.cooldownMultiplier;
  if(selectedCharacter==='raon'){if(slot==='q'&&enemy){eventDamage(enemy,13,'raon-q',2);eventSchedule({at:time+.2,type:'hit',enemy,damage:17,source:'raon-q-two'})}else{s.raonCounterUntil=time+1.1;s.counterWindow=new CounterWindow({ownerId:'raon',duration:1.1,damageReduction:.7,onCounterSuccess:()=>{},onCounterFail:()=>{}});characterEffects.push({type:'ring',x:player.x,y:player.y,r:72,l:1.1,max:1.1,color:data.color})}}
  if(selectedCharacter==='orbis'){if(slot==='q'){eventArea(px,py,92,19,data.color,'orbis-q',2);for(const targetEnemy of enemies)if(Math.hypot(targetEnemy.x-px,targetEnemy.y-py)<145){addCoordinateMark(targetEnemy);const u=unit(px-targetEnemy.x,py-targetEnemy.y);targetEnemy.x+=u.x*38;targetEnemy.y+=u.y*38}eventSchedule({at:time+.7,type:'orbis-collapse',x:px,y:py})}else{s.orbisReflectUntil=time+3;characterEffects.push({type:'ring',x:player.x,y:player.y,r:96,l:3,max:3,color:data.accent})}}
  if(selectedCharacter==='ner'){if(slot==='q'&&enemy){eventDamage(enemy,27+(enemy.nerCommandUntil>time?8:0),'ner-q',2);enemy.nerCommandUntil=time+5;characterEffects.push({type:'line',x:player.x,y:player.y,x2:enemy.x,y2:enemy.y,l:.3,max:.3,color:data.color})}else{characterSummons=characterSummons.filter(v=>v.type!=='ner-ray');spawnEventSummon('ner-ray',6,8,1.2,data.accent,{attacksLeft:4,slow:true})}}
  if(selectedCharacter==='velkar'){const boost=consumeVelkarPressure(s,px,py);if(slot==='q'){nearestEnemies(3).forEach((targetEnemy,index)=>eventDamage(targetEnemy,[30,26,22][index]*boost,'velkar-q',2))}else eventSchedule({at:time+.55,type:'velkar-crown',x:px,y:py,boost})}
  if(selectedCharacter==='morga'){if(slot==='q'){const samples=[['morga-predator',15,.9,'#ff9b78'],['morga-lamp',11,.72,'#8eeaff'],['morga-ring',12,1,'#d8a1ff']],pick=samples[s.morgaCycle++%3];const normals=characterSummons.filter(v=>v.ownerId==='morga'&&!v.enhanced&&!v.fusion);if(normals.length>=2)characterSummons.splice(characterSummons.indexOf(normals[0]),1);spawnEventSummon(pick[0],15,pick[1],pick[2],pick[3])}else{const owned=characterSummons.filter(v=>v.ownerId==='morga');if(!owned.length){s.eCd=0;pop('강화할 표본수가 없습니다.');return}for(const summon of owned){summon.mutatedUntil=time+6;summon.damage*=1.35;summon.interval*=.75}}}
  pop(`${data[slot].name} 사용`);
}
const coreAnimeUseTranscendent=useTranscendentSkill;
useTranscendentSkill=function(slot){return isAnimeEventCharacter()?useAnimeEventSkill(slot):coreAnimeUseTranscendent(slot)};

function resolveAnimeEventQueue(s){for(let i=s.eventQueue.length-1;i>=0;i--){const action=s.eventQueue[i];if(time<action.at)continue;s.eventQueue.splice(i,1);if(action.type==='hit')eventDamage(action.enemy,action.damage,action.source,0);if(action.type==='area')eventArea(action.x,action.y,action.r,action.damage,action.color,action.source,2);if(action.type==='orbis-collapse'){eventArea(action.x,action.y,125,9,'#85e8ff','orbis-q-collapse',1);for(const enemy of enemies)if(Math.hypot(enemy.x-action.x,enemy.y-action.y)<155){addCoordinateMark(enemy);const u=unit(action.x-enemy.x,action.y-enemy.y);enemy.x+=u.x*46;enemy.y+=u.y*46}}if(action.type==='velkar-crown'){eventArea(action.x,action.y,112,34*action.boost,'#ffd56a','velkar-e',2);eventSchedule({at:time+.45,type:'area',x:action.x,y:action.y,r:76,damage:12*action.boost,color:'#fff0a0',source:'velkar-crack'})}}}
function finishAnimeEventF(id,s){if(s.eventBoost){if(s.eventBoost.speed)player.speed/=s.eventBoost.speed;if(s.eventBoost.fireRate)player.fireRate/=s.eventBoost.fireRate;if(s.eventBoost.damage)player.damage/=s.eventBoost.damage;s.eventBoost=null}s.orbisFieldUntil=0;s.velkarThroneUntil=0;s.eventFResolved=true}
const coreAnimeCharacterTick=characterTick;
characterTick=function(dt){
  if(!player?.character||!isAnimeEventCharacter())return coreAnimeCharacterTick(dt);const s=player.character,id=selectedCharacter,wasF=s.isTranscending;resolveAnimeEventQueue(s);
  if(wasF&&id==='raon'&&time>=(s.eventFNext||0)&&s.eventFHits<10){s.eventFNext=time+.25;s.eventFHits++;const enemy=eventTarget();eventDamage(enemy,s.eventFHits===10?34:8,'raon-f',0)}
  if(wasF&&id==='orbis'&&time>=(s.eventFNext||0)){s.eventFNext=time+1;eventArea(player.x,player.y,230,7,'#6edcff','orbis-f',0);for(const enemy of enemies)if(Math.hypot(enemy.x-player.x,enemy.y-player.y)<250)enemy.slowUntil=time+.3;for(const shot of enemyShots)if(Math.hypot(shot.x-player.x,shot.y-player.y)<260&&!shot.orbisSlowed){shot.vx*=.55;shot.vy*=.55;shot.orbisSlowed=true}}
  if(wasF&&id==='ner'&&time>=(s.eventFNext||0)&&s.nerFStep<6){const attacks=[18,16,20,0,0,28],index=s.nerFStep++;s.eventFNext=time+1.35;if(index===3){s.shield=(s.shield||0)+18;charFloat('성수 방벽 +18',player.x,player.y-54,'#dbe9ff')}else if(index===4){for(const enemy of enemies)enemy.slowUntil=time+1.5}else{const enemy=eventTarget();eventDamage(enemy,attacks[index],'ner-f',0)}if(s.nerFStep===6)eventSchedule({at:time+.8,type:'area',x:player.x,y:player.y,r:205,damage:42,color:'#d9e7ff',source:'ner-f-final'})}
  if(wasF&&id==='velkar'&&time>=(s.eventFNext||0)){s.eventFNext=time+1;eventArea(player.x,player.y,220,9,'#ffd36a','velkar-f',0,18)}
  if(wasF&&id==='morga'&&time>=s.transEnd&&!s.eventFResolved){eventArea(player.x,player.y,235,48,'#a5ff81','morga-f-end',0,45);s.eventFResolved=true}
  if(wasF&&time>=s.transEnd&&!s.eventFResolved&&id!=='morga')s.eventFResolved=true;
  const beforeHp=player.hp;coreAnimeCharacterTick(dt);const received=Math.max(0,beforeHp-player.hp);
  if(received>0&&id==='raon'&&time<(s.raonCounterUntil||0)&&(!s.counterWindow||s.counterWindow.success({damage:received}))){player.hp=Math.min(player.maxHp,player.hp+received*.7);const enemy=eventTarget();eventDamage(enemy,32,'raon-counter',0);s.raonCounterUntil=0;charFloat('역충격!',player.x,player.y-58,'#ff91ac')}
  if(received>0&&id==='velkar'&&time<(s.velkarThroneUntil||0))player.hp=Math.min(player.maxHp,player.hp+received*.2);
  if(id==='orbis'){for(const enemy of enemies){if((enemy.orbisMarkUntil||0)<time)enemy.orbisMarks=0}if(time<(s.orbisReflectUntil||0)){for(let i=enemyShots.length-1;i>=0;i--){const shot=enemyShots[i];if(Math.hypot(shot.x-player.x,shot.y-player.y)>105)continue;const enemy=eventTarget();eventDamage(enemy,Math.max(8,(shot.damage||16)*.55),'orbis-reflect',0);enemyShots.splice(i,1);charBurst(shot.x,shot.y,'#8be9ff',7)}for(const enemy of enemies)if(Math.hypot(enemy.x-player.x,enemy.y-player.y)<98&&(!enemy.orbisTouchAt||enemy.orbisTouchAt<time)){eventDamage(enemy,24,'orbis-wall',0);addCoordinateMark(enemy);enemy.orbisTouchAt=time+1}}}
  if(id==='orbis'&&characterSource?.key==='weapon'){};
  if(s.raonBoostUntil&&time>=s.raonBoostUntil){s.raonBoostUntil=0;finishAnimeEventF(id,s)}
  if(wasF&&!s.isTranscending)finishAnimeEventF(id,s);
};

const coreAnimeUpdateSummons=updateSummons;
updateSummons=function(dt){
  for(const summon of characterSummons)if(summon.ownerId&&summon.l<=dt&&summon.fusion&&!summon.finished){summon.finished=true;eventArea(summon.x,summon.y,220,48,'#a5ff81','morga-f-end',0,42)}
  coreAnimeUpdateSummons(dt);
  for(const summon of [...characterSummons]){
    if(!summon.ownerId||summon.cd>0)continue;let enemy=eventTarget();if(summon.ownerId==='ner')enemy=[...enemies].sort((a,b)=>Number((b.nerCommandUntil||0)>time)-Number((a.nerCommandUntil||0)>time))[0]||enemy;if(!enemy)continue;
    summon.cd=summon.interval||1;let damage=summon.damage||10;if(summon.markedBonus&&enemy.nerCommandUntil>time)damage+=summon.markedBonus;eventDamage(enemy,damage,`${summon.type}-attack`,summon.fusion?0:1);if(summon.slow)enemy.slowUntil=time+1;if(summon.type==='morga-lamp')enemy.slowUntil=time+.7;if(summon.type==='morga-ring')eventArea(enemy.x,enemy.y,60,damage*.4,summon.color,'morga-ring-area',0);if(summon.type==='morga-predator'){const u=unit(enemy.x-summon.x,enemy.y-summon.y);summon.x+=u.x*38;summon.y+=u.y*38}if(summon.attacksLeft!==undefined&&--summon.attacksLeft<=0)summon.l=0;characterEffects.push({type:'line',x:summon.x,y:summon.y,x2:enemy.x,y2:enemy.y,l:.18,max:.18,color:summon.color});
  }
};

const coreAnimeUpdateUI=updateCharacterUI;
updateCharacterUI=function(){coreAnimeUpdateUI();if(!player?.character||!isAnimeEventCharacter())return;const s=player.character,data=characterNow(),extra=selectedCharacter==='raon'?`충격 표식 ${s.raonMarks?.size||0}`:selectedCharacter==='orbis'?`좌표 표식 ${enemies.filter(v=>v.orbisMarks).length}`:selectedCharacter==='ner'?`성수 ${characterSummons.filter(v=>v.ownerId==='ner').length}`:selectedCharacter==='velkar'?`왕의 위압 ${s.velkarPressure||0}/5`:`생체 기록 ${s.morgaRecords||0}/3`;if(characterPassive)characterPassive.textContent=`${data.name} · ${extra} · F ${Math.floor(player.transcendence||0)}%`};

function ensureAnimeEventBanner(){const screen=$('#characters'),heading=screen?.querySelector('.character-heading');if(!screen||!heading)return null;let banner=$('#anime-event-banner');if(!banner){banner=document.createElement('section');banner.id='anime-event-banner';banner.className='anime-event-banner';heading.before(banner)}banner.innerHTML=`<div><small>상시 획득 · 초월 ★ COLLECTION</small><b>${ANIMATION_STYLE_EVENT.name}</b><span>기간 제한 없이 요원 상자와 요원 보상에서 획득할 수 있습니다.</span></div><button>요원 상자로 이동</button>`;banner.querySelector('button').onclick=()=>{screen.classList.add('hidden');$('#shop')?.classList.remove('hidden');renderOperativeKeyCount()};return banner}
const coreAnimeRenderList=renderCharacterList;
renderCharacterList=function(){coreAnimeRenderList();ensureAnimeEventBanner();const list=$('#character-list');if(!list)return;for(const id of ANIMATION_STYLE_EVENT.characterIds){const button=list.querySelector(`[data-character="${id}"]`),card=button?.closest('.character-card');if(!card)continue;card.classList.add('event-exclusive');if(!card.querySelector('.event-mark'))card.insertAdjacentHTML('afterbegin','<span class="event-mark">★ COLLECTION</span>');const details=card.querySelector('.character-skills'),data=CHARACTER_DATA[id];if(details&&!details.dataset.eventDetails){details.dataset.eventDetails='1';details.innerHTML=`<strong>${data.passive}</strong><br>${data.description}<br>Q ${data.q.name}<br>E ${data.e.name}<br>R ${data.r.name}<br>F ${data.f.name}`}}};
const operativeProbabilityEvent=$('.operative-probability');if(operativeProbabilityEvent)operativeProbabilityEvent.innerHTML='<b>요원 등급 확률</b><span class="common">일반 23.8%</span><span class="rare">희귀 44.6%</span><span class="hero">영웅 18.8%</span><span class="legend">전설 11.8%</span><span class="transcendence">초월 1% (EVENT 0.5%)</span>';
renderCharacterList();refreshAgentTexture();

/* 일반~전설 신규 요원: 반사·함정·거품·식물·극성 전투 장치. */
const LOWER_RARITY_CHARACTER_CONFIG={
  pebble:{name:'페블',role:'반사 원거리 공격수',tier:'common',color:'#d87932',accent:'#ffe0a3',hp:108,damage:11,speed:260,charge:6.25,passive:'반사 보너스',difficulty:'쉬움',q:{name:'튕김탄',cd:5},e:{name:'반동 발판',cd:11},r:{name:'핀볼 소동'},description:'벽과 발판에 투사체를 튕겨 반사 횟수에 따라 추가 피해를 준다.'},
  stitch:{name:'스티치',role:'실 함정 제어자',tier:'rare',color:'#31d6c3',accent:'#d7fff9',hp:98,damage:10,speed:260,charge:4.8,passive:'얽힘 매듭',difficulty:'보통',q:{name:'관통 바늘',cd:5},e:{name:'가로지르는 실',cd:10},r:{name:'연결 매듭'},description:'실 표식 3개로 적을 묶고 연결된 적에게 피해를 전달한다.'},
  bubblin:{name:'버블린',role:'거품 회복 연금술사',tier:'rare',color:'#79dfff',accent:'#edc8ff',hp:114,damage:9,speed:260,charge:4.2,passive:'보호 거품',difficulty:'보통',q:{name:'압축 거품탄',cd:6},e:{name:'포근한 거품탕',cd:10},r:{name:'압력 돔'},description:'거품 조각으로 보호막을 만들고 회복 영역과 압력 돔을 사용한다.'},
  root:{name:'루트',role:'성장 소환 마법사',tier:'hero',color:'#55c96f',accent:'#e7e3a5',hp:120,damage:10,speed:260,charge:4.55,passive:'발아 표식',difficulty:'어려움',q:{name:'덩굴 채찍',cd:5},e:{name:'씨앗 포탑',cd:11},r:{name:'거대 정원'},description:'발아 표식과 씨앗 포탑을 연계해 넓은 전장을 관리한다.'},
  magno:{name:'마그노',role:'극성 제어 기술자',tier:'legend',color:'#e1b443',accent:'#65eadf',hp:128,damage:13,speed:260,charge:5,passive:'극성 반응',difficulty:'매우 어려움',q:{name:'양극 창',cd:5},e:{name:'파편 궤도',cd:11},r:{name:'극성 폭풍'},description:'양극과 음극을 교차시켜 붕괴시키고 금속 파편으로 공격과 방어를 병행한다.'}
};
Object.assign(CHARACTER_DATA,LOWER_RARITY_CHARACTER_CONFIG);
const LOWER_RARITY_CHARACTER_IDS=Object.keys(LOWER_RARITY_CHARACTER_CONFIG),isLowerRarityCharacter=(id=selectedCharacter)=>LOWER_RARITY_CHARACTER_IDS.includes(id);
const storedLowerSelection=localStorage.neonSelectedCharacter;if(isLowerRarityCharacter(storedLowerSelection)&&operativeIsOwned(storedLowerSelection))selectedCharacter=storedLowerSelection;

const lowerWorld={projectiles:[],pads:[],threads:[],zones:[],turrets:[],orbits:[],network:null,storm:null};
function clearLowerWorld(){for(const key of ['projectiles','pads','threads','zones','turrets','orbits'])lowerWorld[key].length=0;lowerWorld.network=null;lowerWorld.storm=null}
function lowerPointSegmentDistance(px,py,x1,y1,x2,y2){const vx=x2-x1,vy=y2-y1,len=vx*vx+vy*vy||1,t=limit(((px-x1)*vx+(py-y1)*vy)/len,0,1);return Math.hypot(px-(x1+vx*t),py-(y1+vy*t))}
function lowerFront(distance=130){const a=characterAim();return{x:limit(player.x+Math.cos(a)*distance,45,W-45),y:limit(player.y+Math.sin(a)*distance,45,H-45),a}}
function lowerValidEnemy(enemy){return !!enemy&&enemies.includes(enemy)&&enemy.hp>0&&(enemy.invulnerableUntil||0)<=time}
function lowerDamage(enemy,damage,source,maxCharge=1){if(!lowerValidEnemy(enemy))return false;const before=enemy.hp;withCharacterSource(source,maxCharge,()=>hurt(enemy,damage));return before>enemy.hp}
function lowerDirectDamage(enemy,damage){if(!lowerValidEnemy(enemy))return false;const before=enemy.hp;coreCharacterHurt(enemy,damage*(player?.character?.skillMultiplier||1));return before>enemy.hp}
function lowerAddMark(enemy,key,max,duration){if(!lowerValidEnemy(enemy))return null;const mark=enemy[key]||{n:0,until:0,ready:0};mark.n=time<mark.until?Math.min(max,mark.n+1):1;mark.until=time+duration;enemy[key]=mark;return mark}
function lowerSprout(enemy){const mark=lowerAddMark(enemy,'rootSprout',3,6);if(mark&&mark.n>=3&&time>=mark.ready){mark.n=0;mark.ready=time+3;lowerDirectDamage(enemy,13);const healed=Math.min(4,player.maxHp-player.hp);player.hp+=healed;charFloat(`발아 +${healed}`,enemy.x,enemy.y-34,'#a9ff91');charBurst(enemy.x,enemy.y,'#72de77',10)}}
function lowerThreadMark(enemy,amount=1){for(let i=0;i<amount;i++){const mark=lowerAddMark(enemy,'stitchThread',3,5);if(mark&&mark.n>=3&&time>=mark.ready){mark.n=0;mark.ready=time+4;if(enemy.boss){enemy.slowUntil=time+1.5}else enemy.frozenUntil=time+.7;charFloat('얽힘!',enemy.x,enemy.y-34,'#8dfff1');charBurst(enemy.x,enemy.y,'#43dbc9',8);break}}}
function lowerPolarity(enemy,next){if(!lowerValidEnemy(enemy))return;const current=enemy.magnoPolarity;if(current&&current.type!==next&&time>=(enemy.magnoPolarityReady||0)){lowerDirectDamage(enemy,18);enemy.magnoPolarityReady=time+2.5;enemy.magnoPolarity=null;for(const other of enemies)if(other!==enemy&&!other.boss&&Math.hypot(other.x-enemy.x,other.y-enemy.y)<115){const u=unit(enemy.x-other.x,enemy.y-other.y);other.x+=u.x*28;other.y+=u.y*28}charFloat('극성 붕괴',enemy.x,enemy.y-36,'#ffe38a');charBurst(enemy.x,enemy.y,'#78eee0',12)}else enemy.magnoPolarity={type:next,until:time+6}}

const coreLowerMakePlayer=makePlayer;
makePlayer=function(){coreLowerMakePlayer();clearLowerWorld();if(player&&isLowerRarityCharacter()){Object.assign(player.character,{lower:true,bubbleFragments:0,bubbleLastHit:time,bubbleDecayAt:time+8,bubbleShieldUntil:0,padDashReady:0,threadTargets:0,sproutTargets:0,magnoFragments:0});player.transcendence=0}characterLastHp=player?.hp||0};

const coreLowerPassive=characterHitPassive;
characterHitPassive=function(enemy){coreLowerPassive(enemy);if(!player?.character||!isLowerRarityCharacter()||!lowerValidEnemy(enemy))return;const s=player.character;if(selectedCharacter==='stitch')lowerThreadMark(enemy);if(selectedCharacter==='bubblin'){s.bubbleLastHit=time;if(s.shield<=0&&s.bubbleFragments<4){s.bubbleFragments++;if(s.bubbleFragments>=4){s.bubbleFragments=0;s.shield=16;s.bubbleShieldUntil=time+6;charFloat('보호 거품 16',player.x,player.y-55,'#bcefff')}}}if(selectedCharacter==='root')lowerSprout(enemy)};

let lowerNetworkGuard=false;
const coreLowerHurt=hurt;
hurt=function(enemy,damage){const before=enemy?.hp;coreLowerHurt(enemy,damage);if(selectedCharacter==='pebble'&&!characterSource&&player?.character?.pebbleBounceBonus&&time<(player.character.pebbleBounceUntil||0)&&Number.isFinite(before)&&before>enemy?.hp){const bonus=player.character.pebbleBounceBonus;player.character.pebbleBounceBonus=0;lowerDirectDamage(enemy,bonus);charFloat(`반사 +${bonus}`,enemy.x,enemy.y-32,'#ffd18c')}if(lowerNetworkGuard||selectedCharacter!=='stitch'||!lowerWorld.network||!lowerValidEnemy(enemy)||!Number.isFinite(before)||before<=enemy.hp||!lowerWorld.network.ids.has(enemy.id))return;const transfer=Math.min(12,(before-enemy.hp)*.25);if(transfer<=0)return;lowerNetworkGuard=true;for(const other of enemies)if(other!==enemy&&lowerWorld.network.ids.has(other.id)&&lowerValidEnemy(other))lowerDirectDamage(other,transfer);lowerNetworkGuard=false};

function addLowerProjectile(kind,damage,color,extra={}){const a=extra.angle??characterAim();lowerWorld.projectiles.push({kind,x:player.x+Math.cos(a)*24,y:player.y+Math.sin(a)*24,vx:Math.cos(a)*(extra.speed||520),vy:Math.sin(a)*(extra.speed||520),damage,color,r:extra.r||11,l:extra.life||2,bounces:0,maxBounces:extra.maxBounces||0,hit:{},chargeHits:0,...extra})}
function useLowerSkill(slot){if(!run||paused||!player)return;const s=player.character,data=characterNow();if(slot==='f'){pop('초월 등급 전용 스킬입니다.');return}if(slot==='r'){if(player.ultimate<100){pop(`궁극기 충전 ${Math.floor(player.ultimate)}%`);return}player.ultimate=0;castLowerUltimate();return}const key=slot==='q'?'qCd':'eCd';if(s[key]>0)return;s[key]=data[slot].cd*s.cooldownMultiplier;const front=lowerFront();
  if(selectedCharacter==='pebble'){if(slot==='q')addLowerProjectile('pebble-q',22,'#ff9a42',{speed:470,r:12,life:4,maxBounces:2});else{lowerWorld.pads.push({id:`pad-${time}-${Math.random()}`,x:front.x,y:front.y,a:front.a,l:8,hits:new Map(),playerReady:0});while(lowerWorld.pads.length>2)lowerWorld.pads.shift()}}
  if(selectedCharacter==='stitch'){if(slot==='q')addLowerProjectile('stitch-q',24,'#4ff0d8',{speed:720,r:7,life:1.3,pierce:2});else{const p=lowerFront(125),side=front.a+Math.PI/2;lowerWorld.threads.push({id:`thread-${time}-${Math.random()}`,x1:p.x+Math.cos(side)*105,y1:p.y+Math.sin(side)*105,x2:p.x-Math.cos(side)*105,y2:p.y-Math.sin(side)*105,l:7,hits:new Map()});while(lowerWorld.threads.length>2)lowerWorld.threads.shift()}}
  if(selectedCharacter==='bubblin'){if(slot==='q')addLowerProjectile('bubblin-q',22,'#8deaff',{speed:330,r:20,life:2.3});else lowerWorld.zones.push({type:'foam',x:front.x,y:front.y,r:115,l:5,tick:0,hits:{},healTick:0})}
  if(selectedCharacter==='root'){if(slot==='q'){const end=lowerFront(210);characterEffects.push({type:'line',x:player.x,y:player.y,x2:end.x,y2:end.y,l:.35,max:.35,color:'#60d877'});withCharacterSource('root-q',4,()=>{for(const enemy of [...enemies])if(lowerPointSegmentDistance(enemy.x,enemy.y,player.x,player.y,end.x,end.y)<enemy.r+25){hurt(enemy,26);if(!enemy.boss){const u=unit(player.x-enemy.x,player.y-enemy.y);enemy.x+=u.x*32;enemy.y+=u.y*32}}})}else{lowerWorld.turrets=[{x:front.x,y:front.y,l:8,cd:.15,shots:0,a:0}]}}
  if(selectedCharacter==='magno'){if(slot==='q')addLowerProjectile('magno-q',28,'#f2c852',{speed:680,r:9,life:1.5,pierce:2});else{lowerWorld.orbits=Array.from({length:3},(_,i)=>({id:i,x:player.x,y:player.y,l:7,cd:.45+i*.28,a:i*Math.PI*2/3}));s.magnoFragments=3}}
  pop(`${data[slot].name} 사용`);
}
function castLowerUltimate(){const data=characterNow();if(selectedCharacter==='pebble'){for(let i=0;i<6;i++)addLowerProjectile('pebble-r',11,'#ffad54',{angle:i*Math.PI/3+.15,speed:500+i*12,r:9+i%2*2,life:5,maxBounces:99,persistent:true,hitTimes:{}})}if(selectedCharacter==='stitch'){const linked=nearestEnemies(4).filter(enemy=>Math.hypot(enemy.x-player.x,enemy.y-player.y)<360);lowerWorld.network={ids:new Set(linked.map(enemy=>enemy.id)),l:6};charFloat(`연결 ${linked.length}명`,player.x,player.y-55,'#78fff0')}if(selectedCharacter==='bubblin')lowerWorld.zones.push({type:'dome',x:player.x,y:player.y,r:190,l:7,tick:0,healTick:0,pressures:{},finished:false,id:`dome-${time}`});if(selectedCharacter==='root')lowerWorld.zones.push({type:'garden',x:player.x,y:player.y,r:220,l:8,tick:0,pulses:0,first:true});if(selectedCharacter==='magno')lowerWorld.storm={x:player.x,y:player.y,r:235,l:7,pulse:0,next:0};characterEffects.push({type:'ring',x:player.x,y:player.y,r:selectedCharacter==='root'?220:190,l:.65,max:.65,color:data.color});pop(`${data.r.name} 발동!`)}

const coreLowerUseSkill=useCharacterSkill;
useCharacterSkill=function(slot){if(isLowerRarityCharacter())return useLowerSkill(slot);return coreLowerUseSkill(slot)};

function updateLowerProjectiles(dt){for(let i=lowerWorld.projectiles.length-1;i>=0;i--){const p=lowerWorld.projectiles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt;let bounced=false;if(p.x<p.r||p.x>W-p.r){p.x=limit(p.x,p.r,W-p.r);p.vx*=-1;bounced=true}if(p.y<p.r||p.y>H-p.r){p.y=limit(p.y,p.r,H-p.r);p.vy*=-1;bounced=true}if(bounced){p.bounces++;charBurst(p.x,p.y,p.color,4);if(p.bounces>p.maxBounces){lowerWorld.projectiles.splice(i,1);continue}}if(p.kind==='pebble-q')for(const pad of lowerWorld.pads)if(p.padId!==pad.id&&Math.hypot(p.x-pad.x,p.y-pad.y)<38){const speed=Math.hypot(p.vx,p.vy)*1.25;p.vx=Math.cos(pad.a)*speed;p.vy=Math.sin(pad.a)*speed;p.padId=pad.id;p.bounces=Math.max(1,p.bounces);charBurst(p.x,p.y,'#ffd186',6)}let remove=false;for(const enemy of [...enemies]){if(!lowerValidEnemy(enemy))continue;const last=p.hit[enemy.id]||-99;if(Math.hypot(enemy.x-p.x,enemy.y-p.y)>=enemy.r+p.r||time-last<(p.persistent?.5:99))continue;p.hit[enemy.id]=time;let damage=p.damage;if(p.kind==='pebble-q')damage=p.bounces===0?22:p.bounces===1?18:15;if(p.kind==='stitch-q'&&Object.keys(p.hit).length>1)damage=20;if(p.kind==='magno-q'&&Object.keys(p.hit).length>1)damage=24;const chargeCap=p.kind==='pebble-r'?0:p.chargeHits<(p.pierce||1)?1:0;if(lowerDamage(enemy,damage,`lower-${p.kind}`,chargeCap)){if(chargeCap)p.chargeHits++;if(p.kind==='pebble-q'&&p.bounces)lowerDirectDamage(enemy,p.bounces>1?8:5);if(p.kind==='stitch-q')lowerThreadMark(enemy,1);if(p.kind==='bubblin-q'){if(enemy.boss)enemy.slowUntil=time+1.5;else enemy.frozenUntil=time+.6}if(p.kind==='magno-q')lowerPolarity(enemy,'positive')}charBurst(p.x,p.y,p.color,6);if(p.persistent){p.hitTimes[enemy.id]=(p.hitTimes[enemy.id]||0)+1;if(p.hitTimes[enemy.id]>=6)p.hit[enemy.id]=Infinity}else if(!p.pierce||Object.keys(p.hit).length>=p.pierce)remove=true;if(remove)break}if(remove||p.l<=0)lowerWorld.projectiles.splice(i,1)}}

function updateLowerPadsAndThreads(dt){for(let i=lowerWorld.pads.length-1;i>=0;i--){const pad=lowerWorld.pads[i];pad.l-=dt;if(pad.l<=0){lowerWorld.pads.splice(i,1);continue}if(Math.hypot(player.x-pad.x,player.y-pad.y)<34&&time>=pad.playerReady){pad.playerReady=time+1;player.x=limit(player.x+Math.cos(characterAim())*115,24,W-24);player.y=limit(player.y+Math.sin(characterAim())*115,24,H-24);charBurst(player.x,player.y,'#ffd089',7)}for(const enemy of [...enemies])if(Math.hypot(enemy.x-pad.x,enemy.y-pad.y)<enemy.r+31){const hit=pad.hits.get(enemy.id)||{last:-99,charged:false};if(time-hit.last>=3){lowerDamage(enemy,12,'pebble-pad',hit.charged?0:1);hit.last=time;hit.charged=true;pad.hits.set(enemy.id,hit);if(!enemy.boss)enemy.frozenUntil=time+.18}}}for(let i=lowerWorld.threads.length-1;i>=0;i--){const trap=lowerWorld.threads[i];trap.l-=dt;if(trap.l<=0){lowerWorld.threads.splice(i,1);continue}for(const enemy of [...enemies])if(lowerPointSegmentDistance(enemy.x,enemy.y,trap.x1,trap.y1,trap.x2,trap.y2)<enemy.r+8){const hit=trap.hits.get(enemy.id)||{n:0,last:-99};if(hit.n<2&&time-hit.last>=2){lowerDamage(enemy,15,'stitch-thread',1);enemy.slowUntil=time+2;hit.n++;hit.last=time;trap.hits.set(enemy.id,hit)}}}}

function updateLowerZones(dt){for(let i=lowerWorld.zones.length-1;i>=0;i--){const zone=lowerWorld.zones[i];zone.l-=dt;zone.tick-=dt;zone.healTick=(zone.healTick||0)-dt;if(zone.type==='foam'){if(Math.hypot(player.x-zone.x,player.y-zone.y)<zone.r&&zone.healTick<=0){zone.healTick=1;player.hp=Math.min(player.maxHp,player.hp+5)}if(zone.tick<=0){zone.tick=1;for(const enemy of [...enemies])if(Math.hypot(enemy.x-zone.x,enemy.y-zone.y)<zone.r+enemy.r){zone.hits[enemy.id]=(zone.hits[enemy.id]||0)+1;lowerDamage(enemy,4,'bubblin-foam',zone.hits[enemy.id]<=3?1:0);enemy.slowUntil=time+1.1}}}if(zone.type==='dome'){zone.x=player.x;zone.y=player.y;player.character.reduceUntil=time+.15;if(zone.healTick<=0){zone.healTick=1;player.hp=Math.min(player.maxHp,player.hp+3);for(const enemy of enemies)if(Math.hypot(enemy.x-zone.x,enemy.y-zone.y)<zone.r+enemy.r)zone.pressures[enemy.id]=Math.min(5,(zone.pressures[enemy.id]||0)+1)}for(const shot of enemyShots||[])if(!shot.meteor&&Math.hypot(shot.x-zone.x,shot.y-zone.y)<zone.r&&shot.lowerDomeId!==zone.id){shot.vx*=.6;shot.vy*=.6;shot.lowerDomeId=zone.id}}if(zone.type==='garden'){const inside=Math.hypot(player.x-zone.x,player.y-zone.y)<zone.r;if(inside){player.hp=Math.min(player.maxHp,player.hp+4*dt);if(!zone.speedApplied){player.speed*=1.1;zone.speedApplied=true}}else if(zone.speedApplied){player.speed/=1.1;zone.speedApplied=false}if(zone.tick<=0&&zone.pulses<4){zone.tick=2;zone.pulses++;for(const enemy of [...enemies])if(Math.hypot(enemy.x-zone.x,enemy.y-zone.y)<zone.r+enemy.r){const bonus=zone.first?(enemy.rootSprout?.n||0)*3:0;lowerDamage(enemy,18+bonus,'root-garden',0);enemy.slowUntil=time+1.2}zone.first=false}}if(zone.l<=0){if(zone.type==='dome'&&!zone.finished){zone.finished=true;for(const enemy of [...enemies]){const stacks=zone.pressures[enemy.id]||0;if(stacks)lowerDirectDamage(enemy,stacks*7)}player.hp=Math.min(player.maxHp,player.hp+18);charBurst(player.x,player.y,'#b7edff',18)}if(zone.speedApplied)player.speed/=1.1;lowerWorld.zones.splice(i,1)}}}

function updateLowerTurretsAndOrbit(dt){for(let i=lowerWorld.turrets.length-1;i>=0;i--){const turret=lowerWorld.turrets[i];turret.l-=dt;turret.cd-=dt;turret.a+=dt*2;if(turret.l<=0||turret.shots>=6){lowerWorld.turrets.splice(i,1);continue}const enemy=nearestEnemies(1,turret.x,turret.y)[0];if(enemy&&turret.cd<=0){turret.cd=1.2;turret.shots++;lowerDamage(enemy,8,'root-turret',1);characterEffects.push({type:'line',x:turret.x,y:turret.y,x2:enemy.x,y2:enemy.y,l:.2,max:.2,color:'#8eec72'})}}for(let i=lowerWorld.orbits.length-1;i>=0;i--){const shard=lowerWorld.orbits[i];shard.l-=dt;shard.cd-=dt;shard.a+=dt*2.4;shard.x=player.x+Math.cos(shard.a)*62;shard.y=player.y+Math.sin(shard.a)*62;if(shard.l<=0){lowerWorld.orbits.splice(i,1);continue}const blocked=enemyShots?.find(shot=>!shot.meteor&&Math.hypot(shot.x-shard.x,shot.y-shard.y)<24);if(blocked){enemyShots.splice(enemyShots.indexOf(blocked),1);charBurst(shard.x,shard.y,'#c9ffff',8);lowerWorld.orbits.splice(i,1);player.character.magnoFragments=lowerWorld.orbits.length;continue}const enemy=nearestEnemies(1,shard.x,shard.y)[0];if(enemy&&shard.cd<=0&&Math.hypot(enemy.x-shard.x,enemy.y-shard.y)<300){shard.cd=2.1;if(lowerDamage(enemy,11,'magno-orbit',1))lowerPolarity(enemy,'negative');characterEffects.push({type:'line',x:shard.x,y:shard.y,x2:enemy.x,y2:enemy.y,l:.2,max:.2,color:'#82eee4'});lowerWorld.orbits.splice(i,1);player.character.magnoFragments=lowerWorld.orbits.length}}}

function updateLowerUltimate(dt){if(lowerWorld.network){lowerWorld.network.l-=dt;const linked=enemies.filter(enemy=>lowerWorld.network.ids.has(enemy.id)&&lowerValidEnemy(enemy));if(lowerWorld.network.l<=0||linked.length<2)lowerWorld.network=null;else{const cx=linked.reduce((n,e)=>n+e.x,0)/linked.length,cy=linked.reduce((n,e)=>n+e.y,0)/linked.length;for(const enemy of linked)if(!enemy.boss){const d=Math.hypot(enemy.x-cx,enemy.y-cy);if(d>150){const u=unit(cx-enemy.x,cy-enemy.y);enemy.x+=u.x*18*dt;enemy.y+=u.y*18*dt}}}}if(lowerWorld.storm){const storm=lowerWorld.storm;storm.l-=dt;storm.next-=dt;if(storm.next<=0&&storm.pulse<5){storm.next=1.35;storm.pulse++;const last=storm.pulse===5,damage=last?34:12;for(const enemy of [...enemies])if(Math.hypot(enemy.x-storm.x,enemy.y-storm.y)<storm.r+enemy.r){lowerDamage(enemy,damage+(last&&enemy.magnoPolarity?8:0),'magno-storm',0);if(!enemy.boss&&!last){const pull=storm.pulse%2===1,u=unit(enemy.x-storm.x,enemy.y-storm.y),move=pull?-38:38;enemy.x=limit(enemy.x+u.x*move,20,W-20);enemy.y=limit(enemy.y+u.y*move,20,H-20)}if(last)enemy.magnoPolarity=null}characterEffects.push({type:'ring',x:storm.x,y:storm.y,r:storm.r,l:.45,max:.45,color:storm.pulse%2?'#f0c654':'#55e2da'})}if(storm.l<=0||storm.pulse>=5)lowerWorld.storm=null}}

const coreLowerCharacterTick=characterTick;
characterTick=function(dt){const domeActive=!!(player&&selectedCharacter==='bubblin'&&lowerWorld.zones.some(zone=>zone.type==='dome')),rawDomeDamage=domeActive?Math.max(0,characterLastHp-player.hp):0;coreLowerCharacterTick(dt);if(!run||paused||!player?.character||!isLowerRarityCharacter())return;const s=player.character;if(domeActive&&rawDomeDamage){player.hp=Math.min(player.maxHp,player.hp+rawDomeDamage*.05);characterLastHp=player.hp}if(selectedCharacter==='pebble'){for(const shot of shots)if(!shot.pebblePrepared){shot.pebblePrepared=true;shot.pebbleBounces=0}for(const shot of shots){if(shot.pebbleBounces>=1)continue;if(shot.x<4||shot.x>W-4){shot.vx*=-1;shot.x=limit(shot.x,4,W-4);shot.pebbleBounces++;s.pebbleBounceBonus=5;s.pebbleBounceUntil=time+2}if(shot.y<4||shot.y>H-4){shot.vy*=-1;shot.y=limit(shot.y,4,H-4);shot.pebbleBounces++;s.pebbleBounceBonus=5;s.pebbleBounceUntil=time+2}}}if(selectedCharacter==='bubblin'){if(s.shield>0&&time>=s.bubbleShieldUntil)s.shield=0;if(s.bubbleFragments>0&&time-s.bubbleLastHit>=8&&time>=s.bubbleDecayAt){s.bubbleFragments--;s.bubbleDecayAt=time+1}}for(const enemy of enemies){if(enemy.stitchThread&&time>enemy.stitchThread.until)delete enemy.stitchThread;if(enemy.rootSprout&&time>enemy.rootSprout.until)delete enemy.rootSprout;if(enemy.magnoPolarity&&time>enemy.magnoPolarity.until)enemy.magnoPolarity=null}updateLowerProjectiles(dt);updateLowerPadsAndThreads(dt);updateLowerZones(dt);updateLowerTurretsAndOrbit(dt);updateLowerUltimate(dt)};

const coreLowerEnd=end;
end=function(win){clearLowerWorld();return coreLowerEnd(win)};

const coreLowerUpdateUI=updateCharacterUI;
updateCharacterUI=function(){coreLowerUpdateUI();if(!player?.character||!isLowerRarityCharacter())return;const s=player.character,data=characterNow();let extra='';if(selectedCharacter==='pebble')extra=`반동 발판 ${lowerWorld.pads.length}/2`;if(selectedCharacter==='stitch')extra=`실 표식 ${enemies.filter(e=>e.stitchThread?.n).length}명 · 함정 ${lowerWorld.threads.length}/2`;if(selectedCharacter==='bubblin')extra=`거품 ${s.bubbleFragments}/4 · 보호막 ${Math.ceil(s.shield||0)}`;if(selectedCharacter==='root')extra=`발아 ${enemies.filter(e=>e.rootSprout?.n).length}명 · 포탑 ${lowerWorld.turrets[0]?Math.max(0,lowerWorld.turrets[0].l).toFixed(1)+'초':'없음'}`;if(selectedCharacter==='magno')extra=`극성 ${enemies.filter(e=>e.magnoPolarity).length}명 · 파편 ${lowerWorld.orbits.length}/3`;if(characterPassive)characterPassive.textContent=`${data.name} · ${extra}`;transcendButton.classList.add('hidden')};

function drawLowerCharacterEffects(now){const dt=Math.min(.05,(now-(drawLowerCharacterEffects.last||now))/1000);drawLowerCharacterEffects.last=now;if(run&&player&&isLowerRarityCharacter()){x.save();for(const pad of lowerWorld.pads){x.globalAlpha=Math.min(1,pad.l);x.fillStyle='#d8793266';x.strokeStyle='#ffd28c';x.lineWidth=4;x.beginPath();x.ellipse(pad.x,pad.y,34,22,0,0,Math.PI*2);x.fill();x.stroke();x.beginPath();x.moveTo(pad.x-12,pad.y);x.lineTo(pad.x+Math.cos(pad.a)*18,pad.y+Math.sin(pad.a)*18);x.stroke()}for(const trap of lowerWorld.threads){x.globalAlpha=Math.min(.9,trap.l/2+.25);x.strokeStyle='#54efdd';x.shadowBlur=12;x.shadowColor='#54efdd';x.lineWidth=3;x.beginPath();x.moveTo(trap.x1,trap.y1);x.lineTo(trap.x2,trap.y2);x.stroke()}for(const zone of lowerWorld.zones){x.globalAlpha=Math.min(.55,zone.l);x.fillStyle=zone.type==='garden'?'#4fcf6938':'#77dfff38';x.strokeStyle=zone.type==='garden'?'#8bea80':'#bdefff';x.lineWidth=4;x.beginPath();x.arc(zone.x,zone.y,zone.r,0,Math.PI*2);x.fill();x.stroke();if(zone.type!=='garden')for(let j=0;j<7;j++){const a=time*.5+j*.9,r=zone.r*(.25+(j%3)*.16);x.beginPath();x.arc(zone.x+Math.cos(a)*r,zone.y+Math.sin(a)*r,5+j%2*3,0,Math.PI*2);x.stroke()}}for(const turret of lowerWorld.turrets){x.save();x.translate(turret.x,turret.y);x.rotate(turret.a);x.fillStyle='#55cd67';x.beginPath();x.arc(0,0,16,0,Math.PI*2);x.fill();for(let j=0;j<3;j++){x.rotate(Math.PI*2/3);x.fillRect(8,-5,23,10)}x.restore()}for(const shard of lowerWorld.orbits){x.save();x.translate(shard.x,shard.y);x.rotate(shard.a);x.fillStyle='#d8edf2';x.strokeStyle='#5be5da';x.lineWidth=3;x.beginPath();x.moveTo(16,0);x.lineTo(-10,-8);x.lineTo(-6,0);x.lineTo(-10,8);x.closePath();x.fill();x.stroke();x.restore()}if(lowerWorld.network){const linked=enemies.filter(e=>lowerWorld.network.ids.has(e.id));x.strokeStyle='#66f4e2';x.lineWidth=3;x.shadowBlur=10;x.shadowColor='#66f4e2';for(let j=0;j<linked.length;j++){const next=linked[(j+1)%linked.length];x.beginPath();x.moveTo(linked[j].x,linked[j].y);x.lineTo(next.x,next.y);x.stroke()}}for(const p of lowerWorld.projectiles){x.save();x.translate(p.x,p.y);x.fillStyle=p.color;x.strokeStyle='#fff';x.lineWidth=2;x.shadowBlur=13;x.shadowColor=p.color;x.beginPath();if(p.kind==='stitch-q'||p.kind==='magno-q'){const a=Math.atan2(p.vy,p.vx);x.rotate(a);x.moveTo(18,0);x.lineTo(-13,-6);x.lineTo(-8,0);x.lineTo(-13,6);x.closePath()}else x.arc(0,0,p.r,0,Math.PI*2);x.fill();x.stroke();x.restore()}for(const enemy of enemies){let color=null,count=0;if(enemy.stitchThread?.n){color='#55efdd';count=enemy.stitchThread.n}if(enemy.rootSprout?.n){color='#78df78';count=enemy.rootSprout.n}if(enemy.magnoPolarity){color=enemy.magnoPolarity.type==='positive'?'#f1c651':'#5be8dc';count=1}if(color){x.fillStyle=color;x.font='bold 12px sans-serif';x.textAlign='center';x.fillText(`${count}`,enemy.x,enemy.y-enemy.r-18)}}x.restore()}requestAnimationFrame(drawLowerCharacterEffects)}requestAnimationFrame(drawLowerCharacterEffects);

const coreLowerRenderCharacterList=renderCharacterList;
renderCharacterList=function(){coreLowerRenderCharacterList();const list=$('#character-list');if(!list)return;const icons={pebble:'●',stitch:'⌁',bubblin:'◌',root:'❧',magno:'◇'};for(const id of LOWER_RARITY_CHARACTER_IDS){const data=CHARACTER_DATA[id],button=list.querySelector(`[data-character="${id}"]`),card=button?.closest('.character-card');if(!card)continue;const icon=card.querySelector('span');if(icon&&operativeIsOwned(id))icon.textContent=icons[id];const details=card.querySelector('.character-skills');if(details)details.innerHTML=`<strong>${data.passive}</strong> · 난이도 ${data.difficulty}<br>${data.description}<br>Q ${data.q.name}<br>E ${data.e.name}<br>R ${data.r.name}`}};

/* 기존 등급 확률은 유지하고, 같은 등급 안에서 모든 상시 요원을 균등 추첨한다. */
grantOperative=function(source){const roll=Math.random()*100,tier=roll<23.8?'common':roll<68.4?'rare':roll<87.2?'hero':roll<99?'legend':'transcendence',pool=Object.keys(CHARACTER_DATA).filter(id=>id!=='recruit'&&CHARACTER_DATA[id].tier===tier),id=pool[Math.floor(Math.random()*pool.length)];return awardOperative(id,source)};
renderCharacterList();refreshAgentTexture();

/* 월광 검객 이벤트: 검술 판정과 이벤트 수명은 기존 초월 시스템과 분리한다. */
const BLADE_FANTASY_EVENT={id:'transcendent_blade_week_01',name:'월광 검객 컬렉션',durationDays:7,rarity:'초월',eventExclusive:false,characterIds:['harin','seiran','zephyr','varkan','nebel']};
const BLADE_EVENT_SCHEDULE={startAt:null,endAt:null};
const BLADE_EVENT_CHARACTER_CONFIG={
  harin:{name:'하린',role:'자세 전환 검사',color:'#43d8c7',accent:'#ffad61',hp:124,damage:13,speed:260,charge:5.3,transCharge:1.79,passive:'전투 리듬',q:{name:'유선 가르기',cd:5},e:{name:'홍염 반월',cd:7},r:{name:'쌍류 연무'},f:{name:'새벽의 윤회검'},description:'유수와 작열 자세를 바꾸며 두 표식을 합쳐 균형 파열을 일으킨다.'},
  seiran:{name:'세이란',role:'방어 반격 검사',color:'#78bce8',accent:'#e1f7ff',hp:128,damage:12,speed:260,charge:4.55,transCharge:1.62,passive:'정적의 중심',q:{name:'청류 보행',cd:5},e:{name:'무결 방진',cd:10},r:{name:'유리호수 결계'},f:{name:'천경무파'},description:'피해를 받지 않으면 정적을 쌓고 정확한 방어로 강하게 반격한다.'},
  zephyr:{name:'제피르',role:'폭풍 광전 검사',color:'#d8f4d0',accent:'#91ff9c',hp:136,damage:15,speed:291,charge:6.25,transCharge:2,passive:'역풍 본능',q:{name:'파열풍',cd:5},e:{name:'폭풍 추격',cd:7},r:{name:'태풍의 상처'},f:{name:'백풍 해방'},description:'체력이 낮아질수록 공격력이 오르는 고위험 돌진 검사다.'},
  varkan:{name:'바르칸',role:'생체 에너지 지배자',color:'#b85bda',accent:'#f0b5ff',hp:150,damage:14,speed:260,charge:5,transCharge:1.67,passive:'적응 재생',q:{name:'형상 채찍',cd:5},e:{name:'분열 잔영',cd:10},r:{name:'포식 진화'},f:{name:'생명군락'},description:'회복과 에너지 잔영을 이용해 장기전을 지배한다.'},
  nebel:{name:'네벨',role:'고속 안개 검사',color:'#a7e7df',accent:'#efffff',hp:98,damage:13,speed:307,charge:5.6,transCharge:1.86,passive:'흐림',q:{name:'희무 돌진',cd:4.5},e:{name:'무영 연참',cd:7},r:{name:'백무 칠섬'},f:{name:'무형천무'},description:'이동으로 흐림을 만들고 잔상을 남기며 빠르게 연속 베기한다.'}
};
Object.entries(BLADE_EVENT_CHARACTER_CONFIG).forEach(([id,data])=>{CHARACTER_DATA[id]={...data,tier:'transcendence',eventId:BLADE_FANTASY_EVENT.id}});
window.BLADE_FANTASY_EVENT=BLADE_FANTASY_EVENT;window.BLADE_EVENT_SCHEDULE=BLADE_EVENT_SCHEDULE;
class StanceController{constructor(defaultStance){this.currentStance=defaultStance}setStance(nextStance){this.currentStance=nextStance}isStance(stanceId){return this.currentStance===stanceId}}
class CounterWindow{constructor({ownerId,duration,damageReduction,onCounterSuccess,onCounterFail}){this.ownerId=ownerId;this.duration=duration;this.damageReduction=damageReduction;this.onCounterSuccess=onCounterSuccess;this.onCounterFail=onCounterFail;this.startedAt=time;this.expiresAt=time+duration;this.isActive=true}success(payload){if(!this.isActive)return false;this.isActive=false;this.onCounterSuccess?.(payload);return true}fail(){if(!this.isActive)return;this.isActive=false;this.onCounterFail?.()}}
window.StanceController=StanceController;window.CounterWindow=CounterWindow;
const bladeEventStartKey='neonBladeEventStartAt',bladeEventTestKey='neonBladeEventTestMode';
function bladeEventWindow(){let start=BLADE_EVENT_SCHEDULE.startAt?Date.parse(BLADE_EVENT_SCHEDULE.startAt):Number(localStorage[bladeEventStartKey]||0);if(!start){start=Date.now();localStorage[bladeEventStartKey]=String(start)}const end=BLADE_EVENT_SCHEDULE.endAt?Date.parse(BLADE_EVENT_SCHEDULE.endAt):start+BLADE_FANTASY_EVENT.durationDays*86400000;return{start,end}}
function bladeEventActive(now=Date.now()){const period=bladeEventWindow();return now>=period.start&&now<period.end}
function bladeEventTestMode(){return localStorage[bladeEventTestKey]==='true'}
window.setBladeEventTestMode=enabled=>{localStorage[bladeEventTestKey]=String(!!enabled);renderCharacterList();return bladeEventTestMode()};
function bladeEventUsable(){return bladeEventActive()||bladeEventTestMode()}
function bladeEventRemaining(){return Math.max(0,bladeEventWindow().end-Date.now())}
function bladeEventTimeText(){const left=bladeEventRemaining();if(!left)return'이벤트 종료';const d=Math.floor(left/86400000),h=Math.floor(left%86400000/3600000),m=Math.floor(left%3600000/60000),s=Math.floor(left%60000/1000);return`${d}일 ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function isBladeEventCharacter(id=selectedCharacter){return BLADE_FANTASY_EVENT.characterIds.includes(id)}
const storedBladeSelection=localStorage.neonSelectedCharacter;if(isBladeEventCharacter(storedBladeSelection)&&(operativeIsOwned(storedBladeSelection)||bladeEventTestMode()))selectedCharacter=storedBladeSelection;

/* 초월 1%는 유지한다. 기존 초월 0.5%, 두 상시 특별 컬렉션이 나머지 0.5%를 나눈다. */
grantOperative=function(source){
  const roll=Math.random()*100;let id;
  if(roll<99)id=roll<23.76?'kairos':roll<46.53?'lumina':roll<68.31?'nox':roll<75.24?'frost':roll<80.19?'mirage':roll<84.15?'blaze':roll<87.12?'volt':roll<93.06?'iron':roll<97.02?'arca':'gravion';
  else{const permanent=['astra','solaris','inkra','chronos','rezona'],collections=[ANIMATION_STYLE_EVENT.characterIds,BLADE_FANTASY_EVENT.characterIds],offset=roll-99;if(offset<.5)id=permanent[Math.min(4,Math.floor(offset/.1))];else{const collectionIndex=Math.min(1,Math.floor((offset-.5)/.25)),pool=collections[collectionIndex],inside=((offset-.5)%0.25)/.25;id=pool[Math.min(4,Math.floor(inside*5))]}}
  return awardOperative(id,source);
};

function bladeTarget(){return nearestEnemies(1)[0]||null}
function bladeHit(enemy,damage,source,max=1){if(!enemy||!enemies.includes(enemy)||(enemy.invulnerableUntil||0)>time)return false;const before=enemy.hp;withCharacterSource(source,max,()=>hurt(enemy,damage));return before>(enemy.hp??before)}
function bladeArea(px,py,r,damage,color,source,max=2,knock=0){eventArea(px,py,r,damage,color,source,max,knock)}
function bladeQueue(action){player.character.bladeQueue.push(action)}
function bladeSetDamage(s,multiplier){const old=s.bladeDamageMultiplier||1;player.damage*=multiplier/old;s.bladeDamageMultiplier=multiplier}
function bladeSetSpeed(s,multiplier){const old=s.bladeSpeedMultiplier||1;player.speed*=multiplier/old;s.bladeSpeedMultiplier=multiplier}
function addHarinMark(enemy,type){if(!enemy)return;enemy.harinMarks=enemy.harinMarks||{flow:false,heat:false,burstAt:-99};enemy.harinMarks[type]=true;if(enemy.harinMarks.flow&&enemy.harinMarks.heat&&time-enemy.harinMarks.burstAt>=(player.character.isTranscending?1.5:3)){enemy.harinMarks.flow=false;enemy.harinMarks.heat=false;enemy.harinMarks.burstAt=time;bladeHit(enemy,18,'harin-balance',0);enemy.slowUntil=time+1;charFloat('균형 파열',enemy.x,enemy.y-34,'#ffe0a2')}}
function safeBladeMove(px,py){player.x=limit(px,player.r+6,W-player.r-6);player.y=limit(py,player.r+6,H-player.r-6)}

const coreBladeMakePlayer=makePlayer;
makePlayer=function(){coreBladeMakePlayer();if(player&&isBladeEventCharacter()){Object.assign(player.character,{bladeQueue:[],stance:new StanceController('flow'),harinBasic:0,harinFAlternate:false,seiranStill:0,seiranLastDamage:time,seiranNextStack:time+3,seiranCounters:0,counterWindow:null,zephyrSecondDashUntil:0,zephyrDrainNext:0,varkanLastDamage:time,varkanRegenNext:time+4,varkanResists:{},varkanEcho:null,varkanRUntil:0,nebelMoveStart:0,nebelLastMove:time,nebelBlurred:false,nebelBlurReady:0,nebelFGuard:true,nebelBasic:0,bladeDamageMultiplier:1,bladeSpeedMultiplier:1,bladeFEnded:false});player.transcendence=0}};
const coreBladePassive=characterHitPassive;
characterHitPassive=function(enemy){
  coreBladePassive(enemy);if(!player?.character||!isBladeEventCharacter()||!enemy)return;const s=player.character;
  if(selectedCharacter==='harin'){s.harinBasic++;if(s.isTranscending){addHarinMark(enemy,s.harinFAlternate?'heat':'flow');s.harinFAlternate=!s.harinFAlternate}else if(s.stance.isStance('heat')&&s.harinBasic%3===0)bladeHit(enemy,5,'harin-heat-basic',0)}
  if(selectedCharacter==='seiran'&&s.seiranStill>=3){bladeHit(enemy,7,'seiran-still-basic',0);s.seiranStill=0;charBurst(enemy.x,enemy.y,'#d8f6ff',8)}
  if(selectedCharacter==='varkan'&&s.varkanRUntil>time&&time>=(enemy.varkanHealAt||0)){enemy.varkanHealAt=time+.5;player.hp=Math.min(player.maxHp,player.hp+2.5)}
  if(selectedCharacter==='nebel'&&s.isTranscending&&++s.nebelBasic%3===0)bladeHit(enemy,8,'nebel-mist-blade',0)
};

function castBladeF(){
  const s=player.character,id=selectedCharacter;s.isTranscending=true;s.bladeFEnded=false;player.transcendence=0;
  if(id==='harin'){s.transEnd=time+9;bladeSetDamage(s,1.25);bladeSetSpeed(s,1.15)}
  if(id==='seiran'){s.transEnd=time+7;s.seiranFUntil=s.transEnd;characterEffects.push({type:'ring',x:player.x,y:player.y,r:112,l:7,max:7,color:'#c9f2ff'})}
  if(id==='zephyr'){s.transEnd=time+10;s.zephyrFUntil=s.transEnd;s.zephyrDrainNext=time+1;s.zephyrSecondDashUntil=0}
  if(id==='varkan'){s.transEnd=time+9;s.varkanColonyUntil=s.transEnd;s.bladeFNext=time;s.varkanSpikeNext=time;characterEffects.push({type:'ring',x:player.x,y:player.y,r:210,l:9,max:9,color:'#c768ed'})}
  if(id==='nebel'){s.transEnd=time+8;s.nebelFUntil=s.transEnd;s.nebelFGuard=true;bladeSetSpeed(s,1.25);player.fireRate*=.75;s.nebelFireBoost=.75}
  pop(`${characterNow().f.name} 발동!`);
}
function useBladeSkill(slot){
  if(!run||paused||!player)return;const s=player.character,data=characterNow(),enemy=bladeTarget(),a=characterAim(),frontX=limit(player.x+Math.cos(a)*125,35,W-35),frontY=limit(player.y+Math.sin(a)*125,35,H-35);
  if(slot==='f'){if(player.transcendence<100){pop(`초월기 충전 ${Math.floor(player.transcendence||0)}%`);return}castBladeF();return}
  const allowDuringF=slot==='q'||slot==='e';if(s.isTranscending&&!allowDuringF){pop('초월기 사용 중');return}
  if(slot==='r'){
    if(player.ultimate<100){pop(`궁극기 충전 ${Math.floor(player.ultimate)}%`);return}player.ultimate=0;
    if(selectedCharacter==='harin'){for(let i=0;i<6;i++)bladeQueue({at:time+i*.16,type:'harin-r',index:i,enemy})}
    if(selectedCharacter==='seiran'){s.seiranRUntil=time+6;s.seiranCounters=0;characterEffects.push({type:'ring',x:player.x,y:player.y,r:205,l:6,max:6,color:data.color})}
    if(selectedCharacter==='zephyr'){const cost=Math.min(player.hp-1,player.hp*.08);player.hp-=cost;charFloat(`-${Math.ceil(cost)} HP`,player.x,player.y-58,'#ffb0a0');for(let i=0;i<5;i++)bladeQueue({at:time+i*.19,type:'zephyr-r',index:i,bonus:i===4?Math.min(12,cost):0})}
    if(selectedCharacter==='varkan'){s.varkanRUntil=time+10;s.varkanRAdded=true;player.maxHp+=35;player.hp+=35;bladeSetDamage(s,1.2);characterEffects.push({type:'ring',x:player.x,y:player.y,r:105,l:10,max:10,color:data.color})}
    if(selectedCharacter==='nebel'){s.nebelRUntil=time+1.5;s.nebelRHits=0;s.nebelRNext=time}
    pop(`${data.r.name} 발동!`);return;
  }
  if(selectedCharacter==='varkan'&&slot==='e'&&s.varkanEcho&&time<s.varkanEcho.until){const oldX=player.x,oldY=player.y;safeBladeMove(s.varkanEcho.x,s.varkanEcho.y);s.varkanEcho.x=oldX;s.varkanEcho.y=oldY;bladeArea(player.x,player.y,90,18,data.color,'varkan-e-swap',1);s.varkanEcho=null;pop('분열 잔영 교환');return}
  if(selectedCharacter==='zephyr'&&slot==='e'&&s.eCd>0&&time<s.zephyrSecondDashUntil)s.eCd=0;
  const key=slot==='q'?'qCd':'eCd';if(s[key]>0)return;s[key]=data[slot].cd*s.cooldownMultiplier;
  if(selectedCharacter==='harin'){
    if(slot==='q'){s.stance.setStance('flow');const sx=player.x,sy=player.y;safeBladeMove(player.x+Math.cos(a)*95,player.y+Math.sin(a)*95);characterEffects.push({type:'line',x:sx,y:sy,x2:player.x,y2:player.y,l:.28,max:.28,color:'#52ded3'});for(const targetEnemy of nearestEnemies(3))if(Math.hypot(targetEnemy.x-player.x,targetEnemy.y-player.y)<210){bladeHit(targetEnemy,27,'harin-q',1);addHarinMark(targetEnemy,'flow')}if(s.isTranscending)s.eCd=Math.max(0,s.eCd-1.5)}
    else{s.stance.setStance('heat');for(const targetEnemy of nearestEnemies(3))if(Math.hypot(targetEnemy.x-frontX,targetEnemy.y-frontY)<150){bladeHit(targetEnemy,31,'harin-e',1);addHarinMark(targetEnemy,'heat');bladeQueue({at:time+1,type:'hit',enemy:targetEnemy,damage:4,source:'harin-bleed'});bladeQueue({at:time+2,type:'hit',enemy:targetEnemy,damage:4,source:'harin-bleed'})}characterEffects.push({type:'ring',x:frontX,y:frontY,r:145,l:.35,max:.35,color:'#ff9c49'});if(s.isTranscending)s.qCd=Math.max(0,s.qCd-1.5)}
  }
  if(selectedCharacter==='seiran'){if(slot==='q'){const sx=player.x,sy=player.y;safeBladeMove(player.x+Math.cos(a)*150,player.y+Math.sin(a)*150);characterEffects.push({type:'line',x:sx,y:sy,x2:player.x,y2:player.y,l:.3,max:.3,color:data.color});for(const targetEnemy of nearestEnemies(3))if(Math.hypot(targetEnemy.x-player.x,targetEnemy.y-player.y)<150){bladeHit(targetEnemy,25,'seiran-q',1);targetEnemy.attackReducedUntil=time+2}}else{s.counterWindow=new CounterWindow({ownerId:'seiran',duration:1.5,damageReduction:1,onCounterSuccess:()=>{const targetEnemy=bladeTarget();bladeHit(targetEnemy,34,'seiran-counter',1);s.seiranStill=3;if(s.seiranFUntil>time)bladeArea(player.x,player.y,150,18,data.color,'seiran-f-counter',0)},onCounterFail:()=>{}});characterEffects.push({type:'ring',x:player.x,y:player.y,r:82,l:1.5,max:1.5,color:data.accent})}}
  if(selectedCharacter==='zephyr'){if(slot==='q'){const count=s.isTranscending?5:3,targets=nearestEnemies(count);targets.forEach((targetEnemy,index)=>{if(index<2||targetEnemy!==targets[0]){bladeHit(targetEnemy,12,'zephyr-q',2);if(index===0)bladeHit(targetEnemy,12,'zephyr-q',2)}const u=unit(targetEnemy.x-player.x,targetEnemy.y-player.y);targetEnemy.x+=u.x*14;targetEnemy.y+=u.y*14})}else{const beforeIds=new Set(enemies.map(v=>v.id)),sx=player.x,sy=player.y;safeBladeMove(player.x+Math.cos(a)*185,player.y+Math.sin(a)*185);const targets=nearestEnemies(3).filter(v=>Math.hypot(v.x-player.x,v.y-player.y)<125),damage=player.hp/player.maxHp<=.45?38:32;for(const targetEnemy of targets)bladeHit(targetEnemy,damage,'zephyr-e',1);if(targets.length)s.eCd=Math.max(0,s.eCd-1);if([...beforeIds].some(id=>!enemies.some(v=>v.id===id)))s.eCd=Math.max(0,s.eCd-2);if(s.isTranscending)s.zephyrSecondDashUntil=time+3;characterEffects.push({type:'line',x:sx,y:sy,x2:player.x,y2:player.y,l:.25,max:.25,color:data.color})}}
  if(selectedCharacter==='varkan'){if(slot==='q'){const range=s.varkanRUntil>time?190:145;for(const targetEnemy of nearestEnemies(3))if(Math.hypot(targetEnemy.x-frontX,targetEnemy.y-frontY)<range){bladeHit(targetEnemy,12,'varkan-q',2);if(!targetEnemy.boss){const u=unit(player.x-targetEnemy.x,player.y-targetEnemy.y);targetEnemy.x+=u.x*30;targetEnemy.y+=u.y*30}else targetEnemy.slowUntil=time+.5}}else{const sx=player.x,sy=player.y;safeBladeMove(player.x+Math.cos(a)*135,player.y+Math.sin(a)*135);s.varkanEcho={x:sx,y:sy,until:time+4,next:time,attacks:3};characterSummons=characterSummons.filter(v=>v.type!=='blade-varkan-echo');characterSummons.push({type:'blade-varkan-echo',x:sx,y:sy,l:4,cd:99,color:data.color,ownerId:'varkan'})}}
  if(selectedCharacter==='nebel'){s.nebelBlurred=true;s.nebelBlurReady=Math.max(s.nebelBlurReady,time);if(slot==='q'){const sx=player.x,sy=player.y,ex=limit(sx+Math.cos(a)*250,player.r+6,W-player.r-6),ey=limit(sy+Math.sin(a)*250,player.r+6,H-player.r-6);characterSummons=characterSummons.filter(v=>v.type!=='blade-nebel-decoy');characterSummons.push({type:'blade-nebel-decoy',x:sx,y:sy,l:1,cd:99,color:data.color,ownerId:'nebel'});let hits=0;for(const targetEnemy of [...enemies]){const vx=ex-sx,vy=ey-sy,len=vx*vx+vy*vy||1,t=limit(((targetEnemy.x-sx)*vx+(targetEnemy.y-sy)*vy)/len,0,1),hitX=sx+vx*t,hitY=sy+vy*t;if(hits<3&&Math.hypot(targetEnemy.x-hitX,targetEnemy.y-hitY)<targetEnemy.r+28){bladeHit(targetEnemy,25,`nebel-q-${targetEnemy.id}`,1);hits++}}safeBladeMove(ex,ey);characterEffects.push({type:'line',x:sx,y:sy,x2:ex,y2:ey,l:.3,max:.3,color:data.color})}else if(enemy){const origin={x:player.x,y:player.y};for(let i=0;i<3;i++)bladeQueue({at:time+i*.16,type:'nebel-e',enemy,index:i,origin})}}
  pop(`${data[slot].name} 사용`);
}
const coreBladeUseTranscendent=useTranscendentSkill;
useTranscendentSkill=function(slot){return isBladeEventCharacter()?useBladeSkill(slot):coreBladeUseTranscendent(slot)};

function processBladeQueue(s){for(let i=s.bladeQueue.length-1;i>=0;i--){const action=s.bladeQueue[i];if(time<action.at)continue;s.bladeQueue.splice(i,1);if(action.type==='hit')bladeHit(action.enemy,action.damage,action.source,0);if(action.type==='harin-r'){const enemy=enemies.includes(action.enemy)?action.enemy:bladeTarget();if(!enemy)continue;const last=action.index===5;bladeHit(enemy,last?32:10,'harin-r',action.index<3?1:0);addHarinMark(enemy,action.index%2?'heat':'flow');if(last){addHarinMark(enemy,'flow');addHarinMark(enemy,'heat');characterShake=.18;characterEffects.push({type:'ring',x:enemy.x,y:enemy.y,r:100,l:.45,max:.45,color:'#fff1bd'})}}if(action.type==='zephyr-r'){const enemy=bladeTarget();if(!enemy)continue;const last=action.index===4;bladeHit(enemy,(last?30:12)+(action.bonus||0),'zephyr-r',action.index<3?1:0);const u=unit(player.x-enemy.x,player.y-enemy.y);enemy.x+=u.x*(last?-42:16);enemy.y+=u.y*(last?-42:16);if(last)characterShake=.16}if(action.type==='nebel-e'){const enemy=enemies.includes(action.enemy)?action.enemy:bladeTarget();if(!enemy)continue;const side=action.index===0?1:action.index===1?-1:0,a=characterAim()+Math.PI/2;safeBladeMove(action.index===2?action.origin.x:enemy.x+Math.cos(a)*side*(enemy.r+30),action.index===2?action.origin.y:enemy.y+Math.sin(a)*side*(enemy.r+30));bladeHit(enemy,action.index===2&&s.isTranscending?24:11,'nebel-e',1);characterEffects.push({type:'line',x:player.x,y:player.y,x2:enemy.x,y2:enemy.y,l:.2,max:.2,color:'#dffcf8'})}}}
function finishBladeState(id,s){
  if(id==='harin'){bladeSetDamage(s,1);bladeSetSpeed(s,1);bladeArea(player.x,player.y,175,38,'#fff0b0','harin-f-end',0)}
  if(id==='seiran'){player.hp=Math.min(player.maxHp,player.hp+Math.min(21,(s.seiranStill||0)*7));s.seiranFUntil=0}
  if(id==='zephyr'){s.zephyrFUntil=0;bladeSetDamage(s,1);bladeSetSpeed(s,1)}
  if(id==='varkan'){bladeArea(player.x,player.y,210,42,'#d88df2','varkan-f-end',0);s.varkanColonyUntil=0}
  if(id==='nebel'){bladeSetSpeed(s,1);if(s.nebelFireBoost){player.fireRate/=s.nebelFireBoost;s.nebelFireBoost=0}bladeArea(player.x,player.y,165,35,'#dffff8','nebel-f-end',0);safeBladeMove(player.x+Math.cos(characterAim())*55,player.y+Math.sin(characterAim())*55)}
  s.bladeFEnded=true;
}
const coreBladeCharacterTick=characterTick;
characterTick=function(dt){
  if(!player?.character||!isBladeEventCharacter())return coreBladeCharacterTick(dt);const s=player.character,id=selectedCharacter,wasF=s.isTranscending;processBladeQueue(s);
  const moving=!!(keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD||touchMove.active);
  if(id==='harin'){const heat=s.stance.isStance('heat')?1.08:1,trans=s.isTranscending?1.25:1;bladeSetDamage(s,heat*trans);bladeSetSpeed(s,s.isTranscending?1.15:1)}
  if(id==='seiran'){if(time>=s.seiranNextStack){s.seiranNextStack=time+3;if(time-s.seiranLastDamage>=3)s.seiranStill=Math.min(3,s.seiranStill+1)}if(s.counterWindow?.isActive&&time>=s.counterWindow.expiresAt)s.counterWindow.fail();if(s.seiranFUntil>time)s.eCd=Math.max(0,s.eCd-dt)}
  if(id==='zephyr'){const ratio=player.hp/player.maxHp,low=ratio<=.25?1.24:ratio<=.45?1.14:ratio<=.7?1.06:1,boost=s.zephyrFUntil>time?1.35:1;bladeSetDamage(s,low*boost);bladeSetSpeed(s,(ratio<=.25?1.1:1)*(s.zephyrFUntil>time?1.2:1));if(s.zephyrFUntil>time&&time>=s.zephyrDrainNext){s.zephyrDrainNext=time+1;player.hp=Math.max(1,player.hp-player.maxHp*.01)}}
  if(id==='varkan'){if(time-s.varkanLastDamage>=4&&time>=s.varkanRegenNext){s.varkanRegenNext=time+1;player.hp=Math.min(player.maxHp,player.hp+(s.varkanRUntil>time?3.75:3))}if(s.varkanEcho&&time<s.varkanEcho.until&&time>=s.varkanEcho.next&&s.varkanEcho.attacks>0){s.varkanEcho.next=time+1;s.varkanEcho.attacks--;bladeArea(s.varkanEcho.x,s.varkanEcho.y,82,7,'#c46ce4','varkan-echo',1)}if(s.varkanEcho&&time>=s.varkanEcho.until)s.varkanEcho=null;if(s.varkanRUntil&&time>=s.varkanRUntil){s.varkanRUntil=0;if(s.varkanRAdded){player.maxHp-=35;player.hp=Math.min(player.hp,player.maxHp);s.varkanRAdded=false;bladeSetDamage(s,1)}}if(s.varkanColonyUntil>time){if(time>=s.bladeFNext){s.bladeFNext=time+1;player.hp=Math.min(player.maxHp,player.hp+(s.varkanRUntil>time?6.25:5));bladeArea(player.x,player.y,210,9,'#c768ed','varkan-colony',0)}if(time>=s.varkanSpikeNext){s.varkanSpikeNext=time+2;bladeHit(bladeTarget(),16,'varkan-spike',0)}}}
  if(id==='nebel'){if(moving){if(!s.nebelMoveStart)s.nebelMoveStart=time;if(time-s.nebelMoveStart>=2)s.nebelBlurred=true;s.nebelLastMove=time}else{s.nebelMoveStart=0;if(time-s.nebelLastMove>=3)s.nebelBlurred=false}if(s.nebelFUntil>time)s.qCd=Math.max(0,s.qCd-dt*.4);if(s.nebelRUntil>time&&time>=s.nebelRNext&&s.nebelRHits<7){s.nebelRNext=time+.18;s.nebelRHits++;const choices=nearestEnemies(7),enemy=choices[(s.nebelRHits-1)%Math.max(1,choices.length)];if(enemy){safeBladeMove(enemy.x-Math.cos(characterAim())*(enemy.r+28),enemy.y-Math.sin(characterAim())*(enemy.r+28));bladeHit(enemy,s.nebelRHits===7?25:13,'nebel-r',s.nebelRHits<=3?1:0);characterEffects.push({type:'ring',x:enemy.x,y:enemy.y,r:36,l:.35,max:.35,color:'#c9f8f1'})}}}
  const beforeHp=player.hp;coreBladeCharacterTick(dt);const received=Math.max(0,beforeHp-player.hp);
  if(received>0){
    if(id==='seiran'){s.seiranLastDamage=time;s.seiranNextStack=time+3;if(s.counterWindow?.isActive){player.hp=Math.min(player.maxHp,player.hp+received);s.counterWindow.success({damage:received})}else{s.seiranStill=Math.max(0,s.seiranStill-1);const reduction=Math.min(.8,(s.seiranStill||0)*.04+(s.seiranRUntil>time?.35:0)+(s.seiranFUntil>time?.45:0));player.hp=Math.min(player.maxHp,player.hp+received*reduction);if(s.seiranRUntil>time&&s.seiranCounters<7&&time>=(s.seiranCounterNext||0)){s.seiranCounterNext=time+.8;s.seiranCounters++;bladeArea(player.x,player.y,175,9,'#bdeaff','seiran-r-wave',0)}}}
    if(id==='varkan'){s.varkanLastDamage=time;s.varkanRegenNext=time+4;if(s.varkanColonyUntil>time)player.hp=Math.min(player.maxHp,player.hp+received*.25)}
    if(id==='nebel'){let reduction=0;if(s.nebelBlurred&&time>=s.nebelBlurReady){reduction=.3;s.nebelBlurred=false;s.nebelBlurReady=time+5}if(s.nebelFUntil>time&&s.nebelFGuard){reduction=Math.max(reduction,.6);s.nebelFGuard=false}player.hp=Math.min(player.maxHp,player.hp+received*Math.min(.8,reduction))}
    if(id==='harin'&&s.isTranscending&&player.hp<=player.maxHp*.35)player.hp=Math.min(player.maxHp,player.hp+received*.2)
  }
  if(wasF&&!s.isTranscending&&!s.bladeFEnded)finishBladeState(id,s);
};
const coreBladeKillEnemy=killEnemy;
killEnemy=function(enemy){const valid=!!enemy&&enemies.includes(enemy);coreBladeKillEnemy(enemy);if(valid&&selectedCharacter==='zephyr'&&player?.character?.zephyrFUntil>time&&!enemy.boss)player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.05)};

const coreBladeUpdateUI=updateCharacterUI;
updateCharacterUI=function(){coreBladeUpdateUI();if(!player?.character||!isBladeEventCharacter())return;const s=player.character,data=characterNow();let extra='';if(selectedCharacter==='harin')extra=`${s.stance.currentStance==='flow'?'유수':'작열'} 자세`;if(selectedCharacter==='seiran')extra=`정적 ${s.seiranStill||0}/3`;if(selectedCharacter==='zephyr'){const ratio=player.hp/player.maxHp;extra=`체력 ${Math.ceil(ratio*100)}% · 공격 +${ratio<=.25?24:ratio<=.45?14:ratio<=.7?6:0}%`}if(selectedCharacter==='varkan')extra=`재생 ${time-s.varkanLastDamage>=4?'활성':'대기'} · 저항 ${Object.keys(s.varkanResists||{}).length}`;if(selectedCharacter==='nebel')extra=`흐림 ${s.nebelBlurred?'활성':Math.max(0,s.nebelBlurReady-time).toFixed(1)+'초'}`;if(characterPassive)characterPassive.textContent=`${data.name} · ${extra} · F ${Math.floor(player.transcendence||0)}%`};

function ensureBladeEventBanner(){const screen=$('#characters'),heading=screen?.querySelector('.character-heading');if(!screen||!heading)return null;let banner=$('#blade-event-banner');if(!banner){banner=document.createElement('section');banner.id='blade-event-banner';banner.className='anime-event-banner blade-event-banner';heading.before(banner)}banner.innerHTML=`<div><small>상시 획득 · 검술 판타지 · 초월 ☾ COLLECTION</small><b>${BLADE_FANTASY_EVENT.name}</b><span>기간 제한 없이 언제든 획득하고 강화할 수 있습니다.</span></div><button>요원 상자로 이동</button>`;banner.querySelector('button').onclick=()=>{screen.classList.add('hidden');$('#shop')?.classList.remove('hidden');renderOperativeKeyCount()};return banner}
const coreBladeRenderList=renderCharacterList;
renderCharacterList=function(){coreBladeRenderList();ensureBladeEventBanner();const list=$('#character-list');if(!list)return;for(const id of BLADE_FANTASY_EVENT.characterIds){const button=list.querySelector(`[data-character="${id}"]`),card=button?.closest('.character-card');if(!card)continue;card.classList.add('event-exclusive','blade-exclusive');if(!card.querySelector('.event-mark'))card.insertAdjacentHTML('afterbegin','<span class="event-mark">☾ COLLECTION</span>');const data=CHARACTER_DATA[id],details=card.querySelector('.character-skills');if(details){details.innerHTML=`<strong>${data.passive}</strong><br>${data.description}<br>Q ${data.q.name}<br>E ${data.e.name}<br>R ${data.r.name}<br>F ${data.f.name}`}if(bladeEventTestMode()&&!operativeIsOwned(id)){button.disabled=false;button.textContent='테스트 선택';button.onclick=()=>{selectedCharacter=id;agentSpriteId='';refreshAgentTexture();saveOperatives();renderCharacterList();pop(`${data.name} 테스트 선택`)}}}}
const transProbability=$('.operative-probability .transcendence');if(transProbability)transProbability.textContent='초월 1% · 특별 컬렉션 상시 포함';
/* 최종 획득 함수: 등급 확률은 유지하고 신규 요원도 같은 등급 풀에 포함한다. */
grantOperative=function(source){const roll=Math.random()*100,tier=roll<23.8?'common':roll<68.4?'rare':roll<87.2?'hero':roll<99?'legend':'transcendence',pool=Object.keys(CHARACTER_DATA).filter(id=>id!=='recruit'&&CHARACTER_DATA[id].tier===tier),id=pool[Math.floor(Math.random()*pool.length)];return awardOperative(id,source)};
renderCharacterList();refreshAgentTexture();
