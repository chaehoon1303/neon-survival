const c=document.querySelector('#game'),x=c.getContext('2d'),W=1280,H=720,keys={},mouse={x:640,y:360,down:false},touchMove={x:0,y:0,active:false};
const $=s=>document.querySelector(s),ui={menu:$('#menu'),hud:$('#hud'),up:$('#upgrade'),upList:$('#upgrade-list'),result:$('#result'),picker:$('#map-picker'),cross:$('#crosshair'),hp:$('#hp-bar'),hpNum:$('#hp-num'),xp:$('#xp-bar'),lv:$('#level'),time:$('#timer'),kills:$('#kill-count'),map:$('#map-name'),stage:$('#stage-bar'),stageText:$('#stage-text'),stageLabel:$('#stage-label'),notice:$('#notice')};
const maps=[{name:'1. 훈련 구역',bg:'#101b35'},{name:'2. 용암 연구소',bg:'#351825'},{name:'3. 네온 도시',bg:'#132d37'},{name:'4. 황혼 사막',bg:'#3b2b1a'},{name:'5. 얼어붙은 기지',bg:'#183448'},{name:'6. 독성 늪지',bg:'#1a3829'},{name:'7. 붉은 협곡',bg:'#421d24'},{name:'8. 천공 정거장',bg:'#21234a'},{name:'9. 심해 연구소',bg:'#102d42'},{name:'10. 폐허 도시',bg:'#32302b'},{name:'11. 기계 공장',bg:'#283039'},{name:'12. 지옥 관문',bg:'#46121d'},{name:'13. 네온 핵심부',bg:'#28164a'},{name:'14. 유리 정원',bg:'#1a3d3d'},{name:'15. 달 기지',bg:'#34364d'},{name:'16. 망각의 항구',bg:'#17263b'},{name:'17. 크림슨 성채',bg:'#4a162a'},{name:'18. 폭풍 발전소',bg:'#203b50'},{name:'19. 무한 회랑',bg:'#29203f'},{name:'20. 최후의 신전',bg:'#481d15'},{name:'21. 오로라 초원',bg:'#163b46'},{name:'22. 시계탑 도시',bg:'#352d49'},{name:'23. 수정 동굴',bg:'#24344d'},{name:'24. 태양 사원',bg:'#4b3518'},{name:'25. 그림자 숲',bg:'#182c2b'},{name:'26. 양자 실험장',bg:'#173550'},{name:'27. 잿빛 화산',bg:'#422226'},{name:'28. 별의 묘지',bg:'#25233f'},{name:'29. 차원 경계',bg:'#2e1944'},{name:'30. 창세의 심장',bg:'#48213e'}];let selected=0,unlocked=+localStorage.neonUnlocked||0,run=false,paused=false,last=0,player,enemies=[],shots=[],gems=[],parts=[],zones=[],effects=[],drones=[],specials=[],heals=[],enemyShots=[],guardian=null,medic=null,time=0,kills=0,spawn=0,stage=0,stageKills=0,boss=null,bossSpawned=false,bossDefeated=false,noticeTime=0,nextId=1;
// 각 지역의 바닥 타일을 따로 그려, 단색 배경 대신 맵별 분위기가 보이도록 한다.
function buildMapPatterns(){const accents=['#5ad8ff','#ff7048','#ff4fd8','#e8bd62','#a9efff','#83d85d','#ed6151','#aab8ff','#53d8de','#b6aa82','#bfcbd8','#ff4a45','#bb6bff','#91fff0','#eef4ff','#65c9ef','#ff607e','#75dbff','#c798ff','#ffd16a'];maps.forEach((map,index)=>{const tile=document.createElement('canvas'),ctx=tile.getContext('2d'),size=256,accent=accents[index];tile.width=tile.height=size;const grad=ctx.createRadialGradient(128,108,10,128,128,205);grad.addColorStop(0,map.bg+'ff');grad.addColorStop(1,'#050914');ctx.fillStyle=grad;ctx.fillRect(0,0,size,size);ctx.globalAlpha=.25;ctx.strokeStyle=accent;ctx.fillStyle=accent;const kind=index%5;if(kind===0){for(let i=0;i<=size;i+=32){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,size);ctx.moveTo(0,i);ctx.lineTo(size,i);ctx.stroke()}for(let i=0;i<12;i++)ctx.fillRect((i*47)%size,(i*83)%size,3,3)}else if(kind===1){ctx.lineWidth=3;for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo((i*39)%size,0);ctx.lineTo((i*57+30)%size,70);ctx.lineTo((i*27+4)%size,150);ctx.lineTo((i*71)%size,size);ctx.stroke()}}else if(kind===2){ctx.lineWidth=2;for(let i=0;i<9;i++){let y=18+i*28;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(90,y);ctx.lineTo(112,y+14);ctx.lineTo(size,y+14);ctx.stroke()}for(let i=0;i<18;i++)ctx.fillRect((i*59)%size,(i*101)%size,5,2)}else if(kind===3){for(let i=0;i<36;i++){const px=(i*67)%size,py=(i*41)%size;ctx.beginPath();ctx.arc(px,py,1+(i%3),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=.12;for(let i=-size;i<size*2;i+=58){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i-80,size);ctx.stroke()}}else{for(let i=0;i<18;i++){const px=(i*73)%size,py=(i*109)%size;ctx.beginPath();ctx.moveTo(px,py-9);ctx.lineTo(px+8,py);ctx.lineTo(px,py+9);ctx.lineTo(px-8,py);ctx.closePath();ctx.fill()}}ctx.globalAlpha=1;map.bg=x.createPattern(tile,'repeat')||map.bg})}buildMapPatterns();
let stageThreat=1,runBonus=0,runModifier=null;
const runModifiers=[{name:'과충전 탄환',detail:'무기 공격력 +22%',apply:p=>p.damage*=1.22},{name:'질주 프로토콜',detail:'이동 속도 +18%',apply:p=>p.speed*=1.18},{name:'응급 재생',detail:'초당 체력 회복 +2',apply:p=>p.regen+=2}];
function applyRunModifier(){runModifier=runModifiers[Math.floor(Math.random()*runModifiers.length)];runModifier.apply(player);pop(`맵 변이: ${runModifier.name} · ${runModifier.detail}`)}
// 화면에 보이는 새 무기 이름과 기존 공격 구현을 연결한다. 내부 키는 저장 호환용으로만 쓴다.
const weaponCoreName=name=>({
  '유성 단도':'쿠나이','충격 철퇴':'야구방망이','노바 리볼버':'리볼버','청광 도검':'카타나','폭풍 산탄총':'샷건',
  '태양 파쇄검':'빛을 쫓는 자','공허 흡수기':'파괴의 힘','균열 장검':'혼돈의 검','여명·황혼 쌍창':'영원의 빛(쌍창)'
}[name]||name);
const weaponDisplayName=core=>({
  '쿠나이':'유성 단도','야구방망이':'충격 철퇴','리볼버':'노바 리볼버','카타나':'청광 도검','샷건':'폭풍 산탄총',
  '빛을 쫓는 자':'태양 파쇄검','파괴의 힘':'공허 흡수기','혼돈의 검':'균열 장검','영원의 빛(쌍창)':'여명·황혼 쌍창'
}[core]||core);
const totalStages=()=>5+Math.min(selected,19)*2+Math.floor(Math.max(0,selected-19)/2),stageInfo=()=>{let n=stage+1,total=totalStages(),mid=Math.ceil(total/2);return{n,total,boss:n===total?'최종 보스':n===mid?'중간 보스':null,need:10+stage*6+selected*4}};
const upgrades=[['●','플라즈마 탄심','무기 대미지 증가',p=>p.damage+=12],['♥','생체 강화 지침','최대 HP +35',p=>{p.maxHp+=35;p.hp+=35}],['✚','회복 촉진제','체력 회복 속도 증가',p=>p.regen+=1.4],['👟','벡터 러너','이동 속도 증가',p=>p.speed*=1.15],['◆','동력 응축기','스킬 쿨타임 감소',p=>p.cdRate+=.15],['🧲','중력 견인기','아이템 획득 범위 증가',p=>p.magnet+=75],['⛽','광자 연료','투사체 크기·범위 증가',p=>{p.projectileSize+=.18;p.projectileRange+=.15}],['🦾','시간 연장기','지속 스킬 유지 시간 증가',p=>p.durationRate+=.2],['➤','추진 탄피','모든 투사체 속도 증가',p=>p.ammoSpeed+=.15],['🛡','방벽 외투','받는 피해량 감소',p=>p.reduce+=.08],['📜','별자리 전술서','경험치 획득량 증가',p=>p.xpMult+=.2],['🪙','전리품 채굴권','획득 골드 증가',p=>p.goldMult+=.25],['⚡','뇌광 비콘','무작위 적에게 자동 낙뢰',p=>p.lightning++],['🔥','잔화 병','바닥에 불길을 생성',p=>p.molotov++],['⚽','반동 구체','벽에 튕기는 자동 공격',p=>p.ball++],['↩','귀환 절단환','되돌아오는 광역 투사체',p=>p.boom++],['▣','궤도 낙하석','무작위 지역에 낙하 공격',p=>p.brick++],['🚀','혜성 발사기','적을 추적해 폭발',p=>p.rpg++],['🛡','이지스 위성','회전 방패로 적을 막습니다',p=>p.guardian++],['➶','관통 송곳','화면을 튕기는 관통 투사체',p=>p.drill++],['🌰','가시 반응로','가시 구체로 적을 밀칩니다',p=>p.durian++],['┃','프리즘 광선기','적을 추적하는 지속 광선',p=>p.laser++],['✹','분열 기뢰','적이 밟으면 폭발하는 기뢰',p=>p.mine++],['✚','생체 지원 드론','치유 영역을 생성하는 드론',p=>p.medic++],['A','스위프트 드론','시즈 드론과 합체할 수 있습니다',p=>{p.droneA=true;if(p.droneB)p.destroyer=true}],['B','시즈 드론','스위프트 드론과 합체할 수 있습니다',p=>{p.droneB=true;if(p.droneA)p.destroyer=true}]];
const evolutions=[['🦈','폭성 혜성포','혜성 발사기','광자 연료','rpg','거대한 로켓 한 발로 넓은 범위를 폭발'],['⚛','반동 성운구','반동 구체','벡터 러너','ball','공의 수·반사·범위가 커져 화면을 튕김'],['🏋','궤도 중력추','궤도 낙하석','생체 강화 지침','brick','거대한 낙하체를 사방에 뿌려 넉백'],['🧲','자력 귀환환','귀환 절단환','중력 견인기','boom','캐릭터 주변을 크게 선회하며 적을 쓸어냄'],['➳','공명 송곳','관통 송곳','추진 탄피','drill','자동 추적·관통 투사체로 보스 집중 공격'],['🛡','수호 위성망','이지스 위성','시간 연장기','guardian','회전 위성이 적·탄환을 밀어내고 방어'],['☠','절대 광선','프리즘 광선기','동력 응축기','laser','넓은 광선이 회전하며 적을 절단'],['⚡','뇌성 구름','뇌광 비콘','동력 응축기','lightning','낙뢰 지점에서 충격파가 퍼짐'],['🛢','푸른 잔화','잔화 병','전리품 채굴권','molotov','푸른 불길이 주변을 돌며 근접 방어'],['🌰','철갑 가시구','가시 반응로','광자 연료','durian','거대 가시 구체가 적을 넓게 밀어냄'],['💣','화염 균열뢰','분열 기뢰','잔화 병','mineFire','폭발 뒤 불길을 남기는 지속 피해 기뢰'],['⚡','낙뢰 균열뢰','분열 기뢰','뇌광 비콘','mineShock','폭발 뒤 낙뢰 충격파로 주변 적 공격']];
upgrades.push(['◯','바스티온 장','장벽 피해량과 범위 증가',p=>p.forcefield++]);evolutions.push(['◉','성채 장벽','바스티온 장','방벽 외투','forcefield','더 큰 장벽이 적을 둔화·밀어내며 지속 피해']);
const unit=(a,b)=>{let d=Math.hypot(a,b)||1;return{x:a/d,y:b/d}};
const mapEnemyThemes=[
  {mob:'훈련 검병',color:'#6cb9ff',mark:'◆',boss:'훈련 지휘관',bossColor:'#9d7cff'},
  {mob:'용암 검병',color:'#e85d36',mark:'🔥',boss:'마그마 골렘',bossColor:'#ff7138'},
  {mob:'네온 갱',color:'#43d8e9',mark:'✦',boss:'페인트 건 로봇',bossColor:'#ff48bd'},
  {mob:'사막 약탈자',color:'#d5a65e',mark:'☀',boss:'모래 폭군',bossColor:'#e8bd58'},
  {mob:'빙결 전사',color:'#8ce8ff',mark:'❄',boss:'프로스트 타이탄',bossColor:'#8eefff'},
  {mob:'늪지 사냥꾼',color:'#70c65d',mark:'☣',boss:'독성 베히모스',bossColor:'#a2ed4b'},
  {mob:'협곡 검객',color:'#db5948',mark:'▲',boss:'붉은 바위 거인',bossColor:'#ff6a53'},
  {mob:'궤도 경비병',color:'#a8b8ff',mark:'◈',boss:'오비탈 센티널',bossColor:'#c4a1ff'},
  {mob:'심해 잠수병',color:'#4ca8bd',mark:'◉',boss:'심연의 포식자',bossColor:'#4be0dc'},
  {mob:'폐허 약탈자',color:'#a29b79',mark:'▣',boss:'철갑 파괴자',bossColor:'#d6c28a'},
  {mob:'기계 공병',color:'#a7b2bd',mark:'⚙',boss:'공장 감독관',bossColor:'#e4f0ff'},
  {mob:'지옥 검병',color:'#e44450',mark:'♨',boss:'화염 군주',bossColor:'#ff443d'},
  {mob:'코어 드론',color:'#a45bff',mark:'✧',boss:'네온 코어',bossColor:'#ff55e2'},
  {mob:'유리 수호자',color:'#66d6c1',mark:'◇',boss:'프리즘 거신',bossColor:'#8affef'},
  {mob:'월면 병사',color:'#c0c8d4',mark:'☾',boss:'월면 집행관',bossColor:'#ecf1ff'},
  {mob:'항구 해적',color:'#4d9ec2',mark:'⚓',boss:'망각의 선장',bossColor:'#58c8ff'},
  {mob:'크림슨 기사',color:'#d94a6f',mark:'♜',boss:'핏빛 군주',bossColor:'#ff5c7d'},
  {mob:'번개 정비병',color:'#7abfea',mark:'⚡',boss:'폭풍 엔진',bossColor:'#70dcff'},
  {mob:'회랑 망령',color:'#b178dc',mark:'◌',boss:'무한의 감시자',bossColor:'#e194ff'},
  {mob:'신전 수호병',color:'#d58b53',mark:'☀',boss:'태양 신전의 왕',bossColor:'#ffd05a'},
  {mob:'오로라 추적자',color:'#70f0dc',mark:'✣',boss:'오로라 수호수',bossColor:'#b1fff2'},
  {mob:'톱니 순찰자',color:'#d9a96d',mark:'⌚',boss:'크로노 거신',bossColor:'#ffd37c'},
  {mob:'수정 포식자',color:'#72cfff',mark:'◆',boss:'크리스탈 히드라',bossColor:'#b18cff'},
  {mob:'태양 사제',color:'#f4bd4a',mark:'☀',boss:'솔라 아바타',bossColor:'#fff08a'},
  {mob:'그림자 사냥꾼',color:'#4ec69b',mark:'♣',boss:'고목의 망령',bossColor:'#72ffd0'},
  {mob:'양자 실험체',color:'#4bb9ff',mark:'⎔',boss:'퀀텀 브레이커',bossColor:'#8be6ff'},
  {mob:'잿불 마수',color:'#ee654c',mark:'♨',boss:'애시 타이탄',bossColor:'#ff9b5e'},
  {mob:'성운 유령',color:'#9f92ef',mark:'✦',boss:'아스트랄 리퍼',bossColor:'#d8bcff'},
  {mob:'차원 방랑자',color:'#c15cff',mark:'◈',boss:'리프트 엠페러',bossColor:'#f08cff'},
  {mob:'창세 수호자',color:'#f4c46c',mark:'Ω',boss:'제네시스 오메가',bossColor:'#fff3a1'}
];
const enemyProfiles=[
  {mobs:['훈련 드론','스파크 드론','정비 봇','미니 터렛'],elite:['강화 드론','실험 터렛'],boss:'MK-1 훈련 로봇'},
  {mobs:['용암 슬라임','불꽃 정령','화염 도마뱀','용암 거북'],elite:['마그마 골렘','화염 기사'],boss:'라바 타이탄'},
  {mobs:['해킹 드론','네온 바이크','전기 거미','사이버 병사'],elite:['EMP 드론','네온 집행관'],boss:'네온 코어'},
  {mobs:['모래 전갈','모래 늑대','사막 독수리','모래 골렘'],elite:['거대 전갈','황금 미라'],boss:'샌드 웜'},
  {mobs:['얼음 늑대','냉기 병사','얼음 정령','냉각 드론'],elite:['아이스 골렘','프로스트 가디언'],boss:'프로스트 타이탄'},
  {mobs:['독개구리','독버섯','독뱀','늪 악어'],elite:['독성 히드라','늪 거인'],boss:'베놈 킹'},
  {mobs:['붉은 박쥐','협곡 늑대','암석 거미','절벽 골렘'],elite:['블러드 비스트','캐니언 골렘'],boss:'레드 드래곤'},
  {mobs:['우주 드론','플라즈마 봇','제트 병사','우주 슬라임'],elite:['레일건 드론','중력 병사'],boss:'오비탈 코어'},
  {mobs:['전기 해파리','돌연변이 물고기','심해 게','독 문어'],elite:['거대 상어','심해 수호자'],boss:'크라켄'},
  {mobs:['철골 골렘','떠도는 기계','붕괴 드론','폐기물 괴수'],elite:['스크랩 타이탄','철갑 병사'],boss:'메가 디바우러'},
  {mobs:['톱날 봇','용접 드론','압축 프레스','조립 기계'],elite:['터보 공병','강철 집행관'],boss:'오버로드 제조기'},
  {mobs:['임프','지옥 사냥개','용암 악마','뿔 달린 기사'],elite:['지옥 수호자','화염 대악마'],boss:'헬 로드'},
  {mobs:['방어 드론','코어 감시자','레이저 노드','해킹 봇'],elite:['제로 가드','EMP 집행자'],boss:'제로 코어'},
  {mobs:['유리 사냥꾼','수정 나비','크리스탈 늑대','유리 골렘'],elite:['프리즘 기사','수정 거인'],boss:'크리스탈 퀸'},
  {mobs:['월면 드론','저중력 병사','운석 진드기','달 슬라임'],elite:['진공 수호자','월면 골렘'],boss:'문 가디언'},
  {mobs:['유령 선원','망령 포수','저주받은 상어','안개 해적'],elite:['유령 함장','심해 망령'],boss:'고스트 캡틴'},
  {mobs:['흡혈 박쥐','피의 기사','진홍 늑대','혈액 골렘'],elite:['블러드 비스트','붉은 귀족'],boss:'블러드 킹'},
  {mobs:['번개 정령','전선 드론','코일 괴수','충전 병사'],elite:['스파크 골렘','천둥 기사'],boss:'썬더 엔진'},
  {mobs:['차원 망령','혼합 드론','균열 짐승','회랑 기사'],elite:['차원 포식자','무한 감시자'],boss:'디멘션 워커'},
  {mobs:['혼돈 드론','성역 골렘','융합 악마','창조 파편'],elite:['오메가 수호자','최후의 집행관'],boss:'창조자 오메가'},
  {mobs:['빛결 사슴','극광 나비','초원 정령','오로라 드론'],elite:['극광 기사','빛무리 거수'],boss:'오로라 수호수'},
  {mobs:['톱니 쥐','태엽 병사','시간 까마귀','시계 골렘'],elite:['분침 집행자','역행 기사'],boss:'크로노 거신'},
  {mobs:['수정 박쥐','광맥 벌레','보석 골렘','프리즘 사냥꾼'],elite:['자수정 기사','광맥 포식자'],boss:'크리스탈 히드라'},
  {mobs:['태양 풍뎅이','황금 파수꾼','빛의 사제','성화 골렘'],elite:['일식 기사','태양 심판자'],boss:'솔라 아바타'},
  {mobs:['그림자 늑대','덩굴 괴수','밤안개 정령','독가시 사냥꾼'],elite:['고목 기사','암영 포식자'],boss:'고목의 망령'},
  {mobs:['양자 슬라임','위상 드론','중첩 병사','확률 괴수'],elite:['양자 집행자','붕괴 실험체'],boss:'퀀텀 브레이커'},
  {mobs:['재 슬라임','화산 갑충','잿불 늑대','분화 골렘'],elite:['용암 심장','화산 집행자'],boss:'애시 타이탄'},
  {mobs:['별가루 망령','성운 벌레','공허 묘지기','혜성 골렘'],elite:['별빛 수확자','성운 거인'],boss:'아스트랄 리퍼'},
  {mobs:['차원 파편','균열 사냥개','위상 기사','공간 포식자'],elite:['경계 감시자','균열 군주'],boss:'리프트 엠페러'},
  {mobs:['창세 입자','원초 골렘','빛과 어둠의 기사','오메가 파편'],elite:['기원 수호자','창세 집행관'],boss:'제네시스 오메가'}
];
let questState=null;
const questTemplates=[
  {kind:'kills',title:'검격 훈련',desc:'적 처치',target:18,reward:25},{kind:'kills',title:'위협 제거',desc:'적 처치',target:35,reward:45},{kind:'kills',title:'전장 청소',desc:'적 처치',target:55,reward:70},
  {kind:'time',title:'생존 훈련',desc:'전투 생존',target:35,reward:25},{kind:'time',title:'장기 작전',desc:'전투 생존',target:70,reward:55},{kind:'time',title:'정예 생존',desc:'전투 생존',target:110,reward:85}
];
function makeQuestState(){const picks=[...questTemplates].sort(()=>Math.random()-.5).slice(0,5).map((q,n)=>({...q,id:`${Date.now()}-${n}`,progress:0,claimed:false}));return{resetAt:Date.now()+300000,quests:picks}}
function ensureQuests(){try{questState=JSON.parse(localStorage.neonQuests||'null')}catch{}if(!questState||!Array.isArray(questState.quests)||Date.now()>=questState.resetAt)questState=makeQuestState();localStorage.neonQuests=JSON.stringify(questState)}
function saveQuests(){localStorage.neonQuests=JSON.stringify(questState)}
function questProgress(kind,amount){if(!questState)return;let changed=false;for(const quest of questState.quests)if(quest.kind===kind&&!quest.claimed&&quest.progress<quest.target){quest.progress=Math.min(quest.target,quest.progress+amount);changed=true}if(changed)saveQuests()}
function renderQuests(){if(!questState)return;const list=$('#quest-list'),left=Math.max(0,questState.resetAt-Date.now()),minutes=String(Math.floor(left/60000)).padStart(2,'0'),seconds=String(Math.floor(left/1000)%60).padStart(2,'0');$('#quest-reset').textContent=`${minutes}:${seconds}`;list.innerHTML=questState.quests.map((quest,index)=>{const done=quest.progress>=quest.target;return `<article class="quest-card ${done?'done':''}"><b>${quest.title}</b><small>${quest.desc} ${Math.floor(quest.progress)} / ${quest.target}</small><progress value="${Math.min(quest.progress,quest.target)}" max="${quest.target}"></progress><small>보상 🪙 ${quest.reward}</small><button data-quest="${index}" ${!done||quest.claimed?'disabled':''}>${quest.claimed?'수령 완료':done?'보상 받기':'진행 중'}</button></article>`}).join('');list.querySelectorAll('[data-quest]').forEach(button=>button.onclick=()=>{const quest=questState.quests[+button.dataset.quest];if(!quest||quest.claimed||quest.progress<quest.target)return;quest.claimed=true;wallet+=quest.reward;localStorage.neonCoins=wallet;renderCoins();saveQuests();renderQuests()})}
function questLoop(now){const dt=Math.min(1,(now-(questLoop.last||now))/1000);questLoop.last=now;if(!questState||Date.now()>=questState.resetAt){ensureQuests();if(!$('#quests').classList.contains('hidden'))renderQuests()}if(run&&!paused)questProgress('time',dt);if(!$('#quests').classList.contains('hidden'))renderQuests();requestAnimationFrame(questLoop)}
setTimeout(()=>{ensureQuests();$('#quest-button').onclick=()=>{$('#quests').classList.remove('hidden');renderQuests()};requestAnimationFrame(questLoop)},0);
// 참고표의 스킬/무기 아이콘을 레벨업 카드에 입힌다.
const skillTextureClass={
  '쿠나이':'tex-kunai','유령 수리검':'tex-kunai','야구방망이':'tex-bat','루실':'tex-bat',
  '카타나':'tex-katana','악마의 검':'tex-katana','리볼버':'tex-revolver','사신':'tex-revolver','샷건':'tex-shotgun','개틀링':'tex-shotgun',
  '빛을 쫓는 자':'tex-light','영원의 빛':'tex-light','파괴의 힘':'tex-void','글룸 노바':'tex-void','혼돈의 검':'tex-chaos','지배의 검':'tex-chaos','영원의 빛(쌍창)':'tex-twin','영원의 빛·쌍창 완전체':'tex-twin',
  'A형 드론':'tex-drone','B형 드론':'tex-drone','의료용 드론':'tex-drone','번개 발사기':'tex-lightning','벽돌':'tex-brick','수호자':'tex-guardian','포스필드':'tex-guardian','축구공':'tex-ball','화염병':'tex-lightning','RPG':'tex-revolver','부메랑':'tex-light','드릴 샷':'tex-revolver','두리안':'tex-ball','레이저 발사기':'tex-lightning','지뢰':'tex-guardian'
};
function skillTextureLoop(){for(const card of document.querySelectorAll('.upgrade-card')){const name=card.querySelector('b')?.textContent,icon=card.querySelector('.icon'),texture=skillTextureClass[name];if(icon&&texture){icon.className=`icon textured ${texture}`}}requestAnimationFrame(skillTextureLoop)}requestAnimationFrame(skillTextureLoop);
// 참고 디자인을 바탕으로 생성한 미래 전사 스프라이트. 분홍색 배경은 로드 시 투명 처리한다.
let warriorSprite=null,shotgunBattleSprite=null,katanaBattleSprite=null,kunaiBattleSprite=null;
function edgeCutout(image,sx=30,sy=30,sw=280,sh=280){const sheet=document.createElement('canvas'),ctx=sheet.getContext('2d');sheet.width=sw;sheet.height=sh;ctx.drawImage(image,sx,sy,sw,sh,0,0,sw,sh);const data=ctx.getImageData(0,0,sw,sh),pixels=data.data,seen=new Uint8Array(sw*sh),queue=new Int32Array(sw*sh);let head=0,tail=0;const isBackground=i=>{const r=pixels[i*4],g=pixels[i*4+1],b=pixels[i*4+2];return r<88&&g<128&&b<205};const add=i=>{if(!seen[i]&&isBackground(i)){seen[i]=1;queue[tail++]=i}};for(let x=0;x<sw;x++){add(x);add((sh-1)*sw+x)}for(let y=0;y<sh;y++){add(y*sw);add(y*sw+sw-1)}while(head<tail){const p=queue[head++],x=p%sw,y=(p/sw)|0;pixels[p*4+3]=0;if(x)add(p-1);if(x<sw-1)add(p+1);if(y)add(p-sw);if(y<sh-1)add(p+sw)}ctx.putImageData(data,0,0);return sheet}
(()=>{const raw=new Image();raw.onload=()=>{const sheet=document.createElement('canvas'),ctx=sheet.getContext('2d');sheet.width=raw.width;sheet.height=raw.height;ctx.drawImage(raw,0,0);const pixels=ctx.getImageData(0,0,sheet.width,sheet.height);for(let i=0;i<pixels.data.length;i+=4){const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];if(r>115&&b>55&&g<165&&r>g*1.2&&b>g*1.05)pixels.data[i+3]=0}ctx.putImageData(pixels,0,0);warriorSprite=sheet};raw.src='assets/player-warrior-source.png'})();
const shotgunTexture=new Image();shotgunTexture.onload=()=>{const sheet=edgeCutout(shotgunTexture),ctx=sheet.getContext('2d'),data=ctx.getImageData(0,0,280,280);for(let y=0;y<280;y++)for(let x=0;x<280;x++){const i=(y*280+x)*4,dx=240-55,dy=78-195,t=Math.max(0,Math.min(1,((x-55)*dx+(y-195)*dy)/(dx*dx+dy*dy))),px=55+t*dx,py=195+t*dy,nearGun=Math.hypot(x-px,y-py)<39||(x<125&&y>150);if(!nearGun)data.data[i+3]=0}ctx.putImageData(data,0,0);shotgunBattleSprite=sheet};shotgunTexture.src='assets/shotgun-texture.png';
const katanaTexture=new Image();katanaTexture.onload=()=>{katanaBattleSprite=edgeCutout(katanaTexture)};katanaTexture.src='assets/katana-texture.png';
const kunaiTexture=new Image();kunaiTexture.onload=()=>{kunaiBattleSprite=edgeCutout(kunaiTexture,0,0,1024,1024)};kunaiTexture.src='assets/kunai-texture.png';
// 9종 주무기 공용 텍스처 시트. 초록 배경은 로드 시 투명하게 만든다.
let weaponSpriteSheet=null;
const weaponSpriteCells={쿠나이:[0,0],야구방망이:[1,0],리볼버:[2,0],카타나:[0,1],샷건:[1,1],'빛을 쫓는 자':[2,1],'파괴의 힘':[0,2],'혼돈의 검':[1,2],'영원의 빛(쌍창)':[2,2]};
(()=>{const raw=new Image();raw.onload=()=>{const sheet=document.createElement('canvas'),ctx=sheet.getContext('2d');sheet.width=raw.width;sheet.height=raw.height;ctx.drawImage(raw,0,0);const data=ctx.getImageData(0,0,sheet.width,sheet.height);for(let i=0;i<data.data.length;i+=4){const r=data.data[i],g=data.data[i+1],b=data.data[i+2];if(g>145&&g>r*1.22&&g>b*1.22)data.data[i+3]=0}ctx.putImageData(data,0,0);weaponSpriteSheet=sheet;document.documentElement.style.setProperty('--weapon-sheet',`url(${sheet.toDataURL('image/png')})`);drawGear?.()};raw.src='assets/weapon-sprite-sheet-source.png'})();
function drawWeaponSprite(coreName,size=58){const cell=weaponSpriteCells[coreName];if(!weaponSpriteSheet||!cell)return false;const sw=weaponSpriteSheet.width/3,sh=weaponSpriteSheet.height/3;x.drawImage(weaponSpriteSheet,cell[0]*sw,cell[1]*sh,sw,sh,5,-size/2,size,size);return true}
// 패시브 전용 4x3 텍스처 시트. 레벨업 카드에서 이름에 맞는 셀을 사용한다.
const passiveTextureClass={'플라즈마 탄심':'passive-core','생체 강화 지침':'passive-guide','회복 촉진제':'passive-heal','벡터 러너':'passive-boot','동력 응축기':'passive-cube','중력 견인기':'passive-pull','광자 연료':'passive-fuel','시간 연장기':'passive-coat','추진 탄피':'passive-thruster','방벽 외투':'passive-mantle','별자리 전술서':'passive-chart','전리품 채굴권':'passive-token'};let passiveSheetUrl='';
(()=>{const raw=new Image();raw.onload=()=>{const sheet=document.createElement('canvas'),ctx=sheet.getContext('2d');sheet.width=raw.width;sheet.height=raw.height;ctx.drawImage(raw,0,0);const data=ctx.getImageData(0,0,sheet.width,sheet.height);for(let i=0;i<data.data.length;i+=4){const r=data.data[i],g=data.data[i+1],b=data.data[i+2];if(g>145&&g>r*1.22&&g>b*1.22)data.data[i+3]=0}ctx.putImageData(data,0,0);passiveSheetUrl=sheet.toDataURL('image/png');document.documentElement.style.setProperty('--passive-sheet',`url(${passiveSheetUrl})`);document.querySelectorAll('.upgrade-card .icon').forEach(icon=>delete icon.dataset.texture)};raw.src='assets/passive-sprite-sheet-source.png'})();
function passiveTextureLoop(){for(const card of document.querySelectorAll('.upgrade-card')){const name=card.querySelector('b')?.textContent,icon=card.querySelector('.icon'),texture=passiveTextureClass[name];if(icon&&texture&&icon.dataset.texture!==texture){icon.dataset.texture=texture;icon.className=`icon passive-textured ${texture}`;if(passiveSheetUrl)icon.style.backgroundImage=`url("${passiveSheetUrl}")`}}requestAnimationFrame(passiveTextureLoop)}requestAnimationFrame(passiveTextureLoop);
const activeTextureClass={'뇌광 비콘':'active-lightning','잔화 병':'active-flask','반동 구체':'active-orb','귀환 절단환':'active-disc','궤도 낙하석':'active-block','혜성 발사기':'active-rocket','이지스 위성':'active-aegis','관통 송곳':'active-drill','가시 반응로':'active-spike','프리즘 광선기':'active-laser','분열 기뢰':'active-mine','생체 지원 드론':'active-medic','스위프트 드론':'active-swift','시즈 드론':'active-siege','바스티온 장':'active-field','파괴자':'active-destroyer'};let activeSheetUrl='',activeSkillSpriteSheet=null;
(()=>{const raw=new Image();raw.onload=()=>{const sheet=document.createElement('canvas'),ctx=sheet.getContext('2d');sheet.width=raw.width;sheet.height=raw.height;ctx.drawImage(raw,0,0);const data=ctx.getImageData(0,0,sheet.width,sheet.height);for(let i=0;i<data.data.length;i+=4){const r=data.data[i],g=data.data[i+1],b=data.data[i+2];if(g>145&&g>r*1.22&&g>b*1.22)data.data[i+3]=0}ctx.putImageData(data,0,0);activeSkillSpriteSheet=sheet;activeSheetUrl=sheet.toDataURL('image/png');document.documentElement.style.setProperty('--active-sheet',`url(${activeSheetUrl})`);document.querySelectorAll('.upgrade-card .icon').forEach(icon=>delete icon.dataset.texture)};raw.src='assets/active-skill-sprite-sheet-source.png'})();
function activeTextureLoop(){for(const card of document.querySelectorAll('.upgrade-card')){const name=card.querySelector('b')?.textContent,icon=card.querySelector('.icon'),texture=activeTextureClass[name];if(icon&&texture&&icon.dataset.texture!==texture){icon.dataset.texture=texture;icon.className=`icon active-textured ${texture}`;if(activeSheetUrl)icon.style.backgroundImage=`url("${activeSheetUrl}")`}}requestAnimationFrame(activeTextureLoop)}requestAnimationFrame(activeTextureLoop);
const activeWorldCells={lightning:[0,0],flask:[1,0],orb:[2,0],disc:[3,0],block:[0,1],rocket:[1,1],aegis:[2,1],drill:[3,1],spike:[0,2],laser:[1,2],mine:[2,2],medic:[3,2],swift:[0,3],siege:[1,3],field:[2,3],destroyer:[3,3]};
function drawActiveWorldIcon(cell,px,py,size,angle=0,alpha=1,flip=false){if(!activeSkillSpriteSheet)return;size*=1.18;const [col,row]=cell,sw=activeSkillSpriteSheet.width/4,sh=activeSkillSpriteSheet.height/4;x.save();x.globalAlpha=alpha;x.translate(px,py);x.rotate(angle);if(flip)x.scale(-1,1);x.drawImage(activeSkillSpriteSheet,col*sw,row*sh,sw,sh,-size/2,-size/2,size,size);x.restore()}
function activeSkillWorldLoop(now){const dt=Math.min(.04,(now-(activeSkillWorldLoop.last||now))/1000);activeSkillWorldLoop.last=now;if(run&&activeSkillSpriteSheet){for(const f of effects)if(f.kind==='bolt')drawActiveWorldIcon(activeWorldCells.lightning,f.x,f.y-38,104,0,Math.min(1,f.l*4));for(const f of effects)if(f.kind==='brick'){drawActiveWorldIcon(activeWorldCells.block,f.x,f.y,102,Math.sin(time*8)*.22,Math.min(1,f.l*3));for(const enemy of [...enemies])if(Math.hypot(enemy.x-f.x,enemy.y-f.y)<f.r)hurt(enemy,f.damage*dt/.45)}for(const shot of shots){const cell=shot.kind==='molotov'?activeWorldCells.flask:shot.kind==='ball'?activeWorldCells.orb:shot.kind==='boom'?activeWorldCells.disc:shot.kind==='rpg'?activeWorldCells.rocket:null;if(cell)drawActiveWorldIcon(cell,shot.x,shot.y,shot.kind==='rpg'?82:shot.kind==='ball'?68:62,Math.atan2(shot.vy,shot.vx))}for(const special of specials){const cell=special.kind==='drill'?activeWorldCells.drill:special.kind==='durian'?activeWorldCells.spike:special.kind==='laser'?activeWorldCells.laser:special.kind==='mine'?activeWorldCells.mine:null;if(cell)drawActiveWorldIcon(cell,special.x,special.y,special.kind==='laser'?120:special.kind==='durian'?96:78,Math.atan2(special.vy||0,special.vx||1))}if(guardian)drawActiveWorldIcon(activeWorldCells.aegis,guardian.x,guardian.y,108,0);if(medic)drawActiveWorldIcon(activeWorldCells.medic,medic.x,medic.y,78,0,1,medic.x<player.x);for(const drone of drones){const cell=drone.type==='A'?activeWorldCells.swift:drone.type==='B'?activeWorldCells.siege:activeWorldCells.destroyer;drawActiveWorldIcon(cell,drone.x,drone.y,drone.type==='destroyer'?104:70,0,1,drone.x<player.x)}if(player?.forcefield)drawActiveWorldIcon(activeWorldCells.field,player.x,player.y,190,time*.35,.38)}requestAnimationFrame(activeSkillWorldLoop)}
setTimeout(()=>requestAnimationFrame(activeSkillWorldLoop),300);
// 드론의 공전 속도를 낮추고, 위·아래 방향에서도 텍스처 회전 없이 좌우 반전만 사용한다.
function slowDroneOrbitLoop(){if(run&&player){for(const drone of drones){const speed=drone.type==='A'?3:drone.type==='B'?-1.7:2.25,radius=drone.type==='destroyer'?76:drone.type==='A'?58:64,a=time*speed;drone.x=player.x+Math.cos(a)*radius;drone.y=player.y+Math.sin(a)*radius}}requestAnimationFrame(slowDroneOrbitLoop)}setTimeout(()=>requestAnimationFrame(slowDroneOrbitLoop),290);
// 기존 낙뢰선·레이저선은 지우고 새 전용 아이콘만 남긴다.
function clearLegacySkillBeamsLoop(){if(run){x.save();x.fillStyle=maps[selected].bg;for(const effect of effects)if(effect.kind==='bolt')x.fillRect(effect.x-34,0,68,effect.y+8);for(const special of specials)if(special.kind==='laser')x.fillRect(special.x-18,0,36,special.y+8);x.restore()}requestAnimationFrame(clearLegacySkillBeamsLoop)}
setTimeout(()=>requestAnimationFrame(clearLegacySkillBeamsLoop),280);
// 맵별 적 텍스처: 초록 배경과 가장자리의 초록 잔상까지 투명하게 처리한다.
function removeGreenScreen(ctx,w,h){const data=ctx.getImageData(0,0,w,h);for(let i=0;i<data.data.length;i+=4){const r=data.data[i],g=data.data[i+1],b=data.data[i+2],spill=g-Math.max(r,b);if(g>90&&spill>38)data.data[i+3]=Math.round(data.data[i+3]*Math.max(0,1-(spill-38)/65))}ctx.putImageData(data,0,0)}
let enemyThemeSpriteSheet=null;
(()=>{const raw=new Image();raw.onload=()=>{const sheet=document.createElement('canvas'),ctx=sheet.getContext('2d');sheet.width=raw.width;sheet.height=raw.height;ctx.drawImage(raw,0,0);removeGreenScreen(ctx,sheet.width,sheet.height);enemyThemeSpriteSheet=sheet};raw.src='assets/enemy-theme-sprite-sheet-source.png'})();
let enemyRoleSpriteSheet=null;
(()=>{const raw=new Image();raw.onload=()=>{const sheet=document.createElement('canvas'),ctx=sheet.getContext('2d');sheet.width=raw.width;sheet.height=raw.height;ctx.drawImage(raw,0,0);removeGreenScreen(ctx,sheet.width,sheet.height);enemyRoleSpriteSheet=sheet};raw.src='assets/enemy-role-sprite-sheet-source.png'})();
const enemyRoleCells={charge:[0,0],shooter:[1,0],tank:[2,0],dash:[3,0],bomber:[0,1],support:[1,1],summoner:[2,1],elite:[3,1]};
// 모든 적은 다리 애니메이션 대신 부양 코어·드론 실루엣으로 통일한다. 역할은 날개·포대·링의 형태로만 구분한다.
function drawHoverEnemy(enemy){
  const size=enemy.boss?76:enemy.elite?48:32,phase=(time*2.3+enemy.id*.71),bob=Math.sin(phase)*Math.max(3,size*.06),color=enemy.boss?(enemy.theme?.bossColor||'#ff6dba'):enemy.elite?'#ffc95a':(enemy.theme?.color||'#63e8ff'),role=enemy.elite?'elite':enemy.role||'charge',cy=enemy.y+bob;
  x.save();x.translate(enemy.x,cy);x.globalCompositeOperation='source-over';
  x.fillStyle='#0007';x.beginPath();x.ellipse(0,size*.55,size*.58,size*.12,0,0,Math.PI*2);x.fill();
  x.shadowBlur=enemy.boss?24:12;x.shadowColor=color;
  if(enemy.boss){
    x.strokeStyle=color;x.lineWidth=4;for(let ring=0;ring<3;ring++){x.save();x.rotate(phase*(ring%2?-.7:.5)+ring);x.beginPath();x.ellipse(0,0,size*.54-ring*7,size*.22+ring*6,0,.25,Math.PI*1.78);x.stroke();x.restore()}
    x.fillStyle='#101a32';x.beginPath();x.arc(0,0,size*.38,0,Math.PI*2);x.fill();x.strokeStyle='#e8fbff';x.lineWidth=3;x.stroke();x.fillStyle=color;x.beginPath();x.arc(0,0,size*.16,0,Math.PI*2);x.fill();
  }else{
    x.fillStyle='#0a1830';x.beginPath();x.ellipse(0,0,size*.58,size*.31,0,0,Math.PI*2);x.fill();x.strokeStyle=color;x.lineWidth=enemy.elite?4:3;x.stroke();
    if(role==='tank'||role==='elite'){x.strokeStyle='#dffbff';x.lineWidth=3;x.beginPath();x.arc(0,0,size*.43,.25,Math.PI-.25);x.stroke()}
    if(role==='dash'){x.fillStyle=color;x.beginPath();x.moveTo(-size*.85,0);x.lineTo(-size*.22,-size*.2);x.lineTo(-size*.22,size*.2);x.fill();x.beginPath();x.moveTo(size*.85,0);x.lineTo(size*.22,-size*.2);x.lineTo(size*.22,size*.2);x.fill()}
    else if(role==='shooter'){x.fillStyle='#dffbff';x.fillRect(size*.22,-3,size*.58,6);x.fillStyle=color;x.beginPath();x.arc(size*.84,0,5,0,Math.PI*2);x.fill()}
    else if(role==='bomber'){x.rotate(phase);x.fillStyle='#ffba55';x.beginPath();x.moveTo(0,-size*.56);x.lineTo(size*.45,size*.32);x.lineTo(-size*.45,size*.32);x.closePath();x.fill()}
    else if(role==='support'){x.strokeStyle='#8dffb6';x.lineWidth=3;x.beginPath();x.arc(0,0,size*.7,0,Math.PI*2);x.stroke()}
    else if(role==='summoner'){x.strokeStyle='#e8beff';x.lineWidth=3;x.beginPath();x.moveTo(0,-size*.15);x.lineTo(0,-size*.72);x.stroke();x.beginPath();x.arc(0,-size*.78,4,0,Math.PI*2);x.stroke()}
    else{x.fillStyle=color;x.fillRect(-size*.42,-size*.1,size*.84,size*.2)}
    x.fillStyle=color;x.beginPath();x.arc(0,0,size*.17,0,Math.PI*2);x.fill();
  }
  x.restore();
  const barW=enemy.boss?132:Math.max(44,size*1.45),barY=cy-size*.72;x.fillStyle='#181d2c';x.fillRect(enemy.x-barW/2,barY,barW,6);x.fillStyle=enemy.boss?'#ff6d75':enemy.elite?'#ffc95a':'#63e8ff';x.fillRect(enemy.x-barW/2,barY,barW*Math.max(0,enemy.hp/enemy.maxHp),6);
  if(enemy.elite||enemy.boss){x.fillStyle='#fff';x.font=enemy.boss?'bold 13px sans-serif':'bold 10px sans-serif';x.textAlign='center';x.fillText(enemy.name,enemy.x,barY-6)}
}
function enemyTextureLoop(){if(run)for(const enemy of enemies)drawHoverEnemy(enemy);requestAnimationFrame(enemyTextureLoop)}setTimeout(()=>requestAnimationFrame(enemyTextureLoop),430);
// 아래의 예전 draw 루프가 그리던 원형 몬스터는 투명으로 바꿔 새 스프라이트만 남긴다.
function hideLegacyEnemyLoop(){if(run)for(const enemy of enemies)enemy.color='rgba(0,0,0,0)';requestAnimationFrame(hideLegacyEnemyLoop)}requestAnimationFrame(hideLegacyEnemyLoop);
// 장비 화면은 상자 화면처럼 별도의 전용 화면으로 연다. 무기는 종류별 아이콘을 사용한다.
setTimeout(()=>{
  const weaponIcons={
    '유성 단도':'✦','충격 철퇴':'⚡','노바 리볼버':'✹','청광 도검':'☾','폭풍 산탄총':'☄',
    '태양 파쇄검':'☀','공허 흡수기':'◉','균열 장검':'◆','여명·황혼 쌍창':'✧'
  };
  itemIcon=item=>item.slot==='weapon'?(weaponIcons[item.name]||'⚔️'):({armor:'🛡️',gloves:'🧤',shoes:'👟',belt:'🪢',necklace:'📿'})[item.slot]||'✦';
  drawGear=()=>{
    const labels={weapon:'무기',armor:'갑옷',gloves:'장갑',shoes:'신발',belt:'벨트',necklace:'목걸이'};
    for(const slot of Object.keys(labels)){
      const node=$('#slot-'+slot),item=equipped[slot];
      if(!node)continue;
      node.innerHTML=item?`<span class="slot-icon">${itemIcon(item)}</span><b>${item.name}</b>`:labels[slot];
      node.classList.toggle('equipped',!!item);
    }
    const box=$('#inventory');
    if(box)box.innerHTML=inventory.length?inventory.map((item,n)=>`<button class="item ${item.tier}" data-item="${n}"><span class="item-icon">${itemIcon(item)}</span><b>${item.name}</b><small>${item.desc}</small></button>`).join(''):'아직 획득한 장비가 없습니다.';
    box?.querySelectorAll('.item').forEach(button=>button.onclick=()=>{const item=inventory[+button.dataset.item];equipped[item.slot]=item;saveGear();drawGear()});
  };
  $('#equipment-button').onclick=()=>{$('#menu').classList.add('hidden');$('#equipment').classList.remove('hidden');drawGear()};
  drawGear();
},0);
// 보유 장비 화면 전용 정렬: 실제 인벤토리 순서는 바꾸지 않는다.
setTimeout(()=>{
  const ranks={common:0,rare:1,hero:2,legend:3,mythic:4};
  let sortMode='tier-desc';
  const originalDrawGear=drawGear;
  const renderSortedInventory=()=>{
    const box=$('#inventory');if(!box)return;
    const items=inventory.map((item,index)=>({item,index}));
    const byRank=(a,b)=>ranks[a.item.tier||'common']-ranks[b.item.tier||'common'];
    if(sortMode==='tier-desc')items.sort((a,b)=>byRank(b,a)||b.index-a.index);
    else if(sortMode==='tier-asc')items.sort((a,b)=>byRank(a,b)||b.index-a.index);
    else if(sortMode==='recent')items.sort((a,b)=>b.index-a.index);
    else if(sortMode==='oldest')items.sort((a,b)=>a.index-b.index);
    else items.sort((a,b)=>a.item.name.localeCompare(b.item.name,'ko')||byRank(b,a)||b.index-a.index);
    box.innerHTML=items.length?items.map(({item,index})=>`<button class="item ${item.tier}" data-item="${index}"><span class="item-icon">${itemIcon(item)}</span><b>${item.name}</b><small>${item.desc}</small></button>`).join(''):'아직 획득한 장비가 없습니다.';
    box.querySelectorAll('.item').forEach(button=>button.onclick=()=>{const item=inventory[+button.dataset.item];equipped[item.slot]=item;saveGear();drawGear()});
  };
  drawGear=()=>{originalDrawGear();renderSortedInventory()};
  $('#inventory-sort').onchange=e=>{sortMode=e.target.value;renderSortedInventory()};
  drawGear();
},0);
setTimeout(()=>{const previousItemIcon=itemIcon;itemIcon=item=>item.name==='샷건'?'<i class="gear-shotgun" aria-label="샷건"></i>':previousItemIcon(item);drawGear()},0);
setTimeout(()=>{const previousItemIcon=itemIcon;itemIcon=item=>item.name==='카타나'?'<i class="gear-katana" aria-label="카타나"></i>':previousItemIcon(item);drawGear()},0);
setTimeout(()=>{const previousItemIcon=itemIcon;itemIcon=item=>item.name==='쿠나이'?'<i class="gear-kunai" aria-label="쿠나이"></i>':previousItemIcon(item);drawGear()},0);
setTimeout(()=>{const previousItemIcon=itemIcon,thumbClass={쿠나이:'dagger',야구방망이:'mace',리볼버:'revolver',카타나:'blade',샷건:'scatter','빛을 쫓는 자':'solar','파괴의 힘':'void','혼돈의 검':'rift','영원의 빛(쌍창)':'lances'};itemIcon=item=>{const key=thumbClass[weaponCoreName(item.name)];return item.slot==='weapon'&&key?`<i class="weapon-thumb weapon-${key}" aria-label="${item.name}"></i>`:previousItemIcon(item)};drawGear()},0);
// 상자를 여는 동안 두 번의 심장 박동 뒤에 보상을 공개한다.
setTimeout(()=>{
  const revealCrate=buy;
  let crateOpening=false;
  function crateHeartbeat(){
    if(!audioCtx)return;
    const now=audioCtx.currentTime;
    [[72,0],[58,.18],[80,.43],[62,.61]].forEach(([freq,delay])=>{
      const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
      osc.type='sine';osc.frequency.setValueAtTime(freq,now+delay);
      gain.gain.setValueAtTime(0.0001,now+delay);
      gain.gain.exponentialRampToValueAtTime(.12*musicVolume,now+delay+.025);
      gain.gain.exponentialRampToValueAtTime(.0001,now+delay+.14);
      osc.connect(gain).connect(audioCtx.destination);osc.start(now+delay);osc.stop(now+delay+.16);
    });
    setTimeout(()=>tone(620,.12,.07,'triangle'),760);
  }
  buy=kind=>{
    if(crateOpening)return;
    if(wallet<100){$('#shop-result').textContent='코인이 부족합니다.';return}
    if(!audioCtx)startMusic('menu');
    crateOpening=true;
    const result=$('#shop-result');
    result.className='loot-result opening';
    result.innerHTML='<b>상자를 여는 중…</b><small>두근… 두근…</small>';
    crateHeartbeat();
    setTimeout(()=>{revealCrate(kind);result.classList.remove('opening');crateOpening=false},880);
  };
},0);
// 중간/최종 보스는 경고음 3초 뒤 맵 중앙에 등장한다.
setTimeout(()=>{
  const createEnemy=spawnEnemy;
  let bossEntrancePending=false;
  const decorateEnemy=created=>{if(!created)return created;const theme=mapEnemyThemes[selected]||mapEnemyThemes[0],profile=enemyProfiles[selected]||enemyProfiles[0];created.theme=theme;created.airborne=true;if(created.boss){created.name=profile.boss;created.color=theme.bossColor;created.r=Math.max(created.r,58);created.phase=selected===19?3:1}else{const roll=Math.random(),elite=roll<.12,role=elite?'elite':roll<.26?'shooter':roll<.38?'bomber':roll<.52?'tank':roll<.64?'dash':roll<.75?'support':roll<.84?'summoner':'charge';created.elite=elite;created.role=role;created.name=elite?profile.elite[Math.floor(Math.random()*profile.elite.length)]:profile.mobs[Math.floor(Math.random()*profile.mobs.length)];created.color=theme.color;created.melee=role!=='shooter';if(elite){created.hp*=2.5;created.maxHp*=2.5;created.damage*=1.45;created.r*=1.25}if(role==='tank'){created.hp*=2;created.maxHp*=2;created.speed*=.6}if(role==='dash')created.speed*=1.7;if(role==='shooter')created.type='shooter';if(role==='bomber')created.type='bomber'}return created};
  spawnEnemy=isBoss=>{
    if(!isBoss){createEnemy(false);return decorateEnemy(enemies[enemies.length-1])}
    if(bossEntrancePending||boss)return;
    bossEntrancePending=true;
    const warnedStage=stage;let beat=0;
    if(!audioCtx)startMusic('game');
    const warning=setInterval(()=>{tone(beat++%2?680:920,.14,.085,'square')},360);
    pop('⚠ 보스 접근! 3초 후 중앙에 출현합니다');
    setTimeout(()=>{
      clearInterval(warning);bossEntrancePending=false;
      if(!run||stage!==warnedStage||boss)return;
      const created=decorateEnemy(createEnemy(true));
      if(created){created.x=W/2;created.y=H/2;created.centerEntrance=1.2;created.centerLocked=true;created.patternCd=2.2}
    },3000);
  };
},0);
// 같은 장비 다섯 개를 한 단계 높은 희귀도로 합성한다.
setTimeout(()=>{
  const tiers=['common','rare','hero','legend','mythic'];
  const tierName={common:'일반',rare:'희귀',hero:'영웅',legend:'전설',mythic:'신화'};
  function renderForge(){
    const list=$('#forge-list');
    const groups=new Map();
    for(const item of inventory){const key=`${item.slot}|${item.name}|${item.tier||'common'}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item)}
    if(!groups.size){list.innerHTML='<p>합성할 장비가 없습니다. 상자에서 장비를 획득하세요.</p>';return}
    list.innerHTML=[...groups.entries()].map(([key,items])=>{
      const item=items[0],rank=tiers.indexOf(item.tier||'common'),can=items.length>=5&&rank<tiers.length-1;
      const bonus=item.slot==='weapon'?`공격력 +${rank*35}% · 공속 +${rank*12}%`:'상위 희귀도 장비';
      return `<article class="forge-card ${item.tier}"><span class="forge-icon">${itemIcon(item)}</span><b>${item.name}</b><small>${tierName[item.tier]||'일반'} · 보유 ${items.length}/5</small><small>${bonus}</small><button data-forge="${key}" ${can?'':'disabled'}>${rank===4?'최대 등급':can?'5개 합성':'장비 5개 필요'}</button></article>`;
    }).join('');
    list.querySelectorAll('[data-forge]').forEach(button=>button.onclick=()=>{
      const [slot,name,tier]=button.dataset.forge.split('|'),rank=tiers.indexOf(tier);
      const indexes=[];inventory.forEach((item,i)=>{if(item.slot===slot&&item.name===name&&(item.tier||'common')===tier)indexes.push(i)});
      if(indexes.length<5||rank<0||rank>=tiers.length-1)return;
      const crafted={...inventory[indexes[0]],tier:tiers[rank+1]};
      indexes.slice(0,5).sort((a,b)=>b-a).forEach(i=>inventory.splice(i,1));
      inventory.push(crafted);
      if(equipped[slot]?.name===name&&(equipped[slot].tier||'common')===tier)equipped[slot]=crafted;
      saveGear();drawGear();renderForge();
      if(!audioCtx)startMusic('menu');tone(440,.1,.07,'square');setTimeout(()=>tone(880,.28,.09,'triangle'),100);
    });
  }
  $('#forge-button').onclick=()=>{$('#equipment').classList.add('hidden');$('#forge').classList.remove('hidden');renderForge()};
  $('#forge-back').onclick=()=>{$('#forge').classList.add('hidden');$('#equipment').classList.remove('hidden');drawGear()};
},0);
// 장착 무기도 전투 레벨업 선택지에서 1성부터 5성, 그리고 돌파까지 성장한다.
setTimeout(()=>{
  const weaponGrowth={
    '쿠나이':{icon:'✦',passive:'별자리 전술서',evo:'성운 난격',levels:['가장 가까운 적에게 자동 발사','피해량 증가 · 2발 발사','추가 발사 · 공격 성능 증가','발사 수·피해량 증가','발사 수와 피해량 최대']},
    '야구방망이':{icon:'⚡',passive:'생체 강화 지침',evo:'중력 파쇄봉',levels:['앞쪽을 휘둘러 넉백','범위·피해량 증가 · 공속 증가','범위·피해량 추가 증가','범위·공속 강화','휘두르기·넉백 최대']},
    '리볼버':{icon:'✹',passive:'플라즈마 탄심',evo:'쌍성 집행자',levels:['강한 단발 총알 발사','총알 피해량 크게 증가','피해량·사격 성능 강화','피해량 추가 상승','단발 피해량 최대']},
    '카타나':{icon:'☾',passive:'방벽 외투',evo:'월식의 검',levels:['앞쪽 검기 발사','검기 피해량·수 증가','앞뒤 동시 공격','검기 수·피해량 증가','범위·검기·피해량 최대']},
    '샷건':{icon:'☄',passive:'플라즈마 탄심',evo:'천둥 기관포',levels:['부채꼴 산탄 발사','산탄 수·피해량 증가','산탄 수·범위 추가 증가','피해량·범위 강화','산탄 수·범위·피해량 최대']},
    '빛을 쫓는 자':{icon:'☀',passive:'방벽 외투',evo:'극광 연쇄검',levels:['빛의 검기 발사','검기 수·피해량 증가','검기 수·범위 추가 증가','더 많은 방향 공격','주변 대부분을 덮는 검기']},
    '파괴의 힘':{icon:'◉',passive:'시간 연장기',evo:'암흑 성운',levels:['블랙홀 지속 피해','피해량 증가','크기·흡입 범위 증가','지속 시간·피해량 증가','크기·피해량·발사 성능 최대']},
    '혼돈의 검':{icon:'◆',passive:'중력 견인기',evo:'심연 지배검',levels:['적을 향해 검 공격','피해량·검 길이 증가','거리·공격 간격 강화','검 공격 수·범위 증가','검진·찌르기 최대 성능']}
  };
  function weaponChoice(){
    const name=equipped?.weapon?.name;
    if(!name)return null;
    player.weaponLevels||={};
    if(weaponCoreName(name)==='영원의 빛(쌍창)'){
      const a=player.weaponLevels['성단의 창']||1,b=player.weaponLevels['파멸의 창']||1;
      if(a>=5&&b>=5&&!player.weaponEvolved)return {evo:true,icon:'🔱',name:'태초의 쌍성창',desc:'성단의 창 5성 + 파멸의 창 5성 · 빛과 공허 공격이 동시 발동'};
      const key=a<=b?'성단의 창':'파멸의 창',lv=player.weaponLevels[key]||1;
      return {key,icon:key==='성단의 창'?'✨':'🌀',name:key,lv,desc:lv===1?'피해량·공격 수 증가':lv===2?'공격 수·범위 증가':lv===3?'피해량·광역 성능 강화':lv===4?'마지막 5성 강화':'최대 강화'};
    }
    const data=weaponGrowth[weaponCoreName(name)];if(!data)return null;
    const lv=player.weaponLevels[name]||1;
    if(lv>=5){if(!player.weaponEvolved&&(player.levels[data.passive]||0)>=5)return {evo:true,icon:data.icon,name:data.evo,desc:`5성 ${name} + ${data.passive} · ${data.evo} 돌파`};return null}
    return {key:name,icon:data.icon,name,lv,desc:data.levels[lv]};
  }
  levelUp=()=>{
    paused=true;ui.upList.innerHTML='';
    const cards=[],weapon=weaponChoice();if(weapon)cards.push({weapon});
    const skillEvos=evolutions.filter(e=>(player.levels[e[2]]||0)>=5&&(player.levels[e[3]]||0)>=5&&!player.evolved[e[4]]).sort(()=>Math.random()-.5);
    for(const evo of skillEvos)if(cards.length<3)cards.push({evo});
    const pool=upgrades.filter(u=>{if(u[1]==='스위프트 드론')return !player.droneA;if(u[1]==='시즈 드론')return !player.droneB;return(player.levels[u[1]]||0)<5}).sort(()=>Math.random()-.5);
    for(const u of pool)if(cards.length<3)cards.push({u});
    cards.forEach(card=>{const b=document.createElement('button');b.className='upgrade-card';
      if(card.weapon){const w=card.weapon;b.innerHTML=`<span class="icon">${w.icon}</span><b>${w.name}</b><small>${w.evo?'무기 돌파':`무기 강화 · ${w.lv+1}성`}<br>${w.desc}</small>`;b.onclick=()=>{if(w.evo){player.weaponEvolved=true;pop(`${w.name} 돌파 완료!`)}else{player.weaponLevels[w.key]=(player.weaponLevels[w.key]||1)+1;pop(`${w.name} ${player.weaponLevels[w.key]}성 강화!`)}paused=false;ui.up.classList.add('hidden')}}
      else if(card.evo){const e=card.evo;b.innerHTML=`<span class="icon">${e[0]}</span><b>${e[1]}</b><small>스킬 돌파 · ${e[5]}</small>`;b.onclick=()=>{const base=e[4]==='mineFire'||e[4]==='mineShock'?'mine':e[4];player.evolved[e[4]]=e[1];player[base]+=5;paused=false;ui.up.classList.add('hidden');pop(`${e[1]} 돌파 완료!`)}}
      else{const u=card.u,unique=u[1]==='스위프트 드론'||u[1]==='시즈 드론',lv=player.levels[u[1]]||0;b.innerHTML=`<span class="icon">${u[0]}</span><b>${u[1]}</b><small>${u[2]}${unique?' · 1회 한정':` · LV. ${lv+1} / 5`}</small>`;b.onclick=()=>{const fusion=!player.destroyer&&((u[1]==='스위프트 드론'&&player.droneB)||(u[1]==='시즈 드론'&&player.droneA));u[3](player);if(!unique)player.levels[u[1]]=lv+1;paused=false;ui.up.classList.add('hidden');pop(fusion?'스위프트/시즈 드론 합체 — 파괴자 활성화!':unique?`${u[1]} 획득!`:`${u[1]} LV. ${lv+1} 적용!`)}}
      ui.upList.append(b);
    });ui.up.classList.remove('hidden');
  };
},0);
// 새 자동 전투 스킬은 이 객체 안에서만 성장 수치와 공격 방식을 관리한다.
// 이번 단계에서는 참고표의 쿠나이 구조만 새 이름·새 디자인으로 구현한다.
const autoCombatSkills={
  starNeedle:{
    id:'starNeedle',name:'별무리 침',icon:'✦',maxLevel:5,
    passive:{id:'astralLog',name:'성운 항법서',maxLevel:5},
    evolution:{name:'성운 폭우',description:'별무리 침 5레벨 + 성운 항법서 5레벨 · 매우 빠른 관통 연사'},
    levels:[
      {damage:34,count:1,cooldown:.92,speed:520,pierce:0,size:18,description:'가장 가까운 적에게 별무리 침 1발 자동 투척'},
      {damage:34,count:2,cooldown:.92,speed:520,pierce:0,size:18,description:'투사체 수 +1'},
      {damage:48,count:3,cooldown:.92,speed:520,pierce:0,size:19,description:'투사체 수 +1 · 피해량 증가'},
      {damage:48,count:4,cooldown:.70,speed:520,pierce:1,size:20,description:'투사체 수 +1 · 공격 속도 증가'},
      {damage:64,count:5,cooldown:.52,speed:560,pierce:1,size:21,description:'투사체 수 +1 · 피해량·공격 속도 증가'}
    ],
    evolved:{damage:78,count:4,cooldown:.14,speed:660,pierce:4,size:25,description:'고속 관통 별침을 연속 발사'},
    state(p){return p.modularSkills||(p.modularSkills={starNeedle:0,astralLog:0,starNeedleEvolved:false,cooldown:0})},
    data(p){const state=this.state(p);return state.starNeedleEvolved?this.evolved:this.levels[Math.max(0,state.starNeedle-1)]},
    fire(p){const state=this.state(p),data=this.data(p),enemy=target();if(!data||!enemy)return;state.cooldown=data.cooldown/Math.max(.35,p.cdRate||1);for(let i=0;i<data.count;i++){const offset=(i-(data.count-1)/2)*.10,angle=Math.atan2(enemy.y-p.y,enemy.x-p.x)+offset;starNeedleShots.push({x:p.x,y:p.y,vx:Math.cos(angle)*data.speed,vy:Math.sin(angle)*data.speed,damage:data.damage,pierce:data.pierce,size:data.size,life:2.4,hit:{}})}},
    update(p,dt){const state=this.state(p);if(!state.starNeedle)return;state.cooldown-=dt;if(state.cooldown<=0)this.fire(p)}
  }
};
let starNeedleShots=[],starNeedleSprite=null;
(()=>{const raw=new Image();raw.onload=()=>{const sheet=document.createElement('canvas'),ctx=sheet.getContext('2d');sheet.width=raw.width;sheet.height=raw.height;ctx.drawImage(raw,0,0);const pixels=ctx.getImageData(0,0,sheet.width,sheet.height);for(let i=0;i<pixels.data.length;i+=4){const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];if(g>150&&g>r*1.25&&g>b*1.25)pixels.data[i+3]=0}ctx.putImageData(pixels,0,0);starNeedleSprite=sheet};raw.src='assets/star-needle-source.png'})();
function updateStarNeedles(now){const dt=Math.min(.04,(now-(updateStarNeedles.last||now))/1000);updateStarNeedles.last=now;if(run&&!paused&&player){autoCombatSkills.starNeedle.update(player,dt);for(let i=starNeedleShots.length-1;i>=0;i--){const shot=starNeedleShots[i],enemy=target();if(enemy){const desired=unit(enemy.x-shot.x,enemy.y-shot.y),speed=Math.hypot(shot.vx,shot.vy);shot.vx+=(desired.x*speed-shot.vx)*Math.min(1,dt*3.2);shot.vy+=(desired.y*speed-shot.vy)*Math.min(1,dt*3.2)}shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.life-=dt;for(const enemy of [...enemies])if(!shot.hit[enemy.id]&&Math.hypot(enemy.x-shot.x,enemy.y-shot.y)<enemy.r+shot.size*.45){shot.hit[enemy.id]=true;hurt(enemy,shot.damage);burst(shot.x,shot.y,'#b98cff',7);if(shot.pierce--<=0)shot.life=0}if(shot.life<=0||shot.x<-80||shot.x>W+80||shot.y<-80||shot.y>H+80)starNeedleShots.splice(i,1)}}requestAnimationFrame(updateStarNeedles)}
function drawStarNeedles(){if(run){for(const shot of starNeedleShots){const angle=Math.atan2(shot.vy,shot.vx);x.save();x.translate(shot.x,shot.y);x.rotate(angle);x.shadowBlur=13;x.shadowColor='#9a65ff';if(starNeedleSprite)x.drawImage(starNeedleSprite,-shot.size,-shot.size,shot.size*2,shot.size*2);else{x.fillStyle='#c6a4ff';x.beginPath();x.moveTo(shot.size,0);x.lineTo(-shot.size,-shot.size*.45);x.lineTo(-shot.size,shot.size*.45);x.fill()}x.restore()}}requestAnimationFrame(drawStarNeedles)}
function makeModularSkillCard(skill){const state=skill.state(player),b=document.createElement('button');b.className='upgrade-card modular-skill-card';let mode='skill',name=skill.name,detail='';if(!state.starNeedle){detail=`자동 공격 스킬 획득 · LV. 1 / 5<br>${skill.levels[0].description}`}else if(state.starNeedle<skill.maxLevel){const next=skill.levels[state.starNeedle];detail=`자동 공격 강화 · LV. ${state.starNeedle+1} / 5<br>${next.description}`}else if(state.astralLog<skill.passive.maxLevel){mode='passive';name=skill.passive.name;detail=`돌파 조건 패시브 · LV. ${state.astralLog+1} / 5<br>별무리 침의 공격 궤도가 더 안정됩니다`}else if(!state.starNeedleEvolved){mode='evolution';name=skill.evolution.name;detail=`스킬 돌파<br>${skill.evolution.description}`}else return null;b.innerHTML=`<span class="icon modular-icon">✦</span><b>${name}</b><small>${detail}</small>`;b.onclick=()=>{if(mode==='skill')state.starNeedle++;else if(mode==='passive')state.astralLog++;else state.starNeedleEvolved=true;paused=false;ui.up.classList.add('hidden');pop(mode==='evolution'?`${name} 돌파 완료!`:mode==='passive'?`${name} LV. ${state.astralLog} 적용!`:`${skill.name} LV. ${state.starNeedle} 적용!`)};return b}
// 주무기 강화는 장비 중인 무기만 담당한다. 별무리 침 실험 스킬은 현재 레벨업 카드에 넣지 않는다.
setTimeout(()=>{requestAnimationFrame(updateStarNeedles);requestAnimationFrame(drawStarNeedles)},260);
// 기본 총은 사용하지 않고, 상자에서 장착한 무기만 자동으로 공격한다.
function shoot(){}
// draw 루프가 화면을 비운 뒤에 표시되도록 한 프레임 늦춰 그린다.
function playerHpTopLoop(){if(run&&player){const ratio=Math.max(0,player.hp/player.maxHp),barW=48,barX=player.x-barW/2,barY=player.y-player.r-19;x.fillStyle='#111b2b';x.fillRect(barX-1,barY-1,barW+2,7);x.fillStyle='#2c4059';x.fillRect(barX,barY,barW,5);x.fillStyle=ratio>.35?'#54efa2':'#ff6375';x.fillRect(barX,barY,barW*ratio,5);x.strokeStyle='#dff6ff';x.lineWidth=1;x.strokeRect(barX,barY,barW,5)}requestAnimationFrame(playerHpTopLoop)}setTimeout(()=>requestAnimationFrame(playerHpTopLoop),40);
const weaponState={cool:0,flip:false},meleeArcs=[];let movementAim=0;
function weaponAttack(dt){
  if(!run||paused||!player||!equipped?.weapon)return;
  const faceX=(keys.KeyD?1:0)-(keys.KeyA?1:0)+touchMove.x,faceY=(keys.KeyS?1:0)-(keys.KeyW?1:0)+touchMove.y;
  if(faceX||faceY)movementAim=Math.atan2(faceY,faceX);
  player.angle=movementAim;
  weaponState.cool-=dt;
  if(weaponState.cool>0)return;
  const targetEnemy=target();
  if(!targetEnemy)return;
  const equippedWeaponName=equipped.weapon.name,weapon=weaponCoreName(equippedWeaponName);
  const weaponTier=['common','rare','hero','legend','mythic'].indexOf(equipped.weapon.tier||'common');
  const weaponStar=weapon==='영원의 빛(쌍창)'?Math.min(player.weaponLevels?.['성단의 창']||1,player.weaponLevels?.['파멸의 창']||1):player.weaponLevels?.[equippedWeaponName]||1;
  const weaponEvo=!!player.weaponEvolved;
  const weaponPower=(1+Math.max(0,weaponTier)*.35)*(1+(weaponStar-1)*.18)*(weaponEvo?1.6:1),weaponSpeed=(1+Math.max(0,weaponTier)*.12)*(1+(weaponStar-1)*.1)*(weaponEvo?1.35:1),weaponDamage=player.damage*weaponPower;
  const aim=movementAim;
  const nearby=(range,front=true)=>enemies.filter(e=>{const dx=e.x-player.x,dy=e.y-player.y,d=Math.hypot(dx,dy);return d<range&&(!front||Math.cos(Math.atan2(dy,dx)-aim)>.15)});
  const slash=(range,damage,front=true)=>{for(const e of nearby(range,front))hurt(e,damage);meleeArcs.push({x:player.x,y:player.y,a:aim,l:.25,r:range*.68});effects.push({kind:'blast',x:player.x+Math.cos(aim)*50,y:player.y+Math.sin(aim)*50,l:.18,r:range*.6})};
  const rearSlash=(range,damage)=>{for(const e of enemies){const dx=e.x-player.x,dy=e.y-player.y,d=Math.hypot(dx,dy);if(d<range&&Math.cos(Math.atan2(dy,dx)-aim)<-.15)hurt(e,damage)}meleeArcs.push({x:player.x,y:player.y,a:aim+Math.PI,l:.25,r:range*.68})};
  if(weapon==='쿠나이'){let n=weaponStar+(weaponEvo?2:0);for(let i=0;i<n;i++)addShot(aim+(i-(n-1)/2)*.1,'kunai',weaponDamage*1.35);weaponState.cool=weaponEvo?.1:.24}
  else if(weapon==='야구방망이'){slash(105+weaponStar*28+(weaponEvo?65:0),weaponDamage*2.7);weaponState.cool=.62}
  else if(weapon==='리볼버'){addShot(aim,'bullet',weaponDamage*2.3);if(weaponEvo)addShot(aim+.09,'bullet',weaponDamage*2.3);weaponState.cool=.34}
  else if(weapon==='카타나'){const range=125+weaponStar*22+(weaponEvo?60:0);slash(range,weaponDamage*2.2);if(weaponStar>=3||weaponEvo)rearSlash(range,weaponDamage*(weaponEvo?2:1.15));weaponState.katanaFlip=!weaponState.katanaFlip;if(weaponState.katanaFlip&&(weaponStar>=4||weaponEvo)){player.x=Math.max(20,Math.min(W-20,player.x+Math.cos(aim)*55));player.y=Math.max(20,Math.min(H-20,player.y+Math.sin(aim)*55))}weaponState.cool=.34}
  else if(weapon==='샷건'){if(weaponEvo){const bullet=addShot(aim,'bullet',weaponDamage*1.65);bullet.vx*=2.25;bullet.vy*=2.25;bullet.l*=1.45;weaponState.cool=.055}else{let n=3+weaponStar;for(let i=0;i<n;i++)addShot(aim+(i-(n-1)/2)*(.12+weaponStar*.01),'bullet',weaponDamage*1.2);weaponState.cool=.82}}
  else if(weapon==='빛을 쫓는 자'){let n=2+weaponStar+(weaponEvo?5:0);for(let i=0;i<n;i++)addShot(aim+i*Math.PI*2/n,'boom',weaponDamage*1.65);weaponState.cool=.7}
  else if(weapon==='파괴의 힘'){let r=80+weaponStar*18+(weaponEvo?65:0),tx=Math.max(40,Math.min(W-40,player.x+Math.cos(aim)*300)),ty=Math.max(40,Math.min(H-40,player.y+Math.sin(aim)*300));zones.push({x:tx,y:ty,r,l:1+weaponStar*.14,damage:weaponDamage*4.5});effects.push({kind:'blast',x:tx,y:ty,l:.6,r});if(weaponEvo)zones.push({x:player.x,y:player.y,r:105,l:1.2,damage:weaponDamage*.9});weaponState.cool=1.35}
  else if(weapon==='혼돈의 검'){const range=135+weaponStar*26+(weaponEvo?65:0);weaponState.flip=!weaponState.flip;if(weaponState.flip){slash(range,weaponDamage*3);if(weaponStar>=3||weaponEvo)rearSlash(range,weaponDamage*1.6);player.x=Math.max(20,Math.min(W-20,player.x+Math.cos(aim)*65));player.y=Math.max(20,Math.min(H-20,player.y+Math.sin(aim)*65))}else{for(let i=-1;i<=1;i++)addShot(aim+i*.18,'boom',weaponDamage*1.6)}if(weaponEvo)effects.push({kind:'blast',x:targetEnemy.x,y:targetEnemy.y,l:.5,r:110+weaponStar*18,damage:weaponDamage*2});weaponState.cool=.44}
  else if(weapon==='영원의 빛(쌍창)'){let n=weaponStar+(weaponEvo?3:0);for(let i=0;i<n;i++){let spread=(i-(n-1)/2)*.12;addShot(aim-.07+spread,'bullet',weaponDamage*1.55);addShot(aim+.07-spread,'kunai',weaponDamage*1.55)}weaponState.cool=.18}
  else {addShot(aim,'bullet',weaponDamage);weaponState.cool=.35}
  weaponState.cool/=weaponSpeed;
}
function weaponLoop(now){const dt=Math.min(.05,(now-(weaponLoop.last||now))/1000);weaponLoop.last=now;weaponAttack(dt);requestAnimationFrame(weaponLoop)}requestAnimationFrame(weaponLoop);
// 마우스 위치 대신 마지막 이동 방향을 항상 플레이어의 시선으로 유지한다.
function movementFacingLoop(){if(run&&player){const dx=(keys.KeyD?1:0)-(keys.KeyA?1:0)+touchMove.x,dy=(keys.KeyS?1:0)-(keys.KeyW?1:0)+touchMove.y;if(dx||dy)movementAim=Math.atan2(dy,dx);player.angle=movementAim;mouse.x=player.x+Math.cos(movementAim)*1000;mouse.y=player.y+Math.sin(movementAim)*1000}requestAnimationFrame(movementFacingLoop)}setTimeout(()=>requestAnimationFrame(movementFacingLoop),80);
// 드릴 샷은 발사 순간 가장 가까운 적을 향하고, 낮은 속도로 벽을 튕기며 날아간다.
function drillStraightLoop(){if(run&&player){for(const shot of specials)if(shot.kind==='drill'){if(!shot.straight){const enemy=target(),angle=enemy?Math.atan2(enemy.y-shot.y,enemy.x-shot.x):movementAim;shot.straight=true;shot.dirX=Math.cos(angle);shot.dirY=Math.sin(angle)}if(shot.x<=0||shot.x>=W){shot.dirX*=-1;shot.x=Math.max(0,Math.min(W,shot.x))}if(shot.y<=0||shot.y>=H){shot.dirY*=-1;shot.y=Math.max(0,Math.min(H,shot.y))}shot.vx=shot.dirX*620;shot.vy=shot.dirY*620}}requestAnimationFrame(drillStraightLoop)}setTimeout(()=>requestAnimationFrame(drillStraightLoop),100);
// 귀환 절단환은 잠시 전진한 뒤 플레이어 위치로 방향을 꺾어 반드시 돌아온다.
function returnDiscLoop(now){const dt=Math.min(.04,(now-(returnDiscLoop.last||now))/1000);returnDiscLoop.last=now;if(run&&player)for(const shot of shots)if(shot.kind==='boom'){shot.outbound=(shot.outbound||0)+dt;if(shot.outbound>.34){const toward=unit(player.x-shot.x,player.y-shot.y),speed=720;shot.vx+=(toward.x*speed-shot.vx)*Math.min(1,dt*8);shot.vy+=(toward.y*speed-shot.vy)*Math.min(1,dt*8);if(shot.outbound>.55&&Math.hypot(player.x-shot.x,player.y-shot.y)<34)shot.l=0}}requestAnimationFrame(returnDiscLoop)}setTimeout(()=>requestAnimationFrame(returnDiscLoop),120);
// 기본 총구를 가리고 원형 플레이어 및 장착 무기를 마지막 레이어에 그린다.
function playerWeaponVisualLoop(now){
  const dt=Math.min(.05,(now-(playerWeaponVisualLoop.last||now))/1000);playerWeaponVisualLoop.last=now;
  for(let i=meleeArcs.length-1;i>=0;i--){const arc=meleeArcs[i];arc.l-=dt;if(arc.l<=0)meleeArcs.splice(i,1)}
  if(run&&player){
    player.angle=movementAim;
    x.save();x.translate(player.x,player.y);x.rotate(player.angle);
    if(warriorSprite){x.save();x.rotate(-player.angle);if(Math.cos(movementAim)<-.45)x.scale(-1,1);x.drawImage(warriorSprite,190,170,760,840,-40,-47,80,90);x.restore()}
    else{x.fillStyle='#63e9ff';x.beginPath();x.arc(0,0,player.r,0,Math.PI*2);x.fill();x.strokeStyle='#d9fbff';x.lineWidth=2;x.stroke()}
    const name=equipped?.weapon?.name||'',coreName=weaponCoreName(name);
    if(name){
      const drawDirectionalTexture=(sprite,w=54,h=54)=>{const dx=Math.cos(movementAim),dy=Math.sin(movementAim);x.save();x.rotate(-player.angle);if(Math.abs(dy)>Math.abs(dx))x.rotate(dy<0?-Math.PI/2:Math.PI/2);else if(dx<0)x.scale(-1,1);x.drawImage(sprite,5,-h/2,w,h);x.restore()};
      x.lineCap='round';
      if(drawWeaponSprite(coreName,60)){}
      else if(name==='쿠나이'&&kunaiBattleSprite){drawDirectionalTexture(kunaiBattleSprite,48,48)}
      else if(name==='카타나'&&katanaBattleSprite){drawDirectionalTexture(katanaBattleSprite,56,56)}
      else if(['쿠나이','카타나','빛을 쫓는 자','혼돈의 검'].includes(name)){x.strokeStyle='#eaf7ff';x.lineWidth=name==='쿠나이'?5:7;x.beginPath();x.moveTo(10,0);x.lineTo(name==='쿠나이'?31:42,0);x.stroke();x.strokeStyle='#7198bf';x.lineWidth=5;x.beginPath();x.moveTo(8,0);x.lineTo(16,0);x.stroke()}
      else if(name==='야구방망이'){x.strokeStyle='#c98a50';x.lineWidth=11;x.beginPath();x.moveTo(8,0);x.lineTo(39,0);x.stroke();x.strokeStyle='#f0bd79';x.lineWidth=5;x.beginPath();x.moveTo(28,0);x.lineTo(42,0);x.stroke()}
      else if(name==='파괴의 힘'){x.fillStyle='#6d3cff';x.beginPath();x.arc(31,0,13,0,Math.PI*2);x.fill();x.strokeStyle='#e9b6ff';x.lineWidth=3;x.stroke()}
      else if(name==='영원의 빛(쌍창)'){x.strokeStyle='#ffe370';x.lineWidth=5;x.beginPath();x.moveTo(8,-7);x.lineTo(46,-13);x.moveTo(8,7);x.lineTo(46,13);x.stroke()}
      else if(name==='샷건'&&shotgunBattleSprite){drawDirectionalTexture(shotgunBattleSprite,54,54)}
      else{x.fillStyle=name==='샷건'?'#8e6370':'#536d8f';x.fillRect(8,-6,name==='샷건'?33:24,12);x.fillStyle='#dcecff';x.fillRect(29,-3,14,6)}
    }
    x.restore();
    for(const arc of meleeArcs){x.save();x.globalAlpha=Math.min(1,arc.l*5);x.strokeStyle='#eaffff';x.shadowBlur=14;x.shadowColor='#65eaff';x.lineWidth=9;x.beginPath();x.arc(arc.x,arc.y,arc.r,arc.a-.95,arc.a+.95);x.stroke();x.restore()}
  }
  requestAnimationFrame(playerWeaponVisualLoop);
}
setTimeout(()=>requestAnimationFrame(playerWeaponVisualLoop),80);
// 맵 테마별 장식과 일반 근접 몬스터의 칼을 마지막 화면 레이어에 그린다.
function themedEnemyVisualLoop(){
  if(run){for(const enemy of enemies){const color=enemy.boss?(enemy.theme?.bossColor||'#ff78c5'):(enemy.theme?.color||'#63e8ff'),size=enemy.boss?62:enemy.elite?40:27,cy=enemy.y+Math.sin(time*2.3+enemy.id*.71)*Math.max(3,size*.06);x.save();x.globalAlpha=.4;x.strokeStyle=color;x.lineWidth=2;x.beginPath();x.moveTo(enemy.x-size*.22,cy+size*.34);x.lineTo(enemy.x,cy+size*.55);x.lineTo(enemy.x+size*.22,cy+size*.34);x.stroke();x.restore()}}
  requestAnimationFrame(themedEnemyVisualLoop);
}
setTimeout(()=>requestAnimationFrame(themedEnemyVisualLoop),150);
function goldenGemVisualLoop(){if(run){for(const gem of gems)if(gem.golden){x.save();x.translate(gem.x,gem.y);x.rotate(time*3);x.fillStyle='#ffd84a';x.shadowBlur=12;x.shadowColor='#ffb300';x.beginPath();x.moveTo(0,-gem.size);x.lineTo(gem.size,0);x.lineTo(0,gem.size);x.lineTo(-gem.size,0);x.fill();x.fillStyle='#fff6b5';x.fillRect(-1,-gem.size+3,2,gem.size*2-6);x.restore()}}requestAnimationFrame(goldenGemVisualLoop)}setTimeout(()=>requestAnimationFrame(goldenGemVisualLoop),190);
function bossCenterEntranceLoop(now){const dt=Math.min(.05,(now-(bossCenterEntranceLoop.last||now))/1000);bossCenterEntranceLoop.last=now;if(run&&boss?.centerLocked){boss.centerEntrance=Math.max(0,(boss.centerEntrance||0)-dt);boss.x=W/2;boss.y=H/2}requestAnimationFrame(bossCenterEntranceLoop)}requestAnimationFrame(bossCenterEntranceLoop);
// 플레이어 스프라이트와 무기를 모두 그린 뒤 체력바를 다시 그려 가려지지 않게 한다.
function playerHpFinalLoop(){if(run&&player){const ratio=Math.max(0,player.hp/player.maxHp),width=48,left=player.x-width/2,top=player.y-player.r-19;x.fillStyle='#111b2b';x.fillRect(left-1,top-1,width+2,7);x.fillStyle='#2c4059';x.fillRect(left,top,width,5);x.fillStyle=ratio>.35?'#54efa2':'#ff6375';x.fillRect(left,top,width*ratio,5);x.strokeStyle='#dff6ff';x.lineWidth=1;x.strokeRect(left,top,width,5)}requestAnimationFrame(playerHpFinalLoop)}setTimeout(()=>requestAnimationFrame(playerHpFinalLoop),220);
function playerHpOverlayLoop(){if(run&&player){const ratio=Math.max(0,player.hp/player.maxHp),barW=48,barX=player.x-barW/2,barY=player.y-player.r-19;x.fillStyle='#111b2b';x.fillRect(barX-1,barY-1,barW+2,7);x.fillStyle='#2c4059';x.fillRect(barX,barY,barW,5);x.fillStyle=ratio>.35?'#54efa2':'#ff6375';x.fillRect(barX,barY,barW*ratio,5);x.strokeStyle='#dff6ff';x.lineWidth=1;x.strokeRect(barX,barY,barW,5)}requestAnimationFrame(playerHpOverlayLoop)}requestAnimationFrame(playerHpOverlayLoop);
function makePlayer(){player={x:W/2,y:H/2,r:16,hp:100,maxHp:100,speed:260,angle:0,fire:0,fireRate:.25,damage:25,pierce:0,multi:1,level:1,xp:0,next:10,levels:{},evolved:{},regen:0,cdRate:1,magnet:120,projectileSize:1,projectileRange:1,durationRate:1,ammoSpeed:1,reduce:0,xpMult:1,gold:0,goldMult:1,lastHp:100,lightning:0,molotov:0,ball:0,kunai:0,boom:0,brick:0,rpg:0,guardian:0,drill:0,durian:0,laser:0,mine:0,medic:0,droneA:false,droneB:false,destroyer:false,cd:{lightning:0,molotov:0,ball:0,kunai:0,boom:0,brick:0,rpg:0,droneA:0,droneB:0,destroyer:0,guardian:0,drill:0,durian:0,laser:0,mine:0,medic:0}}}
let noticeDismissTimer=0;function pop(t){ui.notice.textContent=t;ui.notice.style.opacity=1;noticeTime=1.8;clearTimeout(noticeDismissTimer);noticeDismissTimer=setTimeout(()=>{if(noticeTime<=0||!run)ui.notice.style.opacity=0},1850)}
function spawnEnemy(isBoss=false){let a=Math.random()*6.28,d=580+Math.random()*160,mapScale=1+selected*.19+selected*selected*.018,stageScale=1+stage*.15,scale=mapScale*stageScale*stageThreat;if(isBoss){let info=stageInfo(),hp=(info.n===info.total?760:460)*scale,e={id:nextId++,x:player.x+Math.cos(a)*d,y:player.y+Math.sin(a)*d,r:info.n===info.total?55:42,hp,maxHp:hp,speed:(30+stage*3+selected*2)*stageThreat,damage:(12*mapScale+stage*1.6)*stageThreat,color:info.n===info.total?'#ffbf3f':'#b779ff',boss:true,name:info.boss};enemies.push(e);boss=e;return}let hp=22*scale;enemies.push({id:nextId++,x:player.x+Math.cos(a)*d,y:player.y+Math.sin(a)*d,r:13+Math.random()*7,hp,maxHp:hp,speed:(34+Math.random()*22+stage*4+selected*3.5)*stageThreat,damage:(3.5*mapScale+stage*.75)*stageThreat,color:Math.random()<.15?'#ffbe52':'#f05272'})}
function gem(a){const golden=Math.random()<(a.boss?.5:.08),value=golden?(a.boss?180:55):(a.boss?30:3+stage*2);gems.push({x:a.x,y:a.y,v:value,size:golden?10:a.boss?11:5,golden})}function burst(px,py,col,n=8){for(let i=0;i<n;i++){let a=Math.random()*6.28,s=40+Math.random()*180;parts.push({x:px,y:py,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:.25+Math.random()*.3,col})}}
function killEnemy(e){let i=enemies.indexOf(e);if(i<0)return;gem(e);enemies.splice(i,1);kills++;questProgress('kills',1);if(selected===1&&!e.boss)zones.push({x:e.x,y:e.y,r:42,l:2.2,damage:12});if(e.boss){bossDefeated=true;const codex=JSON.parse(localStorage.neonBossCodex||'{}'),key=`${selected}-${e.name}`;if(!codex[key]){codex[key]=true;localStorage.neonBossCodex=JSON.stringify(codex);runBonus+=30;pop(`도감 등록: ${e.name} · 첫 처치 보너스 +30 코인`)}}else stageKills++;burst(e.x,e.y,e.color,15)}function hurt(e,dmg){if(!e||!enemies.includes(e))return;const amount=Number(dmg);if(!Number.isFinite(amount)||amount<=0)return;if(!Number.isFinite(e.hp))e.hp=Number.isFinite(e.maxHp)?e.maxHp:1;e.hp=Math.max(0,e.hp-amount);if(e.hp<=0)killEnemy(e)}function target(){return enemies.find(e=>e.boss)||enemies.slice().sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]}
function mapButtons(){let m=maps[selected],locked=selected>unlocked;ui.picker.innerHTML=`<button class="map selected ${locked?'locked':''}"><b>${locked?'🔒 ':''}${m.name}</b><small>${locked?'이전 맵 클리어 필요':`${5+selected*2} 스테이지 · 보스전`}</small></button>`;$('#map-prev').disabled=selected===0;$('#map-next').disabled=selected===maps.length-1}
function begin(){makePlayer();resetTouchJoystick();resetRiftRun();starNeedleShots.length=0;player.forcefield=0;enemies=[];shots=[];gems=[];parts=[];zones=[];effects=[];specials=[];heals=[];guardian=medic=null;time=kills=spawn=stage=stageKills=0;stageThreat=1;runBonus=0;boss=null;bossSpawned=bossDefeated=false;run=true;paused=false;ui.menu.classList.add('hidden');ui.result.classList.add('hidden');ui.hud.classList.remove('hidden');ui.map.textContent=maps[selected].name;applyRunModifier();pop(`STAGE 1 시작! · ${runModifier.name}`)}
function addShot(a,kind='bullet',damage=player.damage,origin=player){let s={x:origin.x,y:origin.y,vx:Math.cos(a)*760,vy:Math.sin(a)*760,l:kind==='ball'?5:kind==='boom'?1.5:kind==='molotov'?.65:1.15,p:kind==='ball'?99:player.pierce,damage,kind,bounce:kind==='ball'?8:0,hit:{}};shots.push(s);if(kind==='molotov'){let r=65+player.molotov*10,fx=origin.x+Math.cos(a)*300,fy=origin.y+Math.sin(a)*300;zones.push({x:fx,y:fy,r,l:3,damage:18*player.molotov});effects.push({kind:'fire',x:fx,y:fy,l:3,r})}return s}function shoot(){}
function levelUp(){paused=true;ui.upList.innerHTML='';let evo=evolutions.filter(e=>(player.levels[e[2]]||0)>=5&&(player.levels[e[3]]||0)>=5&&!player.evolved[e[4]]).sort(()=>Math.random()-.5),pool=upgrades.filter(u=>{if(u[1]==='A형 드론')return !player.droneA;if(u[1]==='B형 드론')return !player.droneB;return(player.levels[u[1]]||0)<5}).sort(()=>Math.random()-.5),cards=[...evo.slice(0,3).map(e=>({evo:e})),...pool.slice(0,Math.max(0,3-evo.length)).map(u=>({u}))];cards.forEach(card=>{let b=document.createElement('button');b.className='upgrade-card';if(card.evo){let e=card.evo;b.innerHTML=`<span class="icon">${e[0]}</span><b>${e[1]}</b><small>스킬 돌파 · ${e[5]}</small>`;b.onclick=()=>{let base=e[4]==='mineFire'||e[4]==='mineShock'?'mine':e[4];player.evolved[e[4]]=e[1];player[base]+=5;paused=false;ui.up.classList.add('hidden');pop(`${e[1]} 돌파 완료!`)}}else{let u=card.u,unique=u[1]==='A형 드론'||u[1]==='B형 드론',lv=player.levels[u[1]]||0;b.innerHTML=`<span class="icon">${u[0]}</span><b>${u[1]}</b><small>${u[2]}${unique?' · 1회 한정':` · LV. ${lv+1} / 5`}</small>`;b.onclick=()=>{let fusion=!player.destroyer&&((u[1]==='A형 드론'&&player.droneB)||(u[1]==='B형 드론'&&player.droneA));u[3](player);if(!unique)player.levels[u[1]]=lv+1;paused=false;ui.up.classList.add('hidden');pop(fusion?'A/B 드론 합체 — 파괴자 활성화!':unique?`${u[1]} 획득!`:`${u[1]} LV. ${lv+1} 적용!`)}}ui.upList.append(b)});ui.up.classList.remove('hidden')}
function nextStage(route){stage++;stageKills=0;boss=null;bossSpawned=bossDefeated=false;stageThreat=route==='elite'?1.35:1;if(route==='safe')player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.35);else runBonus+=20;paused=false;$('#stage-event').classList.add('hidden');pop(route==='elite'?`정예 도전 시작! 적 능력 +35% · 보너스 +20 코인`:`안전 보급 완료 · HP 회복`)}
function clearStage(){if(stage+1>=totalStages()){end(true);return}paused=true;$('#stage-event').classList.remove('hidden')}
$('#route-safe').onclick=()=>nextStage('safe');$('#route-elite').onclick=()=>nextStage('elite');
function end(win=false){run=false;resetTouchJoystick();ui.hud.classList.add('hidden');ui.result.classList.remove('hidden');let reward=win?60+selected*35+runBonus:0;if(win){wallet+=reward;localStorage.neonCoins=wallet;renderCoins()}$('#result-label').textContent=win?'MAP CLEARED!':'RUN OVER';$('#result-title').textContent=win?'지역 정복 성공!':'생존 실패';$('#result-detail').textContent=`${Math.floor(time)}초 생존 · 적 ${kills}마리 처치 · STAGE ${Math.min(stage+1,totalStages())}${win?` · 🪙 +${reward}`:''}`;if(win&&selected===unlocked&&unlocked<maps.length-1){unlocked++;localStorage.neonUnlocked=unlocked;mapButtons()}}
// 낮은 확률로 열리는 균열은 전투력 보상 대신 기록과 외형 수집용 신호 조각을 준다.
const riftCanvas=$('#rift-overlay'),riftX=riftCanvas?.getContext('2d');
let rift={opened:false,active:false,portal:null,time:0,shards:[],stored:[],lastPlayer:null};
// 화면에 그려지는 보라색 고리와 플레이어 크기까지 포함한 실제 상호작용 반경이다.
const RIFT_PORTAL_ENTER_RADIUS=120,RIFT_SHARD_COLLECT_RADIUS=82;
function resetRiftRun(){rift={opened:false,active:false,portal:null,time:0,shards:[],stored:[],lastPlayer:null};riftX?.clearRect(0,0,W,H)}
function grantRiftReward(){const roll=Math.random();if(roll<.45){wallet+=1000;localStorage.neonCoins=wallet;renderCoins();return'🪙 1,000 코인'}const tier=roll<.8?'hero':'legend',pool=[...weapons,...armors.filter(item=>item.slot==='armor')].filter(item=>item.tier===tier),item={...pool[Math.floor(Math.random()*pool.length)]};inventory.push(item);saveGear();drawGear();return`${tier==='legend'?'전설':'영웅'} ${item.slot==='weapon'?'무기':'갑옷'} · ${item.name}`}
function enterRift(){rift.active=true;rift.portal=null;rift.time=14;rift.stored=enemies.map(enemy=>({enemy,x:enemy.x,y:enemy.y}));for(const item of rift.stored){item.enemy.x=-9999;item.enemy.y=-9999}player.x=W/2;player.y=H/2;rift.lastPlayer={x:player.x,y:player.y};rift.shards=Array.from({length:6},(_,i)=>{const a=i*Math.PI*2/6+.35,r=120+(i%2)*65;return{id:i+1,x:W/2+Math.cos(a)*r,y:H/2+Math.sin(a)*r,phase:i*.8}});pop('균열 내부 진입 · 14초 안에 신호 조각 6개를 모으세요!')}
function pointToMoveDistance(px,py,from,to){const vx=to.x-from.x,vy=to.y-from.y,lengthSq=vx*vx+vy*vy;if(!lengthSq)return Math.hypot(px-to.x,py-to.y);const t=Math.max(0,Math.min(1,((px-from.x)*vx+(py-from.y)*vy)/lengthSq)),cx=from.x+vx*t,cy=from.y+vy*t;return Math.hypot(px-cx,py-cy)}
function closeRift(success){for(const item of rift.stored)if(enemies.includes(item.enemy)){item.enemy.x=item.x;item.enemy.y=item.y}for(const enemy of enemies)if(enemy.x<-1000){const a=Math.random()*Math.PI*2;enemy.x=player.x+Math.cos(a)*520;enemy.y=player.y+Math.sin(a)*520}rift.active=false;rift.stored=[];rift.lastPlayer=null;if(success){const archives=JSON.parse(localStorage.neonRiftArchives||'[]'),record=`${maps[selected].name}의 균열 기록`;if(!archives.includes(record)){archives.push(record);localStorage.neonRiftArchives=JSON.stringify(archives)}pop(`균열 성공! ${grantRiftReward()}`)}else pop('균열 신호가 사라졌습니다.')}
function riftLoop(now){
  const dt=Math.min(.05,(now-(riftLoop.last||now))/1000);riftLoop.last=now;
  if(run&&!paused&&player){
    if(!rift.opened&&!rift.active&&time>14&&Math.random()<dt*.0028){
      const a=Math.random()*Math.PI*2,d=250;
      rift.opened=true;
      rift.portal={x:Math.max(115,Math.min(W-115,player.x+Math.cos(a)*d)),y:Math.max(115,Math.min(H-115,player.y+Math.sin(a)*d)),bornAt:time,enterHold:0};
      pop('미확인 균열 신호 감지! 커다란 보라색 포털 안에 머무르세요.');
    }
    if(rift.portal){
      const near=Math.hypot(player.x-rift.portal.x,player.y-rift.portal.y)<=RIFT_PORTAL_ENTER_RADIUS+(player.r||0);
      if(time-rift.portal.bornAt>.8&&near)rift.portal.enterHold=Math.min(.65,rift.portal.enterHold+dt);
      else rift.portal.enterHold=0;
      if(rift.portal.enterHold>=.65)enterRift();
    }
    if(rift.active){
      rift.time-=dt;
      for(const enemy of enemies)if(!rift.stored.some(item=>item.enemy===enemy)){enemy.x=-9999;enemy.y=-9999}
      const from=rift.lastPlayer||{x:player.x,y:player.y},to={x:player.x,y:player.y};
      let collected=0;
      for(let i=rift.shards.length-1;i>=0;i--){
        if(pointToMoveDistance(rift.shards[i].x,rift.shards[i].y,from,to)<=RIFT_SHARD_COLLECT_RADIUS+(player.r||0)){
          rift.shards.splice(i,1);collected++;
        }
      }
      if(collected)pop(`신호 조각 획득! ${6-rift.shards.length}/6`);
      rift.lastPlayer=to;
      if(!rift.shards.length)closeRift(true);
      else if(rift.time<=0)closeRift(false);
    }
  }
  requestAnimationFrame(riftLoop);
}
requestAnimationFrame(riftLoop);
function drawRiftLoop(){if(!riftX)return requestAnimationFrame(drawRiftLoop);riftX.clearRect(0,0,W,H);if(run&&(rift.portal||rift.active)){const c=riftX;c.save();if(rift.active){c.fillStyle='#10062d8c';c.fillRect(0,0,W,H);for(const shard of rift.shards){const pulse=1+Math.sin(time*7+shard.phase)*.12;c.save();c.translate(shard.x,shard.y);c.scale(pulse,pulse);c.shadowBlur=28;c.shadowColor='#d878ff';c.fillStyle='#f4d8ff';c.strokeStyle='#a84dff';c.lineWidth=4;c.beginPath();c.moveTo(0,-20);c.lineTo(15,0);c.lineTo(0,20);c.lineTo(-15,0);c.closePath();c.fill();c.stroke();c.shadowBlur=0;c.fillStyle='#6f20b9';c.font='bold 12px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(shard.id,0,1);c.restore()}c.fillStyle='#fff0ff';c.font='bold 18px sans-serif';c.textAlign='center';c.fillText(`균열 신호 ${Math.ceil(rift.time)}초 · 남은 조각 ${rift.shards.length}/6`,W/2,56)}else{const p=rift.portal,pulse=Math.sin(time*7)*5,hold=p.enterHold/.65;c.translate(p.x,p.y);c.scale(1.55,1.55);c.fillStyle='#140326cc';c.beginPath();c.arc(0,0,42+pulse*.2,0,Math.PI*2);c.fill();c.shadowBlur=32;c.shadowColor='#bd52ff';for(let i=0;i<3;i++){c.strokeStyle=i===1?'#f1c3ff':'#a33eff';c.lineWidth=i===1?5:3;c.beginPath();c.arc(0,0,31+i*9+pulse, time*(i%2?2:-1.6)+i, time*(i%2?2:-1.6)+i+Math.PI*1.55);c.stroke()}c.shadowBlur=0;if(hold>0){c.strokeStyle='#fff36a';c.lineWidth=7;c.beginPath();c.arc(0,0,55,-Math.PI/2,-Math.PI/2+Math.PI*2*hold);c.stroke()}c.fillStyle='#f8ddff';c.font='bold 15px sans-serif';c.textAlign='center';c.fillText('균열 포털',0,-61);c.font='bold 11px sans-serif';c.fillStyle='#dfb7ff';c.fillText('안에서 잠시 머물러 입장',0,72)}c.restore()}requestAnimationFrame(drawRiftLoop)}requestAnimationFrame(drawRiftLoop);
function droneShot(d,damage,kind){let e=target();if(e)addShot(Math.atan2(e.y-d.y,e.x-d.x),kind,damage,d)}function autoSkills(dt){let s=player.cd;for(const k in s)s[k]-=dt;let e=target();drones=[];if(player.destroyer){let a=time*5.5,d={x:player.x+Math.cos(a)*72,y:player.y+Math.sin(a)*72,type:'destroyer',r:24};drones.push(d);if(s.destroyer<=0){s.destroyer=.16;droneShot(d,82,'destroyer')}}else{if(player.droneA){let a=time*8,d={x:player.x+Math.cos(a)*54,y:player.y+Math.sin(a)*54,type:'A',r:14};drones.push(d);if(s.droneA<=0){s.droneA=.22;droneShot(d,25,'droneA')}}if(player.droneB){let a=-time*3.8,d={x:player.x+Math.cos(a)*58,y:player.y+Math.sin(a)*58,type:'B',r:16};drones.push(d);if(s.droneB<=0){s.droneB=.8;droneShot(d,76,'droneB')}}}if(player.lightning&&s.lightning<=0&&e){s.lightning=1.6/player.lightning;hurt(e,65*player.lightning);effects.push({kind:'bolt',x:e.x,y:e.y,l:.25});burst(e.x,e.y,'#c993ff',10)}if(player.molotov&&s.molotov<=0&&e){s.molotov=3.4/player.molotov;let a=Math.atan2(e.y-player.y,e.x-player.x),m=addShot(a,'molotov',0);m.tx=e.x;m.ty=e.y;m.vx=(m.tx-m.x)/.65;m.vy=(m.ty-m.y)/.65}if(player.ball&&s.ball<=0){s.ball=3/player.ball;addShot(player.angle,'ball',35*player.ball)}if(player.kunai&&s.kunai<=0&&e){s.kunai=.85/player.kunai;addShot(Math.atan2(e.y-player.y,e.x-player.x),'kunai',42*player.kunai)}if(player.boom&&s.boom<=0){s.boom=3/player.boom;addShot(player.angle,'boom',45*player.boom)}if(player.brick&&s.brick<=0&&e){s.brick=3/player.brick;effects.push({kind:'brick',x:e.x,y:e.y,l:.45,r:70+player.brick*10,damage:65*player.brick})}if(player.rpg&&s.rpg<=0&&e){s.rpg=3.2/player.rpg;addShot(Math.atan2(e.y-player.y,e.x-player.x),'rpg',110*player.rpg)}}
function update(dt){if(!run||paused)return;time+=dt;if(noticeTime>0&&(noticeTime-=dt)<=0)ui.notice.style.opacity=0;let info=stageInfo();spawn-=dt;if(info.boss&&!bossSpawned){spawnEnemy(true);bossSpawned=true;pop(`${info.boss} 출현!`)}else if(!info.boss&&spawn<=0){spawnEnemy();spawn=Math.max(.18,.68-stage*.05)}player.fire-=dt;let m=unit((keys.KeyD?1:0)-(keys.KeyA?1:0)+touchMove.x,(keys.KeyS?1:0)-(keys.KeyW?1:0)+touchMove.y);player.x=Math.max(20,Math.min(W-20,player.x+m.x*player.speed*dt));player.y=Math.max(20,Math.min(H-20,player.y+m.y*player.speed*dt));player.angle=movementAim;if(mouse.down)shoot();autoSkills(dt);for(const e of enemies){let u=unit(player.x-e.x,player.y-e.y),d=Math.hypot(player.x-e.x,player.y-e.y);e.x+=u.x*e.speed*dt;e.y+=u.y*e.speed*dt;if(d<player.r+e.r){player.hp-=e.damage*dt;player.x-=u.x*25*dt;player.y-=u.y*25*dt}}for(let i=shots.length-1;i>=0;i--){let s=shots[i];let t=target();if((s.kind==='kunai'||s.kind==='rpg'||s.kind==='destroyer')&&t){let u=unit(t.x-s.x,t.y-s.y),turn=s.kind==='rpg'?.14:.08;s.vx+=u.x*760*turn;s.vy+=u.y*760*turn;let q=unit(s.vx,s.vy);s.vx=q.x*760;s.vy=q.y*760}s.x+=s.vx*dt;s.y+=s.vy*dt;s.l-=dt;if(s.kind==='ball'&&(s.x<0||s.x>W)){s.vx*=-1;s.bounce--}if(s.kind==='ball'&&(s.y<0||s.y>H)){s.vy*=-1;s.bounce--}for(const e of [...enemies])if(!s.hit[e.id]&&Math.hypot(e.x-s.x,e.y-s.y)<e.r+(s.kind==='ball'?12:4)){s.hit[e.id]=true;hurt(e,s.damage);burst(s.x,s.y,'#62e7ff');if(s.kind==='rpg'){effects.push({kind:'blast',x:s.x,y:s.y,l:.35,r:90,damage:s.damage*.7});s.l=0}else if(s.kind!=='ball'&&s.p--<=0)s.l=0}if(s.l<=0||s.bounce<0)shots.splice(i,1)}for(let i=zones.length-1;i>=0;i--){let z=zones[i];z.l-=dt;for(const e of [...enemies])if(Math.hypot(e.x-z.x,e.y-z.y)<z.r)hurt(e,z.damage*dt);if(z.l<=0)zones.splice(i,1)}for(let i=effects.length-1;i>=0;i--){let f=effects[i];f.l-=dt;if(f.kind==='blast')for(const e of [...enemies])if(Math.hypot(e.x-f.x,e.y-f.y)<f.r)hurt(e,f.damage*dt/.45);if(f.l<=0)effects.splice(i,1)}for(let i=gems.length-1;i>=0;i--){let g=gems[i],d=Math.hypot(player.x-g.x,player.y-g.y)||1;if(d<120){g.x+=(player.x-g.x)/d*370*dt;g.y+=(player.y-g.y)/d*370*dt}if(d<20){player.xp+=g.v;gems.splice(i,1);if(player.xp>=player.next){player.xp-=player.next;player.level++;player.next=Math.floor(player.next*1.28);levelUp()}}}for(let i=parts.length-1;i>=0;i--){let p=parts[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt;if(p.l<=0)parts.splice(i,1)}if(player.hp<=0){end();return}if((info.boss&&bossDefeated)||(!info.boss&&stageKills>=info.need)){clearStage();return}ui.hp.style.width=player.hp/player.maxHp*100+'%';ui.hpNum.textContent=Math.max(0,Math.ceil(player.hp));ui.xp.style.width=player.xp/player.next*100+'%';ui.lv.textContent=player.level;ui.time.textContent=`${String(Math.floor(time/60)).padStart(2,'0')}:${String(Math.floor(time%60)).padStart(2,'0')}`;ui.kills.textContent=`처치 ${kills}`;ui.stageLabel.textContent=info.boss?`STAGE ${info.n}/${info.total} · ${info.boss}`:`STAGE ${info.n}/${info.total}`;let p=info.boss?(boss?1-boss.hp/boss.maxHp:0):stageKills/info.need;ui.stage.style.width=Math.max(0,Math.min(100,p*100))+'%';ui.stageText.textContent=info.boss?(boss?`BOSS HP ${Math.max(0,Math.ceil(boss.hp))}`:'BOSS 출현 중'):`${stageKills} / ${info.need}`}
function draw(){x.fillStyle=maps[selected].bg;x.fillRect(0,0,W,H);x.strokeStyle='#ffffff0c';for(let i=0;i<W;i+=50){x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke()}for(let i=0;i<H;i+=50){x.beginPath();x.moveTo(0,i);x.lineTo(W,i);x.stroke()}for(const z of zones){x.fillStyle='#ff522b44';x.beginPath();x.arc(z.x,z.y,z.r,0,7);x.fill();x.fillStyle='#ffba3b99';for(let i=0;i<7;i++){let a=i*.9+time*3,r=z.r*.5;x.beginPath();x.arc(z.x+Math.cos(a)*r,z.y+Math.sin(a)*r,7+Math.sin(time*8+i)*3,0,7);x.fill()}}for(const f of effects){if(f.kind==='bolt'){x.strokeStyle='#e6b5ff';x.lineWidth=6;x.beginPath();x.moveTo(f.x,0);x.lineTo(f.x-18,f.y*.45);x.lineTo(f.x+12,f.y);x.stroke()}if(f.kind==='blast'){x.fillStyle='#ffcb5a55';x.beginPath();x.arc(f.x,f.y,f.r,0,7);x.fill()}}for(const g of gems){x.fillStyle='#75eaff';x.beginPath();x.moveTo(g.x,g.y-g.size);x.lineTo(g.x+g.size,g.y);x.lineTo(g.x,g.y+g.size);x.lineTo(g.x-g.size,g.y);x.fill()}for(const s of shots){let a=Math.atan2(s.vy,s.vx);x.save();x.translate(s.x,s.y);x.rotate(a);if(s.kind==='ball'){x.fillStyle='#fff';x.beginPath();x.arc(0,0,12,0,7);x.fill();x.fillStyle='#202534';x.beginPath();x.arc(0,0,5,0,7);x.fill();for(let k=0;k<5;k++){x.rotate(1.256);x.fillRect(6,-2,4,4)}}else if(s.kind==='rpg'){x.fillStyle='#ff6c4e';x.beginPath();x.moveTo(-13,-6);x.lineTo(12,-6);x.lineTo(20,0);x.lineTo(12,6);x.lineTo(-13,6);x.fill();x.fillStyle='#fff2bd';x.fillRect(0,-3,11,6);x.fillStyle='#ffcf3b';x.beginPath();x.moveTo(-13,-8);x.lineTo(-27,0);x.lineTo(-13,8);x.fill()}else if(s.kind==='molotov'){x.fillStyle='#6dd9ff';x.fillRect(-5,-8,10,14);x.fillStyle='#f5b64b';x.beginPath();x.arc(0,5,7,0,7);x.fill();x.fillStyle='#e9542f';x.fillRect(-3,-13,6,5)}else if(s.kind==='kunai'){x.fillStyle='#dce8ff';x.beginPath();x.moveTo(14,0);x.lineTo(-7,-6);x.lineTo(-2,0);x.lineTo(-7,6);x.fill();x.fillStyle='#2c3650';x.fillRect(-11,-2,9,4)}else if(s.kind==='boom'){x.strokeStyle='#ffbd57';x.lineWidth=6;x.beginPath();x.arc(0,0,10,-1.3,1.3);x.stroke();x.strokeStyle='#fff0ae';x.lineWidth=3;x.beginPath();x.arc(0,0,6,-1.1,1.1);x.stroke()}else if(s.kind==='droneA'||s.kind==='droneB'||s.kind==='destroyer'){x.fillStyle=s.kind==='droneA'?'#5be2ff':s.kind==='droneB'?'#ff7e89':'#ffe34c';x.fillRect(-6,-3,12,6)}else{x.fillStyle='#fff6a8';x.beginPath();x.arc(0,0,4,0,7);x.fill()}x.restore()}for(const e of enemies){x.fillStyle=e.color;x.shadowBlur=e.boss?20:0;x.shadowColor=e.color;x.beginPath();x.arc(e.x,e.y,e.r,0,7);x.fill();x.shadowBlur=0;x.fillStyle='#25111e';x.fillRect(e.x-e.r,e.y-e.r-10,e.r*2,4);x.fillStyle=e.color;x.fillRect(e.x-e.r,e.y-e.r-10,e.r*2*Math.max(0,e.hp/e.maxHp),4);if(e.boss){x.fillStyle='#fff';x.font='bold 11px sans-serif';x.textAlign='center';x.fillText(e.name,e.x,e.y-e.r-18)}}for(const d of drones){x.save();x.translate(d.x,d.y);x.fillStyle=d.type==='A'?'#5be2ff':d.type==='B'?'#ff7e89':'#ffe34c';x.shadowBlur=15;x.shadowColor=x.fillStyle;x.beginPath();x.arc(0,0,d.r,0,7);x.fill();x.fillStyle='#15243e';x.fillRect(-d.r-4,-4,d.r*2+8,8);x.fillStyle='#fff';x.fillRect(-3,-3,6,6);x.restore()}for(const p of parts){x.globalAlpha=p.l*3;x.fillStyle=p.col;x.fillRect(p.x,p.y,3,3)}x.globalAlpha=1;if(player){x.save();x.translate(player.x,player.y);x.rotate(player.angle);x.fillStyle='#63e9ff';x.fillRect(-2,-4,26,8);x.beginPath();x.arc(0,0,player.r,0,7);x.fill();x.restore()}requestAnimationFrame(draw)}
function resetTouchJoystick(){touchMove.x=touchMove.y=0;touchMove.active=false;const stick=$('#touch-stick');if(stick)stick.style.transform='translate(-50%,-50%)'}
function initTouchJoystick(){
  const base=$('#touch-joystick'),stick=$('#touch-stick');if(!base||!stick)return;
  let pointerId=null;
  const move=e=>{const r=base.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=r.width*.3;let dx=e.clientX-cx,dy=e.clientY-cy,d=Math.hypot(dx,dy);if(d>max){dx=dx/d*max;dy=dy/d*max}touchMove.x=dx/max;touchMove.y=dy/max;stick.style.transform=`translate(-50%,-50%) translate(${dx}px,${dy}px)`};
  const release=e=>{if(pointerId!==null&&(!e||e.pointerId===pointerId)){pointerId=null;resetTouchJoystick()}};
  base.addEventListener('pointerdown',e=>{if(!run||paused||pointerId!==null)return;pointerId=e.pointerId;touchMove.active=true;move(e);e.preventDefault()},{passive:false});
  addEventListener('pointermove',e=>{if(e.pointerId===pointerId){move(e);e.preventDefault()}},{passive:false});
  addEventListener('pointerup',release,{passive:true});
  addEventListener('pointercancel',release,{passive:true});
  addEventListener('blur',()=>release());
}
initTouchJoystick();
document.addEventListener('dblclick',event=>event.preventDefault(),{passive:false});
function typingTarget(target){return !!target?.closest?.('input, textarea, select, [contenteditable="true"]')}
addEventListener('keydown',e=>{if(typingTarget(e.target))return;keys[e.code]=true;if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault()});addEventListener('keyup',e=>{keys[e.code]=false});addEventListener('blur',()=>Object.keys(keys).forEach(code=>delete keys[code]));c.addEventListener('mousemove',e=>{let r=c.getBoundingClientRect();mouse.x=(e.clientX-r.left)*W/r.width;mouse.y=(e.clientY-r.top)*H/r.height;ui.cross.style.left=e.clientX+'px';ui.cross.style.top=e.clientY+'px'});addEventListener('mousedown',()=>{if(run&&!paused){mouse.down=true;shoot()}});addEventListener('mouseup',()=>mouse.down=false);$('#play-button').onclick=begin;$('#retry-button').onclick=begin;$('#menu-button').onclick=()=>{ui.result.classList.add('hidden');ui.menu.classList.remove('hidden')};$('#settings-button').onclick=()=>$('#settings').classList.toggle('hidden');$('#map-prev').onclick=()=>{if(selected>0){selected--;mapButtons()}};$('#map-next').onclick=()=>{if(selected<unlocked&&selected<maps.length-1){selected++;mapButtons()}};mapButtons();makePlayer();draw();requestAnimationFrame(function loop(t){let dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);requestAnimationFrame(loop)});

function extraSkills(dt){if(!run||paused||!player)return;let c=player.cd;guardian=null;medic=null;if(player.guardian){let a=time*3.5;guardian={x:player.x+Math.cos(a)*78,y:player.y+Math.sin(a)*78,r:31};for(const e of [...enemies]){let d=Math.hypot(e.x-guardian.x,e.y-guardian.y);if(d<e.r+guardian.r){hurt(e,48*player.guardian*dt);let u=unit(e.x-guardian.x,e.y-guardian.y);e.x+=u.x*180*dt;e.y+=u.y*180*dt}}}if(player.medic){let a=-time*2.5;medic={x:player.x+Math.cos(a)*63,y:player.y+Math.sin(a)*63,r:20};if(c.medic<=0){c.medic=3/player.medic;heals.push({x:player.x,y:player.y,r:85+player.medic*8,l:3,heal:11*player.medic})}}if(player.drill&&c.drill<=0){c.drill=3/player.drill;let a=Math.random()*6.28;specials.push({kind:'drill',x:player.x,y:player.y,vx:Math.cos(a)*1050,vy:Math.sin(a)*1050,l:5,b:12,damage:80*player.drill,hit:{}})}if(player.durian&&c.durian<=0){c.durian=4/player.durian;let a=player.angle;specials.push({kind:'durian',x:player.x,y:player.y,vx:Math.cos(a)*420,vy:Math.sin(a)*420,l:4,damage:75*player.durian,hit:{}})}if(player.laser&&c.laser<=0){let e=target();if(e){c.laser=1.4/player.laser;specials.push({kind:'laser',x:e.x,y:e.y,l:.7,damage:95*player.laser})}}if(player.mine&&c.mine<=0){c.mine=2.4/player.mine;specials.push({kind:'mine',x:player.x,y:player.y,l:10,r:24,damage:110*player.mine,type:player.molotov?'fire':player.lightning?'shock':'normal'})}for(let i=specials.length-1;i>=0;i--){let s=specials[i];s.l-=dt;if(s.kind==='drill'||s.kind==='durian'){s.x+=s.vx*dt;s.y+=s.vy*dt;if(s.x<0||s.x>W)s.vx*=-1;if(s.y<0||s.y>H)s.vy*=-1;for(const e of [...enemies])if(!s.hit[e.id]&&Math.hypot(e.x-s.x,e.y-s.y)<e.r+(s.kind==='durian'?28:14)){s.hit[e.id]=true;hurt(e,s.damage);if(s.kind==='durian'){let u=unit(e.x-s.x,e.y-s.y);e.x+=u.x*55;e.y+=u.y*55}}}if(s.kind==='laser')for(const e of [...enemies])if(Math.hypot(e.x-s.x,e.y-s.y)<58)hurt(e,s.damage*dt/.7);if(s.kind==='mine'&&enemies.some(e=>Math.hypot(e.x-s.x,e.y-s.y)<e.r+s.r)){let r=s.type==='fire'?105:s.type==='shock'?120:90;effects.push({kind:'blast',x:s.x,y:s.y,l:.45,r,damage:s.damage});if(s.type==='fire')zones.push({x:s.x,y:s.y,r,l:3,damage:25*player.mine});if(s.type==='shock')effects.push({kind:'bolt',x:s.x,y:s.y,l:.35});s.l=0}if(s.l<=0)specials.splice(i,1)}for(let i=heals.length-1;i>=0;i--){let h=heals[i];h.l-=dt;if(Math.hypot(player.x-h.x,player.y-h.y)<h.r)player.hp=Math.min(player.maxHp,player.hp+h.heal*dt);if(h.l<=0)heals.splice(i,1)}}
function specialLoop(t){let dt=Math.min(.033,(t-(specialLoop.last||t))/1000);specialLoop.last=t;extraSkills(dt);requestAnimationFrame(specialLoop)}requestAnimationFrame(specialLoop);
// 수호자 아이콘은 플레이어 중심에서 고정된 모습으로 보이게 한다.
function guardianAnchorLoop(){requestAnimationFrame(guardianAnchorLoop)}requestAnimationFrame(guardianAnchorLoop);
// 수호자 레벨은 회전하는 방패 수로 이어진다. 1레벨은 1개, 최대 5레벨은 5개다.
let guardianExtras=[];
function guardianFormationLoop(){guardianExtras=[];if(run&&player?.guardian>1){const count=Math.min(5,player.guardian),base=time*3.5;for(let i=1;i<count;i++){const a=base+Math.PI*2*i/count,shield={x:player.x+Math.cos(a)*78,y:player.y+Math.sin(a)*78,r:31};guardianExtras.push(shield);for(const enemy of [...enemies])if(Math.hypot(enemy.x-shield.x,enemy.y-shield.y)<enemy.r+shield.r){hurt(enemy,28*(1+(player.guardian-1)*.16)/60);const push=unit(enemy.x-shield.x,enemy.y-shield.y);enemy.x+=push.x*3;enemy.y+=push.y*3}}}requestAnimationFrame(guardianFormationLoop)}requestAnimationFrame(guardianFormationLoop);
function guardianTextureExtrasLoop(){if(run&&activeSkillSpriteSheet)for(const shield of guardianExtras)drawActiveWorldIcon(activeWorldCells.aegis,shield.x,shield.y,108,0);requestAnimationFrame(guardianTextureExtrasLoop)}requestAnimationFrame(guardianTextureExtrasLoop);
function enemyTactics(dt){if(!run||paused||!player)return;for(const e of [...enemies]){if(e.boss){e.patternCd=(e.patternCd??1.8)-dt;if(e.patternCd<=0){e.pattern=(e.pattern||0)+1;e.pattern%=3;e.patternCd=2.5;if(e.pattern===0){for(let i=0;i<10;i++){let a=i*.628;enemyShots.push({x:e.x,y:e.y,vx:Math.cos(a)*310,vy:Math.sin(a)*310,l:2,damage:16})}pop('보스: 탄막 발사!')}else if(e.pattern===1){enemyShots.push({x:player.x,y:player.y,l:.9,meteor:true,damage:42});pop('보스: 낙하 공격!')}else{spawnEnemy();spawnEnemy();pop('보스: 증원 소환!')}}continue}if(!e.type){let r=Math.random();e.type=r<.18?'shooter':r<.28?'bomber':'normal';e.cool=1+Math.random()*1.5}let d=Math.hypot(player.x-e.x,player.y-e.y);if(e.type==='shooter'){e.cool-=dt;if(e.cool<=0&&d<520){e.cool=1.7;let u=unit(player.x-e.x,player.y-e.y);enemyShots.push({x:e.x,y:e.y,vx:u.x*360,vy:u.y*360,l:2,damage:13})}}if(e.type==='bomber'&&d<72){effects.push({kind:'blast',x:e.x,y:e.y,l:.35,r:85,damage:0});player.hp-=32;killEnemy(e)}}for(let i=enemyShots.length-1;i>=0;i--){let s=enemyShots[i];s.l-=dt;if(!s.meteor){s.x+=s.vx*dt;s.y+=s.vy*dt;if(Math.hypot(player.x-s.x,player.y-s.y)<player.r+10){player.hp-=s.damage;effects.push({kind:'blast',x:s.x,y:s.y,l:.25,r:30,damage:0});s.l=0}}else if(s.l<=0&&Math.hypot(player.x-s.x,player.y-s.y)<105){player.hp-=s.damage;effects.push({kind:'blast',x:s.x,y:s.y,l:.35,r:105,damage:0})}if(s.l<=0)enemyShots.splice(i,1)}for(const s of specials)if(s.kind==='mine'&&!s.tossed){let a=Math.random()*6.28,d=100+Math.random()*100;s.x=player.x+Math.cos(a)*d;s.y=player.y+Math.sin(a)*d;s.tossed=true;player.cd.mine=Math.max(player.cd.mine,4.5/Math.max(1,player.mine))}}
function enemyLoop(t){let dt=Math.min(.033,(t-(enemyLoop.last||t))/1000);enemyLoop.last=t;enemyTactics(dt);requestAnimationFrame(enemyLoop)}requestAnimationFrame(enemyLoop);
function enemyVariantLoop(){if(run){for(const e of enemies){if(e.boss||e.variantReady)continue;if(e.type==='bomber'){e.speed*=2.25;e.color='#ff5a36';e.variant='bomber'}else if(e.type==='shooter'){e.weapon=Math.random()<.5?'bow':'fire';e.color=e.weapon==='bow'?'#b87aff':'#ff873d';e.variant='shooter'}else if(selected>=8&&Math.random()<.13){e.maxHp*=2.8;e.hp*=2.8;e.r*=1.45;e.speed*=.65;e.color='#727b8f';e.variant='tank'}else if(selected>=4&&Math.random()<.22){e.speed*=1.8;e.r*=.82;e.color='#76e7c7';e.variant='sprinter'}else e.variant='normal';e.variantReady=true}}requestAnimationFrame(enemyVariantLoop)}requestAnimationFrame(enemyVariantLoop);
function enemyVisualLoop(){if(run){for(const s of enemyShots){x.save();x.translate(s.x,s.y);if(s.meteor){x.strokeStyle='#ff4d62';x.lineWidth=4;x.beginPath();x.arc(0,0,42+Math.sin(time*10)*8,0,7);x.stroke();x.fillStyle='#ff923e88';x.beginPath();x.arc(0,0,18,0,7);x.fill()}else{let a=Math.atan2(s.vy,s.vx);x.rotate(a);x.fillStyle='#ffcf62';x.fillRect(-11,-3,19,6);x.fillStyle='#fff2c5';x.beginPath();x.moveTo(12,0);x.lineTo(3,-7);x.lineTo(3,7);x.fill()}x.restore()}for(const e of enemies){if(e.variant==='shooter'){x.save();x.translate(e.x,e.y);x.strokeStyle=e.weapon==='bow'?'#f3d493':'#ffb76b';x.lineWidth=3;if(e.weapon==='bow'){x.beginPath();x.arc(8,0,13,-1.2,1.2);x.stroke();x.beginPath();x.moveTo(8,-13);x.lineTo(8,13);x.stroke()}else{x.fillStyle='#ff8a45';x.fillRect(3,-14,10,20);x.fillStyle='#ffe070';x.beginPath();x.arc(8,-16,4,0,7);x.fill()}x.restore()}if(e.variant==='bomber'){x.save();x.translate(e.x,e.y);x.fillStyle='#3b2730';x.fillRect(-e.r-3,-5,e.r*2+6,10);for(let i=-1;i<=1;i++){x.fillStyle='#e73732';x.fillRect(i*10-4,-13,8,20);x.fillStyle='#ffd64f';x.fillRect(i*10-1,-17,2,5)}x.restore()}if(e.variant==='tank'){x.strokeStyle='#c3d0e2';x.lineWidth=4;x.beginPath();x.arc(e.x,e.y,e.r+5,0,7);x.stroke()}}}requestAnimationFrame(enemyVisualLoop)}requestAnimationFrame(enemyVisualLoop);
function traitLoop(t){let dt=Math.min(.033,(t-(traitLoop.last||t))/1000);traitLoop.last=t;if(run&&!paused&&player){for(const k in player.cd)player.cd[k]-=dt*Math.max(0,player.cdRate-1);player.hp=Math.min(player.maxHp,player.hp+player.regen*dt);if(player.lastHp>player.hp){let lost=player.lastHp-player.hp;player.hp=Math.min(player.maxHp,player.hp+lost*player.reduce)}player.lastHp=player.hp;for(const g of gems){let d=Math.hypot(player.x-g.x,player.y-g.y)||1;if(d<player.magnet){g.x+=(player.x-g.x)/d*260*dt;g.y+=(player.y-g.y)/d*260*dt}}for(const s of shots)if(!s.traitScaled){s.vx*=player.ammoSpeed;s.vy*=player.ammoSpeed;s.l*=player.projectileRange;s.traitScaled=true}for(const z of zones)z.l+=dt*Math.max(0,player.durationRate-1);for(const h of heals)h.l+=dt*Math.max(0,player.durationRate-1);if((traitLoop.kills||0)!==kills){player.gold+=(kills-(traitLoop.kills||0))*player.goldMult;traitLoop.kills=kills}}requestAnimationFrame(traitLoop)}requestAnimationFrame(traitLoop);
function passiveScaleLoop(){if(run&&player){for(const g of gems)if(!g.xpScaled){g.v*=player.xpMult;g.xpScaled=true}for(const s of shots)if(!s.sizeScaled){s.damage*=1+(player.projectileSize-1)*.35;s.sizeScaled=true}}requestAnimationFrame(passiveScaleLoop)}requestAnimationFrame(passiveScaleLoop);
function evolutionLoop(t){let dt=Math.min(.033,(t-(evolutionLoop.last||t))/1000);evolutionLoop.last=t;if(run&&!paused&&player){let ev=player.evolved,near=e=>Math.hypot(e.x-player.x,e.y-player.y);if(ev.boom)for(const e of [...enemies])if(near(e)<145){hurt(e,32*dt);let u=unit(e.x-player.x,e.y-player.y);e.x+=u.x*120*dt;e.y+=u.y*120*dt}if(ev.guardian)for(const e of [...enemies])if(near(e)<125){hurt(e,44*dt);let u=unit(e.x-player.x,e.y-player.y);e.x+=u.x*160*dt;e.y+=u.y*160*dt}if(ev.drill)for(const s of specials)if(s.kind==='drill'){let e=target();if(e){let u=unit(e.x-s.x,e.y-s.y);s.vx+=u.x*85;s.vy+=u.y*85}}if(ev.lightning){evolutionLoop.super=(evolutionLoop.super||0)-dt;if(evolutionLoop.super<=0){let e=target();if(e){evolutionLoop.super=.7;for(const o of [...enemies])if(Math.hypot(o.x-e.x,o.y-e.y)<105)hurt(o,28);effects.push({kind:'blast',x:e.x,y:e.y,l:.25,r:105,damage:0})}}}if(ev.molotov){evolutionLoop.fire=(evolutionLoop.fire||0)-dt;if(evolutionLoop.fire<=0){evolutionLoop.fire=1.3;zones.push({x:player.x,y:player.y,r:105,l:1.4,damage:38})}}for(const s of specials)if(s.kind==='mine'&&!s.evoType){s.type=ev.mineFire?'fire':ev.mineShock?'shock':'normal';s.evoType=true}}requestAnimationFrame(evolutionLoop)}requestAnimationFrame(evolutionLoop);
function evolutionHintLoop(){let h=$('#evolution-hint');if(player&&paused&&!ui.up.classList.contains('hidden')){let ready=evolutions.filter(e=>(player.levels[e[2]]||0)>=5&&(player.levels[e[3]]||0)>=5&&!player.evolved[e[4]]);h.textContent=ready.length?`돌파 가능: ${ready.map(e=>`${e[2]} + ${e[3]} → ${e[1]}`).join(' · ')}`:'돌파 조건: 액티브 스킬 LV.5 + 연결 패시브 LV.5. 예) 혜성 발사기 + 광자 연료 → 폭성 혜성포'}else h.textContent='';requestAnimationFrame(evolutionHintLoop)}requestAnimationFrame(evolutionHintLoop);
function forcefieldLoop(t){let dt=Math.min(.033,(t-(forcefieldLoop.last||t))/1000);forcefieldLoop.last=t;if(run&&!paused&&player?.forcefield){let r=75+player.forcefield*13;if(player.evolved.forcefield)r+=60;for(const e of [...enemies])if(Math.hypot(e.x-player.x,e.y-player.y)<r+e.r){hurt(e,(18+player.forcefield*7)*dt);let u=unit(e.x-player.x,e.y-player.y);e.x+=u.x*(player.evolved.forcefield?120:45)*dt;e.y+=u.y*(player.evolved.forcefield?120:45)*dt}}requestAnimationFrame(forcefieldLoop)}requestAnimationFrame(forcefieldLoop);
let audioCtx=null,musicTimer=null,musicMode='',bossMusicStarted=false;function tone(freq,dur,vol=.035,type='triangle'){if(!audioCtx)return;let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur)}function startMusic(mode){if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)()}if(audioCtx.state==='suspended')audioCtx.resume();if(musicMode===mode)return;clearInterval(musicTimer);musicMode=mode;let notes=mode==='menu'?[262,330,392,523,392,330]:mode==='boss'?[73,87,98,110,98,87]:[110,131,147,123,110,98],i=0,step=mode==='menu'?260:mode==='boss'?180:340;musicTimer=setInterval(()=>{tone(notes[i++%notes.length],step/1000*.8,mode==='boss'?.055:.032,mode==='boss'?'sawtooth':'triangle');if(mode==='menu'&&i%4===0)tone(notes[(i+2)%notes.length]/2,.18,.018,'sine')},step)}function bossAlarm(){if(bossMusicStarted)return;bossMusicStarted=true;let n=0,a=setInterval(()=>{tone(n++%2?880:660,.12,.08,'square');if(n>=7){clearInterval(a);startMusic('boss')}},160)}function musicWatch(){if(run&&boss)bossAlarm();if(run&&!boss&&musicMode==='boss')startMusic('game');if(!run&&musicMode==='boss')startMusic('menu');requestAnimationFrame(musicWatch)}requestAnimationFrame(musicWatch);document.addEventListener('pointerdown',()=>startMusic(run?'game':'menu'),{once:true});$('#play-button').addEventListener('click',()=>{bossMusicStarted=false;startMusic('game')});$('#menu-button').addEventListener('click',()=>startMusic('menu'));
function holyDestroyerLoop(t){let dt=Math.min(.033,(t-(holyDestroyerLoop.last||t))/1000);holyDestroyerLoop.last=t;if(run&&!paused&&player){if(player.destroyer&&player.medic>=5&&!player.evolved.holy){player.evolved.holy='신성한 파괴자';pop('신성한 파괴자 탄생!')}if(player.evolved.holy){player.hp=Math.min(player.maxHp,player.hp+13*dt);holyDestroyerLoop.cd=(holyDestroyerLoop.cd||0)-dt;if(holyDestroyerLoop.cd<=0){holyDestroyerLoop.cd=.1;let e=target();if(e){hurt(e,65);effects.push({kind:'bolt',x:e.x,y:e.y,l:.15})}}}}requestAnimationFrame(holyDestroyerLoop)}requestAnimationFrame(holyDestroyerLoop);
let wallet=localStorage.getItem('neonCoins')===null?100:(+localStorage.neonCoins||0),musicVolume=.6;if(localStorage.getItem('neonCoins')===null)localStorage.neonCoins=wallet;function renderCoins(){let w=$('#coin-wallet'),count=$('#coin-count');if(count)count.textContent=wallet;else if(w)w.textContent=`🪙 ${wallet}`}function tryBegin(){if(selected>unlocked){pop('이전 맵을 먼저 클리어하세요!');return}if(!equipped?.weapon){pop('상자에서 무기를 획득하고 장착하세요!');return}begin()}function tone(freq,dur,vol=.035,type='triangle'){if(!audioCtx)return;let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol*musicVolume,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur)}$('#sound').oninput=e=>{musicVolume=+e.target.value/100};$('#play-button').onclick=tryBegin;$('#battle-tab').onclick=()=>{$('#menu').classList.remove('home');mapButtons()};$('#menu-button').addEventListener('click',()=>$('#menu').classList.add('home'));$('#map-next').onclick=()=>{if(selected<maps.length-1){selected++;mapButtons()}};renderCoins();
const weapons=[['유성 단도','common','매우 빠름 · 전방으로 연속 단도 투척'],['충격 철퇴','common','보통 · 앞을 넓게 휘둘러 넉백'],['노바 리볼버','rare','빠름 · 바라보는 방향으로 강한 에너지탄'],['청광 도검','rare','빠름 · 초승달 검기로 근거리 절단'],['폭풍 산탄총','hero','느림 · 부채꼴 산탄 발사'],['태양 파쇄검','hero','보통 · 여러 방향 태양 검기'],['공허 흡수기','legend','느림 · 중력장으로 적 흡수'],['균열 장검','legend','빠름 · 균열 검기와 돌진을 교대'],['여명·황혼 쌍창','mythic','매우 빠름 · 빛·그림자 창 광역 공격']].map(x=>({name:x[0],tier:x[1],desc:x[2],slot:'weapon'}));
const armors=[['군복','armor','적 처치 시 체력 회복','common'],['보호복','armor','최대 체력 증가','common'],['카라페이스','armor','투사체 피해 감소','rare'],['여행자 재킷','armor','받는 피해 감소','rare'],['풀 메탈 슈트','armor','부활 1회','hero'],['공허의 바람막이','armor','위기 시 광폭화·흡혈','legend'],['침묵의 갑옷','armor','사망 시 영혼 무적','legend'],['영원의 슈트','armor','부활 2회·공격·이속 증가','mythic'],['손가락 없는 장갑','gloves','치명타 확률 증가','common'],['군용 장갑','gloves','일반 적 추가 피해','rare'],['가죽 장갑','gloves','공격력 증가','common'],['식조리 장갑','gloves','처치 시 공격력 증가','hero'],['영원의 장갑','gloves','치명타·체력 회복','mythic'],['공허의 장갑','gloves','고체력 적에게 강력','legend'],['악의 장갑','gloves','출혈 효과','legend'],['고속 러너','shoes','이동속도 증가','common'],['군화','shoes','체력 증가','common'],['경량 운동화','shoes','회피 성능 향상','rare'],['방호 부츠','shoes','받는 피해 감소','rare'],['영원의 장화','shoes','화염 장판 생성','mythic'],['공허의 장화','shoes','이동할수록 강해짐','legend'],['악의 장화','shoes','적 처치 시 강화','legend'],['가죽 벨트','belt','체력 증가','common'],['폭 넓은 허리띠','belt','방어력 증가','common'],['군용 벨트','belt','공격력 증가','rare'],['세련된 벨트','belt','피해 감소','rare'],['스타일리시 벨트','belt','보호막 생성','hero'],['영원의 벨트','belt','보호막·공격력 증가','mythic'],['공허의 허리띠','belt','생존력 매우 높음','legend'],['혼돈의 벨트','belt','공격·생존 우수','legend'],['에메랄드 펜던트','necklace','체력 증가','common'],['뼈 목걸이','necklace','공격력 증가','common'],['메탈 목걸이','necklace','스킬 피해 증가','rare'],['트렌디 참','necklace','경험치 획득 증가','hero'],['영원의 목걸이','necklace','공격력 증가','mythic'],['공허의 문장','necklace','체력이 낮을수록 강함','legend'],['악의 목걸이','necklace','디버프 활용','legend']].map(x=>({name:x[0],slot:x[1],desc:x[2],tier:x[3]}));
let inventory=JSON.parse(localStorage.neonInventory||'[]'),equipped=JSON.parse(localStorage.neonEquipped||'{}');for(const item of inventory)if(item.slot==='weapon')item.name=weaponDisplayName(weaponCoreName(item.name));if(equipped.weapon)equipped.weapon.name=weaponDisplayName(weaponCoreName(equipped.weapon.name));function saveGear(){localStorage.neonInventory=JSON.stringify(inventory);localStorage.neonEquipped=JSON.stringify(equipped)}
// 첫 전투를 막지 않도록, 무기가 하나도 없는 계정에는 최하급 주무기를 자동 지급·장착한다.
function grantStarterWeapon(){const owned=inventory.find(item=>item.slot==='weapon');if(owned){if(!equipped.weapon)equipped.weapon=owned;return}const starter={...weapons[0],starter:true};inventory.push(starter);equipped.weapon=starter;localStorage.neonStarterWeapon='1';pop?.('기본 지급: 유성 단도를 장착했습니다.')}grantStarterWeapon();saveGear();function rarity(){let r=Math.random()*100;return r<58?'common':r<83?'rare':r<94?'hero':r<99?'legend':'mythic'}function rollItem(list){let tier=rarity(),pool=list.filter(i=>i.tier===tier);return {...pool[Math.floor(Math.random()*pool.length)]}}function drawGear(){for(const slot of ['weapon','armor','gloves','shoes','belt','necklace']){let n=$('#slot-'+slot),i=equipped[slot];if(n){n.textContent=i?i.name:({weapon:'무기',armor:'갑옷',gloves:'장갑',shoes:'신발',belt:'벨트',necklace:'목걸이'}[slot]);n.classList.toggle('equipped',!!i)}}let box=$('#inventory');if(box)box.innerHTML=inventory.length?inventory.map((i,n)=>`<button class="item ${i.tier}" data-item="${n}"><b>${i.name}</b><small>${i.desc}</small></button>`).join(''):'아직 획득한 장비가 없습니다.';box?.querySelectorAll('.item').forEach(b=>b.onclick=()=>{let i=inventory[+b.dataset.item];equipped[i.slot]=i;saveGear();drawGear()})}function buy(kind){if(wallet<100){$('#shop-result').textContent='코인이 부족합니다.';return}wallet-=100;let item=rollItem(kind==='weapon'?weapons:armors);inventory.push(item);saveGear();renderCoins();$('#shop-result').innerHTML=`획득! <b class="${item.tier}">${item.name}</b><br>${item.desc}`;drawGear()}function openModal(id){$('#'+id).classList.remove('hidden');drawGear()}$('#crate-button').onclick=()=>openModal('shop');$('#equipment-button').onclick=()=>openModal('equipment');$('#buy-weapon').onclick=()=>buy('weapon');$('#buy-armor').onclick=()=>buy('armor');document.querySelectorAll('.close').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).classList.add('hidden'));drawGear();
function itemIcon(item){if(item.slot==='weapon')return item.name.includes('검')||item.name.includes('카타나')?'⚔':'🔫';return({armor:'🛡',gloves:'🧤',shoes:'👟',belt:'🪢',necklace:'📿'})[item.slot]||'✦'}function buy(kind){if(wallet<100){$('#shop-result').textContent='코인이 부족합니다.';return}wallet-=100;let item=rollItem(kind==='weapon'?weapons:armors);inventory.push(item);saveGear();renderCoins();$('#shop-result').innerHTML=`<div class="loot-texture ${item.tier}"><span class="loot-icon">${itemIcon(item)}</span><b>${item.name}</b><small>${item.desc}</small><small>${({common:'일반',rare:'희귀',hero:'영웅',legend:'전설',mythic:'신화'})[item.tier]}</small></div>`;drawGear()}function showShop(){$('#menu').classList.add('hidden');$('#shop').classList.remove('hidden');$('#shop-result').textContent='상자를 열어 보상을 확인하세요.'}$('#crate-button').onclick=showShop;document.querySelectorAll('.close').forEach(b=>b.onclick=()=>{$('#'+b.dataset.close).classList.add('hidden');$('#menu').classList.remove('hidden')});
// 갑옷은 각 이름마다 전용 실루엣을 장비·상자·인벤토리에서 공통으로 사용한다.
setTimeout(()=>{const priorItemIcon=itemIcon,armorTexture={군복:'military',보호복:'protective',카라페이스:'shell','여행자 재킷':'jacket','풀 메탈 슈트':'metal','공허의 바람막이':'void','침묵의 갑옷':'silence','영원의 슈트':'eternal'};itemIcon=item=>item.slot==='armor'&&armorTexture[item.name]?`<i class="armor-thumb armor-${armorTexture[item.name]}" aria-label="${item.name}"></i>`:priorItemIcon(item);drawGear()},0);

// 장착 장비도 보유함에는 남기되, 동일 장비 여러 개를 정확히 구분해 "착용 중"으로 표시한다.
let gearInstanceSequence=Number(localStorage.neonGearInstanceSequence||0);
function ensureGearInstance(item){
  if(!item.instanceId)item.instanceId=`gear-${++gearInstanceSequence}`;
  return item.instanceId;
}
function sameGearType(a,b){return a&&b&&a.slot===b.slot&&a.name===b.name&&(a.tier||'common')===(b.tier||'common')}
function normalizeGearInstances(){
  const claimed=new Set();
  for(const item of inventory)ensureGearInstance(item);
  for(const slot of Object.keys(equipped)){
    const equippedItem=equipped[slot];
    if(!equippedItem)continue;
    let source=inventory.find(item=>item.instanceId===equippedItem.instanceId&&!claimed.has(item.instanceId));
    source||=inventory.find(item=>sameGearType(item,equippedItem)&&!claimed.has(item.instanceId));
    if(source){equipped[slot]=source;claimed.add(source.instanceId)}
    else{ensureGearInstance(equippedItem);inventory.push(equippedItem);claimed.add(equippedItem.instanceId)}
  }
}
const saveGearWithInstanceIds=saveGear;
saveGear=()=>{normalizeGearInstances();localStorage.neonGearInstanceSequence=String(gearInstanceSequence);saveGearWithInstanceIds()};
function isEquippedInventoryItem(item){return !!item&&equipped[item.slot]?.instanceId===item.instanceId}
function decorateInventoryEquipmentState(){
  const box=$('#inventory');if(!box)return;
  box.querySelectorAll('.item').forEach(button=>{
    const item=inventory[+button.dataset.item],wearing=isEquippedInventoryItem(item);
    button.classList.toggle('equipped-item',wearing);
    button.querySelector('.equipped-badge')?.remove();
    if(wearing){const badge=document.createElement('em');badge.className='equipped-badge';badge.textContent='착용 중';button.append(badge)}
    button.onclick=()=>{
      if(isEquippedInventoryItem(item)){pop('이미 착용 중인 장비입니다.');return}
      equipped[item.slot]=item;saveGear();drawGear();
    };
  });
}
setTimeout(()=>{
  normalizeGearInstances();
  const drawGearWithSortedInventory=drawGear;
  drawGear=()=>{drawGearWithSortedInventory();decorateInventoryEquipmentState()};
  saveGear();drawGear();
},0);

function draw(){x.fillStyle=maps[selected].bg;x.fillRect(0,0,W,H);x.strokeStyle='#ffffff0c';for(let i=0;i<W;i+=50){x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke()}for(let i=0;i<H;i+=50){x.beginPath();x.moveTo(0,i);x.lineTo(W,i);x.stroke()}for(const h of heals){x.fillStyle='#49ff9b30';x.beginPath();x.arc(h.x,h.y,h.r,0,7);x.fill();x.strokeStyle='#5dffab';x.stroke()}for(const z of zones){x.fillStyle='#ff522b44';x.beginPath();x.arc(z.x,z.y,z.r,0,7);x.fill();for(let i=0;i<7;i++){let a=i*.9+time*3,r=z.r*.5;x.fillStyle='#ffba3b99';x.beginPath();x.arc(z.x+Math.cos(a)*r,z.y+Math.sin(a)*r,9,0,7);x.fill()}}for(const f of effects){if(f.kind==='bolt'){x.strokeStyle='#e6b5ff';x.lineWidth=7;x.beginPath();x.moveTo(f.x,0);x.lineTo(f.x-18,f.y*.45);x.lineTo(f.x+12,f.y);x.stroke()}if(f.kind==='blast'){x.fillStyle='#ffcb5a55';x.beginPath();x.arc(f.x,f.y,f.r,0,7);x.fill()}}for(const g of gems){x.fillStyle='#75eaff';x.beginPath();x.moveTo(g.x,g.y-g.size);x.lineTo(g.x+g.size,g.y);x.lineTo(g.x,g.y+g.size);x.lineTo(g.x-g.size,g.y);x.fill()}for(const s of specials){x.save();x.translate(s.x,s.y);let a=Math.atan2(s.vy||0,s.vx||1);x.rotate(a);if(s.kind==='drill'){x.fillStyle='#88eaff';x.beginPath();x.moveTo(28,0);x.lineTo(-20,-13);x.lineTo(-10,0);x.lineTo(-20,13);x.fill();x.fillStyle='#fff';x.fillRect(-8,-5,22,10)}if(s.kind==='durian'){x.fillStyle='#81b843';x.beginPath();x.arc(0,0,28,0,7);x.fill();x.strokeStyle='#d8ff80';x.lineWidth=4;for(let i=0;i<10;i++){x.rotate(.63);x.beginPath();x.moveTo(20,0);x.lineTo(34,0);x.stroke()}}if(s.kind==='mine'){x.fillStyle=s.type==='fire'?'#ff783f':s.type==='shock'?'#c989ff':'#59667b';x.beginPath();x.arc(0,0,22,0,7);x.fill();x.fillStyle='#1b2435';x.fillRect(-18,-5,36,10);x.fillStyle='#ffdf57';x.beginPath();x.arc(0,-24,5,0,7);x.fill()}if(s.kind==='laser'){x.rotate(-a);x.fillStyle='#ff5bdf44';x.fillRect(-12,-720,24,720);x.fillStyle='#fff0ff';x.fillRect(-4,-720,8,720)}x.restore()}for(const s of shots){let a=Math.atan2(s.vy,s.vx);x.save();x.translate(s.x,s.y);x.rotate(a);if(s.kind==='ball'){x.fillStyle='#fff';x.beginPath();x.arc(0,0,14,0,7);x.fill();x.fillStyle='#202534';x.beginPath();x.arc(0,0,6,0,7);x.fill()}else if(s.kind==='rpg'){x.fillStyle='#ff6c4e';x.fillRect(-15,-8,30,16);x.fillStyle='#ffcf3b';x.beginPath();x.moveTo(-15,-12);x.lineTo(-32,0);x.lineTo(-15,12);x.fill()}else if(s.kind==='molotov'){x.fillStyle='#6dd9ff';x.fillRect(-7,-11,14,19);x.fillStyle='#f5b64b';x.beginPath();x.arc(0,7,10,0,7);x.fill()}else if(s.kind==='kunai'){x.fillStyle='#dce8ff';x.beginPath();x.moveTo(22,0);x.lineTo(-10,-9);x.lineTo(-3,0);x.lineTo(-10,9);x.fill()}else if(s.kind==='boom'){x.strokeStyle='#ffbd57';x.lineWidth=9;x.beginPath();x.arc(0,0,15,-1.3,1.3);x.stroke()}else if(s.kind==='droneA'||s.kind==='droneB'||s.kind==='destroyer'){x.fillStyle=s.kind==='droneA'?'#5be2ff':s.kind==='droneB'?'#ff7e89':'#ffe34c';x.fillRect(-8,-4,16,8)}else{x.fillStyle='#fff6a8';x.beginPath();x.arc(0,0,4,0,7);x.fill()}x.restore()}for(const e of enemies){x.fillStyle=e.color;x.shadowBlur=e.boss?20:0;x.shadowColor=e.color;x.beginPath();x.arc(e.x,e.y,e.r,0,7);x.fill();x.shadowBlur=0;x.fillStyle='#25111e';x.fillRect(e.x-e.r,e.y-e.r-10,e.r*2,4);x.fillStyle=e.color;x.fillRect(e.x-e.r,e.y-e.r-10,e.r*2*Math.max(0,e.hp/e.maxHp),4);if(e.boss){x.fillStyle='#fff';x.font='bold 11px sans-serif';x.textAlign='center';x.fillText(e.name,e.x,e.y-e.r-18)}}for(const d of drones){x.save();x.translate(d.x,d.y);x.fillStyle=d.type==='A'?'#5be2ff':d.type==='B'?'#ff7e89':'#ffe34c';x.beginPath();x.arc(0,0,d.r,0,7);x.fill();x.fillStyle='#15243e';x.fillRect(-d.r-4,-4,d.r*2+8,8);x.restore()}if(guardian){x.save();x.translate(guardian.x,guardian.y);x.rotate(time*8);x.fillStyle='#9ed8ff';x.fillRect(-guardian.r,-9,guardian.r*2,18);x.fillStyle='#37618c';x.fillRect(-9,-guardian.r,18,guardian.r*2);x.restore()}if(medic){x.save();x.translate(medic.x,medic.y);x.fillStyle='#55f39a';x.beginPath();x.arc(0,0,medic.r,0,7);x.fill();x.fillStyle='#fff';x.fillRect(-4,-12,8,24);x.fillRect(-12,-4,24,8);x.restore()}for(const p of parts){x.globalAlpha=p.l*3;x.fillStyle=p.col;x.fillRect(p.x,p.y,3,3)}x.globalAlpha=1;if(player){x.save();x.translate(player.x,player.y);x.rotate(player.angle);x.fillStyle='#63e9ff';x.fillRect(-2,-4,26,8);x.beginPath();x.arc(0,0,player.r,0,7);x.fill();x.restore()}requestAnimationFrame(draw)}
