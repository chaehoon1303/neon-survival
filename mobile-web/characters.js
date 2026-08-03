/* 오리지널 요원 시스템: 외부 이미지 없이 Canvas 도형과 파티클만 사용한다. */
const CHARACTER_DATA={
  kairos:{name:'카이로스',role:'근접 밸런스',color:'#4fb9ff',accent:'#c5f2ff',hp:110,damage:12,speed:260,charge:9,passive:'전투 가속',q:{name:'블레이드 러시',cd:5},e:{name:'회전 베기',cd:7},r:{name:'천공참'}},
  lumina:{name:'루미나',role:'회복 원거리',color:'#78f0a1',accent:'#ffd76a',hp:120,damage:8,speed:260,charge:7.5,passive:'생명의 잔광',q:{name:'생명의 빛',cd:8},e:{name:'광휘 탄환',cd:6},r:{name:'생명의 성역'}},
  volt:{name:'볼트',role:'빠른 암살자',color:'#ffe259',accent:'#8fefff',hp:88,damage:14,speed:300,charge:10,passive:'과전류',q:{name:'전광 돌진',cd:5},e:{name:'연쇄 번개',cd:8},r:{name:'뇌전 폭풍'}},
  gravion:{name:'그라비온',role:'탱커 제어',color:'#b98cff',accent:'#573d9c',hp:135,damage:10,speed:220,charge:7,passive:'중력 장갑',q:{name:'중력 응축',cd:7},e:{name:'반중력 폭발',cd:9},r:{name:'특이점 붕괴'}},
  frost:{name:'프로스트',role:'원거리 제어',color:'#8ceaff',accent:'#eefcff',hp:96,damage:11,speed:260,charge:8,passive:'서리 표식',q:{name:'서리창',cd:5},e:{name:'설원의 장막',cd:9},r:{name:'영원의 빙원'}}
};
let selectedCharacter=localStorage.neonSelectedCharacter||'kairos';
if(!CHARACTER_DATA[selectedCharacter])selectedCharacter='kairos';
let characterEffects=[],characterProjectiles=[],characterFloats=[],characterSource=null,characterLastHp=0,characterShake=0;
const characterButtons=[...document.querySelectorAll('[data-character-skill]')],characterPassive=$('#character-passive');
const characterNow=()=>CHARACTER_DATA[selectedCharacter];
let agentSprite=null,agentSpriteId='';
function refreshAgentTexture(){
  if(agentSpriteId===selectedCharacter&&agentSprite){warriorSprite=agentSprite;return}
  const data=characterNow(),sheet=document.createElement('canvas'),ctx=sheet.getContext('2d'),cx=570,cy=590;
  sheet.width=1140;sheet.height=1050;ctx.translate(cx,cy);ctx.lineJoin='round';ctx.lineCap='round';
  const fill=(color,path)=>{ctx.fillStyle=color;ctx.beginPath();path();ctx.fill()},stroke=(color,width,path)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();path();ctx.stroke()};
  ctx.shadowBlur=34;ctx.shadowColor=data.color;fill(data.color+'44',()=>ctx.arc(0,28,245,0,Math.PI*2));ctx.shadowBlur=0;
  if(selectedCharacter==='kairos'){
    fill('#121927',()=>ctx.roundRect(-155,-68,310,280,46));fill('#b9c4d1',()=>ctx.roundRect(-128,-205,256,188,74));fill('#10141e',()=>ctx.roundRect(-96,-153,192,72,25));fill('#61d9ff',()=>ctx.roundRect(-82,-141,164,43,15));fill('#111722',()=>ctx.roundRect(-120,188,92,113,23));fill('#111722',()=>ctx.roundRect(28,188,92,113,23));stroke('#dcecff',23,()=>{ctx.moveTo(85,24);ctx.lineTo(255,-96)});stroke('#4ad6ff',12,()=>{ctx.moveTo(82,24);ctx.lineTo(264,-103)});fill('#0a101a',()=>ctx.roundRect(-92,-263,184,77,43));
  }else if(selectedCharacter==='lumina'){
    fill('#f7f0d8',()=>{ctx.moveTo(0,-245);ctx.lineTo(152,196);ctx.lineTo(-152,196);ctx.closePath()});fill('#d9ac4f',()=>{ctx.moveTo(0,-230);ctx.lineTo(54,170);ctx.lineTo(-54,170);ctx.closePath()});fill('#fff7dd',()=>ctx.arc(0,-188,88,0,Math.PI*2));fill('#6ef2a1',()=>ctx.roundRect(-58,-204,116,32,12));stroke('#b8984f',23,()=>{ctx.moveTo(135,144);ctx.lineTo(198,-205)});fill('#ffe373',()=>ctx.arc(204,-228,34,0,Math.PI*2));
  }else if(selectedCharacter==='volt'){
    fill('#111827',()=>ctx.roundRect(-115,-142,230,305,48));fill('#202b3c',()=>ctx.roundRect(-105,-230,210,160,70));fill('#95f4ff',()=>ctx.roundRect(-76,-186,152,42,15));fill('#171c28',()=>ctx.roundRect(-122,150,85,165,24));fill('#171c28',()=>ctx.roundRect(37,150,85,165,24));stroke('#ffe55b',22,()=>{ctx.moveTo(-148,-24);ctx.lineTo(-216,142);ctx.lineTo(-130,120);ctx.lineTo(-196,283)});stroke('#ffe55b',18,()=>{ctx.moveTo(105,-10);ctx.lineTo(210,-88);ctx.lineTo(164,50);ctx.lineTo(248,16)});
  }else if(selectedCharacter==='gravion'){
    fill('#2a2d3a',()=>ctx.roundRect(-188,-115,376,338,68));fill('#404456',()=>ctx.roundRect(-164,-260,328,185,78));fill('#151723',()=>ctx.roundRect(-114,-204,228,55,18));fill('#b98cff',()=>ctx.roundRect(-92,-191,184,28,10));fill('#1f2130',()=>ctx.roundRect(-169,196,135,132,30));fill('#1f2130',()=>ctx.roundRect(34,196,135,132,30));fill('#6b42a4',()=>ctx.arc(0,34,58,0,Math.PI*2));fill('#e3c7ff',()=>ctx.arc(0,34,24,0,Math.PI*2));for(let i=0;i<4;i++){ctx.save();ctx.rotate(i*Math.PI/2);fill('#8370a7',()=>ctx.roundRect(210,-18,58,36,12));ctx.restore()}
  }else{
    fill('#172945',()=>{ctx.moveTo(0,-246);ctx.lineTo(158,205);ctx.lineTo(-158,205);ctx.closePath()});fill('#effcff',()=>ctx.arc(0,-182,86,0,Math.PI*2));fill('#8eeeff',()=>ctx.roundRect(-63,-196,126,35,13));fill('#a9f5ff',()=>{ctx.moveTo(0,-345);ctx.lineTo(42,-264);ctx.lineTo(-42,-264);ctx.closePath()});fill('#6ccdf0',()=>ctx.arc(112,34,42,0,Math.PI*2));stroke('#dffcff',18,()=>{ctx.moveTo(94,68);ctx.lineTo(207,-120)});for(let i=-1;i<=1;i++){ctx.save();ctx.translate(i*90,34);fill('#c9f9ff',()=>{ctx.moveTo(0,-48);ctx.lineTo(24,0);ctx.lineTo(0,48);ctx.lineTo(-24,0);ctx.closePath()});ctx.restore()}
  }
  agentSprite=sheet;agentSpriteId=selectedCharacter;warriorSprite=agentSprite;
}
const limit=(n,a,b)=>Math.max(a,Math.min(b,n));
function characterAim(){return player?.angle??0}
function charFloat(text,px=player?.x||W/2,py=(player?.y||H/2)-48,color='#ffffff'){characterFloats.push({text,x:px,y:py,l:.8,color})}
function charBurst(px,py,color,count=9){burst(px,py,color,count);characterEffects.push({type:'flash',x:px,y:py,l:.22,max:.22,r:38,color})}
function withCharacterSource(key,max,fn){const previous=characterSource;characterSource={key,max,count:0};try{fn()}finally{characterSource=previous}}
const coreCharacterHurt=hurt;
hurt=function(enemy,damage){
  const before=enemy?.hp;
  coreCharacterHurt(enemy,damage);
  if(!player||!run||!Number.isFinite(before)||!characterSource)return;
  if(before>(enemy?.hp??0)&&characterSource.count<characterSource.max){characterSource.count++;player.ultimate=Math.min(100,player.ultimate+characterNow().charge);characterHitPassive(enemy);}
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
}
const coreCharacterWeaponAttack=weaponAttack;
weaponAttack=function(dt){
  if(!run||paused||!player)return coreCharacterWeaponAttack(dt);
  withCharacterSource('weapon',1,()=>coreCharacterWeaponAttack(dt));
};
const coreCharacterMakePlayer=makePlayer;
makePlayer=function(){
  coreCharacterMakePlayer();
  const data=characterNow();
  refreshAgentTexture();
  player.maxHp=data.hp;player.hp=data.hp;player.damage=data.damage;player.speed=data.speed;
  player.character={id:selectedCharacter,qCd:0,eCd:0,ultimate:0,stacks:0,lastHit:-99,fragments:0,lifeReady:0,combo:{},speedUntil:0,shield:0,shieldReady:5,invulnerableUntil:0,reduceUntil:0};
  player.ultimate=0;characterEffects.length=0;characterProjectiles.length=0;characterFloats.length=0;characterLastHp=player.hp;
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
  if(slot==='r'){if(player.ultimate<100){pop(`궁극기 충전 ${Math.floor(player.ultimate)}%`);return}player.ultimate=0;castUltimate();return}
  const key=slot==='q'?'qCd':'eCd';if(state[key]>0)return;
  if(selectedCharacter==='lumina'&&slot==='q'&&player.hp>=player.maxHp-.1){pop('체력이 최대입니다.');return}
  state[key]=data[slot].cd;
  if(selectedCharacter==='kairos'){
    if(slot==='q'){dash(245,24,'#4fb9ff');player.character.reduceUntil=time+.35}
    else{characterEffects.push({type:'delayedArea',x:player.x,y:player.y,r:98,damage:15,l:.10,max:.10,color:'#4fb9ff',source:'kairos-e1',maxHits:1});characterEffects.push({type:'delayedArea',x:player.x,y:player.y,r:126,damage:17,l:.30,max:.30,color:'#8defff',source:'kairos-e2',maxHits:2,knock:45})}
  }else if(selectedCharacter==='lumina'){
    if(slot==='q'){player.hp=Math.min(player.maxHp,player.hp+24);charFloat('+24',player.x,player.y-55,'#72ffab');characterEffects.push({type:'heal',x:player.x,y:player.y,r:62,l:.55,max:.55,color:'#78f0a1'})}
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
  pop(`${characterNow().r.name} 발동!`);
}
function frostMark(enemy){const marks=enemy.frostMarks||[];const active=marks.filter(t=>t>time);active.push(time+5);enemy.frostMarks=active;if(active.length>=3&&time>(enemy.frostReady||0)){enemy.frostMarks=[];enemy.frostReady=time+4;enemy.frozenUntil=time+1;coreCharacterHurt(enemy,10);charFloat('빙결!',enemy.x,enemy.y-30,'#bdf6ff')}}
function updateCharacterEffects(dt){
  for(let i=characterProjectiles.length-1;i>=0;i--){const p=characterProjectiles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt;let impact=null;for(const enemy of enemies)if(!p.hit[enemy.id]&&Math.hypot(enemy.x-p.x,enemy.y-p.y)<enemy.r+p.r){impact=enemy;break}if(impact||p.x<0||p.x>W||p.y<0||p.y>H||p.l<=0){if(impact){withCharacterSource(`projectile-${p.kind}`,p.kind==='lumina'?2:1,()=>{hurt(impact,p.damage);if(p.freezeMark)frostMark(impact);if(p.explode)for(const enemy of enemies)if(enemy!==impact&&Math.hypot(enemy.x-p.x,enemy.y-p.y)<70+enemy.r)hurt(enemy,p.explode)});if(p.slow)for(const enemy of enemies)if(Math.hypot(enemy.x-p.x,enemy.y-p.y)<70+enemy.r)enemy.slowUntil=Math.max(enemy.slowUntil||0,time+p.slow);charBurst(p.x,p.y,p.color,8)}characterProjectiles.splice(i,1)}}
  for(let i=characterEffects.length-1;i>=0;i--){const fx=characterEffects[i];fx.l-=dt;
    if(fx.type==='delayedArea'&&fx.l<=0){if(fx.ultimate==='kairos'){withCharacterSource('kairos-r',1,()=>{for(const enemy of enemies){let d=Math.hypot(enemy.x-fx.x,enemy.y-fx.y);if(d<fx.r+enemy.r){hurt(enemy,d<70?78:52);enemy.frozenUntil=time+.25}}});characterEffects.push({type:'ring',x:fx.x,y:fx.y,r:fx.r,l:.7,max:.7,color:'#5ddfff'});charBurst(fx.x,fx.y,'#72dcff',22)}else areaDamage(fx.x,fx.y,fx.r,fx.damage,fx.color,fx.source,fx.maxHits,fx.knock)}
    if(fx.type==='gravity'||fx.type==='singularity'){fx.tick=(fx.tick||0)-dt;for(const enemy of enemies){let d=Math.hypot(enemy.x-fx.x,enemy.y-fx.y);if(d<fx.r+enemy.r){let u=unit(fx.x-enemy.x,fx.y-enemy.y);enemy.x+=u.x*(fx.type==='singularity'?175:80)*dt;enemy.y+=u.y*(fx.type==='singularity'?175:80)*dt;if(fx.type==='gravity'&&fx.tick<=0)withCharacterSource(fx.source,fx.maxHits,()=>hurt(enemy,18));}}if(fx.tick<=0)fx.tick=1;if(fx.type==='singularity'&&fx.l<=0){areaDamage(fx.x,fx.y,fx.r,38,'#c795ff','gravion-r',1);for(const e of enemies)if(Math.hypot(e.x-fx.x,e.y-fx.y)<fx.r+e.r)e.frozenUntil=time+.3;characterShake=.35}}
    if(fx.type==='blizzard'){fx.tick=(fx.tick||0)-dt;if(fx.tick<=0){fx.tick=1;withCharacterSource(fx.source,fx.maxHits,()=>{for(const enemy of enemies)if(Math.hypot(enemy.x-fx.x,enemy.y-fx.y)<fx.r+enemy.r){hurt(enemy,fx.damage);enemy.slowUntil=time+1.1;if(!fx.marked[enemy.id]){fx.marked[enemy.id]=true;frostMark(enemy)}}})}}
    if(fx.type==='sanctuary'){fx.tick=(fx.tick||0)-dt;if(Math.hypot(player.x-fx.x,player.y-fx.y)<fx.r)player.hp=Math.min(player.maxHp,player.hp+8*dt);if(fx.tick<=0){fx.tick=1;withCharacterSource('lumina-r',3,()=>{for(const enemy of enemies)if(Math.hypot(enemy.x-fx.x,enemy.y-fx.y)<fx.r+enemy.r)hurt(enemy,6)})}}
    if(fx.type==='storm'){fx.x=player.x;fx.y=player.y;fx.tick=(fx.tick||0)-dt;if(fx.tick<=0&&fx.hits<10){fx.tick=.6;let choices=enemies.filter(e=>Math.hypot(e.x-fx.x,e.y-fx.y)<fx.r);let enemy=choices[Math.floor(Math.random()*choices.length)];if(enemy){fx.hits++;withCharacterSource('volt-r',10,()=>hurt(enemy,16));characterEffects.push({type:'boltLine',x:enemy.x,y:0,x2:enemy.x,y2:enemy.y,l:.18,max:.18,color:'#fff5a6'});charBurst(enemy.x,enemy.y,'#ffe259',6);characterShake=.08}}}
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
  if(selectedCharacter==='lumina'&&player.hp<=player.maxHp*.5&&s.fragments&&time>=s.lifeReady){let heal=s.fragments*4;player.hp=Math.min(player.maxHp,player.hp+heal);charFloat(`+${heal}`,player.x,player.y-54,'#78f0a1');s.fragments=0;s.lifeReady=time+8;}
  if(characterLastHp>player.hp){let damage=characterLastHp-player.hp;s.lastDamage=time;if(time<s.invulnerableUntil)player.hp=characterLastHp;else {let reduction=time<(s.reduceUntil||0)?0.2:0;if(s.shield>0){let absorbed=Math.min(s.shield,damage);s.shield-=absorbed;player.hp+=absorbed;if(s.shield<=0)s.shieldReady=time+8;}if(reduction)player.hp+=damage*.2;}}
  characterLastHp=player.hp;
  for(const enemy of enemies){if(enemy.slowUntil>time){if(!enemy.characterSlow){enemy.characterSlow=enemy.speed*.75;enemy.speed*=.75}}else if(enemy.characterSlow){enemy.speed/=.75;enemy.characterSlow=0}if(enemy.frozenUntil>time){if(!enemy.characterFrozen){enemy.characterFrozen=enemy.speed;enemy.speed=0}}else if(enemy.characterFrozen!==undefined){enemy.speed=enemy.characterFrozen;delete enemy.characterFrozen}}
  updateCharacterEffects(dt);updateCharacterUI();
}
const coreCharacterUpdate=update;
update=function(dt){coreCharacterUpdate(dt);characterTick(dt)};
const coreCharacterEnd=end;
end=function(win){characterEffects.length=0;characterProjectiles.length=0;characterFloats.length=0;coreCharacterEnd(win)};
function updateCharacterUI(){if(!player)return;const data=characterNow(),s=player.character;characterButtons.forEach(button=>{const slot=button.dataset.characterSkill,cd=slot==='q'?s.qCd:slot==='e'?s.eCd:0,ready=slot==='r'&&player.ultimate>=100;button.classList.toggle('ready',ready);button.classList.toggle('cooldown',cd>0);button.querySelector('small').textContent=slot==='r'?`${Math.floor(player.ultimate)}%`:cd>0?`${cd.toFixed(1)}초`:data[slot].name;button.querySelector('i').style.width=slot==='r'?`${player.ultimate}%`:`${Math.max(0,1-cd/data[slot].cd)*100}%`});
  if(characterPassive){let text='';if(selectedCharacter==='kairos')text=`전투 가속 ${s.stacks}/5`;if(selectedCharacter==='lumina')text=`생명 조각 ${s.fragments}/4`;if(selectedCharacter==='volt')text='과전류 · 3연타';if(selectedCharacter==='gravion')text=s.shield>0?`중력 장갑 ${Math.ceil(s.shield)}`:'중력 장갑 재생 중';if(selectedCharacter==='frost')text='서리 표식 · 스킬 적중';characterPassive.textContent=`${data.name} · ${text}`;}
}
function drawCharacterEffects(now){
  const dt=Math.min(.05,(now-(drawCharacterEffects.last||now))/1000);drawCharacterEffects.last=now;if(run&&player){
    refreshAgentTexture();
    x.save();if(characterShake>0){characterShake=Math.max(0,characterShake-dt);x.translate((Math.random()-.5)*10*characterShake/.45,(Math.random()-.5)*10*characterShake/.45)}
    for(const fx of characterEffects){x.save();x.globalAlpha=Math.min(1,fx.l/(fx.max||fx.l));x.strokeStyle=fx.color;x.fillStyle=fx.color+'33';x.shadowBlur=16;x.shadowColor=fx.color;if(['ring','heal','sanctuary','storm','gravity','singularity','blizzard','iceNova'].includes(fx.type)){x.lineWidth=fx.type==='sanctuary'?5:3;x.beginPath();x.arc(fx.x,fx.y,fx.r*(fx.type==='ring'?1-fx.l/(fx.max||1)*.15:1),0,Math.PI*2);x.fill();x.stroke()}if(fx.type==='line'||fx.type==='boltLine'){x.lineWidth=fx.type==='boltLine'?5:7;x.beginPath();x.moveTo(fx.x,fx.y);x.lineTo(fx.x2,fx.y2);x.stroke()}if(fx.type==='flash'){x.beginPath();x.arc(fx.x,fx.y,fx.r*(1-fx.l/fx.max),0,Math.PI*2);x.stroke()}x.restore()}
    for(const p of characterProjectiles){x.save();x.translate(p.x,p.y);x.fillStyle=p.color;x.shadowBlur=14;x.shadowColor=p.color;x.beginPath();if(p.kind==='frost'){x.moveTo(18,0);x.lineTo(-14,-9);x.lineTo(-8,0);x.lineTo(-14,9)}else x.arc(0,0,p.r,0,Math.PI*2);x.fill();x.restore()}
    const data=characterNow();x.save();x.translate(player.x,player.y-player.r-31);x.fillStyle=data.accent;x.shadowBlur=8;x.shadowColor=data.color;x.beginPath();x.arc(0,0,5,0,Math.PI*2);x.fill();x.restore();
    for(const f of characterFloats){x.globalAlpha=Math.max(0,f.l*1.3);x.fillStyle=f.color;x.font='bold 15px sans-serif';x.textAlign='center';x.fillText(f.text,f.x,f.y);f.y-=18*dt;f.l-=dt}characterFloats=characterFloats.filter(f=>f.l>0);x.restore();
  }requestAnimationFrame(drawCharacterEffects);
}
function renderCharacterList(){const list=$('#character-list');if(!list)return;list.innerHTML=Object.entries(CHARACTER_DATA).map(([id,data])=>`<button class="character-card ${id===selectedCharacter?'selected':''}" data-character="${id}" style="--char:${data.color}"><span>${id==='kairos'?'⚔':id==='lumina'?'✦':id==='volt'?'ϟ':id==='gravion'?'◉':'❄'}</span><b>${data.name}</b><small>${data.role}</small><em>HP ${data.hp} · 공격 ${data.damage}</em><i>Q ${data.q.name}<br>E ${data.e.name}<br>R ${data.r.name}</i></button>`).join('');list.querySelectorAll('[data-character]').forEach(button=>button.onclick=()=>{selectedCharacter=button.dataset.character;agentSpriteId='';refreshAgentTexture();localStorage.neonSelectedCharacter=selectedCharacter;renderCharacterList();pop(`${characterNow().name} 선택 완료`)});}
$('#character-button')?.addEventListener('click',()=>{$('#characters').classList.remove('hidden');renderCharacterList()});
characterButtons.forEach(button=>button.addEventListener('pointerdown',event=>{event.preventDefault();useCharacterSkill(button.dataset.characterSkill)}));
addEventListener('keydown',event=>{if(event.repeat||!run||paused)return;const slot={KeyQ:'q',KeyE:'e',KeyR:'r'}[event.code];if(slot){event.preventDefault();useCharacterSkill(slot)}});
renderCharacterList();requestAnimationFrame(drawCharacterEffects);
