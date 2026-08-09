/* 네온 생존자 기지 로비 확장: 기존 메뉴와 저장 구조를 보존하는 독립 UI 레이어 */
(function () {
  var LOBBY_VERSION = '1.3.0';
  var CODEX_KEY = 'neonCodexDiscoveries';
  var CODEX_NEW_KEY = 'neonCodexUnread';
  var RECORD_KEY = 'neonRecords';
  var ACHIEVEMENT_KEY = 'neonAchievements';
  var ATTENDANCE_KEY = 'neonAttendance';
  var lobby = { frame: performance.now(), noticeIndex: 0, noticeAt: 0, runDamage: 0, initialized: false, openedCharacters: false };

  var CODEX = {
    characters: { label: '캐릭터', entries: function () { return Object.entries(CHARACTER_DATA).map(function (entry) { return { id: entry[0], name: entry[1].name, detail: entry[1].role, known: entry[0] === 'recruit' || !!operativeRoster[entry[0]] }; }); } },
    weapons: { label: '무기', entries: function () { return weapons.map(function (weapon) { return { id: weapon.name, name: weapon.name, detail: weapon.desc, known: (inventory || []).some(function (item) { return item.name === weapon.name; }) }; }); } },
    skills: { label: '스킬', entries: function () { return [{ id: 'lightning', name: '뇌광 비콘', detail: '자동 낙뢰 전술' }, { id: 'molotov', name: '잔화 병', detail: '화염 지대 전술' }, { id: 'ball', name: '반동 구체', detail: '반사 구체 전술' }, { id: 'boom', name: '귀환 절단환', detail: '귀환 절단 전술' }, { id: 'rpg', name: '혜성 발사기', detail: '유도 폭발 전술' }, { id: 'guardian', name: '이지스 위성', detail: '회전 방패 전술' }, { id: 'laser', name: '프리즘 광선기', detail: '지속 광선 전술' }, { id: 'drill', name: '관통 송곳', detail: '반사 관통 전술' }, { id: 'mine', name: '분열 기뢰', detail: '설치 폭발 전술' }, { id: 'medic', name: '생체 지원 드론', detail: '회복 지원 전술' }].map(function (entry) { entry.known = lobbyHas('skills', entry.id); return entry; }); } },
    fusions: { label: '스킬 융합', entries: function () { var known = lobbyJson('neonFusionCodex', {}); return [{ id: 'storm-scout', name: '폭뢰 정찰기', detail: '드론 연쇄 낙뢰' }, { id: 'inferno-missile', name: '태양재 미사일', detail: '화염 지대 유도탄' }, { id: 'blade-vortex', name: '궤도 절단 폭풍', detail: '흡인 회전 칼날' }, { id: 'cinder-sprayer', name: '잿불 살포기', detail: '드론 화염 지대' }, { id: 'judgment-array', name: '심판의 광선', detail: '비밀 3중 융합' }].map(function (entry) { entry.known = !!known[entry.id]; return entry; }); } },
    normal: { label: '일반 몬스터', entries: function () { return lobbyEnemyEntries(['돌격형', '원거리형', '탱커형', '돌진형', '자폭형', '지원형', '소환형'], 'normal'); } },
    elite: { label: '엘리트 몬스터', entries: function () { return lobbyEnemyEntries(['강화 드론', '마그마 골렘', 'EMP 드론', '황금 미라', '프로스트 가디언'], 'elite'); } },
    bosses: { label: '보스', entries: function () { var bosses = lobbyJson('neonBossCodex', {}); return maps.map(function (map, index) { var names = ['MK-1 훈련 로봇', '라바 타이탄', '네온 코어', '샌드 웜', '프로스트 타이탄', '베놈 킹', '레드 드래곤', '오비탈 코어', '크라켄', '메가 디바우러', '오버로드 제조기', '헬 로드', '제로 코어', '크리스탈 퀸', '문 가디언', '고스트 캡틴', '블러드 킹', '썬더 엔진', '디멘션 워커', '창조자 오메가']; var name = names[index] || map.name.replace(/^\d+\.\s*/, '') + ' 수호자'; return { id: String(index), name: name, detail: map.name, known: Object.keys(bosses).some(function (key) { return key.indexOf(index + '-') === 0; }) || lobbyHas('bosses', String(index)) }; }); } },
    maps: { label: '맵', entries: function () { return maps.map(function (map, index) { return { id: String(index), name: map.name, detail: index <= unlocked ? '정복 경로 확인' : '아직 도달하지 못한 지역', known: index <= unlocked }; }); } },
    events: { label: '희귀 이벤트', entries: function () { return [{ id: 'contract', name: '위험한 계약', detail: '전투력과 생존력을 교환' }, { id: 'merchant', name: '수상한 상인', detail: '대가를 지불하는 전술 거래' }, { id: 'cache', name: '봉인된 보급함', detail: '선택에 따라 결과가 변하는 보급품' }, { id: 'red-moon', name: '붉은 달', detail: '강화된 적과 특수 보스' }, { id: 'gold-storm', name: '황금 폭풍', detail: '황금 개체가 몰려오는 현상' }].map(function (entry) { entry.known = lobbyHas('events', entry.id); return entry; }); } }
  };

  var BULLETINS = [
    { tag: '긴급 작전', title: '기계 군단 출현!', detail: '훈련 구역 외곽에서 미확인 드론 신호가 감지되었습니다.', color: 'cyan' },
    { tag: '오늘의 위험 지역', title: '용암 연구소', detail: '열원 반응 증가 · 방열 장비 점검 권장', color: 'orange' },
    { tag: 'NEON NEWS', title: 'NEON CITY 7구역 통신 두절', detail: '생존자들에게 새로운 보급품이 전달되었습니다.', color: 'pink' },
    { tag: '감시국 경보', title: '알 수 없는 에너지 반응 감지', detail: '야간 몬스터 활동이 증가하고 있습니다.', color: 'violet' }
  ];

  var ATTENDANCE_REWARDS = [
    { name: '보급 코인', detail: '🪙 100', grant: function () { return lobbyCoins(100, '코인 100개'); } },
    { name: '장비 보급', detail: '🪙 150', grant: function () { return lobbyCoins(150, '코인 150개'); } },
    { name: '전술 지원', detail: '🪙 220', grant: function () { return lobbyCoins(220, '코인 220개'); } },
    { name: '무기 상자', detail: '무작위 무기 1개', grant: function () { var item = rollItem(weapons); inventory.push(item); saveGear(); drawGear(); return item.name + ' 획득'; } },
    { name: '장비 상자', detail: '무작위 장비 1개', grant: function () { var item = rollItem(armors); inventory.push(item); saveGear(); drawGear(); return item.name + ' 획득'; } },
    { name: '요원 열쇠', detail: '🔑 1개', grant: function () { operativeCrateKeys++; saveOperatives(); renderOperativeKeyCount(); return '요원 열쇠 1개 획득'; } },
    { name: '특별 보급', detail: '🪙 500 + 🔑 1', grant: function () { wallet += 500; localStorage.neonCoins = wallet; renderCoins(); operativeCrateKeys++; saveOperatives(); renderOperativeKeyCount(); return '코인 500개와 요원 열쇠 1개 획득'; } }
  ];

  function lobbyJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }
  function lobbySave(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function lobbyToday() { return new Date().toISOString().slice(0, 10); }
  function lobbyCodex() { return lobbyJson(CODEX_KEY, {}); }
  function lobbyHas(category, id) { return !!lobbyCodex()[category + ':' + id]; }
  function lobbyDiscover(category, id) {
    var codex = lobbyCodex(), key = category + ':' + id;
    if (codex[key]) return false;
    codex[key] = Date.now(); lobbySave(CODEX_KEY, codex);
    var unread = lobbyJson(CODEX_NEW_KEY, []); if (!unread.includes(key)) { unread.push(key); lobbySave(CODEX_NEW_KEY, unread); }
    lobbyRefreshBadges(); return true;
  }
  function lobbyEnemyEntries(names, category) { return names.map(function (name) { return { id: name, name: name, detail: category === 'elite' ? '특수 패턴 보유' : '전장 위협 개체', known: lobbyHas(category, name) }; }); }
  function lobbyRecords() {
    var defaults = { runs: 0, totalKills: 0, totalBosses: 0, bestKills: 0, bestSurvival: 0, bestHit: 0, maxDifficulty: 1, characterUses: {}, weaponUses: {}, lastRun: null, lowHpBoss: false };
    return Object.assign(defaults, lobbyJson(RECORD_KEY, {}));
  }
  function lobbySaveRecords(records) { lobbySave(RECORD_KEY, records); }
  function lobbyPower() { var data = characterNow ? characterNow() : CHARACTER_DATA.recruit, rank = typeof operativeRank === 'function' ? operativeRank(selectedCharacter) : 0, weapon = equipped && equipped.weapon, tiers = { common: 1, rare: 1.35, hero: 1.8, legend: 2.35, mythic: 3.1 }; return Math.floor((data.hp * 42 + data.damage * 290 + data.speed * 5) * (1 + rank * .12) * (tiers[weapon?.tier] || 1)); }
  function lobbyCoins(amount, text) { wallet += amount; localStorage.neonCoins = wallet; renderCoins(); return text; }
  function lobbyWeaponClass(name) { return ({ '유성 단도': 'weapon-dagger', '충격 철퇴': 'weapon-mace', '노바 리볼버': 'weapon-revolver', '청광 도검': 'weapon-blade', '폭풍 산탄총': 'weapon-scatter', '태양 파쇄검': 'weapon-solar', '공허 흡수기': 'weapon-void', '균열 장검': 'weapon-rift', '여명·황혼 쌍창': 'weapon-lances' })[name] || 'weapon-dagger'; }

  function lobbyBuildUi() {
    var menu = document.querySelector('#menu'), shell = document.querySelector('#game-shell');
    if (!menu || !shell || document.querySelector('#lobby-stage')) return;
    menu.insertAdjacentHTML('beforeend', '<div id="lobby-atmosphere" aria-hidden="true"><i class="city city-a"></i><i class="city city-b"></i><i class="pipe pipe-a"></i><i class="pipe pipe-b"></i><i class="holo-sign">N-07</i><i class="holo-sign holo-two">SAFE</i><div class="lobby-particles"></div><div class="lobby-floor"></div></div><section id="lobby-stage" class="lobby-stage"><button id="lobby-character-card" class="lobby-character-card" aria-label="요원 관리 열기"><canvas id="lobby-character-canvas" width="420" height="420"></canvas><div class="lobby-platform"><i></i><i></i></div><div class="lobby-agent-info"><b id="lobby-agent-name">훈련 요원</b><small id="lobby-agent-meta">Lv. 1 · 전투력 0</small><span id="lobby-agent-weapon"></span></div></button></section><section id="lobby-news" class="lobby-news"><small id="lobby-news-tag">NEON NEWS</small><b id="lobby-news-title">통신 대기 중</b><span id="lobby-news-detail">기지 전광판을 초기화합니다.</span><i></i></section><section id="lobby-record-card" class="lobby-record-card"><small>최근 전투</small><b id="lobby-record-title">전투 기록 없음</b><div id="lobby-record-values"></div></section><nav id="lobby-tools" class="lobby-tools"><button id="codex-button">◈<small>도감</small><em></em></button><button id="archives-button">▤<small>기록실</small><em></em></button><button id="attendance-button">◷<small>출석</small><em></em></button></nav>');
    shell.insertAdjacentHTML('beforeend', '<section id="codex" class="screen hidden modal-screen lobby-modal"><button class="close lobby-close" data-lobby-close="codex">×</button><p class="label">NEON ARCHIVE</p><h2>도감</h2><p>처음 발견한 모든 신호를 기록합니다.</p><div id="codex-tabs" class="codex-tabs"></div><div id="codex-list" class="codex-list"></div></section><section id="archives" class="screen hidden modal-screen lobby-modal"><button class="close lobby-close" data-lobby-close="archives">×</button><p class="label">LONG-TERM RECORD</p><h2>업적 / 기록실</h2><p>생존자의 모든 전투 이력을 전시합니다.</p><div id="record-grid" class="record-grid"></div><h3 class="achievement-heading">획득 업적</h3><div id="achievement-list" class="achievement-list"></div></section><section id="attendance" class="screen hidden modal-screen lobby-modal"><button class="close lobby-close" data-lobby-close="attendance">×</button><p class="label">DAILY SUPPLY</p><h2>출석 보급</h2><p id="attendance-status">하루 한 번, 기지 보급품을 받으세요.</p><div id="attendance-list" class="attendance-list"></div><button id="attendance-claim" class="attendance-claim">오늘의 보급 받기</button></section>');
    var particles = document.querySelector('.lobby-particles');
    if (particles) particles.innerHTML = Array.from({ length: 34 }, function (_, index) { return '<i style="--x:' + ((index * 37) % 100) + '%;--y:' + ((index * 53) % 84) + '%;--d:' + (7 + index % 9) + 's;--delay:-' + (index % 8) + 's"></i>'; }).join('');
    document.querySelector('#lobby-character-card').onclick = function () { lobby.openedCharacters = true; document.querySelector('#characters').classList.remove('hidden'); renderCharacterList(); };
    document.querySelector('#codex-button').onclick = function () { lobbyOpen('codex'); };
    document.querySelector('#archives-button').onclick = function () { lobbyOpen('archives'); };
    document.querySelector('#attendance-button').onclick = function () { lobbyOpen('attendance'); };
    document.querySelectorAll('[data-lobby-close]').forEach(function (button) { button.onclick = function () { document.querySelector('#' + button.dataset.lobbyClose).classList.add('hidden'); }; });
    var characterClose = document.querySelector('[data-close="characters"]');
    if (characterClose) characterClose.addEventListener('click', function () { if (!lobby.openedCharacters) return; lobby.openedCharacters = false; document.querySelector('#equipment').classList.add('hidden'); menu.classList.remove('hidden'); menu.classList.add('home'); lobbyRenderAll(); });
    document.querySelector('#menu-button')?.addEventListener('click', function () { lobbyRenderAll(); });
    document.querySelector('#attendance-claim').onclick = lobbyClaimAttendance;
    var eventTitle = document.querySelector('#variety-event-title');
    if (eventTitle) new MutationObserver(function () { var ids = { '위험한 계약': 'contract', '수상한 상인': 'merchant', '봉인된 보급함': 'cache' }; if (ids[eventTitle.textContent]) lobbyDiscover('events', ids[eventTitle.textContent]); }).observe(eventTitle, { childList: true, subtree: true, characterData: true });
    lobby.initialized = true;
    lobbyRenderAll();
  }

  function lobbyOpen(id) { document.querySelector('#' + id).classList.remove('hidden'); if (id === 'codex') lobbyRenderCodex(); if (id === 'archives') lobbyRenderArchives(); if (id === 'attendance') lobbyRenderAttendance(); }
  function lobbyRenderAgent() {
    if (!lobby.initialized) return;
    if (typeof refreshAgentTexture === 'function') refreshAgentTexture();
    var data = characterNow(), rank = typeof operativeRank === 'function' ? operativeRank(selectedCharacter) : 0, weapon = equipped && equipped.weapon;
    document.querySelector('#lobby-agent-name').textContent = data.name;
    document.querySelector('#lobby-agent-meta').textContent = 'Lv. ' + (1 + unlocked * 2 + rank * 3) + ' · 전투력 ' + lobbyPower().toLocaleString();
    var weaponNode = document.querySelector('#lobby-agent-weapon'); weaponNode.innerHTML = weapon ? '<i class="weapon-thumb ' + lobbyWeaponClass(weapon.name) + '"></i><small>' + weapon.name + '</small>' : '<small>기본 무기 장착 필요</small>';
  }
  function lobbyRenderNews() { var bulletin = BULLETINS[lobby.noticeIndex % BULLETINS.length]; document.querySelector('#lobby-news').dataset.color = bulletin.color; document.querySelector('#lobby-news-tag').textContent = bulletin.tag; document.querySelector('#lobby-news-title').textContent = bulletin.title; document.querySelector('#lobby-news-detail').textContent = bulletin.detail; }
  function lobbyRenderRecordCard() { var record = lobbyRecords(), node = document.querySelector('#lobby-record-values'), title = document.querySelector('#lobby-record-title'); if (!node || !title) return; if (!record.lastRun) { title.textContent = '전투 기록 없음'; node.innerHTML = '<span>첫 출격을 준비하세요.</span>'; return; } var last = record.lastRun; title.textContent = last.character + ' · 최근 전투'; node.innerHTML = '<span>처치 <b>' + last.kills.toLocaleString() + '</b></span><span>보스 <b>' + last.bosses + '</b></span><span>생존 <b>' + lobbyFormatTime(last.time) + '</b></span>'; }
  function lobbyRenderCodex() {
    var tabs = document.querySelector('#codex-tabs'), list = document.querySelector('#codex-list'); if (!tabs || !list) return;
    var active = tabs.dataset.active || 'characters'; tabs.dataset.active = active;
    tabs.innerHTML = Object.keys(CODEX).map(function (key) { return '<button class="' + (key === active ? 'selected' : '') + '" data-codex-tab="' + key + '">' + CODEX[key].label + '</button>'; }).join('');
    function renderList() { var category = tabs.dataset.active, entries = CODEX[category].entries(); list.innerHTML = entries.map(function (entry) { return '<article class="codex-entry ' + (entry.known ? 'known' : 'unknown') + '"><i>' + (entry.known ? lobbyCodexIcon(category, entry) : '◒') + '</i><b>' + (entry.known ? entry.name : '???') + '</b><small>' + (entry.known ? entry.detail : '아직 발견하지 못했습니다.') + '</small></article>'; }).join(''); }
    tabs.querySelectorAll('[data-codex-tab]').forEach(function (button) { button.onclick = function () { tabs.dataset.active = button.dataset.codexTab; lobbyRenderCodex(); }; }); renderList();
    lobbySave(CODEX_NEW_KEY, []); lobbyRefreshBadges();
  }
  function lobbyCodexIcon(category, entry) { var icons = { characters: '◉', weapons: '⚔', skills: '✦', fusions: '✧', normal: '◆', elite: '⬢', bosses: '☠', maps: '⌖', events: '⚡' }; return icons[category] || '◈'; }
  function lobbyAchievements(record) {
    var weaponCount = weapons.filter(function (weapon) { return (inventory || []).some(function (item) { return item.name === weapon.name; }); }).length;
    var fusion = lobbyJson('neonFusionCodex', {});
    return [
      { id: 'kill-1k', name: '첫 번째 천 단위', detail: '몬스터 1,000마리 처치', done: record.totalKills >= 1000, reward: '칭호 · 신입 생존자' },
      { id: 'kill-10k', name: '도시의 수호자', detail: '몬스터 10,000마리 처치', done: record.totalKills >= 10000, reward: '네온 플랫폼 효과' },
      { id: 'kill-100k', name: '끝없는 밤', detail: '몬스터 100,000마리 처치', done: record.totalKills >= 100000, reward: '프로필 테두리' },
      { id: 'boss-10', name: '거신 사냥꾼', detail: '보스 10마리 처치', done: record.totalBosses >= 10, reward: '보스 아이콘' },
      { id: 'weapon-all', name: '무기고 완성', detail: '모든 일반 무기 발견', done: weaponCount >= weapons.length, reward: '무기 연구실 장식' },
      { id: 'secret-fusion', name: '비밀의 해독자', detail: '비밀 융합 최초 발견', done: !!fusion['judgment-array'], reward: '보랏빛 네온 후광' },
      { id: 'low-boss', name: '절체절명의 승부', detail: '체력 10% 이하에서 보스 처치', done: !!record.lowHpBoss, reward: '경고등 플랫폼 효과' },
      { id: 'hard-map', name: '심연 개척자', detail: '10번째 지역 이상 도달', done: record.maxDifficulty >= 10, reward: '기지 전광판 외형' }
    ];
  }
  function lobbyRenderArchives() {
    var record = lobbyRecords(), grid = document.querySelector('#record-grid'), achievements = lobbyAchievements(record), mostCharacter = lobbyMost(record.characterUses, '기록 없음'), mostWeapon = lobbyMost(record.weaponUses, '기록 없음');
    grid.innerHTML = [['총 플레이', record.runs + '회'], ['총 몬스터 처치', record.totalKills.toLocaleString()], ['총 보스 처치', record.totalBosses.toLocaleString()], ['최고 한 판 처치', record.bestKills.toLocaleString()], ['최고 생존 시간', lobbyFormatTime(record.bestSurvival)], ['최고 피해량', record.bestHit.toLocaleString()], ['가장 많이 사용한 캐릭터', mostCharacter], ['가장 많이 사용한 무기', mostWeapon], ['발견한 융합', Object.keys(lobbyJson('neonFusionCodex', {})).length + '개'], ['발견한 도감', Object.keys(lobbyCodex()).length + '개'], ['최고 난이도', '지역 ' + record.maxDifficulty]].map(function (entry) { return '<article><small>' + entry[0] + '</small><b>' + entry[1] + '</b></article>'; }).join('');
    document.querySelector('#achievement-list').innerHTML = achievements.map(function (achievement) { return '<article class="' + (achievement.done ? 'done' : '') + '"><i>' + (achievement.done ? '★' : '◌') + '</i><b>' + achievement.name + '</b><small>' + achievement.detail + '</small><em>' + (achievement.done ? achievement.reward : '미달성') + '</em></article>'; }).join('');
    var stored = lobbyJson(ACHIEVEMENT_KEY, {}); achievements.forEach(function (achievement) { if (achievement.done && !stored[achievement.id]) stored[achievement.id] = Date.now(); }); lobbySave(ACHIEVEMENT_KEY, stored);
  }
  function lobbyMost(values, fallback) { var entries = Object.entries(values || {}).sort(function (a, b) { return b[1] - a[1]; }); return entries[0] ? entries[0][0] + ' · ' + entries[0][1] + '회' : fallback; }
  function lobbyAttendance() { return Object.assign({ day: 0, lastClaim: '' }, lobbyJson(ATTENDANCE_KEY, {})); }
  function lobbyCanClaim() { return lobbyAttendance().lastClaim !== lobbyToday(); }
  function lobbyRenderAttendance() { var state = lobbyAttendance(), can = lobbyCanClaim(), list = document.querySelector('#attendance-list'); document.querySelector('#attendance-status').textContent = can ? '오늘의 보급품을 받을 수 있습니다.' : '오늘 보급을 수령했습니다. 내일 다시 확인하세요.'; list.innerHTML = ATTENDANCE_REWARDS.map(function (reward, index) { var current = index === state.day % 7 && can, past = !can ? index < (state.day % 7 || 7) : index < state.day % 7; return '<article class="' + (current ? 'current' : '') + ' ' + (past ? 'claimed' : '') + '"><b>' + (index + 1) + '일차</b><span>' + reward.name + '</span><small>' + reward.detail + '</small></article>'; }).join(''); var claim = document.querySelector('#attendance-claim'); claim.disabled = !can; claim.textContent = can ? (state.day % 7 + 1) + '일차 보급 받기' : '오늘 수령 완료'; }
  function lobbyClaimAttendance() { if (!lobbyCanClaim()) return; var state = lobbyAttendance(), reward = ATTENDANCE_REWARDS[state.day % 7], text = reward.grant(); state.day = (state.day + 1) % 7; state.lastClaim = lobbyToday(); lobbySave(ATTENDANCE_KEY, state); lobbyRenderAttendance(); lobbyRefreshBadges(); pop('출석 보급: ' + text); }
  function lobbyRefreshBadges() { var unread = lobbyJson(CODEX_NEW_KEY, []), attendance = lobbyCanClaim(); var codexBadge = document.querySelector('#codex-button em'), attendanceBadge = document.querySelector('#attendance-button em'); if (codexBadge) codexBadge.classList.toggle('active', unread.length > 0); if (attendanceBadge) attendanceBadge.classList.toggle('active', attendance); }
  function lobbyFormatTime(value) { value = Math.floor(value || 0); return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0'); }
  function lobbyRenderAll() { lobbyRenderAgent(); lobbyRenderNews(); lobbyRenderRecordCard(); lobbyRefreshBadges(); }

  function lobbyAnimate(now) {
    var dt = Math.min(.05, (now - lobby.frame) / 1000); lobby.frame = now;
    if (lobby.initialized) {
      var canvas = document.querySelector('#lobby-character-canvas'), ctx = canvas && canvas.getContext('2d');
      if (ctx && document.querySelector('#menu').classList.contains('home') && !run) {
        var phase = now / 1000, sprite = agentSprite || warriorSprite, bob = Math.sin(phase * 1.35) * 5, look = Math.sin(phase * .45) * .025;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save(); ctx.translate(210, 220 + bob); ctx.rotate(look); ctx.shadowBlur = 28; ctx.shadowColor = characterNow().color; ctx.globalAlpha = .24; ctx.beginPath(); ctx.ellipse(0, 115, 80, 14, 0, 0, Math.PI * 2); ctx.fillStyle = characterNow().color; ctx.fill(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        if (sprite) ctx.drawImage(sprite, 190, 170, 760, 840, -126, -142, 252, 279);
        else { ctx.fillStyle = characterNow().color; ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = characterNow().accent; ctx.fillRect(-42, -14, 84, 24); }
        ctx.restore();
        var fusions = lobbyJson('neonFusionCodex', {}); if (fusions['storm-scout'] || fusions['cinder-sprayer']) { var a = phase * .65; for (var i = 0; i < 2; i++) { var angle = a + i * Math.PI; ctx.save(); ctx.translate(210 + Math.cos(angle) * 126, 203 + Math.sin(angle) * 38); ctx.fillStyle = i ? '#ff83c2' : '#67eaff'; ctx.shadowBlur = 14; ctx.shadowColor = ctx.fillStyle; ctx.fillRect(-10, -6, 20, 12); ctx.fillStyle = '#f7ffff'; ctx.fillRect(3, -3, 4, 4); ctx.restore(); } }
      }
      if (now >= lobby.noticeAt) { lobby.noticeAt = now + 6500; lobby.noticeIndex = (lobby.noticeIndex + 1) % BULLETINS.length; lobbyRenderNews(); }
    }
    requestAnimationFrame(lobbyAnimate);
  }

  function lobbyInstallTracking() {
    if (lobbyInstallTracking.done) return; lobbyInstallTracking.done = true;
    var originalBegin = begin, originalEnd = end, originalKill = killEnemy, originalHurt = hurt, originalSpawn = spawnEnemy;
    begin = function () { var result = originalBegin.apply(this, arguments); var record = lobbyRecords(), data = characterNow(), weapon = equipped && equipped.weapon; record.runs++; record.characterUses[data.name] = (record.characterUses[data.name] || 0) + 1; if (weapon) record.weaponUses[weapon.name] = (record.weaponUses[weapon.name] || 0) + 1; record.maxDifficulty = Math.max(record.maxDifficulty, selected + 1); lobbySaveRecords(record); lobby.runDamage = 0; lobby.runBosses = 0; lobbyDiscover('characters', selectedCharacter); if (weapon) lobbyDiscover('weapons', weapon.name); return result; };
    end = function (win) { var snapshot = { time: time || 0, kills: kills || 0, bosses: lobby.runBosses || 0, character: characterNow().name, weapon: equipped?.weapon?.name || '미장착' }, record = lobbyRecords(), skillIds = { lightning: 'lightning', molotov: 'molotov', ball: 'ball', boom: 'boom', rpg: 'rpg', guardian: 'guardian', laser: 'laser', drill: 'drill', mine: 'mine', medic: 'medic' }; Object.keys(skillIds).forEach(function (key) { if (player && player[key]) lobbyDiscover('skills', skillIds[key]); }); record.totalKills += snapshot.kills; record.bestKills = Math.max(record.bestKills, snapshot.kills); record.bestSurvival = Math.max(record.bestSurvival, snapshot.time); record.maxDifficulty = Math.max(record.maxDifficulty, selected + 1); record.lastRun = snapshot; lobbySaveRecords(record); var result = originalEnd.apply(this, arguments); lobbyRenderAll(); return result; };
    killEnemy = function (enemy) { var valid = !!enemy && enemies.includes(enemy), bossEnemy = valid && !!enemy.boss, lowHp = bossEnemy && player && player.hp / player.maxHp <= .1, result = originalKill.apply(this, arguments); if (valid) { var record = lobbyRecords(); if (bossEnemy) { lobby.runBosses = (lobby.runBosses || 0) + 1; record.totalBosses++; if (lowHp) record.lowHpBoss = true; lobbyDiscover('bosses', String(selected)); } else { lobbyDiscover(enemy.elite ? 'elite' : 'normal', enemy.elite ? (enemy.name || '강화 드론') : ({ shooter: '원거리형', tank: '탱커형', dash: '돌진형', bomber: '자폭형', support: '지원형', summon: '소환형' }[enemy.role] || '돌격형')); } lobbySaveRecords(record); } return result; };
    hurt = function (enemy, damage) { var before = enemy?.hp, result = originalHurt.apply(this, arguments), actual = Math.max(0, (Number(before) || 0) - (Number(enemy?.hp) || 0)); if (actual) { lobby.runDamage += actual; var record = lobbyRecords(); record.bestHit = Math.max(record.bestHit, Math.round(actual)); lobbySaveRecords(record); } return result; };
    spawnEnemy = function (isBoss) { var result = originalSpawn.apply(this, arguments); var enemy = result || (!isBoss ? enemies[enemies.length - 1] : null); if (enemy && !isBoss) lobbyDiscover(enemy.elite ? 'elite' : 'normal', enemy.elite ? (enemy.name || '강화 드론') : '돌격형'); return result; };
  }

  lobbyBuildUi();
  setTimeout(lobbyInstallTracking, 0);
  requestAnimationFrame(lobbyAnimate);
})();
