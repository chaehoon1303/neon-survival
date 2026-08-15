/* Neon Arsenal: equipment art, item detail panel, and optional run effects.
 * This layer deliberately keeps neonInventory/neonEquipped intact. New data lives
 * beside it, so older saves keep working and new slots can be ignored safely. */
const NEON_GEAR_ITEMS=[
  {name:'펄스 흉갑',slot:'armor',tier:'common',desc:'받는 피해 -3% · 5회 피격 시 보호막',effect:'피해를 5회 받으면 최대 HP의 5% 보호막을 생성합니다.',art:0},
  {name:'벡터 부츠',slot:'shoes',tier:'common',desc:'이동속도 증가 · 근접 가속',effect:'이동속도 +7%. 적이 가까우면 짧게 추가 가속합니다.',art:1},
  {name:'충격 건틀릿',slot:'gloves',tier:'common',desc:'근접 피해 증가 · 넉백',effect:'근접 무기 피해 +12%. 적을 낮은 확률로 밀쳐냅니다.',art:2},
  {name:'자기장 벨트',slot:'belt',tier:'rare',desc:'획득 범위 증가 · 주변 견인',effect:'획득 범위 +70. 일정 시간마다 가까운 보석과 전리품을 끌어옵니다.',art:3},
  {name:'추적 바이저',slot:'head',tier:'rare',desc:'치명타 +4% · 정예/보스 피해',effect:'치명타 확률 +4%, 정예와 보스 피해 +5%.',art:4},
  {name:'과충전 코어',slot:'necklace',tier:'hero',desc:'쿨타임 감소 · 연속 처치 가속',effect:'스킬 재사용 대기시간 -5%. 짧은 시간 20처치 시 공격속도 +10% / 4초.',art:5},
  {name:'위상 망토',slot:'armor',tier:'hero',desc:'12초마다 다음 피해 크게 감소',effect:'12초마다 다음 1회 피해를 60% 줄이고 위상 효과가 나타납니다.',art:6},
  {name:'반응형 전투복',slot:'armor',tier:'legend',desc:'저체력 공격·방어 강화',effect:'HP 50% 이하 공격 +6%/피해 -5%, 25% 이하 공격 +12%/피해 -10%.',art:7},
  {name:'제로 크라운',slot:'head',tier:'legend',desc:'적 밀집도에 따라 공격 상승',effect:'주변 적 10/25/40마리 이상에서 공격력 +5/+10/+15%.',art:8},
  {name:'특이점 외골격',slot:'armor',tier:'mythic',desc:'피해로 특이 에너지 충전',effect:'피해를 주면 에너지가 충전됩니다. 100% 시 6초간 공격 +15%, 이속 +10%, 피해 -10%.',art:9}
];
const NEON_GEAR_BY_NAME=Object.fromEntries(NEON_GEAR_ITEMS.map(item=>[item.name,item]));
const NEON_GEAR_SETS=[
  {id:'pulse-battle',name:'펄스 전투 세트',items:['펄스 흉갑','충격 건틀릿','벡터 부츠'],detail:'보호막 생성 시 이동속도 +8% / 3초.'},
  {id:'signal-hunter',name:'신호 사냥 세트',items:['추적 바이저','자기장 벨트','과충전 코어'],detail:'정예 처치 시 가까운 보석을 한 번 더 강하게 견인합니다.'}
];
const GEAR_TIER_LABEL={common:'일반',rare:'희귀',hero:'영웅',legend:'전설',mythic:'신화'};
const GEAR_UPGRADE_KEY='neonGearUpgrades';
let neonGearCombat={active:false,lastHp:0,hits:0,shield:0,phaseReady:false,phaseAt:0,energy:0,energyActiveUntil:0,killTimes:[],overchargeUntil:0,setBoostUntil:0,magnetPulse:0,lastHitAt:0};

function gearKey(item){return item?.instanceId||`${item?.slot||'gear'}:${item?.name||'unknown'}:${item?.tier||'common'}`}
function gearUpgrades(){try{return JSON.parse(localStorage.getItem(GEAR_UPGRADE_KEY)||'{}')}catch(_){return{}}}
function gearLevel(item){return Math.max(1,Math.min(5,Number(gearUpgrades()[gearKey(item)]||1)))}
function gearLegacyVariant(name){let hash=0;for(const char of String(name))hash=(hash*31+char.charCodeAt(0))>>>0;return hash%8}
function gearArt(item,large=false){
  if(!item)return '';
  const spec=NEON_GEAR_BY_NAME[item.name];
  const size=large?' gear-art-large':'';
  if(spec)return `<i class="gear-art gear-atlas gear-atlas-${spec.art}${size}" aria-label="${item.name}"></i>`;
  return `<i class="gear-art gear-legacy gear-${item.slot||'misc'} gear-v${gearLegacyVariant(item.name)} tier-${item.tier||'common'}${size}" aria-label="${item.name}"></i>`;
}
function ensureHeadSlot(){
  const loadout=document.querySelector('#equipment .loadout');
  if(loadout&&!document.querySelector('#slot-head')){
    const node=document.createElement('div');node.id='slot-head';node.className='slot head-slot';node.dataset.slot='head';node.textContent='머리';loadout.append(node);
  }
}
function isEquippedGear(item){return !!item&&equipped?.[item.slot]?.instanceId===item.instanceId}
function gearSetList(){return NEON_GEAR_SETS.filter(set=>set.items.every(name=>Object.values(equipped||{}).some(item=>item?.name===name)))}
function renderGearEffects(){
  const card=document.querySelector('#equipment .player-card');if(!card)return;
  card.querySelector('.gear-visuals')?.remove();
  const visuals=document.createElement('span');visuals.className='gear-visuals';
  if(equipped.head?.name==='추적 바이저')visuals.innerHTML+='<i class="gear-visor-scan"></i>';
  if(equipped.head?.name==='제로 크라운')visuals.innerHTML+='<i class="gear-zero-ring"></i>';
  if(equipped.shoes?.name==='벡터 부츠')visuals.innerHTML+='<i class="gear-boot-thruster"></i>';
  if(equipped.armor?.name==='특이점 외골격')visuals.innerHTML+='<i class="gear-singularity-preview"></i>';
  if(equipped.armor?.name==='위상 망토')visuals.innerHTML+='<i class="gear-phase-preview"></i>';
  if(visuals.innerHTML)card.append(visuals);
}
function renderGearSlots(){
  ensureHeadSlot();
  const labels={weapon:'무기',armor:'갑옷',gloves:'장갑',shoes:'신발',belt:'벨트',necklace:'목걸이',head:'머리'};
  for(const slot of Object.keys(labels)){
    const node=document.querySelector(`#slot-${slot}`),item=equipped?.[slot];
    if(!node)continue;
    node.classList.toggle('equipped',!!item);
    node.innerHTML=item?`${gearArt(item)}<b>${item.name}</b><small>${GEAR_TIER_LABEL[item.tier]||'일반'} · LV.${gearLevel(item)}</small>`:`<i class="slot-empty-core"></i><b>${labels[slot]}</b>`;
  }
  renderGearEffects();
}
function gearCardMarkup(item,wearing){const spec=NEON_GEAR_BY_NAME[item.name],level=gearLevel(item);return `${gearArt(item)}<span class="gear-card-copy"><em>${GEAR_TIER_LABEL[item.tier]||'일반'}${spec?' · NEON 장비':''}</em><b>${item.name}</b><small>${item.desc}</small><small class="gear-level">LV.${level} · ${wearing?'착용 중':'상세 보기'}</small></span>`}
function openGearDetail(item){
  if(!item||item.slot==='weapon')return;
  let modal=document.querySelector('#gear-detail');
  if(!modal){modal=document.createElement('section');modal.id='gear-detail';modal.className='gear-detail hidden';document.body.append(modal)}
  const spec=NEON_GEAR_BY_NAME[item.name],level=gearLevel(item),cost=35+level*25,wearing=isEquippedGear(item),setNames=NEON_GEAR_SETS.filter(set=>set.items.includes(item.name));
  modal.innerHTML=`<button class="gear-detail-close" aria-label="닫기">×</button><div class="gear-detail-art ${item.tier}">${gearArt(item,true)}</div><div class="gear-detail-title"><p>NEON EQUIPMENT</p><h2>${item.name}</h2><b class="${item.tier}">${GEAR_TIER_LABEL[item.tier]||'일반'}</b><small>${item.slot==='head'?'머리 모듈':({armor:'갑옷',gloves:'장갑',shoes:'신발',belt:'벨트',necklace:'목걸이'}[item.slot]||'장비')} · LV.${level}/5</small></div><dl><dt>기본 효과</dt><dd>${item.desc}</dd><dt>특수 효과</dt><dd>${spec?.effect||'장비 고유 효과가 전투에서 적용됩니다.'}</dd>${setNames.length?`<dt>세트 연계</dt><dd>${setNames.map(set=>`${set.name}: ${set.detail}`).join('<br>')}</dd>`:''}</dl><div class="gear-detail-actions"><button data-gear-upgrade ${level>=5?'disabled':''}>${level>=5?'강화 완료':`강화 · ${cost} <i class="game-icon icon-coin" aria-hidden="true"></i>`}</button><button data-gear-equip class="${wearing?'equipped-action':''}">${wearing?'장착 중':'장착'}</button></div>`;
  modal.querySelector('.gear-detail-close').onclick=()=>modal.classList.add('hidden');
  modal.querySelector('[data-gear-equip]').onclick=()=>{if(wearing){pop('이미 장착 중인 장비입니다.');return}equipped[item.slot]=item;saveGear();drawGear();openGearDetail(item);pop(`${item.name} 장착 완료`)};
  modal.querySelector('[data-gear-upgrade]').onclick=()=>{if(level>=5)return;if(wallet<cost){pop('코인이 부족합니다.');return}const levels=gearUpgrades();levels[gearKey(item)]=level+1;localStorage.setItem(GEAR_UPGRADE_KEY,JSON.stringify(levels));wallet-=cost;localStorage.neonCoins=wallet;renderCoins();drawGear();openGearDetail(item);pop(`${item.name} LV.${level+1} 강화 완료`)};
  modal.classList.remove('hidden');
}
function decorateGearInventory(){
  const box=document.querySelector('#inventory');if(!box)return;
  box.querySelectorAll('.item').forEach(button=>{
    const item=inventory[Number(button.dataset.item)];if(!item||item.slot==='weapon')return;
    const wearing=isEquippedGear(item);button.classList.toggle('equipped-item',wearing);button.classList.add('gear-item-card');button.innerHTML=gearCardMarkup(item,wearing);button.onclick=()=>openGearDetail(item);
  });
  renderGearSlots();
  let summary=document.querySelector('#gear-set-summary');
  if(!summary){summary=document.createElement('div');summary.id='gear-set-summary';document.querySelector('#equipment .equipment-actions')?.insertAdjacentElement('afterend',summary)}
  const active=gearSetList();summary.innerHTML=active.length?active.map(set=>`<b>${set.name}</b><small>${set.detail}</small>`).join(''):'<b>세트 연계</b><small>펄스 흉갑 · 충격 건틀릿 · 벡터 부츠를 장착하면 세트 효과가 활성화됩니다.</small>';
}
function gearMeleeWeapon(){const name=weaponCoreName(equipped?.weapon?.name||'');return ['야구방망이','카타나','빛을 쫓는 자','혼돈의 검'].includes(name)}
function gearOutgoingMultiplier(enemy){
  let multiplier=1,armor=equipped?.armor?.name,head=equipped?.head?.name;
  if(head==='추적 바이저'){if(enemy?.elite||enemy?.boss)multiplier*=1.05;if(Math.random()<.04)multiplier*=1.4}
  if(head==='제로 크라운'){const count=enemies.filter(e=>Math.hypot(e.x-player.x,e.y-player.y)<235).length;multiplier*=count>=40?1.15:count>=25?1.10:count>=10?1.05:1}
  const hpRatio=player?.hp/player?.maxHp||1;if(armor==='반응형 전투복')multiplier*=hpRatio<=.25?1.12:hpRatio<=.5?1.06:1;
  if(neonGearCombat.energyActiveUntil>time)multiplier*=1.15;
  if(neonGearCombat.overchargeUntil>time)multiplier*=1.10;
  if(gearMeleeWeapon()&&equipped?.gloves?.name==='충격 건틀릿')multiplier*=1.12;
  return multiplier;
}
function activateGearRun(){
  neonGearCombat={active:true,lastHp:player?.hp||0,hits:0,shield:0,phaseReady:equipped?.armor?.name==='위상 망토',phaseAt:(time||0)+12,energy:0,energyActiveUntil:0,killTimes:[],overchargeUntil:0,setBoostUntil:0,magnetPulse:0,lastHitAt:0};
  if(!player)return;
  if(equipped?.armor?.name==='펄스 흉갑')player.reduce+=.03;
  if(equipped?.shoes?.name==='벡터 부츠')player.speed*=1.07;
  if(equipped?.belt?.name==='자기장 벨트')player.magnet+=70;
  if(equipped?.necklace?.name==='과충전 코어')player.cdRate+=.05;
}
function gearCombatTick(now){
  const dt=Math.min(.05,(now-(gearCombatTick.last||now))/1000);gearCombatTick.last=now;
  if(!run||paused||!player||!neonGearCombat.active){requestAnimationFrame(gearCombatTick);return}
  const gc=neonGearCombat,armor=equipped?.armor?.name;
  if(player.hp<gc.lastHp-.01){
    let loss=gc.lastHp-player.hp;gc.lastHitAt=time;
    if(armor==='위상 망토'&&gc.phaseReady){player.hp=Math.min(player.maxHp,player.hp+loss*.6);gc.phaseReady=false;gc.phaseAt=time+12;effects.push({kind:'gear-phase',x:player.x,y:player.y,l:.45,r:58});pop('위상 망토 · 피해 위상화')}
    if(gc.shield>0){const absorb=Math.min(gc.shield,loss);gc.shield-=absorb;player.hp=Math.min(player.maxHp,player.hp+absorb)}
    if(armor==='펄스 흉갑'){gc.hits++;if(gc.hits>=5){gc.hits=0;gc.shield=Math.max(gc.shield,player.maxHp*.05*(1+(gearLevel(equipped.armor)-1)*.08));if(gearSetList().some(set=>set.id==='pulse-battle'))gc.setBoostUntil=time+3;pop('펄스 보호막 전개')}}
    if(armor==='반응형 전투복'){const reduction=player.hp/player.maxHp<=.25?.10:player.hp/player.maxHp<=.5?.05:0;if(reduction)player.hp=Math.min(player.maxHp,player.hp+loss*reduction)}
  }
  if(armor==='위상 망토'&&time>=gc.phaseAt)gc.phaseReady=true;
  if(equipped?.belt?.name==='자기장 벨트'){gc.magnetPulse-=dt;if(gc.magnetPulse<=0){gc.magnetPulse=2.8;for(const gem of gems){const d=Math.hypot(gem.x-player.x,gem.y-player.y)||1;if(d<310){gem.x+=(player.x-gem.x)/d*90;gem.y+=(player.y-gem.y)/d*90}}}}
  gc.lastHp=player.hp;
  requestAnimationFrame(gearCombatTick);
}
function gearAuraLoop(){
  if(run&&player){const gc=neonGearCombat;x.save();
    if(gc.shield>0){x.strokeStyle='#62efff';x.lineWidth=3;x.shadowBlur=14;x.shadowColor='#62efff';x.beginPath();x.arc(player.x,player.y,player.r+10,0,Math.PI*2);x.stroke()}
    if(gc.energyActiveUntil>time){x.strokeStyle='#bb6dff';x.lineWidth=4;x.shadowBlur=18;x.shadowColor='#a85cff';x.beginPath();x.ellipse(player.x,player.y+15,31,12,time*2,0,Math.PI*2);x.stroke();x.fillStyle='#d7a5ff';x.beginPath();x.arc(player.x,player.y-29,4,0,Math.PI*2);x.fill()}
    if(equipped?.head?.name==='추적 바이저'){x.strokeStyle='#55edff';x.globalAlpha=.65;x.beginPath();x.arc(player.x,player.y,42,-.7,.25);x.stroke()}
    x.restore();}
  requestAnimationFrame(gearAuraLoop);
}
function installGearArsenal(){
  for(const item of NEON_GEAR_ITEMS)if(!armors.some(existing=>existing.name===item.name))armors.push({...item});
  ensureHeadSlot();
  const previousIcon=itemIcon;itemIcon=function(item){return item?.slot&&item.slot!=='weapon'?gearArt(item):previousIcon(item)};
  const previousDrawGear=drawGear;drawGear=function(){previousDrawGear();decorateGearInventory()};
  const previousBegin=begin;begin=function(...args){const result=previousBegin.apply(this,args);activateGearRun();return result};
  const previousEnd=end;end=function(...args){neonGearCombat.active=false;return previousEnd.apply(this,args)};
  const previousHurt=hurt;hurt=function(enemy,damage){if(!enemy||!player)return previousHurt(enemy,damage);const before=enemy.hp,amount=Number(damage)*gearOutgoingMultiplier(enemy),result=previousHurt(enemy,amount);if(Number.isFinite(before)&&Number.isFinite(enemy.hp)&&before>enemy.hp){const dealt=before-enemy.hp;if(equipped?.armor?.name==='특이점 외골격'){neonGearCombat.energy=Math.min(100,neonGearCombat.energy+dealt*.32);if(neonGearCombat.energy>=100){neonGearCombat.energy=0;neonGearCombat.energyActiveUntil=time+6;pop('특이점 외골격 · 중력 동기화')}}if(gearMeleeWeapon()&&equipped?.gloves?.name==='충격 건틀릿'&&Math.random()<.18&&!enemy.boss){const push=unit(enemy.x-player.x,enemy.y-player.y);enemy.x+=push.x*34;enemy.y+=push.y*34}}return result};
  const previousKill=killEnemy;killEnemy=function(enemy){if(run&&equipped?.necklace?.name==='과충전 코어'){const gc=neonGearCombat;gc.killTimes.push(time);gc.killTimes=gc.killTimes.filter(t=>time-t<=4);if(gc.killTimes.length>=20&&gc.overchargeUntil<=time){gc.overchargeUntil=time+4;gc.killTimes.length=0;pop('과충전 코어 · 공격속도 상승')}}if(run&&equipped?.head?.name==='추적 바이저'&&enemy?.elite&&gearSetList().some(set=>set.id==='signal-hunter'))for(const gem of gems){const d=Math.hypot(gem.x-player.x,gem.y-player.y)||1;if(d<420){gem.x+=(player.x-gem.x)/d*145;gem.y+=(player.y-gem.y)/d*145}}return previousKill.apply(this,arguments)};
  const previousWeaponAttack=weaponAttack;weaponAttack=function(dt){return previousWeaponAttack(dt*(neonGearCombat.overchargeUntil>time?1.10:1))};
  saveGear();drawGear();requestAnimationFrame(gearCombatTick);requestAnimationFrame(gearAuraLoop);
}
setTimeout(installGearArsenal,0);
