/* 계정 레벨: 전투 중 스킬 레벨과 분리된 장기 성장/보상 시스템. */
(function () {
  var PLAYER_LEVEL_KEY = 'neonPlayerLevel';
  var PLAYER_LEVEL_CONFIG = {
    maxLevel: 100,
    xpForLevel: function (level) { return Math.round(82 + (level - 1) * 21 + Math.pow(level - 1, 1.52) * 3.5); },
    choiceLevels: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  };
  var ACCOUNT_TITLES = [
    { level: 1, name: '신입 생존자' }, { level: 10, name: '거리의 생존자' }, { level: 20, name: '숙련 생존자' },
    { level: 30, name: '네온 사냥꾼' }, { level: 40, name: '도시 정복자' }, { level: 50, name: '엘리트 생존자' },
    { level: 75, name: '네온 베테랑' }, { level: 100, name: 'NEON LEGEND' }
  ];
  var ACCOUNT_FEATURES = [
    { level: 8, name: '전투 기록 분석', detail: '전투 종료 시 계정 XP 분석을 확인합니다.' },
    { level: 12, name: '무기 관심 목록', detail: '장비 관리 효율을 높이는 수집 특전입니다.' },
    { level: 18, name: '도감 추적', detail: '미발견 도감을 장기 목표로 기록합니다.' },
    { level: 25, name: '출격 플랫폼 α', detail: '로비 출격 플랫폼에 추가 네온 라인이 적용됩니다.' },
    { level: 35, name: '준비 프리셋 β', detail: '장비 성장 기록용 두 번째 준비 표식입니다.' },
    { level: 50, name: '프리즘 프로필', detail: '로비 요원 전시에 프리즘 네온 효과가 적용됩니다.' },
    { level: 75, name: '황금 홀로그램', detail: '로비 플랫폼에 고급 홀로그램 효과가 적용됩니다.' },
    { level: 100, name: '전설의 엠블럼', detail: 'NEON LEGEND 전용 레벨 엠블럼이 적용됩니다.' }
  ];
  var GEAR_TIER = { common: 1, rare: 1.35, hero: 1.8, legend: 2.35, mythic: 3.1 };
  var ACCOUNT_GEAR_BONUS = {
    armor: { hp: 20, defense: 7 }, gloves: { power: 18, defense: 2 }, shoes: { hp: 8, defense: 4 }, belt: { hp: 17, defense: 6 }, necklace: { hp: 8, power: 12, defense: 2 }, head: { power: 13, defense: 4, hp: 5 }
  };
  var accountRun = { elite: 0, boss: 0, started: false, snapshots: {} };

  function accountJson(value, fallback) { try { return JSON.parse(value || ''); } catch (_) { return fallback; } }
  function accountDefault() { return { version: 1, level: 1, xp: 0, nextXp: 82, totalXp: 0, claimedLevelRewards: [], unlockedLevelFeatures: [], unlockedTitles: ['신입 생존자'], selectedTitle: '신입 생존자', pendingChoices: [] }; }
  function accountState() {
    var state = Object.assign(accountDefault(), accountJson(localStorage.getItem(PLAYER_LEVEL_KEY), {}));
    state.level = Math.max(1, Math.min(PLAYER_LEVEL_CONFIG.maxLevel, Number(state.level) || 1));
    state.xp = Math.max(0, Number(state.xp) || 0); state.nextXp = accountNeed(state.level); state.totalXp = Math.max(0, Number(state.totalXp) || 0);
    state.claimedLevelRewards = Array.isArray(state.claimedLevelRewards) ? state.claimedLevelRewards : [];
    state.unlockedLevelFeatures = Array.isArray(state.unlockedLevelFeatures) ? state.unlockedLevelFeatures : [];
    state.unlockedTitles = Array.isArray(state.unlockedTitles) && state.unlockedTitles.length ? state.unlockedTitles : ['신입 생존자'];
    state.pendingChoices = Array.isArray(state.pendingChoices) ? state.pendingChoices : [];
    if (!state.unlockedTitles.includes(state.selectedTitle)) state.selectedTitle = state.unlockedTitles[0];
    return state;
  }
  function accountSave(state) { localStorage.setItem(PLAYER_LEVEL_KEY, JSON.stringify(state)); }
  function accountNeed(level) { return level >= PLAYER_LEVEL_CONFIG.maxLevel ? 0 : PLAYER_LEVEL_CONFIG.xpForLevel(level); }
  function accountEmblem(level) { return level >= 100 ? 'legend' : level >= 75 ? 'gold' : level >= 50 ? 'pink' : level >= 25 ? 'violet' : level >= 10 ? 'cyan' : 'blue'; }
  function accountCount(key) { var value = accountJson(localStorage.getItem(key), {}); return Array.isArray(value) ? value.length : Object.keys(value || {}).length; }
  function accountClaimedQuestCount() { var quests = accountJson(localStorage.getItem('neonQuests'), {}); return (quests.quests || []).filter(function (quest) { return quest.claimed; }).length; }
  function accountTier(item) { return GEAR_TIER[item?.tier] || 1; }
  function accountGearStats() {
    var stats = { power: 0, defense: 0, hp: 0 };
    Object.keys(equipped || {}).forEach(function (slot) {
      var item = equipped[slot]; if (!item) return;
      var tier = accountTier(item), slotBonus = ACCOUNT_GEAR_BONUS[slot] || {};
      if (slot === 'weapon') stats.power += 32 * tier + (item.tier === 'mythic' ? 22 : 0);
      stats.power += (slotBonus.power || 0) * tier;
      stats.defense += (slotBonus.defense || 0) * tier;
      stats.hp += (slotBonus.hp || 0) * tier;
      if (item.name === '보호복' || item.name === '군화' || item.name === '가죽 벨트' || item.name === '에메랄드 펜던트') stats.hp += 8 * tier;
      if (item.name === '방호 부츠' || item.name === '세련된 벨트' || item.name === '카라페이스' || item.name === '여행자 재킷') stats.defense += 5 * tier;
      if (item.name === '가죽 장갑' || item.name === '군용 벨트' || item.name === '뼈 목걸이') stats.power += 8 * tier;
    });
    return stats;
  }
  function accountCombatStats() {
    var data = typeof characterNow === 'function' ? characterNow() : { hp: 100, damage: 10, speed: 260 }, gear = accountGearStats();
    var hp = Math.round((data.hp || 100) + gear.hp), defense = Math.round(gear.defense), attack = (data.damage || 10) + gear.power;
    return { hp: hp, defense: defense, power: Math.round(hp * 5.2 + attack * 24 + defense * 21 + (data.speed || 250) * .12) };
  }
  function accountReward(level) {
    if (level === 100) return { type: 'cosmetic', name: '전설의 네온 엠블럼', detail: 'NEON LEGEND 전용 로비 효과' };
    if (PLAYER_LEVEL_CONFIG.choiceLevels.includes(level)) return { type: 'choice', name: '선택 보급', detail: '세 가지 보상 중 하나 선택' };
    if (level % 5 === 0) return { type: 'crate', name: '장비 보급 상자', detail: '무작위 장비 1개' };
    return { type: 'coins', amount: 30 + level * 8, name: '보급 코인', detail: (30 + level * 8) + ' 코인' };
  }
  function accountUnlockLevelData(state, level) {
    ACCOUNT_TITLES.filter(function (title) { return title.level <= level && !state.unlockedTitles.includes(title.name); }).forEach(function (title) { state.unlockedTitles.push(title.name); });
    ACCOUNT_FEATURES.filter(function (feature) { return feature.level <= level && !state.unlockedLevelFeatures.includes(feature.level); }).forEach(function (feature) { state.unlockedLevelFeatures.push(feature.level); });
  }
  function accountGrantAutomaticReward(state, level) {
    if (state.claimedLevelRewards.includes(level)) return '';
    state.claimedLevelRewards.push(level);
    var reward = accountReward(level);
    if (reward.type === 'coins') { wallet += reward.amount; localStorage.neonCoins = wallet; renderCoins(); return reward.name + ' +' + reward.amount; }
    if (reward.type === 'crate') { var item = rollItem(level % 10 === 5 ? armors : weapons); inventory.push(item); saveGear(); drawGear(); return reward.name + ' · ' + item.name; }
    if (reward.type === 'choice') { if (!state.pendingChoices.includes(level)) state.pendingChoices.push(level); return '선택 보급 대기'; }
    return reward.name;
  }
  function accountChoiceOptions(level) {
    return [
      { id: 'coins', icon: 'icon-coin', name: '보급 코인', detail: '+' + (360 + level * 14), grant: function () { wallet += 360 + level * 14; localStorage.neonCoins = wallet; renderCoins(); return '코인 지급'; } },
      { id: 'weapon', icon: 'icon-sword', name: '무기 보급', detail: '무작위 무기 1개', grant: function () { var item = rollItem(weapons); inventory.push(item); saveGear(); drawGear(); return item.name + ' 획득'; } },
      { id: 'operative', icon: 'icon-key', name: '요원 보급', detail: '요원 열쇠 1개', grant: function () { operativeCrateKeys++; saveOperatives(); renderOperativeKeyCount(); return '요원 열쇠 획득'; } }
    ];
  }
  function accountRenderWidget() {
    var state = accountState(), need = accountNeed(state.level), percent = need ? Math.min(100, state.xp / need * 100) : 100;
    var button = document.querySelector('#account-level-widget'); if (!button) return;
    button.dataset.emblem = accountEmblem(state.level);
    button.innerHTML = '<span class="account-emblem">LV</span><span><b>LV. ' + state.level + '</b><small>' + (need ? Math.floor(state.xp).toLocaleString() + ' / ' + need.toLocaleString() + ' XP' : 'MAX LEVEL') + '</small><i><em style="width:' + percent + '%"></em></i></span>';
  }
  function accountRenderEquipment() {
    var target = document.querySelector('#equipment-combat-summary'); if (!target) return;
    var stats = accountCombatStats();
    target.innerHTML = '<small>현재 장비 종합</small><div><span><i class="game-icon icon-engine"></i><b>전투력</b><em>' + stats.power.toLocaleString() + '</em></span><span><i class="game-icon icon-shield"></i><b>방어력</b><em>' + stats.defense + '</em></span><span><i class="game-icon icon-heart"></i><b>체력</b><em>' + stats.hp + '</em></span></div>';
  }
  function accountRenderModal() {
    var state = accountState(), need = accountNeed(state.level), percent = need ? Math.min(100, state.xp / need * 100) : 100;
    var title = state.selectedTitle, track = document.querySelector('#account-level-track'), titleSelect = document.querySelector('#account-title-select');
    document.querySelector('#account-level-number').textContent = 'LV. ' + state.level;
    document.querySelector('#account-level-title').textContent = title;
    document.querySelector('#account-profile-emblem').dataset.emblem = accountEmblem(state.level);
    document.querySelector('#account-level-value').textContent = need ? Math.floor(state.xp).toLocaleString() + ' / ' + need.toLocaleString() + ' XP' : 'MAX LEVEL · 베테랑 XP 확장 예정';
    document.querySelector('#account-level-bar').style.width = percent + '%';
    titleSelect.innerHTML = state.unlockedTitles.map(function (name) { return '<option value="' + name + '"' + (name === title ? ' selected' : '') + '>' + name + '</option>'; }).join('');
    var nextLevel = Math.min(PLAYER_LEVEL_CONFIG.maxLevel, state.level + (state.level >= PLAYER_LEVEL_CONFIG.maxLevel ? 0 : 1)), next = accountReward(nextLevel), nextMilestone = ACCOUNT_FEATURES.find(function (feature) { return feature.level > state.level; });
    document.querySelector('#account-next-reward').innerHTML = '<small>NEXT REWARD · LV.' + nextLevel + '</small><b>' + next.name + '</b><span>' + next.detail + '</span>' + (nextMilestone ? '<em>다음 특전 LV.' + nextMilestone.level + ' · ' + nextMilestone.name + '</em>' : '<em>모든 특전 달성</em>');
    track.innerHTML = Array.from({ length: PLAYER_LEVEL_CONFIG.maxLevel }, function (_, index) {
      var level = index + 1, reward = accountReward(level), current = level === state.level, done = level < state.level || state.claimedLevelRewards.includes(level), feature = ACCOUNT_FEATURES.find(function (item) { return item.level === level; }), titleAt = ACCOUNT_TITLES.find(function (item) { return item.level === level; });
      return '<article class="account-track-card ' + (current ? 'current ' : '') + (done ? 'done ' : '') + (level % 10 === 0 ? 'milestone ' : '') + '"><b>LV.' + level + '</b><span>' + (done ? '✓' : level > state.level ? '<i class="game-icon icon-lock" aria-label="잠김"></i>' : '●') + '</span><small>' + reward.name + '</small>' + (feature ? '<em>특전 · ' + feature.name + '</em>' : titleAt && level > 1 ? '<em>칭호 · ' + titleAt.name + '</em>' : '') + '</article>';
    }).join('');
  }
  function accountShowChoice() {
    var state = accountState(), level = state.pendingChoices[0], dialog = document.querySelector('#account-choice'); if (!level || !dialog) return;
    document.querySelector('#account-choice-level').textContent = 'LV. ' + level + ' 선택 보급';
    document.querySelector('#account-choice-options').innerHTML = accountChoiceOptions(level).map(function (option) { return '<button data-account-choice="' + option.id + '"><i><span class="simple-item-glyph"><i class="game-icon ' + option.icon + '"></i></span></i><b>' + option.name + '</b><small>' + option.detail + '</small></button>'; }).join('');
    dialog.classList.remove('hidden');
    dialog.querySelectorAll('[data-account-choice]').forEach(function (button) { button.onclick = function () {
      var fresh = accountState(), choiceLevel = fresh.pendingChoices.shift(), option = accountChoiceOptions(choiceLevel).find(function (entry) { return entry.id === button.dataset.accountChoice; });
      var message = option ? option.grant() : '보상 지급'; accountSave(fresh); dialog.classList.add('hidden'); accountRenderAll(); pop('LV.' + choiceLevel + ' 선택 보급 · ' + message);
      setTimeout(accountShowChoice, 250);
    }; });
  }
  function accountShowLevelUp(from, to, rewards) {
    var overlay = document.querySelector('#account-level-up'); if (!overlay) return;
    var milestone = [10, 25, 50, 75, 100].some(function (level) { return level > from && level <= to; });
    document.querySelector('#account-level-up-title').textContent = milestone ? 'MILESTONE REACHED!' : 'LEVEL UP!';
    document.querySelector('#account-level-up-value').textContent = 'LV. ' + from + ' → LV. ' + to;
    document.querySelector('#account-level-up-reward').textContent = rewards.filter(Boolean).join(' · ') || '새 보상 획득';
    overlay.classList.remove('hidden');
    clearTimeout(accountShowLevelUp.timer); accountShowLevelUp.timer = setTimeout(function () { overlay.classList.add('hidden'); accountShowChoice(); }, milestone ? 1800 : 1200);
  }
  function accountGrantXp(amount, reason) {
    amount = Math.max(0, Math.round(amount || 0)); if (!amount) return { amount: 0, from: accountState().level, to: accountState().level, rewards: [] };
    var state = accountState(), from = state.level, rewards = [];
    state.totalXp += amount; state.xp += amount;
    while (state.level < PLAYER_LEVEL_CONFIG.maxLevel && state.xp >= accountNeed(state.level)) {
      state.xp -= accountNeed(state.level); state.level++; accountUnlockLevelData(state, state.level); rewards.push(accountGrantAutomaticReward(state, state.level));
    }
    if (state.level >= PLAYER_LEVEL_CONFIG.maxLevel) state.xp = Math.max(0, state.xp);
    state.nextXp = accountNeed(state.level);
    accountSave(state); accountRenderAll(); if (state.level > from) accountShowLevelUp(from, state.level, rewards);
    return { amount: amount, reason: reason, from: from, to: state.level, rewards: rewards };
  }
  function accountBuildRunXp(win, firstClear) {
    var items = [];
    if (accountRun.elite) items.push({ label: '엘리트 처치 ×' + accountRun.elite, amount: accountRun.elite * 8 });
    if (accountRun.boss) items.push({ label: '보스 처치 ×' + accountRun.boss, amount: accountRun.boss * 35 });
    if (win) items.push({ label: '스테이지 클리어', amount: 110 + selected * 9 });
    if (firstClear) items.push({ label: '새 지역 최초 클리어', amount: 100 });
    if (activeMode === 'bossrush') items.push({ label: '보스 러시 도전', amount: 65 });
    if (activeMode === 'endless' && time >= 90) items.push({ label: '무한 모드 장기 생존', amount: Math.min(120, Math.floor(time / 45) * 25) });
    if (selected >= 10 && win) items.push({ label: '고난도 지역 정복', amount: 55 + Math.floor(selected / 10) * 20 });
    var fusionNow = accountCount('neonFusionCodex') - accountRun.snapshots.fusions, codexNow = accountCount('neonCodexDiscoveries') - accountRun.snapshots.codex, questsNow = accountClaimedQuestCount() - accountRun.snapshots.quests, achievementNow = accountCount('neonAchievements') - accountRun.snapshots.achievements, riftNow = accountCount('neonRiftArchives') - accountRun.snapshots.rifts;
    if (fusionNow > 0) items.push({ label: '새 스킬 융합 발견 ×' + fusionNow, amount: fusionNow * 35 });
    if (codexNow > 0) items.push({ label: '새 도감 발견 ×' + codexNow, amount: codexNow * 20 });
    if (questsNow > 0) items.push({ label: '퀘스트 완료 ×' + questsNow, amount: questsNow * 30 });
    if (achievementNow > 0) items.push({ label: '업적 달성 ×' + achievementNow, amount: achievementNow * 70 });
    if (riftNow > 0) items.push({ label: '특별 신호 작전 완료 ×' + riftNow, amount: riftNow * 80 });
    return items;
  }
  function accountRenderResult(items, grant) {
    var result = document.querySelector('#account-xp-result'); if (!result) return;
    result.innerHTML = '<b>계정 XP 획득 <em>+' + grant.amount + ' XP</em></b><div>' + (items.length ? items.map(function (item) { return '<span>' + item.label + '<i>+' + item.amount + ' XP</i></span>'; }).join('') : '<span>이번 전투에서 계정 XP 조건을 달성하지 못했습니다.</span>') + '</div><small>LV. ' + grant.from + (grant.to > grant.from ? ' → LV. ' + grant.to : '') + '</small>';
  }
  function accountRenderAll() { accountRenderWidget(); accountRenderEquipment(); accountRenderPerks(); if (!document.querySelector('#player-level')?.classList.contains('hidden')) accountRenderModal(); }
  function accountBuildUi() {
    var menu = document.querySelector('#menu'), shell = document.querySelector('#game-shell'), equipment = document.querySelector('#equipment');
    if (!menu || !shell || document.querySelector('#account-level-widget')) return;
    menu.insertAdjacentHTML('beforeend', '<button id="account-level-widget" class="account-level-widget" aria-label="플레이어 레벨"></button>');
    equipment.querySelector('.equipment-actions').insertAdjacentHTML('afterbegin', '<button id="equipment-combat-summary" class="equipment-combat-summary" aria-label="총 전투력, 방어력, 체력"></button>');
    shell.insertAdjacentHTML('beforeend', '<section id="player-level" class="screen hidden modal-screen player-level-screen"><button id="player-level-close" class="close">×</button><p class="label">SURVIVOR PROFILE</p><div class="account-profile-head"><span id="account-profile-emblem">LV</span><div><h2 id="account-level-number">LV. 1</h2><b id="account-level-title">신입 생존자</b><select id="account-title-select" aria-label="장착 칭호"></select></div></div><section class="account-xp-panel"><div><b>ACCOUNT XP</b><span id="account-level-value">0 / 82 XP</span></div><i><em id="account-level-bar"></em></i></section><section id="account-next-reward" class="account-next-reward"></section><h3 class="account-track-title">레벨 보상 트랙 <small>스크롤하여 전체 보상 확인</small></h3><div id="account-level-track" class="account-level-track"></div><section class="account-perks"><b>획득 특전</b><div id="account-perk-list"></div></section></section><section id="account-level-up" class="account-level-up hidden"><div><p id="account-level-up-title">LEVEL UP!</p><b id="account-level-up-value">LV. 1 → LV. 2</b><small id="account-level-up-reward"></small></div></section><section id="account-choice" class="account-choice screen hidden"><div><p class="label">MILESTONE SUPPLY</p><h2 id="account-choice-level">LV. 10 선택 보급</h2><p>하나를 선택하면 나머지 보상은 받을 수 없습니다.</p><div id="account-choice-options"></div></div></section>');
    document.querySelector('#result').insertAdjacentHTML('beforeend', '<div id="account-xp-result" class="account-xp-result"></div>');
    document.querySelector('#account-level-widget').onclick = function () { document.querySelector('#player-level').classList.remove('hidden'); accountRenderModal(); };
    document.querySelector('#equipment-combat-summary').onclick = function () { document.querySelector('#equipment').classList.add('hidden'); document.querySelector('#player-level').classList.remove('hidden'); accountRenderModal(); };
    document.querySelector('#player-level-close').onclick = function () { document.querySelector('#player-level').classList.add('hidden'); };
    document.querySelector('#account-title-select').onchange = function (event) { var state = accountState(); state.selectedTitle = event.target.value; accountSave(state); accountRenderAll(); };
  }
  function accountRenderPerks() {
    var state = accountState(), target = document.querySelector('#account-perk-list'); if (!target) return;
    target.innerHTML = ACCOUNT_FEATURES.map(function (feature) { var unlocked = state.unlockedLevelFeatures.includes(feature.level); return '<span class="' + (unlocked ? 'unlocked' : '') + '"><b>LV.' + feature.level + ' ' + feature.name + '</b><small>' + feature.detail + '</small></span>'; }).join('');
  }
  function accountInstall() {
    if (accountInstall.done) return; accountInstall.done = true;
    accountSave(accountState());
    var originalBegin = begin, originalEnd = end, originalKill = killEnemy, originalDrawGear = drawGear;
    drawGear = function () { var result = originalDrawGear.apply(this, arguments); accountRenderEquipment(); return result; };
    begin = function () {
      var result = originalBegin.apply(this, arguments);
      accountRun = { elite: 0, boss: 0, started: true, snapshots: { fusions: accountCount('neonFusionCodex'), codex: accountCount('neonCodexDiscoveries'), quests: accountClaimedQuestCount(), achievements: accountCount('neonAchievements'), rifts: accountCount('neonRiftArchives') } };
      return result;
    };
    killEnemy = function (enemy) { var valid = !!enemy && enemies.includes(enemy), bossEnemy = valid && !!enemy.boss, eliteEnemy = valid && !!enemy.elite; var result = originalKill.apply(this, arguments); if (valid && accountRun.started) { if (bossEnemy) accountRun.boss++; else if (eliteEnemy) accountRun.elite++; } return result; };
    end = function (win) {
      var firstClear = !!win && activeMode === 'conquest' && selected === unlocked, result = originalEnd.apply(this, arguments), items = accountBuildRunXp(!!win, firstClear), total = items.reduce(function (sum, item) { return sum + item.amount; }, 0), grant = accountGrantXp(total, '전투 결과');
      accountRenderResult(items, grant); accountRun.started = false; return result;
    };
    accountRenderAll(); accountRenderPerks();
  }
  accountBuildUi();
  setTimeout(accountInstall, 0);
})();
