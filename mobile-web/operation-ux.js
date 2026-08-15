/*
 * Operation UX layer.
 *
 * This file is deliberately loaded last. It wraps the final public combat
 * hooks so every existing progression layer still receives begin/end/kill
 * events in the same order, while adding preparation, deployment, boss and
 * report presentation around them.
 */
(function () {
  'use strict';

  const SETTINGS_KEY = 'neonOperationSettings';
  const MASTERY_LEVELS = [0, 160, 420, 820, 1420, 2280, 3400, 4850, 6650, 8850, 11400];
  const RELIC_LABELS = {
    ember: '적색 심핵', echo: '잔상 프로토콜', overload: '과부하 칩',
    chaos: '카오스 칩', chronoshard: '시간 파편'
  };
  const TIER_POWER = { common: 1, rare: 1.35, hero: 1.8, legend: 2.35, mythic: 3.1 };
  const MODE_COPY = {
    conquest: { code: 'CONQUEST', name: '정복 작전', objective: '지역 최종 보스 처치' },
    endless: { code: 'ENDLESS', name: '무한 작전', objective: '한계까지 생존하고 기록 갱신' },
    bossrush: { code: 'BOSS RUSH', name: '보스 연속 토벌', objective: '연속 보스 격파' },
    coop: { code: 'NEON SQUAD', name: '협동 작전', objective: '팀원과 함께 지역 정복' },
    bounty: { code: 'BOUNTY', name: '현상 토벌', objective: '지정된 고위험 표적 처치' }
  };
  const SKILL_LABELS = {
    lightning: '뇌광 비콘', molotov: '잔화 병', ball: '반동 구체', boom: '귀환 절단환',
    brick: '궤도 낙하석', rpg: '혜성 발사기', guardian: '이지스 위성', drill: '관통 송곳',
    durian: '가시 반응로', laser: '프리즘 광선기', mine: '분열 기뢰', medic: '생체 지원 드론',
    forcefield: '바스티온 장'
  };

  const operation = {
    allowBegin: false,
    launch: 'standard',
    preparing: false,
    deploying: false,
    finalizing: false,
    run: null,
    lastBossId: null,
    warnedStage: '',
    bossDefeatShown: new Set(),
    prepFrame: 0,
    report: null
  };

  function safeJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (_) { return fallback; }
  }
  function settings() {
    const value = safeJson(SETTINGS_KEY, {});
    return {
      presentation: ['full', 'brief', 'minimal'].includes(value.presentation) ? value.presentation : 'full',
      haptics: value.haptics !== false
    };
  }
  function saveSettings(next) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); }
  function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  function formatTime(value) {
    value = Math.max(0, Math.floor(value || 0));
    return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
  }
  function accountState() {
    const value = safeJson('neonPlayerLevel', {});
    return { level: Math.max(1, Number(value.level) || 1), xp: Math.max(0, Number(value.xp) || 0), nextXp: Math.max(0, Number(value.nextXp) || 82), totalXp: Math.max(0, Number(value.totalXp) || 0) };
  }
  function masteryState(name) {
    const entry = safeJson('neonWeaponMastery', {})[name] || { xp: 0 };
    let level = 1;
    for (let index = 1; index < MASTERY_LEVELS.length; index++) if ((entry.xp || 0) >= MASTERY_LEVELS[index]) level = index;
    const floor = MASTERY_LEVELS[level] || MASTERY_LEVELS[10];
    const ceiling = MASTERY_LEVELS[Math.min(10, level + 1)];
    return { xp: Number(entry.xp) || 0, level, percent: level >= 10 ? 100 : Math.max(0, Math.min(100, ((entry.xp || 0) - floor) / Math.max(1, ceiling - floor) * 100)) };
  }
  function combatPower() {
    const data = typeof characterNow === 'function' ? characterNow() : { hp: 100, damage: 10, speed: 250 };
    let hp = Number(data.hp) || 100, defense = 0, attack = Number(data.damage) || 10;
    const slotBonuses = {
      armor: { hp: 20, defense: 7 }, gloves: { power: 18, defense: 2 }, shoes: { hp: 8, defense: 4 },
      belt: { hp: 17, defense: 6 }, necklace: { hp: 8, power: 12, defense: 2 }, head: { hp: 5, power: 13, defense: 4 }
    };
    Object.keys(equipped || {}).forEach(slot => {
      const item = equipped[slot]; if (!item) return;
      const tier = TIER_POWER[item.tier] || 1, bonus = slotBonuses[slot] || {};
      if (slot === 'weapon') attack += 32 * tier + (item.tier === 'mythic' ? 22 : 0);
      hp += (bonus.hp || 0) * tier; defense += (bonus.defense || 0) * tier; attack += (bonus.power || 0) * tier;
    });
    return Math.round(hp * 5.2 + attack * 24 + defense * 21 + (Number(data.speed) || 250) * .12);
  }
  function modeId() { return typeof activeMode === 'string' ? activeMode : 'conquest'; }
  function selectedModeId() { return typeof selectedMode === 'string' ? selectedMode : modeId(); }
  function modeData(id) { return MODE_COPY[id] || MODE_COPY.conquest; }
  function mapData(index) {
    const map = maps[index] || maps[0], profile = enemyProfiles[index] || enemyProfiles[0];
    return { map, profile, total: totalStages(), reward: 60 + index * 35, recommended: 1000 + index * 530 };
  }
  function equippedRelicLabel() {
    const id = localStorage.getItem('neonEquippedRelic') || 'ember';
    return RELIC_LABELS[id] || '미장착';
  }
  function weaponGlyph(name) {
    const className = ({
      '유성 단도': 'weapon-dagger', '충격 철퇴': 'weapon-mace', '노바 리볼버': 'weapon-revolver',
      '청광 도검': 'weapon-blade', '폭풍 산탄총': 'weapon-scatter', '태양 파쇄검': 'weapon-solar',
      '공허 흡수기': 'weapon-void', '균열 장검': 'weapon-rift', '여명·황혼 쌍창': 'weapon-lances'
    })[name] || 'weapon-dagger';
    return '<i class="weapon-thumb ' + className + '" aria-hidden="true"></i>';
  }
  function haptic(pattern) {
    if (!settings().haptics || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch (_) { /* unsupported webview */ }
  }
  function cue(type) {
    if (typeof tone !== 'function') return;
    const notes = {
      select: [330, .05, .025, 'triangle'], deploy: [150, .16, .055, 'sawtooth'],
      start: [620, .1, .045, 'triangle'], warning: [820, .1, .07, 'square'],
      complete: [740, .16, .055, 'triangle'], failed: [95, .2, .055, 'sawtooth'], record: [980, .12, .05, 'sine']
    };
    const args = notes[type]; if (args) tone.apply(null, args);
  }
  function currentModeForPrep(launch) {
    if (launch === 'mode') return selectedModeId();
    if (launch === 'coop') return 'coop';
    if (launch === 'direct') return 'bounty';
    return modeId() || 'conquest';
  }
  function threatState(power, recommended) {
    const ratio = power / Math.max(1, recommended);
    return ratio >= 1.08 ? { cls: 'ready', label: '작전 준비 완료' } : ratio >= .82 ? { cls: 'caution', label: '주의 필요' } : { cls: 'danger', label: '위험' };
  }
  function modeDetails(id, data) {
    if (id === 'endless') {
      const best = Number(localStorage.neonEndlessBest || 0);
      return { stage: '끝없는 전장', objective: '최고 생존 ' + (best ? formatTime(best) : '첫 기록 도전'), boss: '위협도에 따라 반복 출현', reward: '생존 기록 · 계정 XP · 숙련도' };
    }
    if (id === 'bossrush') return { stage: '연속 토벌 구역', objective: '보스 웨이브 연속 격파', boss: bossRushNames.slice(0, 4).join(' · '), reward: '보스별 대량 전투 XP' };
    if (id === 'coop') return { stage: data.map.name, objective: '파티 공동 지역 정복', boss: data.profile.boss, reward: '개인 진행도 · 파티 작전 기록' };
    return { stage: data.map.name, objective: modeData(id).objective, boss: data.profile.boss, reward: '코인 +' + data.reward + ' · 계정 XP · 요원 신호' };
  }

  function buildUi() {
    const shell = document.querySelector('#game-shell');
    if (!shell || document.querySelector('#operation-prep')) return;
    shell.insertAdjacentHTML('beforeend', `
      <section id="operation-prep" class="operation-prep screen hidden" aria-label="작전 준비">
        <div class="operation-prep-scroll">
          <header class="operation-prep-header"><button id="operation-prep-back" class="operation-back">‹</button><div><p>OPERATION PREP</p><h2>작전 준비</h2></div><span id="operation-mode-code">CONQUEST</span></header>
          <div class="operation-prep-grid">
            <article class="operation-agent-card">
              <div class="operation-agent-scan"><canvas id="operation-agent-canvas" width="360" height="410"></canvas><div class="operation-platform"><i></i><i></i><i></i></div></div>
              <div class="operation-agent-info"><small>SELECTED OPERATIVE</small><h3 id="operation-agent-name">훈련 요원</h3><p id="operation-agent-role">기본 전투원</p><div><span id="operation-account-level">LV. 1</span><span id="operation-combat-power">전투력 0</span></div></div>
              <section class="operation-loadout"><div><small>주무기</small><b id="operation-weapon"></b></div><div><small>장착 장비</small><b id="operation-gear"></b></div><div><small>유물</small><b id="operation-relic"></b></div></section>
            </article>
            <article class="operation-mission-card">
              <div class="operation-map-visual"><i></i><i></i><i></i><span id="operation-area-code">AREA 01</span><b id="operation-map-name">훈련 구역</b></div>
              <div class="operation-power-check"><span>위험도 <b id="operation-danger-stars">★☆☆☆☆</b></span><span>추천 전투력 <b id="operation-recommended">1,000</b></span><span>내 전투력 <b id="operation-current-power">0</b></span><em id="operation-ready-state">작전 준비 완료</em></div>
              <section class="operation-mission-info"><div><small>작전 목표</small><b id="operation-objective"></b></div><div><small>주요 적</small><span id="operation-enemies"></span></div><div><small>지역 보스</small><b id="operation-boss"></b></div><div><small>예상 보상</small><b id="operation-reward"></b></div></section>
              <section class="operation-brief"><div><small>이번 작전</small><b id="operation-run-rule">출격 후 무작위 변이 분석</b></div><div><small>특별 보너스</small><b id="operation-first-clear">최초 클리어 보상 확인</b></div><div><small>비밀 발견</small><b>???</b></div></section>
            </article>
          </div>
        </div>
        <div class="operation-prep-actions"><button id="operation-deploy"><span>DEPLOY</span><b>출격</b><i>▶</i></button></div>
      </section>
      <section id="operation-transition" class="operation-transition hidden" aria-live="polite"><div class="operation-deploy-platform"><i></i><i></i><i></i><b></b></div><p id="operation-system-check">SYSTEM CHECK</p><small>NEON HAVEN // LAUNCH CONTROL</small></section>
      <section id="operation-intro" class="operation-intro hidden" aria-live="polite"><div><small id="operation-intro-code">AREA 01</small><h2 id="operation-intro-map">훈련 구역</h2><p id="operation-intro-agent">훈련 요원 // WEAPON ONLINE</p><b>MISSION START</b></div></section>
      <section id="operation-boss-presentation" class="operation-boss-presentation hidden" aria-live="assertive"><div><small id="operation-boss-kicker">BOSS SIGNAL DETECTED</small><h2 id="operation-boss-name">UNKNOWN</h2><p id="operation-boss-class">AREA BOSS</p><b id="operation-boss-threat">THREAT LEVEL ★★★</b></div></section>
      <section id="operation-boss-hud" class="operation-boss-hud hidden"><span><i class="game-icon icon-crown"></i></span><div><small id="operation-boss-hud-class">AREA BOSS</small><b id="operation-boss-hud-name">UNKNOWN</b><i><em id="operation-boss-hp"></em></i></div></section>
      <section id="operation-outro" class="operation-outro hidden" aria-live="assertive"><div><small id="operation-outro-code">OPERATION STATUS</small><h2 id="operation-outro-title">MISSION COMPLETE</h2><p id="operation-outro-detail">지역 위협 제거 완료</p></div></section>
      <div id="operation-sweep" class="operation-sweep hidden"></div>
    `);
    const result = document.querySelector('#result');
    if (result) {
      result.classList.add('operation-report-screen');
      result.querySelector('.result-actions')?.insertAdjacentHTML('afterbegin', '<button id="operation-next" class="operation-next hidden">다음 지역 <small>NEXT OPERATION</small></button>');
      result.querySelector('#result-detail')?.insertAdjacentHTML('afterend', '<section id="operation-report" class="operation-report"></section>');
    }
    const panel = document.querySelector('#settings');
    if (panel && !document.querySelector('#operation-presentation-setting')) {
      panel.insertAdjacentHTML('beforeend', '<label class="operation-setting">전투 연출 <select id="operation-presentation-setting"><option value="full">전체</option><option value="brief">간략</option><option value="minimal">최소</option></select></label><label class="operation-setting toggle"><input id="operation-haptics-setting" type="checkbox"> 중요 연출 진동</label>');
      const value = settings();
      document.querySelector('#operation-presentation-setting').value = value.presentation;
      document.querySelector('#operation-haptics-setting').checked = value.haptics;
      document.querySelector('#operation-presentation-setting').onchange = event => { const next = settings(); next.presentation = event.target.value; saveSettings(next); pop('전투 연출 · ' + event.target.options[event.target.selectedIndex].text); };
      document.querySelector('#operation-haptics-setting').onchange = event => { const next = settings(); next.haptics = event.target.checked; saveSettings(next); if (next.haptics) haptic(25); };
    }
    document.querySelector('#operation-prep-back').onclick = closePrep;
    document.querySelector('#operation-deploy').onclick = deploy;
    document.querySelector('#operation-next')?.addEventListener('click', nextOperation);
  }

  function drawPrepAgent(now) {
    const canvas = document.querySelector('#operation-agent-canvas');
    if (!canvas || document.querySelector('#operation-prep')?.classList.contains('hidden')) { operation.prepFrame = requestAnimationFrame(drawPrepAgent); return; }
    const ctx = canvas.getContext('2d'), phase = now / 1000, sprite = typeof agentSprite !== 'undefined' ? agentSprite : warriorSprite;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(180, 220 + Math.sin(phase * 1.4) * 4); ctx.rotate(Math.sin(phase * .55) * .018);
    ctx.globalAlpha = .22; ctx.shadowBlur = 28; ctx.shadowColor = characterNow().color; ctx.fillStyle = characterNow().color; ctx.beginPath(); ctx.ellipse(0, 130, 92, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    if (sprite) ctx.drawImage(sprite, 190, 170, 760, 840, -138, -158, 276, 305);
    else { ctx.fillStyle = characterNow().color; ctx.beginPath(); ctx.arc(0, 0, 68, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    operation.prepFrame = requestAnimationFrame(drawPrepAgent);
  }

  function renderPrep(launch) {
    const id = currentModeForPrep(launch), meta = modeData(id), previewIndex = ['endless', 'bossrush'].includes(id) ? 0 : selected, data = mapData(previewIndex), mode = modeDetails(id, data), power = combatPower(), recommended = id === 'endless' ? 1800 : id === 'bossrush' ? 2400 : data.recommended, threat = threatState(power, recommended), account = accountState(), character = characterNow();
    document.querySelector('#operation-mode-code').textContent = meta.code;
    document.querySelector('#operation-agent-name').textContent = character.name;
    document.querySelector('#operation-agent-role').textContent = character.role + ' · ' + (OPERATIVE_TIERS[character.tier] || '기본');
    document.querySelector('#operation-account-level').textContent = 'LV. ' + account.level;
    document.querySelector('#operation-combat-power').textContent = '전투력 ' + power.toLocaleString();
    document.querySelector('#operation-weapon').innerHTML = weaponGlyph(equipped?.weapon?.name || '') + '<span>' + (equipped?.weapon?.name || '미장착') + '</span>';
    const gear = Object.keys(equipped || {}).filter(slot => slot !== 'weapon' && equipped[slot]).length;
    document.querySelector('#operation-gear').textContent = gear ? gear + '부위 장착' : '장착 장비 없음';
    document.querySelector('#operation-relic').textContent = equippedRelicLabel();
    document.querySelector('#operation-area-code').textContent = id === 'conquest' || id === 'coop' ? 'AREA ' + String(selected + 1).padStart(2, '0') : meta.code;
    document.querySelector('#operation-map-name').textContent = mode.stage;
    document.querySelector('.operation-map-visual').style.setProperty('--operation-map-color', data.map.bg instanceof CanvasPattern ? '#17395c' : data.map.bg);
    const stars = Math.min(5, Math.max(1, Math.ceil((selected + 1) / 6)));
    document.querySelector('#operation-danger-stars').textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    document.querySelector('#operation-recommended').textContent = recommended.toLocaleString();
    document.querySelector('#operation-current-power').textContent = power.toLocaleString();
    const ready = document.querySelector('#operation-ready-state'); ready.className = threat.cls; ready.textContent = threat.label;
    document.querySelector('#operation-objective').textContent = mode.objective;
    const enemiesForMode = id === 'endless' ? ['혼합 적군', '엘리트 증원', '고위험 변이'] : id === 'bossrush' ? bossRushNames.slice(0, 3) : data.profile.mobs.slice(0, 3);
    document.querySelector('#operation-enemies').innerHTML = enemiesForMode.map((name, index) => '<i class="operation-enemy-token role-' + index + '" title="' + name + '">' + name.slice(0, 1) + '</i><span>' + name + '</span>').join('');
    document.querySelector('#operation-boss').textContent = mode.boss;
    document.querySelector('#operation-reward').textContent = mode.reward;
    const first = id === 'conquest' && selected === unlocked;
    document.querySelector('#operation-first-clear').textContent = first ? '최초 클리어 · 다음 지역 해금' : id === 'conquest' ? '재도전 기록 갱신' : '모드 기록 갱신';
    document.querySelector('#operation-run-rule').textContent = '출격 후 1–3개 무작위 변이 분석';
    document.querySelector('#operation-prep-back').classList.toggle('hidden', launch === 'direct');
  }

  function canPrepare() {
    if (operation.launch !== 'direct' && selected > unlocked && currentModeForPrep(operation.launch) === 'conquest') { pop('이전 맵을 먼저 클리어하세요!'); return false; }
    if (!equipped?.weapon) { pop('상자에서 무기를 획득하고 장착하세요!'); return false; }
    return true;
  }
  function sweep() {
    const node = document.querySelector('#operation-sweep');
    if (!node) return;
    node.classList.remove('hidden');
    requestAnimationFrame(() => node.classList.add('active'));
    setTimeout(() => { node.classList.remove('active'); node.classList.add('hidden'); }, 290);
  }
  function openPrep(launch) {
    if (operation.deploying || operation.preparing || run) return false;
    operation.launch = launch || 'standard';
    if (!canPrepare()) return false;
    operation.preparing = true;
    if (operation.launch === 'mode') document.querySelector('#modes')?.classList.add('hidden');
    renderPrep(operation.launch);
    sweep(); cue('select'); if (typeof startMusic === 'function') startMusic('menu');
    document.querySelector('#operation-prep').classList.remove('hidden');
    return true;
  }
  function closePrep() {
    if (operation.deploying) return;
    operation.preparing = false;
    document.querySelector('#operation-prep')?.classList.add('hidden');
    if (operation.launch === 'mode') document.querySelector('#modes')?.classList.remove('hidden');
    else if (operation.launch !== 'direct') document.querySelector('#menu')?.classList.remove('hidden');
    sweep();
  }
  function transitionDurations() {
    const mode = settings().presentation;
    return mode === 'minimal' ? { deploy: 180, intro: 380, boss: 420, outro: 520 } : mode === 'brief' ? { deploy: 760, intro: 1050, boss: 760, outro: 760 } : { deploy: 1450, intro: 2100, boss: 1250, outro: 1000 };
  }
  async function playDeployTransition(coopCountdown) {
    const node = document.querySelector('#operation-transition'), label = document.querySelector('#operation-system-check'), durations = transitionDurations();
    node.classList.remove('hidden'); node.classList.add('active'); cue('deploy'); haptic(35);
    if (coopCountdown) {
      for (const value of ['3', '2', '1', 'DEPLOY']) { label.textContent = value; cue(value === 'DEPLOY' ? 'deploy' : 'select'); haptic(value === 'DEPLOY' ? 45 : 18); await delay(settings().presentation === 'minimal' ? 90 : 330); }
    } else {
      const steps = settings().presentation === 'minimal' ? ['DEPLOY'] : settings().presentation === 'brief' ? ['SYSTEM CHECK', 'WEAPON ONLINE', 'DEPLOY'] : ['SYSTEM CHECK', 'WEAPON ONLINE', 'TARGET LOCKED', 'DEPLOY'];
      const step = Math.max(70, durations.deploy / steps.length);
      for (const text of steps) { label.textContent = text; await delay(step); }
    }
    node.classList.remove('active'); node.classList.add('hidden');
  }
  function captureRunStart() {
    const weapon = equipped?.weapon?.name || '미장착';
    operation.run = {
      mapIndex: selected, mode: operation.launch === 'direct' ? 'bounty' : operation.launch === 'coop' ? 'coop' : modeId(), wallet: Number(wallet) || 0, account: accountState(), mastery: masteryState(weapon),
      weapon, character: characterNow().name, elites: 0, bosses: 0, bossNames: [], startedAt: Date.now(),
      oldRecord: Object.assign({}, safeJson('neonStageRecords', {})[selected] || {})
    };
    operation.lastBossId = null; operation.warnedStage = ''; operation.bossDefeatShown.clear(); operation.finalizing = false;
  }
  async function showIntro() {
    if (!run) return;
    const node = document.querySelector('#operation-intro'), data = maps[selected], character = characterNow(), duration = transitionDurations().intro;
    paused = true;
    document.querySelector('#operation-intro-code').textContent = modeId() === 'conquest' ? 'AREA ' + String(selected + 1).padStart(2, '0') : modeData(modeId()).code;
    document.querySelector('#operation-intro-map').textContent = modeId() === 'conquest' ? data.name.replace(/^\d+\.\s*/, '') : modeData(modeId()).name;
    document.querySelector('#operation-intro-agent').textContent = character.name + ' // ' + (equipped?.weapon?.name || 'WEAPON') + ' ONLINE';
    node.classList.remove('hidden'); requestAnimationFrame(() => node.classList.add('active')); cue('start');
    await delay(duration);
    node.classList.remove('active'); node.classList.add('hidden');
    if (run && document.querySelector('#upgrade')?.classList.contains('hidden') && document.querySelector('#variety-event')?.classList.contains('hidden')) paused = false;
  }
  async function startActualBattle() {
    operation.allowBegin = true;
    try {
      if (operation.launch === 'mode' && typeof beginSelectedMode === 'function') beginSelectedMode();
      else if (operation.launch === 'standard') originalTryBegin();
      else originalBegin();
    } finally { operation.allowBegin = false; }
    if (!run) return false;
    if (typeof startMusic === 'function') startMusic('game');
    captureRunStart();
    await showIntro();
    return true;
  }
  async function deploy() {
    if (operation.deploying || !operation.preparing || !canPrepare()) return;
    operation.deploying = true; operation.preparing = false;
    document.querySelector('#operation-deploy').disabled = true;
    document.querySelector('#operation-prep').classList.add('hidden');
    await playDeployTransition(false);
    await startActualBattle();
    operation.deploying = false;
    document.querySelector('#operation-deploy').disabled = false;
  }

  function buildSnapshot(win) {
    const runInfo = operation.run || {}, accountBefore = runInfo.account || accountState(), masteryBefore = runInfo.mastery || masteryState(runInfo.weapon || ''), mapIndex = runInfo.mapIndex ?? selected;
    const skills = [];
    Object.keys(SKILL_LABELS).forEach(key => { if (player && (player[key] || player.levels?.[SKILL_LABELS[key]])) skills.push({ name: SKILL_LABELS[key], level: Number(player[key] || player.levels?.[SKILL_LABELS[key]] || 1) }); });
    if (player?.destroyer) skills.push({ name: player?.medic ? '신성한 파괴자' : '파괴자', level: 5 });
    return {
      win: !!win, mode: runInfo.mode || modeId(), mapIndex, mapName: maps[mapIndex]?.name || '작전 구역', time: Number(time) || 0,
      kills: Number(kills) || 0, elites: runInfo.elites || 0, bosses: runInfo.bosses || 0, bossNames: runInfo.bossNames || [],
      stage: Math.min(Number(stage) + 1 || 1, totalStages()), walletBefore: runInfo.wallet ?? (Number(wallet) || 0),
      accountBefore, masteryBefore, weapon: runInfo.weapon || equipped?.weapon?.name || '미장착', character: runInfo.character || characterNow().name,
      skills: skills.slice(0, 6), relic: equippedRelicLabel(), oldRecord: runInfo.oldRecord || {}, builtAt: Date.now()
    };
  }
  function reportBuild(snapshot) {
    const build = [{ name: snapshot.weapon, cls: 'weapon', icon: weaponGlyph(snapshot.weapon) }];
    snapshot.skills.forEach(skill => build.push({ name: skill.name + ' Lv.' + skill.level, cls: 'skill', icon: '<i class="game-icon icon-reactor"></i>' }));
    build.push({ name: snapshot.relic, cls: 'relic', icon: '<i class="game-icon icon-core"></i>' });
    return build.map(item => '<span class="' + item.cls + '">' + item.icon + '<small>' + item.name + '</small></span>').join('');
  }
  function renderReport(snapshot) {
    const accountAfter = accountState(), masteryAfter = masteryState(snapshot.weapon), coins = Math.max(0, (Number(wallet) || 0) - snapshot.walletBefore), xp = Math.max(0, accountAfter.totalXp - snapshot.accountBefore.totalXp), masteryGain = Math.max(0, masteryAfter.xp - snapshot.masteryBefore.xp);
    const newKills = snapshot.kills > (snapshot.oldRecord.bestKills || 0), newTime = snapshot.win && (!snapshot.oldRecord.bestTime || snapshot.time > snapshot.oldRecord.bestTime), record = newKills ? '최다 처치 ' + snapshot.kills.toLocaleString() : newTime ? '최고 생존 ' + formatTime(snapshot.time) : '';
    const report = document.querySelector('#operation-report'); if (!report) return;
    document.querySelector('#result-label').textContent = 'MISSION REPORT';
    document.querySelector('#result-title').textContent = snapshot.win ? 'MISSION COMPLETE' : 'MISSION FAILED';
    document.querySelector('#result-detail').textContent = snapshot.mapName + ' · ' + modeData(snapshot.mode).name;
    report.innerHTML = `
      ${record ? '<div class="operation-new-record"><small>NEW RECORD!</small><b>' + record + '</b></div>' : ''}
      <div class="operation-report-stats"><span><small>플레이 시간</small><b>${formatTime(snapshot.time)}</b></span><span><small>처치</small><b>${snapshot.kills.toLocaleString()}</b></span><span><small>엘리트</small><b>${snapshot.elites}</b></span><span><small>보스</small><b>${snapshot.bosses}</b></span><span><small>획득 XP</small><b>+${xp.toLocaleString()}</b></span><span><small>획득 코인</small><b>+${coins.toLocaleString()}</b></span></div>
      <div class="operation-growth-grid">
        <article><header><small>ACCOUNT XP</small><b>LV. ${snapshot.accountBefore.level}${accountAfter.level > snapshot.accountBefore.level ? ' → LV. ' + accountAfter.level : ''}</b></header><div><i id="operation-account-xp-fill"></i></div><span>+${xp.toLocaleString()} XP ${accountAfter.level > snapshot.accountBefore.level ? '· LEVEL UP!' : ''}</span></article>
        <article><header><small>WEAPON MASTERY</small><b>${snapshot.weapon} · Lv.${masteryAfter.level}/10</b></header><div><i id="operation-mastery-fill"></i></div><span>+${masteryGain.toLocaleString()} 숙련도 ${masteryAfter.level > snapshot.masteryBefore.level ? '· MASTERY UP!' : ''}</span></article>
      </div>
      <section class="operation-final-build"><small>FINAL BUILD</small><div>${reportBuild(snapshot)}</div></section>`;
    const next = document.querySelector('#operation-next');
    const canNext = snapshot.win && snapshot.mode === 'conquest' && snapshot.mapIndex < maps.length - 1 && snapshot.mapIndex + 1 <= unlocked;
    next?.classList.toggle('hidden', !canNext); if (next) next.dataset.map = String(snapshot.mapIndex + 1);
    requestAnimationFrame(() => {
      const accountFill = document.querySelector('#operation-account-xp-fill'), masteryFill = document.querySelector('#operation-mastery-fill');
      if (accountFill) accountFill.style.width = (accountAfter.nextXp ? Math.min(100, accountAfter.xp / accountAfter.nextXp * 100) : 100) + '%';
      if (masteryFill) masteryFill.style.width = masteryAfter.percent + '%';
    });
    if (record) { cue('record'); haptic([28, 35, 55]); }
    operation.report = snapshot;
  }
  async function finalize(win) {
    if (operation.finalizing) return;
    operation.finalizing = true;
    const snapshot = buildSnapshot(win), outro = document.querySelector('#operation-outro'), duration = transitionDurations().outro;
    paused = true;
    document.querySelector('#operation-outro-title').textContent = win ? 'MISSION COMPLETE' : 'MISSION FAILED';
    document.querySelector('#operation-outro-detail').textContent = win ? '작전 목표 달성 · 귀환 신호 연결' : '생존자 회수 신호 전송';
    document.querySelector('#operation-outro-code').textContent = win ? 'OPERATION COMPLETE' : 'OPERATION FAILED';
    outro.classList.toggle('failed', !win); outro.classList.remove('hidden'); requestAnimationFrame(() => outro.classList.add('active'));
    cue(win ? 'complete' : 'failed'); haptic(win ? [35, 45, 60] : 70);
    await delay(duration);
    outro.classList.remove('active'); outro.classList.add('hidden');
    originalEnd(win);
    renderReport(snapshot);
    operation.finalizing = false;
  }
  function nextOperation() {
    const next = Number(document.querySelector('#operation-next')?.dataset.map);
    if (!Number.isInteger(next) || next < 0 || next >= maps.length || next > unlocked) return;
    selected = next; activeMode = 'conquest'; if (typeof selectedMode !== 'undefined') selectedMode = 'conquest';
    mapButtons(); operation.launch = 'standard'; openPrep('standard');
  }
  function retryOperation() {
    const lastMode = operation.report?.mode || modeId();
    if (lastMode === 'endless' || lastMode === 'bossrush') { selectedMode = lastMode; activeMode = lastMode; document.querySelector('#modes')?.classList.add('hidden'); openPrep('mode'); }
    else { if (operation.report?.mapIndex != null) selected = operation.report.mapIndex; activeMode = 'conquest'; mapButtons(); openPrep('standard'); }
  }

  function bossClass(enemy) {
    if (modeId() === 'bossrush') return 'BOSS RUSH TARGET';
    if (enemy?.hiddenBoss) return 'UNKNOWN ANOMALOUS TARGET';
    return stageInfo().n === stageInfo().total ? 'FINAL AREA BOSS' : 'AREA COMMANDER';
  }
  function showBossSignal() {
    const node = document.querySelector('#operation-boss-presentation');
    document.querySelector('#operation-boss-kicker').textContent = 'BOSS SIGNAL DETECTED';
    document.querySelector('#operation-boss-name').textContent = 'WARNING';
    document.querySelector('#operation-boss-class').textContent = '중앙 전송 좌표 고정 중';
    document.querySelector('#operation-boss-threat').textContent = 'HOSTILE ENERGY APPROACHING';
    node.classList.add('warning'); node.classList.remove('hidden'); requestAnimationFrame(() => node.classList.add('active')); cue('warning'); haptic([25, 45, 25]);
    setTimeout(() => { node.classList.remove('active', 'warning'); node.classList.add('hidden'); }, settings().presentation === 'minimal' ? 380 : 950);
  }
  async function showBossArrival(enemy) {
    if (!enemy || operation.lastBossId === enemy.id) return;
    operation.lastBossId = enemy.id; paused = true; enemy.x = W / 2; enemy.y = H / 2; enemy.centerLocked = true; enemy.centerEntrance = Math.max(enemy.centerEntrance || 0, 1.4);
    const node = document.querySelector('#operation-boss-presentation'), stars = Math.min(5, Math.max(2, Math.ceil((selected + 1) / 6) + (stageInfo().n === stageInfo().total ? 1 : 0)));
    document.querySelector('#operation-boss-kicker').textContent = 'HOSTILE SIGNATURE CONFIRMED';
    document.querySelector('#operation-boss-name').textContent = enemy.name || 'UNKNOWN BOSS';
    document.querySelector('#operation-boss-class').textContent = bossClass(enemy);
    document.querySelector('#operation-boss-threat').textContent = 'THREAT LEVEL ' + '★'.repeat(stars);
    node.classList.remove('warning', 'hidden'); requestAnimationFrame(() => node.classList.add('active')); cue('warning'); haptic(60);
    await delay(transitionDurations().boss);
    node.classList.remove('active'); node.classList.add('hidden');
    if (run && !operation.finalizing) paused = false;
  }
  function showBossDefeated(enemy) {
    if (!enemy || operation.bossDefeatShown.has(enemy.id)) return;
    operation.bossDefeatShown.add(enemy.id); paused = true;
    const node = document.querySelector('#operation-boss-presentation');
    document.querySelector('#operation-boss-kicker').textContent = enemy.name || 'AREA BOSS';
    document.querySelector('#operation-boss-name').textContent = 'BOSS DEFEATED';
    document.querySelector('#operation-boss-class').textContent = '위협 신호 소멸';
    document.querySelector('#operation-boss-threat').textContent = 'TARGET ELIMINATED';
    node.classList.remove('warning', 'hidden'); requestAnimationFrame(() => node.classList.add('active')); cue('complete'); haptic([30, 30, 55]);
    setTimeout(() => { node.classList.remove('active'); node.classList.add('hidden'); if (run && !operation.finalizing) paused = false; }, settings().presentation === 'minimal' ? 360 : 900);
  }
  function classifyBossAtCenter(enemy) {
    if (!enemy?.boss) return enemy;
    enemy.x = W / 2; enemy.y = H / 2; enemy.centerLocked = true; enemy.centerEntrance = Math.max(enemy.centerEntrance || 0, 1.4);
    return enemy;
  }
  function bossWatch() {
    if (run && operation.run) {
      const key = stage + ':' + (stageInfo().boss || '');
      if (stageInfo().boss && bossSpawned && !boss && operation.warnedStage !== key) { operation.warnedStage = key; showBossSignal(); }
      if (boss && enemies.includes(boss)) showBossArrival(boss);
      const hud = document.querySelector('#operation-boss-hud');
      if (boss && enemies.includes(boss) && boss.hp > 0) {
        hud.classList.remove('hidden'); document.querySelector('#operation-boss-hud-name').textContent = boss.name || 'AREA BOSS'; document.querySelector('#operation-boss-hud-class').textContent = bossClass(boss); document.querySelector('#operation-boss-hp').style.width = Math.max(0, Math.min(100, boss.hp / boss.maxHp * 100)) + '%';
      } else hud?.classList.add('hidden');
    } else document.querySelector('#operation-boss-hud')?.classList.add('hidden');
    requestAnimationFrame(bossWatch);
  }

  buildUi();
  operation.prepFrame = requestAnimationFrame(drawPrepAgent);

  const originalBegin = begin;
  const originalTryBegin = tryBegin;
  const originalEnd = end;
  const originalKillEnemy = killEnemy;
  const originalSpawnEnemy = spawnEnemy;
  const existingModePlay = document.querySelector('#mode-play')?.onclick;

  begin = function () {
    if (operation.allowBegin) return originalBegin.apply(this, arguments);
    return openPrep('direct');
  };
  tryBegin = function () {
    if (operation.allowBegin) return originalTryBegin.apply(this, arguments);
    return openPrep('standard');
  };
  killEnemy = function (enemy) {
    const valid = !!enemy && enemies.includes(enemy), elite = valid && !!enemy.elite && !enemy.boss, bossKill = valid && !!enemy.boss;
    const result = originalKillEnemy.apply(this, arguments);
    if (valid && operation.run) {
      if (elite) operation.run.elites++;
      if (bossKill) { operation.run.bosses++; operation.run.bossNames.push(enemy.name || 'AREA BOSS'); showBossDefeated(enemy); }
    }
    return result;
  };
  spawnEnemy = function (isBoss) {
    const result = originalSpawnEnemy.apply(this, arguments);
    if (!isBoss) return result;
    classifyBossAtCenter(result);
    classifyBossAtCenter(boss);
    const latest = [...enemies].reverse().find(enemy => enemy?.boss);
    classifyBossAtCenter(latest);
    setTimeout(() => {
      if (!run) return;
      classifyBossAtCenter(boss);
      const delayed = [...enemies].reverse().find(enemy => enemy?.boss);
      classifyBossAtCenter(delayed);
    }, 3050);
    return result;
  };
  end = function (win) {
    if (typeof coop !== 'undefined' && coop?.battle?.active && !win && !coop.battle.abandoned) return originalEnd.apply(this, arguments);
    return finalize(!!win);
  };

  document.querySelector('#play-button').onclick = () => tryBegin();
  const battleStart = document.querySelector('#battle-start'); if (battleStart) battleStart.onclick = () => tryBegin();
  const retry = document.querySelector('#retry-button'); if (retry) retry.onclick = retryOperation;
  const modePlay = document.querySelector('#mode-play');
  if (modePlay) modePlay.onclick = function () {
    if (selectedModeId() === 'coop' && typeof existingModePlay === 'function') return existingModePlay.call(this);
    return openPrep('mode');
  };

  globalThis.operationQueueCoopDeploy = async function (_message, start) {
    if (operation.deploying || run) return;
    operation.launch = 'coop'; operation.deploying = true;
    await playDeployTransition(true);
    operation.allowBegin = true;
    try { start(); } finally { operation.allowBegin = false; }
    if (run) { captureRunStart(); await showIntro(); }
    operation.deploying = false;
  };

  requestAnimationFrame(bossWatch);
})();
