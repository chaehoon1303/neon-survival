/* 전투 선택 화면 확장: 기존 맵 선택/플레이 함수와 저장 데이터를 유지한다. */
(function () {
  var STAGE_RECORD_KEY = 'neonStageRecords';
  var BATTLE_PALETTES = [
    ['#45ddff', '#f15aab'], ['#ff6a3e', '#ffc45a'], ['#5ef3ff', '#ff5ab8'], ['#ffd16a', '#ff7b53'], ['#9eefff', '#778dff'], ['#85de63', '#f1d85f']
  ];
  var WEAPON_HINTS = [
    { title: '광역·근접', detail: '좁은 길을 지키기 쉬운 범위 공격', icons: ['충격 철퇴', '청광 도검', '태양 파쇄검'] },
    { title: '원거리·관통', detail: '안전한 거리에서 적 무리 처리', icons: ['노바 리볼버', '폭풍 산탄총', '여명·황혼 쌍창'] },
    { title: '제어·지속', detail: '보스와 정예 적을 묶어두기 좋음', icons: ['공허 흡수기', '균열 장검', '유성 단도'] }
  ];

  function battleJson() { try { return JSON.parse(localStorage.getItem(STAGE_RECORD_KEY) || '{}'); } catch (_) { return {}; } }
  function battleSave(records) { localStorage.setItem(STAGE_RECORD_KEY, JSON.stringify(records)); }
  function battleFormatTime(value) { value = Math.floor(value || 0); return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0'); }
  function battleWeaponClass(name) { return ({ '유성 단도': 'weapon-dagger', '충격 철퇴': 'weapon-mace', '노바 리볼버': 'weapon-revolver', '청광 도검': 'weapon-blade', '폭풍 산탄총': 'weapon-scatter', '태양 파쇄검': 'weapon-solar', '공허 흡수기': 'weapon-void', '균열 장검': 'weapon-rift', '여명·황혼 쌍창': 'weapon-lances' })[name] || 'weapon-dagger'; }
  function battleMapState() { return selected < unlocked ? '정복 완료' : selected === unlocked ? '도전 가능' : '잠김'; }

  function battleBuildUi() {
    var menu = document.querySelector('#menu');
    if (!menu || document.querySelector('#battle-select-panel')) return;
    menu.insertAdjacentHTML('beforeend', '<section id="battle-select-panel" class="battle-select-panel" aria-label="전투 선택"><button id="battle-back-home" class="battle-back-home">‹ <span>기지 로비</span></button><div class="battle-select-header"><p>MISSION SELECT</p><h2 id="battle-stage-name">1. 훈련 구역</h2><div class="battle-stage-progress"><span>스테이지 진행도</span><div id="battle-stage-dots"></div><b id="battle-stage-count">1 / 5</b></div></div><button id="battle-select-prev" class="battle-select-arrow" aria-label="이전 지역">‹</button><button id="battle-select-next" class="battle-select-arrow next" aria-label="다음 지역">›</button><article id="battle-preview" class="battle-preview"><div class="battle-preview-city"></div><div class="battle-preview-platform"><i></i><i></i></div><div class="battle-preview-activity"><span></span><span></span><span></span></div><small id="battle-preview-label">NEON SCAN · 지역 분석 중</small></article><aside class="battle-best-card"><small>최고 기록</small><b id="battle-best-time">첫 기록 도전</b><span id="battle-best-kills">클리어 기록 없음</span></aside><section class="battle-info-grid"><article class="battle-info-card"><small>스테이지 정보</small><b id="battle-info-threat">권장 전투력 1,000</b><span id="battle-info-enemies">주요 적 분석 중</span><em id="battle-info-rule">전장 규칙</em></article><article class="battle-info-card weapon"><small>추천 무기 타입</small><b id="battle-weapon-title">광역·근접</b><div id="battle-weapon-hints"></div><span id="battle-weapon-note">현재 장착 무기 확인 중</span></article><article class="battle-info-card reward"><small>클리어 보상</small><b id="battle-reward-coins">🪙 +60</b><div id="battle-reward-extra"></div><span id="battle-reward-note">정복 보상</span></article></section><button id="battle-start" class="battle-start"><span>▶</span> 플레이 <small id="battle-start-note">출격 준비 완료</small></button></section>');
    document.querySelector('#battle-select-prev').onclick = function () { if (selected > 0) { selected--; mapButtons(); } };
    document.querySelector('#battle-select-next').onclick = function () { if (selected < maps.length - 1) { selected++; mapButtons(); } };
    document.querySelector('#battle-start').onclick = function () { tryBegin(); };
    document.querySelector('#battle-back-home').onclick = function () { menu.classList.add('home'); };
  }

  function battleRender() {
    var panel = document.querySelector('#battle-select-panel');
    if (!panel) return;
    var map = maps[selected], profile = enemyProfiles[selected] || { mobs: ['미확인 개체'], elite: ['정예 개체'], boss: '지역 수호자' }, records = battleJson(), record = records[selected] || {}, total = totalStages(), palette = BATTLE_PALETTES[selected % BATTLE_PALETTES.length], locked = selected > unlocked, hint = WEAPON_HINTS[selected % WEAPON_HINTS.length], reward = 60 + selected * 35, clear = selected < unlocked;
    panel.style.setProperty('--battle-a', palette[0]); panel.style.setProperty('--battle-b', palette[1]); panel.style.setProperty('--battle-bg', map.bg);
    document.querySelector('#battle-stage-name').textContent = (locked ? '🔒 ' : '') + map.name;
    document.querySelector('#battle-stage-count').textContent = (clear ? total : 1) + ' / ' + total;
    document.querySelector('#battle-stage-dots').innerHTML = Array.from({ length: 5 }, function (_, index) { var milestone = Math.ceil(total * (index + 1) / 5); return '<i class="' + ((clear || milestone <= 1) ? 'active' : '') + '" title="STAGE ' + milestone + '"></i>'; }).join('');
    var preview = document.querySelector('#battle-preview'); preview.dataset.locked = locked ? 'true' : 'false'; document.querySelector('#battle-preview-label').textContent = locked ? 'LOCKED AREA · 이전 지역을 정복하세요' : 'NEON SCAN · ' + profile.boss + ' 감지';
    document.querySelector('#battle-best-time').textContent = record.bestTime ? battleFormatTime(record.bestTime) : '첫 기록 도전'; document.querySelector('#battle-best-kills').textContent = record.bestKills ? '최고 처치 ' + record.bestKills.toLocaleString() : '클리어 기록 없음';
    document.querySelector('#battle-info-threat').textContent = '권장 전투력 ' + (1000 + selected * 530).toLocaleString(); document.querySelector('#battle-info-enemies').textContent = '주요 적 · ' + profile.mobs.slice(0, 3).join(' · '); document.querySelector('#battle-info-rule').textContent = '보스 · ' + profile.boss + ' · ' + total + ' STAGE';
    document.querySelector('#battle-weapon-title').textContent = hint.title; document.querySelector('#battle-weapon-hints').innerHTML = hint.icons.map(function (name) { return '<i class="weapon-thumb ' + battleWeaponClass(name) + '" title="' + name + '"></i>'; }).join(''); document.querySelector('#battle-weapon-note').textContent = equipped?.weapon ? '장착 중 · ' + equipped.weapon.name : '무기를 장착하면 출격할 수 있습니다.';
    document.querySelector('#battle-reward-coins').textContent = '🪙 +' + reward; document.querySelector('#battle-reward-extra').innerHTML = '<i>◈</i><i>✦</i><i>▣</i>'; document.querySelector('#battle-reward-note').textContent = locked ? '이전 지역 정복 필요' : selected === unlocked && selected < maps.length - 1 ? '클리어 시 다음 지역 해금' : '정복 보상 + 요원 신호';
    var start = document.querySelector('#battle-start'); start.disabled = locked; document.querySelector('#battle-start-note').textContent = locked ? '이전 지역을 먼저 정복하세요' : battleMapState() + ' · 출격 준비 완료';
    document.querySelector('#battle-select-prev').disabled = selected === 0; document.querySelector('#battle-select-next').disabled = selected >= maps.length - 1;
  }

  function battleInstall() {
    if (battleInstall.done) return; battleInstall.done = true;
    var originalMapButtons = mapButtons, originalEnd = end;
    mapButtons = function () { var result = originalMapButtons.apply(this, arguments); battleRender(); return result; };
    end = function (win) {
      var mapIndex = selected, duration = time || 0, runKills = kills || 0, result = originalEnd.apply(this, arguments);
      var records = battleJson(), current = records[mapIndex] || { bestTime: 0, bestKills: 0, clears: 0 };
      current.bestTime = Math.max(current.bestTime || 0, duration); current.bestKills = Math.max(current.bestKills || 0, runKills); if (win) current.clears = (current.clears || 0) + 1; current.lastPlayedAt = Date.now(); records[mapIndex] = current; battleSave(records); battleRender();
      return result;
    };
    mapButtons();
  }

  battleBuildUi();
  setTimeout(battleInstall, 0);
})();
