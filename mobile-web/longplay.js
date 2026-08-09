/*
 * Long-play progression layer.
 * Existing combat, equipment and portal data stay untouched; this module only
 * stores its state under `neonLongplay*` keys and wraps public combat hooks.
 */
(function () {
  const MASTERY_KEY = 'neonWeaponMastery';
  const RELIC_KEY = 'neonRelics';
  const RELIC_EQUIPPED_KEY = 'neonEquippedRelic';
  const SECRET_KEY = 'neonSecretArchive';
  const BOUNTY_KEY = 'neonBountyRecord';
  const SEASON_KEY = 'neonSeasonOperation';
  const CORE_KEY = 'neonCoreProgress';
  const MASTERY_LEVELS = [0, 160, 420, 820, 1420, 2280, 3400, 4850, 6650, 8850, 11400];
  const RELICS = {
    ember: { name: '적색 심핵', tier: '희귀', icon: '◉', detail: '체력이 낮을수록 주무기 공격 속도가 빨라집니다.' },
    echo: { name: '잔상 프로토콜', tier: '영웅', icon: '〰', detail: '이동 후 남긴 잔상이 짧게 적을 베어냅니다.' },
    overload: { name: '과부하 칩', tier: '전설', icon: '▣', detail: '스킬 주기가 빨라지지만 적의 이동도 소폭 빨라집니다.' },
    chaos: { name: '카오스 칩', tier: '신화', icon: '✣', detail: '레벨업 때 불안정한 네 번째 선택지가 나타납니다.' },
    chronoshard: { name: '시간 파편', tier: '영웅', icon: '⌛', detail: '주기적으로 일반 적의 시간을 잠시 멈춥니다.' }
  };
  const BRANCHES = {
    blast: { id: 'blast', label: '태양 폭발', icon: '☀', detail: '주무기 적중 시 작은 폭발이 발생합니다.', damage: 1.17, area: true },
    echo: { id: 'echo', label: '태양 잔상', icon: '✦', detail: '공격 속도가 크게 증가하고 잔상이 추가 타격합니다.', cooldown: .68, damage: 1.06 }
  };
  const SECRET_LIST = [
    { id: 'last-light', name: '최후의 빛', detail: '체력 10% 이하에서 보스를 처치했습니다.', reward: '경고등 플랫폼 효과' },
    { id: 'silent-run', name: '무음 전파', detail: '회복 없이 3분을 생존했습니다.', reward: '글리치 프로필 테두리' },
    { id: 'fusion-pulse', name: '교차 신호', detail: '한 전투에서 융합 스킬을 두 개 발견했습니다.', reward: '융합 무기 외형' },
    { id: 'master-signal', name: '장인의 신호', detail: '무기 숙련도 MASTER를 달성했습니다.', reward: 'MASTER 칭호' },
    { id: 'core-hunt', name: '해체 프로토콜', detail: '보스의 모든 부위를 파괴했습니다.', reward: '네온 코어 조각' }
  ];
  const SEASON_NODES = ['외곽 폐허', '버려진 연구소', '지하 수로', '네온 시장', '발전소', '제로 구역'];
  const state = { active: false, weaponName: '', lastWeaponAction: -99, lastMasteryAt: -99, overdrive: 0, overdriveUntil: 0, overdriveHitCap: 0, relicTick: 0, branchHits: 0, noHeal: true, lastHp: 0, hiddenQueued: false, bounty: null, previousSelected: null, partNotice: null };

  function json(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }
  function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function masteryData() { return json(MASTERY_KEY, {}); }
  function masteryFor(name) { const all = masteryData(); return all[name] || { xp: 0, kills: 0, bossDamage: 0 }; }
  function masteryLevel(entry) { let level = 1; for (let i = 1; i < MASTERY_LEVELS.length; i++) if ((entry.xp || 0) >= MASTERY_LEVELS[i]) level = i; return level; }
  function masteryProgress(entry) { const level = masteryLevel(entry); if (level >= 10) return { level, current: MASTERY_LEVELS[10], next: MASTERY_LEVELS[10], percent: 100 }; const current = entry.xp - MASTERY_LEVELS[level], next = MASTERY_LEVELS[level + 1] - MASTERY_LEVELS[level]; return { level, current, next, percent: Math.max(0, Math.min(100, current / next * 100)) }; }
  function weaponName() { return equipped?.weapon?.name || ''; }
  function masteryAward(amount, reason) {
    const name = state.weaponName || weaponName();
    if (!state.active || !name || !Number.isFinite(amount) || amount <= 0) return;
    const all = masteryData(), entry = all[name] || { xp: 0, kills: 0, bossDamage: 0 }, before = masteryLevel(entry);
    entry.xp = Math.min(MASTERY_LEVELS[10], Math.round(entry.xp + amount));
    if (reason === 'kill') entry.kills++;
    if (reason === 'boss') entry.bossDamage += Math.round(amount * 8);
    all[name] = entry; save(MASTERY_KEY, all);
    const after = masteryLevel(entry);
    if (after > before) {
      pop(`무기 숙련도 상승 · ${name} Lv.${after}/10`);
      if (after === 5) pop(`${name} 첫 외형 효과 해금`);
      if (after === 8) pop(`${name} 분기 진화 준비 완료`);
      if (after === 10) discoverSecret('master-signal');
    }
    renderLongplayPanels();
  }
  function relics() { const owned = json(RELIC_KEY, null); if (owned) return owned; const starter = ['ember', 'echo']; save(RELIC_KEY, starter); return starter; }
  function equippedRelic() { const id = localStorage.getItem(RELIC_EQUIPPED_KEY) || relics()[0]; return relics().includes(id) ? id : relics()[0]; }
  function branchForCurrentWeapon() { return player?.weaponBranch || null; }
  function currentMasteryLevel() { const name = state.weaponName || weaponName(); return name ? masteryLevel(masteryFor(name)) : 1; }
  function dailyBounty() {
    const day = new Date().toISOString().slice(0, 10), record = json(BOUNTY_KEY, {});
    if (record.day !== day) {
      const index = Math.abs(Array.from(day).reduce((sum, character) => sum + character.charCodeAt(0), 0)) % Math.max(1, maps.length);
      record.day = day; record.map = index; record.highest = ''; record.claimed = {}; save(BOUNTY_KEY, record);
    }
    return record;
  }
  function bountyGradeValue(grade) { return ({ C: 1, B: 1.3, A: 1.7, S: 2.15, X: 2.7 })[grade] || 1; }
  function seasonState() { const value = json(SEASON_KEY, null); if (value) return value; const fresh = { season: 1, nodes: 0, complete: false }; save(SEASON_KEY, fresh); return fresh; }
  function secretState() { return json(SECRET_KEY, {}); }
  function discoverSecret(id) {
    const secret = SECRET_LIST.find(entry => entry.id === id), all = secretState();
    if (!secret || all[id]) return false;
    all[id] = { at: Date.now() }; save(SECRET_KEY, all);
    pop(`UNKNOWN SIGNAL DETECTED · ${secret.name}`);
    document.body.classList.add('longplay-signal');
    setTimeout(() => document.body.classList.remove('longplay-signal'), 900);
    renderLongplayPanels();
    return true;
  }
  function coreProgress() {
    const current = json(CORE_KEY, { pieces: [] }), secrets = secretState(), mastered = Object.values(masteryData()).filter(entry => masteryLevel(entry) >= 10).length;
    const tests = [unlocked >= 19, unlocked >= 29, mastered >= 1, mastered >= 3, mastered >= 10, Object.keys(secrets).length >= 1, Object.keys(secrets).length >= 3, !!secrets['core-hunt'], dailyBounty().highest === 'X', seasonState().complete, Object.keys(json('neonFusionCodex', {})).length >= 3, Object.keys(json('neonFusionCodex', {})).length >= 5];
    current.pieces = tests.map((done, index) => done ? index + 1 : null).filter(Boolean); save(CORE_KEY, current); return current;
  }
  function injectUi() {
    const shell = document.querySelector('#game-shell');
    if (!shell || document.querySelector('#longplay-panels')) return;
    shell.insertAdjacentHTML('beforeend', `
      <section id="longplay-panels" aria-live="polite">
        <div id="mastery-toast" class="mastery-toast hidden"></div>
        <button id="overdrive-button" class="overdrive-button hidden" aria-label="오버드라이브 발동"><b>OVERDRIVE</b><i></i><small>0%</small></button>
      </section>
      <section id="relics" class="screen hidden modal-screen longplay-modal"><button class="close" data-longplay-close="relics">×</button><p class="label">RELIC BAY</p><h2>유물 장착</h2><p>전투 규칙을 바꾸는 유물은 한 번에 하나만 장착할 수 있습니다.</p><div id="relic-list" class="longplay-list"></div></section>
      <section id="bounty" class="screen hidden modal-screen longplay-modal"><button class="close" data-longplay-close="bounty">×</button><p class="label">TODAY'S BOUNTY</p><h2>현상수배</h2><p id="bounty-target"></p><div id="bounty-grades" class="bounty-grades"></div><button id="bounty-start" class="longplay-cta">토벌 시작</button></section>
      <section id="season" class="screen hidden modal-screen longplay-modal"><button class="close" data-longplay-close="season">×</button><p class="label">SEASON OPERATION · S1</p><h2>네온 시티 붕괴</h2><p>정복한 지역이 늘수록 도시의 전력이 복구됩니다.</p><div id="season-map" class="season-map"></div></section>
      <section id="core" class="screen hidden modal-screen longplay-modal"><button class="close" data-longplay-close="core">×</button><p class="label">NEON CORE</p><h2>파손된 심장</h2><p id="core-copy"></p><div id="core-rings" class="core-rings"></div></section>
      <section id="secrets" class="screen hidden modal-screen longplay-modal"><button class="close" data-longplay-close="secrets">×</button><p class="label">UNKNOWN ARCHIVE</p><h2>비밀 기록</h2><p>알려지지 않은 신호를 발견하면 기록됩니다.</p><div id="secret-list" class="longplay-list"></div></section>`);
    const actions = document.querySelector('#equipment .equipment-actions');
    if (actions && !document.querySelector('#relic-button')) actions.insertAdjacentHTML('beforeend', '<button id="relic-button" class="relic-button">✦ 유물</button>');
    const lobbyTools = document.querySelector('#lobby-tools');
    if (lobbyTools && !document.querySelector('#bounty-button')) lobbyTools.insertAdjacentHTML('beforeend', '<button id="bounty-button">◎<small>현상</small></button><button id="season-button">▧<small>시즌</small></button>');
    const base = document.querySelector('#base');
    if (base && !document.querySelector('#core-console')) base.insertAdjacentHTML('beforeend', '<button id="core-console" class="core-console"><span>◉</span><b>NEON CORE</b><small>장기 목표 진행도</small></button><button id="secret-console" class="secret-console">UNKNOWN ARCHIVE</button>');
    document.querySelectorAll('[data-longplay-close]').forEach(button => button.onclick = () => document.querySelector('#' + button.dataset.longplayClose).classList.add('hidden'));
    document.querySelector('#relic-button')?.addEventListener('click', () => openPanel('relics'));
    document.querySelector('#bounty-button')?.addEventListener('click', () => openPanel('bounty'));
    document.querySelector('#season-button')?.addEventListener('click', () => openPanel('season'));
    document.querySelector('#core-console')?.addEventListener('click', () => openPanel('core'));
    document.querySelector('#secret-console')?.addEventListener('click', () => openPanel('secrets'));
    document.querySelector('#overdrive-button')?.addEventListener('click', activateOverdrive);
    document.addEventListener('keydown', event => { if (event.code === 'KeyX' && run && !paused) activateOverdrive(); });
    document.querySelector('#bounty-start')?.addEventListener('click', startBounty);
  }
  function openPanel(id) { document.querySelector('#' + id)?.classList.remove('hidden'); renderLongplayPanels(); }
  function renderLongplayPanels() {
    const relicList = document.querySelector('#relic-list');
    if (relicList) { const equippedId = equippedRelic(); relicList.innerHTML = relics().map(id => { const relic = RELICS[id]; return `<article class="relic-card ${id === equippedId ? 'equipped' : ''}"><i>${relic.icon}</i><b>${relic.name}</b><em>${relic.tier}</em><small>${relic.detail}</small><button data-relic="${id}">${id === equippedId ? '장착 중' : '장착하기'}</button></article>`; }).join(''); relicList.querySelectorAll('[data-relic]').forEach(button => button.onclick = () => { localStorage.setItem(RELIC_EQUIPPED_KEY, button.dataset.relic); renderLongplayPanels(); pop(`${RELICS[button.dataset.relic].name} 장착 완료`); }); }
    const bounty = dailyBounty(), target = document.querySelector('#bounty-target'), grades = document.querySelector('#bounty-grades');
    if (target) target.textContent = `${maps[bounty.map].name} · ${mapEnemyThemes[bounty.map]?.boss || '현상 보스'} · 남은 시간 오늘 자정`;
    if (grades) grades.innerHTML = ['C', 'B', 'A', 'S', 'X'].map(grade => `<button class="${state.bounty?.grade === grade ? 'selected' : ''}" data-grade="${grade}"><b>${grade}급</b><small>보상 🪙 ${Math.round(140 * bountyGradeValue(grade))}</small><em>${bounty.highest === grade ? '최고 기록' : grade === 'X' ? '강화 형태' : '토벌'}</em></button>`).join('');
    grades?.querySelectorAll('[data-grade]').forEach(button => button.onclick = () => { state.bounty = { grade: button.dataset.grade, map: bounty.map }; renderLongplayPanels(); });
    const season = seasonState(), map = document.querySelector('#season-map');
    if (map) map.innerHTML = SEASON_NODES.map((name, index) => `<article class="${index < season.nodes ? 'cleared' : index === season.nodes ? 'current' : 'locked'}"><i>${index < season.nodes ? '✦' : index === season.nodes ? '◉' : '◌'}</i><b>${String(index + 1).padStart(2, '0')} ${index < season.nodes ? name : '???'}</b><small>${index < season.nodes ? '네온 전력 복구 완료' : index === season.nodes ? '다음 작전 지역' : '잠긴 구역'}</small></article>`).join('');
    const core = coreProgress(), rings = document.querySelector('#core-rings'), copy = document.querySelector('#core-copy');
    if (copy) copy.textContent = core.pieces.length >= 12 ? 'CORE RESTORED · ZERO DISTRICT 신호가 열렸습니다.' : `코어 조각 ${core.pieces.length} / 12 · 정복, 숙련, 비밀과 작전이 하나의 목표로 이어집니다.`;
    if (rings) rings.innerHTML = Array.from({ length: 12 }, (_, index) => `<i class="${core.pieces.includes(index + 1) ? 'on' : ''}">${core.pieces.includes(index + 1) ? '✦' : '◌'}</i>`).join('');
    const secrets = secretState(), list = document.querySelector('#secret-list');
    if (list) list.innerHTML = SECRET_LIST.map((secret, index) => { const known = !!secrets[secret.id]; return `<article class="secret-card ${known ? 'known' : ''}"><i>${known ? '✧' : '◒'}</i><b>${known ? `SECRET ${String(index + 1).padStart(2, '0')} · ${secret.name}` : `SECRET ${String(index + 1).padStart(2, '0')} · ???`}</b><small>${known ? `${secret.detail} · 보상: ${secret.reward}` : '아직 발견하지 못한 신호입니다.'}</small></article>`; }).join('');
    const mastery = document.querySelector('#mastery-toast'), name = weaponName();
    if (mastery && name) { const progress = masteryProgress(masteryFor(name)); mastery.innerHTML = `<b>${name} 숙련도 Lv.${progress.level}/10</b><i><em style="width:${progress.percent}%"></em></i><small>${progress.level >= 10 ? 'MASTER' : `${Math.floor(progress.current)} / ${progress.next}`}</small>`; }
  }
  function addMasteryPanel() {
    const analysis = document.querySelector('#weapon-analysis');
    if (!analysis || document.querySelector('#mastery-analysis')) return;
    analysis.insertAdjacentHTML('beforeend', '<section id="mastery-analysis" class="mastery-analysis"></section>');
  }
  function renderMasteryAnalysis() {
    addMasteryPanel(); const node = document.querySelector('#mastery-analysis'), name = weaponName(); if (!node || !name) return;
    const progress = masteryProgress(masteryFor(name));
    node.innerHTML = `<small>WEAPON MASTERY</small><b>${name} · Lv.${progress.level}/10</b><div><i style="width:${progress.percent}%"></i></div><span>${progress.level >= 8 ? '분기 진화 가능' : `다음 보상: Lv.${progress.level + 1}`}</span>`;
  }
  function branchData() { const name = weaponName(); if (name === '네온 와이어') return [{ ...BRANCHES.blast, label: '전류망', icon: '⌁', detail: '연결 수가 늘고 적 처치 시 전류가 도약합니다.' }, { ...BRANCHES.echo, label: '집중 방전', icon: '▥', detail: '연결 대상은 적지만 보스 피해가 증가합니다.', damage: 1.34 }]; return [BRANCHES.blast, BRANCHES.echo]; }
  function battleWeaponLevel() { const weapon = typeof arsenalWeapon === 'function' ? arsenalWeapon() : null, name = weaponName(), core = weaponCoreName(name); if (weapon) return arsenalLevel(weapon); if (core === '영원의 빛(쌍창)') return Math.min(player?.weaponLevels?.['성단의 창'] || 1, player?.weaponLevels?.['파멸의 창'] || 1); return player?.weaponLevels?.[name] || 1; }
  function offerBranches() {
    const list = ui.upList;
    if (!list || !run || player.weaponEvolved || currentMasteryLevel() < 8 || battleWeaponLevel() < 5) return;
    const weaponCard = list.querySelector('.arsenal-upgrade') || Array.from(list.children).find(card => /무기 돌파|무기 최대 강화/.test(card.textContent));
    weaponCard?.remove();
    const normalCards = Array.from(list.children).slice(0, 1);
    list.innerHTML = '';
    branchData().forEach(branch => { const card = document.createElement('button'); card.className = 'upgrade-card longplay-branch'; card.innerHTML = `<span class="icon">${branch.icon}</span><b>${branch.label}</b><small>분기 진화 · ${branch.detail}</small>`; card.onclick = () => { player.weaponEvolved = true; player.weaponBranch = branch.id; pop(`${branch.label} 분기 진화 완료!`); paused = false; ui.up.classList.add('hidden'); }; list.append(card); });
    normalCards.forEach(card => list.append(card));
  }
  function activateOverdrive() {
    if (!run || paused || state.overdrive < 100 || time < state.overdriveUntil) return;
    state.overdrive = 0; state.overdriveUntil = time + 7; document.body.classList.add('overdrive-active');
    pop('OVERDRIVE · 7초간 전투 출력 최대'); burst(player.x, player.y, '#ffe56a', 28); setTimeout(() => document.body.classList.remove('overdrive-active'), 7100);
    renderOverdrive();
  }
  function renderOverdrive() { const button = document.querySelector('#overdrive-button'); if (!button) return; button.classList.toggle('hidden', !run); button.classList.toggle('ready', state.overdrive >= 100); button.querySelector('i').style.width = `${state.overdrive}%`; button.querySelector('small').textContent = `${Math.floor(state.overdrive)}%`; }
  function applyRelicAtBegin() {
    const id = equippedRelic();
    if (id === 'overload') { player.cdRate += .18; player._longplayEnemySpeed = 1.1; }
    if (id === 'chaos') pop('카오스 칩 활성 · 레벨업에 불안정 선택지가 등장합니다.');
    pop(`유물 장착 · ${RELICS[id].name}`);
  }
  function tryChaosCard() {
    if (equippedRelic() !== 'chaos' || !run || !ui.upList || ui.upList.children.length >= 4) return;
    const card = document.createElement('button'); card.className = 'upgrade-card chaos-card'; card.innerHTML = '<span class="icon">?</span><b>불안정한 신호</b><small>무작위 효과 · 위험할 수도 있습니다</small>';
    card.onclick = () => { const result = Math.random(); if (result < .42) { player.damage *= 1.18; pop('불안정 신호 · 공격력 증가'); } else if (result < .76) { player.hp = Math.min(player.maxHp, player.hp + player.maxHp * .28); pop('불안정 신호 · 긴급 회복'); } else { player.speed *= .88; player.xpMult *= 1.35; pop('불안정 신호 · 이동 -12% / XP +35%'); } paused = false; ui.up.classList.add('hidden'); };
    ui.upList.append(card);
  }
  function addBossParts(enemy) {
    if (!enemy?.boss || enemy.longplayParts || selected % 3 !== 0) return;
    const hp = enemy.maxHp * .18;
    enemy.longplayParts = [
      { id: 'left', name: '좌측 구동부', hp, maxHp: hp, x: -enemy.r * .85, y: -enemy.r * .2, color: '#6ceaff', effect: 'speed' },
      { id: 'right', name: '우측 포대', hp, maxHp: hp, x: enemy.r * .85, y: -enemy.r * .2, color: '#ff8ec6', effect: 'damage' },
      { id: 'core', name: '에너지 코어', hp: hp * 1.25, maxHp: hp * 1.25, x: 0, y: -enemy.r * .9, color: '#ffd86d', effect: 'core' }
    ];
    pop(`${enemy.name} · 파괴 가능한 부위 감지`);
  }
  function damageBossPart(enemy, damage) {
    const parts = enemy?.longplayParts?.filter(part => !part.destroyed); if (!parts?.length) return;
    const part = parts[Math.floor(Math.random() * parts.length)]; part.hp = Math.max(0, part.hp - damage * .68);
    if (!part.hp && !part.destroyed) {
      part.destroyed = true; if (part.effect === 'speed') enemy.speed *= .78; if (part.effect === 'damage') enemy.damage *= .75; if (part.effect === 'core') enemy.longplayCoreBroken = true;
      wallet += 20; localStorage.neonCoins = wallet; renderCoins(); pop(`${part.name} 파괴 · 🪙 +20`);
      if (enemy.longplayParts.every(item => item.destroyed)) discoverSecret('core-hunt');
    }
  }
  function drawBossParts() {
    if (run && boss?.longplayParts) boss.longplayParts.forEach(part => { const px = boss.x + part.x, py = boss.y + part.y; x.save(); x.globalAlpha = part.destroyed ? .2 : 1; x.fillStyle = part.color; x.shadowBlur = 12; x.shadowColor = part.color; x.beginPath(); x.arc(px, py, Math.max(7, boss.r * .18), 0, Math.PI * 2); x.fill(); x.shadowBlur = 0; x.fillStyle = '#101a31'; x.fillRect(px - 16, py - 18, 32, 3); x.fillStyle = part.color; x.fillRect(px - 16, py - 18, 32 * Math.max(0, part.hp / part.maxHp), 3); x.restore(); }); requestAnimationFrame(drawBossParts); }
  function maybeHiddenBoss() {
    if (!state.hiddenQueued || !run || boss || enemies.some(enemy => enemy.boss)) return;
    state.hiddenQueued = false; spawnEnemy(true); if (!boss) return;
    boss.hiddenBoss = true; boss.name = '무명의 추적자'; boss.color = '#fb74ff'; boss.hp *= 1.34; boss.maxHp = boss.hp; boss.damage *= 1.2; addBossParts(boss); pop('UNKNOWN SIGNAL · 무명의 추적자 접근');
  }
  function startBounty() {
    if (!state.bounty) { pop('토벌 등급을 선택하세요.'); return; }
    const bounty = dailyBounty(); state.previousSelected = selected; selected = bounty.map;
    document.querySelector('#bounty')?.classList.add('hidden'); begin();
  }
  function longplayTick(now) {
    const dt = Math.min(.04, (now - (longplayTick.last || now)) / 1000); longplayTick.last = now;
    if (run && player) {
      if (player.hp > state.lastHp + .1) state.noHeal = false;
      state.lastHp = player.hp;
      if (time >= state.overdriveUntil && state.overdriveUntil) document.body.classList.remove('overdrive-active');
      if (equippedRelic() === 'chronoshard') { state.relicTick -= dt; if (state.relicTick <= 0) { state.relicTick = 9; enemies.filter(enemy => !enemy.boss).forEach(enemy => enemy.frozenUntil = Math.max(enemy.frozenUntil || 0, time + 1.35)); pop('시간 파편 · 적 시간 정지'); } }
      if (equippedRelic() === 'echo' && Math.hypot((player.x - (state.lastX || player.x)), (player.y - (state.lastY || player.y))) > 48 && state.relicTick <= 0) { state.relicTick = .7; effects.push({ kind: 'blast', x: state.lastX || player.x, y: state.lastY || player.y, l: .22, r: 48, damage: player.damage * .45 }); }
      state.lastX = player.x; state.lastY = player.y; state.relicTick -= dt;
      if (state.noHeal && time >= 180) { if (discoverSecret('silent-run')) state.hiddenQueued = true; }
      const fusions = Object.keys(json('neonFusionCodex', {})).length; if (fusions >= 2 && !secretState()['fusion-pulse']) discoverSecret('fusion-pulse');
      maybeHiddenBoss(); renderOverdrive();
    }
    requestAnimationFrame(longplayTick);
  }
  function install() {
    injectUi(); renderLongplayPanels(); renderMasteryAnalysis();
    const oldBegin = begin; begin = function () { oldBegin.apply(this, arguments); state.active = true; state.weaponName = weaponName(); state.lastWeaponAction = -99; state.overdrive = 0; state.overdriveUntil = 0; state.overdriveHitCap = 0; state.noHeal = true; state.lastHp = player?.hp || 0; state.relicTick = 0; state.hiddenQueued = false; applyRelicAtBegin(); if (state.bounty) { const multiplier = bountyGradeValue(state.bounty.grade); stage = Math.ceil(totalStages() / 2) - 1; stageKills = 0; stageThreat *= multiplier; pop(`현상 토벌 ${state.bounty.grade}급 · ${maps[selected].name}`); } renderOverdrive(); };
    const oldEnd = end; end = function (win) { const wasActive = state.active, bounty = state.bounty; if (wasActive && win) { masteryAward(46 + selected * 4, 'clear'); const season = seasonState(); season.nodes = Math.min(SEASON_NODES.length, Math.max(season.nodes, Math.floor((unlocked + 1) / 4))); season.complete = season.nodes >= SEASON_NODES.length; save(SEASON_KEY, season); } state.active = false; const result = oldEnd.apply(this, arguments); if (bounty) { state.bounty = null; if (state.previousSelected !== null) { selected = state.previousSelected; state.previousSelected = null; mapButtons(); } } renderOverdrive(); renderLongplayPanels(); return result; };
    const oldWeaponAttack = weaponAttack; weaponAttack = function (dt) { const before = weaponState?.cool, adjustedDt = branchForCurrentWeapon() === 'echo' ? dt * 1.32 : dt; const result = oldWeaponAttack.call(this, adjustedDt); if (run && !paused && before <= 0) state.lastWeaponAction = time; return result; };
    const oldHurt = hurt; hurt = function (enemy, damage) { const valid = !!enemy && enemies.includes(enemy), isBoss = valid && enemy.boss, beforeHp = valid ? enemy.hp : 0; if (valid && state.active && time - state.lastWeaponAction < .42) { const gain = isBoss ? Math.min(5.5, Number(damage) * .13) : Math.min(1.8, Number(damage) * .07); masteryAward(gain, isBoss ? 'boss' : 'hit'); if (time - state.lastMasteryAt > .22) { state.lastMasteryAt = time; state.overdrive = Math.min(100, state.overdrive + (isBoss ? 3.2 : .9)); } if (isBoss) damageBossPart(enemy, Number(damage) || 0); if (branchForCurrentWeapon() === 'blast' && time >= (enemy.longplayBlastAt || 0)) { enemy.longplayBlastAt = time + .34; enemies.filter(other => other !== enemy && Math.hypot(other.x - enemy.x, other.y - enemy.y) < 62).forEach(other => oldHurt(other, Number(damage) * .3)); effects.push({ kind: 'blast', x: enemy.x, y: enemy.y, l: .2, r: 62, damage: 0 }); } }
      return oldHurt.apply(this, arguments); };
    const oldKill = killEnemy; killEnemy = function (enemy) { const valid = !!enemy && enemies.includes(enemy), bossKill = valid && enemy.boss, lowHealth = bossKill && player && player.hp / player.maxHp <= .1, hidden = bossKill && enemy.hiddenBoss, bountyBoss = bossKill && !!state.bounty; const result = oldKill.apply(this, arguments); if (valid && state.active) { if (!bossKill && time - state.lastWeaponAction < .42) masteryAward(3.5 + selected * .15, 'kill'); if (lowHealth) discoverSecret('last-light'); if (hidden) { wallet += 160; localStorage.neonCoins = wallet; renderCoins(); pop('SECRET DISCOVERED · 특별 보상 🪙 +160'); } if (bountyBoss) { const record = dailyBounty(), grade = state.bounty.grade, rank = ['C', 'B', 'A', 'S', 'X']; if (!record.highest || rank.indexOf(grade) > rank.indexOf(record.highest)) record.highest = grade; record.claimed ||= {}; if (!record.claimed[grade]) { const reward = Math.round(140 * bountyGradeValue(grade)); wallet += reward; localStorage.neonCoins = wallet; record.claimed[grade] = true; pop(`현상수배 ${grade}급 토벌 · 🪙 +${reward}`); } save(BOUNTY_KEY, record); setTimeout(() => { if (run) end(true); }, 70); } } return result; };
    const oldSpawn = spawnEnemy; spawnEnemy = function (isBoss) { const result = oldSpawn.apply(this, arguments); const fresh = boss || enemies[enemies.length - 1]; if (isBoss && fresh?.boss) { if (player?._longplayEnemySpeed) fresh.speed *= player._longplayEnemySpeed; if (state.bounty) { fresh.name = `${fresh.name} · 현상 ${state.bounty.grade}`; fresh.hp *= bountyGradeValue(state.bounty.grade); fresh.maxHp = fresh.hp; fresh.damage *= 1 + (bountyGradeValue(state.bounty.grade) - 1) * .45; } addBossParts(fresh); } else if (fresh && player?._longplayEnemySpeed) fresh.speed *= player._longplayEnemySpeed; return result; };
    const oldLevelUp = levelUp; levelUp = function () { const result = oldLevelUp.apply(this, arguments); offerBranches(); tryChaosCard(); return result; };
    if (typeof arsenalDamage === 'function') { const oldArsenalDamage = arsenalDamage; arsenalDamage = function (weapon, multiplier) { let value = oldArsenalDamage(weapon, multiplier); if (state.overdriveUntil > time) value *= 1.72; if (equippedRelic() === 'ember' && player) value *= 1 + Math.max(0, .5 - player.hp / player.maxHp) * .9; if (branchForCurrentWeapon() === 'echo') value *= 1.06; return value; }; }
    if (typeof arsenalStat === 'function') { const oldArsenalStat = arsenalStat; arsenalStat = function (weapon) { const stat = oldArsenalStat(weapon); if (state.overdriveUntil > time) stat.cooldown *= .55; if (branchForCurrentWeapon() === 'echo') stat.cooldown *= .68; if (equippedRelic() === 'ember' && player && player.hp / player.maxHp < .5) stat.cooldown *= .82; return stat; }; }
    const oldDrawGear = drawGear; drawGear = function () { const result = oldDrawGear.apply(this, arguments); setTimeout(renderMasteryAnalysis, 0); return result; };
    document.querySelector('#base-button')?.addEventListener('click', () => setTimeout(() => { injectUi(); renderLongplayPanels(); }, 0));
    document.querySelector('#equipment-button')?.addEventListener('click', () => setTimeout(() => { injectUi(); renderMasteryAnalysis(); }, 0));
  }
  setTimeout(install, 0); requestAnimationFrame(longplayTick); requestAnimationFrame(drawBossParts);
})();
