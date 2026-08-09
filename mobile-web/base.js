// 생존자 기지: 시설을 올리되 전투에는 세 시설만 선택해서 가져간다.
let baseRestored=Number(localStorage.neonBaseRestored||0);
let baseUpgrades=JSON.parse(localStorage.neonBaseUpgrades||'{"workshop":0,"medbay":0,"engine":0,"relay":0}');
let baseLoadout=JSON.parse(localStorage.neonBaseLoadout||'["workshop","medbay","engine"]');
const baseProjects=[
  ['🛠','드론 정비소','폭주 드론을 해체해 기지의 전력을 복구합니다.'],['🔥','용암 발전기','용암 에너지를 안전한 전력으로 바꿉니다.'],['🌃','네온 상점가','생존자들이 다시 모이는 밝은 거리입니다.'],['⛺','사막 급수소','황혼 사막에서 가져온 물로 휴식 구역을 엽니다.'],['❄','온열 대피소','빙결 기지 생존자들을 위한 따뜻한 쉼터입니다.'],
  ['🌿','정화 온실','독성 늪지 식물을 정화해 작은 정원을 만듭니다.'],['🛰','통신 관제실','멀리 흩어진 생존자 신호를 수신합니다.'],['📚','기록 전시관','보스 도감과 균열 기록을 보관합니다.'],['⚙','제조 작업장','복구된 부품으로 기지의 불빛을 늘립니다.'],['✨','희망 광장','모든 지역 생존자를 위한 네온 축제 광장입니다.'],
  ['🏭','자동 생산동','기계 공장에서 회수한 설비로 보급품을 생산합니다.'],['🔥','봉인 제어실','지옥 에너지가 기지로 새지 않도록 관문을 봉인합니다.'],['🧠','AI 분석실','네온 코어의 데이터를 분석해 적의 약점을 찾습니다.'],['💎','수정 공방','유리 생명체의 파편으로 보호 장치를 만듭니다.'],['🌙','저중력 훈련장','달 기지 기술로 새로운 움직임을 훈련합니다.'],
  ['⚓','안개 부두','망각의 항구 생존선이 안전하게 정박합니다.'],['🩸','혈청 연구실','흡혈 감염을 억제하는 치료제를 연구합니다.'],['⚡','폭풍 축전소','번개 에너지를 저장해 기지에 공급합니다.'],['🌀','차원 관측소','불안정한 회랑과 균열 발생을 감시합니다.'],['🏛','오메가 기념관','최후의 신전에서 되찾은 기록을 전시합니다.'],
  ['🌌','극광 휴게원','오로라 에너지로 생존자들의 피로를 회복합니다.'],['🕰','시간 수리소','망가진 장비의 작동 시간을 안정화합니다.'],['🔷','광맥 저장고','수정 동굴에서 회수한 자원을 안전하게 보관합니다.'],['☀','태양 집광탑','태양 사원의 빛을 기지 전력으로 바꿉니다.'],['🌲','그림자 정원','어둠 속에서도 자라는 식량 작물을 재배합니다.'],
  ['⚛','양자 계산실','전투 기록을 분석해 생존 확률을 높입니다.'],['🌋','지열 정제소','잿빛 화산의 열을 안정적인 연료로 정제합니다.'],['⭐','성운 추모관','별의 묘지에서 찾은 생존자 기록을 보존합니다.'],['🌀','경계 안정기','차원 경계를 고정해 기지를 균열로부터 보호합니다.'],['💠','창세 동력핵','모든 복구 시설을 연결하는 기지의 최종 동력원입니다.']
];
const facilities={workshop:{icon:'🔧',name:'무기 정비소',desc:'무기 공격력 +4% / 레벨',apply:(p,l)=>p.damage*=1+l*.04},medbay:{icon:'✚',name:'의무실',desc:'최대 HP +8 / 레벨',apply:(p,l)=>{p.maxHp+=l*8;p.hp+=l*8}},engine:{icon:'⚡',name:'추진 엔진실',desc:'이동 속도 +4% / 레벨',apply:(p,l)=>p.speed*=1+l*.04},relay:{icon:'📡',name:'통신 중계소',desc:'맵 클리어 코인 +15 / 레벨',apply:(p,l)=>runBonus+=l*15},shieldLab:{icon:'🛡',name:'방벽 연구소',desc:'받는 피해량 -3% / 레벨',apply:(p,l)=>p.reduce+=l*.03},academy:{icon:'📘',name:'전술 교육실',desc:'경험치 획득량 +8% / 레벨',apply:(p,l)=>p.xpMult+=l*.08},scavenger:{icon:'🧲',name:'회수 탐색소',desc:'아이템 획득 범위 +20 / 레벨',apply:(p,l)=>p.magnet+=l*20},reactor:{icon:'🔋',name:'동력 반응로',desc:'스킬 쿨타임 -4% / 레벨',apply:(p,l)=>p.cdRate+=l*.04}};
for(const id of Object.keys(facilities))if(!Number.isFinite(Number(baseUpgrades[id])))baseUpgrades[id]=0;
baseLoadout=baseLoadout.filter(id=>facilities[id]).slice(0,3);
function saveBase(){localStorage.neonBaseUpgrades=JSON.stringify(baseUpgrades);localStorage.neonBaseLoadout=JSON.stringify(baseLoadout)}
function upgradeCost(id){return 100*(baseUpgrades[id]+1)}
function renderBase(){const progress=$('#base-progress'),list=$('#base-projects'),upgrades=$('#base-upgrades');if(!progress||!list||!upgrades)return;const restored=Math.min(baseRestored,baseProjects.length);progress.innerHTML=`<span>BASE RESTORATION <b>${restored} / ${baseProjects.length}</b></span><strong>ACTIVE SYSTEMS <b>${baseLoadout.length} / 3</b></strong>`;upgrades.innerHTML=Object.entries(facilities).map(([id,facility])=>{const level=baseUpgrades[id],active=baseLoadout.includes(id),cost=upgradeCost(id);return `<article class="facility-card facility-${id} ${active?'active':''}" data-facility="${id}"><i class="facility-state">${active?'ACTIVE':'STANDBY'}</i><span class="facility-icon">${facility.icon}</span><span class="facility-core"></span><b>${facility.name} <em>LV.${level}/5</em></b><small>${facility.desc}</small><button data-upgrade="${id}" ${level>=5?'disabled':''}>${level>=5?'최대 레벨':`강화 ${cost} 🪙`}</button><button class="equip" data-equip="${id}">${active?'활성 해제':'전투에 활성화'}</button></article>`}).join('');list.innerHTML=baseProjects.map((project,index)=>{const done=index<restored;return `<article class="base-project ${done?'done':''}"><span class="base-icon">${done?project[0]:'🔒'}</span><i></i><b>${done?project[1]:'미확인 구역'}</b><small>${done?project[2]:`${index+1}번째 맵을 처음 클리어하면 복구됩니다.`}</small></article>`}).join('');upgrades.querySelectorAll('[data-upgrade]').forEach(button=>button.onclick=()=>{const id=button.dataset.upgrade,cost=upgradeCost(id);if(wallet<cost){pop('코인이 부족합니다.');return}wallet-=cost;baseUpgrades[id]++;localStorage.neonCoins=wallet;saveBase();renderCoins();renderBase();pop(`${facilities[id].name} 강화 완료!`)});upgrades.querySelectorAll('[data-equip]').forEach(button=>button.onclick=()=>{const id=button.dataset.equip,index=baseLoadout.indexOf(id);if(index>=0)baseLoadout.splice(index,1);else{if(baseLoadout.length>=3){pop('전투에는 시설을 최대 3개만 활성화할 수 있습니다.');return}baseLoadout.push(id)}saveBase();renderBase()})}
$('#base-button').onclick=()=>{renderBase();$('#menu').classList.add('hidden');$('#base').classList.remove('hidden')};
const originalEnd=end;
end=function(win=false){if(win){const next=Math.max(baseRestored,selected+1);if(next>baseRestored){baseRestored=next;localStorage.neonBaseRestored=String(baseRestored)}}return originalEnd(win)};
const originalBegin=begin;
begin=function(){originalBegin();for(const id of baseLoadout){const level=baseUpgrades[id]||0;if(level)facilities[id].apply(player,level)}if(baseLoadout.some(id=>baseUpgrades[id]))pop(`기지 지원 적용: ${baseLoadout.filter(id=>baseUpgrades[id]).map(id=>facilities[id].name).join(' · ')}`)};
$('#retry-button').onclick=begin;
// 초반은 그대로 두고, 후반 지역만 기지 성장에 맞게 조금 더 강하게 만든다.
const originalSpawnEnemy=spawnEnemy;
spawnEnemy=function(isBoss=false){const previousThreat=stageThreat;stageThreat*=1+selected*.02;originalSpawnEnemy(isBoss);stageThreat=previousThreat};
renderBase();
