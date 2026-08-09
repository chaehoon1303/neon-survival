/*
 * 반복 전투 다양성 1차 확장
 * - 핵심 전투 및 기존 포탈 시스템의 상태를 건드리지 않는 독립 래퍼다.
 * - 융합 / 전투 변이 / 선택 이벤트는 이 파일의 varietyState에만 저장한다.
 */
(function () {
  var VARIETY_VERSION = '1.2.0';
  var varietyState = {
    active: false,
    runId: 0,
    mutations: [],
    mutationReward: 0,
    mutationHazards: [],
    hazardTimer: 0,
    fusionIds: {},
    fusionCd: {},
    fusionShots: [],
    fusionZones: [],
    nextEventAt: 0,
    event: null,
    pendingObjective: null,
    previousPaused: false,
    rewarded: false,
    lastFrame: performance.now()
  };

  var FUSION_CODEX_KEY = 'neonFusionCodex';
  var MUTATION_HISTORY_KEY = 'neonMutationHistory';

  var FUSIONS = [
    {
      id: 'storm-scout', name: '폭뢰 정찰기', secret: false,
      detail: '드론이 적을 추적하며 연쇄 낙뢰를 방출합니다.',
      ready: function (p) { return p.lightning > 0 && (p.droneA || p.droneB || p.destroyer); },
      tick: function (dt) {
        varietyState.fusionCd.stormScout = (varietyState.fusionCd.stormScout || .2) - dt;
        if (varietyState.fusionCd.stormScout > 0) return;
        var first = target();
        if (!first) return;
        varietyState.fusionCd.stormScout = .62;
        var victims = [first];
        var nearby = enemies.filter(function (enemy) { return enemy !== first && Math.hypot(enemy.x - first.x, enemy.y - first.y) < 170; }).slice(0, 2);
        victims = victims.concat(nearby);
        victims.forEach(function (enemy, index) {
          if (!enemies.includes(enemy)) return;
          hurt(enemy, 42 + player.level * 3);
          effects.push({ kind: 'bolt', x: enemy.x, y: enemy.y, l: .2 });
          burst(enemy.x, enemy.y, index ? '#9f8bff' : '#fff3a1', 5);
        });
      }
    },
    {
      id: 'inferno-missile', name: '태양재 미사일', secret: false,
      detail: '강력한 자동 유도 미사일이 폭발 뒤 화염 지대를 남깁니다.',
      ready: function (p) { return p.molotov > 0 && p.rpg > 0; },
      tick: function (dt) {
        varietyState.fusionCd.infernoMissile = (varietyState.fusionCd.infernoMissile || .4) - dt;
        if (varietyState.fusionCd.infernoMissile > 0 || !target()) return;
        varietyState.fusionCd.infernoMissile = 2.15;
        varietyState.fusionShots.push({ x: player.x, y: player.y, targetId: target().id, l: 2.8, r: 12, damage: 130 + player.level * 7, speed: 355, color: '#ff7a39', kind: 'inferno' });
      }
    },
    {
      id: 'blade-vortex', name: '궤도 절단 폭풍', secret: false,
      detail: '주변 적을 끌어당기고 회전 칼날로 지속 피해를 줍니다.',
      ready: function (p) { return p.boom > 0 && p.guardian > 0; },
      tick: function (dt) {
        var radius = 148 + player.boom * 7;
        enemies.slice().forEach(function (enemy) {
          var dx = player.x - enemy.x, dy = player.y - enemy.y, dist = Math.hypot(dx, dy) || 1;
          if (dist > radius + enemy.r) return;
          enemy.x += dx / dist * 62 * dt;
          enemy.y += dy / dist * 62 * dt;
          hurt(enemy, (34 + player.level * 2.2) * dt);
        });
      }
    },
    {
      id: 'cinder-sprayer', name: '잿불 살포기', secret: false,
      detail: '보조 드론이 이동하며 작은 화염 지대를 남깁니다.',
      ready: function (p) { return p.molotov > 0 && (p.droneA || p.droneB || p.destroyer); },
      tick: function (dt) {
        varietyState.fusionCd.cinderSprayer = (varietyState.fusionCd.cinderSprayer || .2) - dt;
        if (varietyState.fusionCd.cinderSprayer > 0) return;
        varietyState.fusionCd.cinderSprayer = .85;
        var angle = time * 1.4;
        varietyState.fusionZones.push({ x: player.x + Math.cos(angle) * 92, y: player.y + Math.sin(angle) * 92, r: 55, l: 3.2, max: 3.2, damage: 22 + player.molotov * 6, color: '#ff6c36' });
      }
    },
    {
      id: 'judgment-array', name: '심판의 광선', secret: true,
      detail: '숨겨진 3중 융합. 하늘에서 넓은 광선을 내려 적을 심판합니다.',
      ready: function (p) { return p.lightning > 0 && p.laser > 0 && (p.levels['동력 응축기'] || 0) > 0; },
      tick: function (dt) {
        varietyState.fusionCd.judgmentArray = (varietyState.fusionCd.judgmentArray || 1) - dt;
        if (varietyState.fusionCd.judgmentArray > 0) return;
        var enemy = target();
        if (!enemy) return;
        varietyState.fusionCd.judgmentArray = 3.8;
        var px = enemy.x, py = enemy.y;
        varietyState.fusionZones.push({ x: px, y: py, r: 118, l: .72, max: .72, damage: 145 + player.level * 8, color: '#c47cff', beam: true });
        effects.push({ kind: 'bolt', x: px, y: py, l: .48 });
      }
    }
  ];

  var MUTATIONS = [
    { id: 'quick-hunt', tier: '일반', reward: 8, name: '속도전', detail: '적 이동속도 +30% · 경험치 획득량 +20%', start: function (p) { p.xpMult *= 1.2; }, enemy: function (e) { e.speed *= 1.3; } },
    { id: 'elite-signal', tier: '희귀', reward: 18, name: '정예 신호', detail: '정예 적 등장 확률 증가 · 보상 +18', eliteChance: .22 },
    { id: 'twin-command', tier: '특수', reward: 34, name: '쌍두 지휘관', detail: '보스가 2마리 등장 · 보스 보상 증가', twinBoss: true },
    { id: 'thin-swarm', tier: '일반', reward: 12, name: '과밀 돌입', detail: '적 수 증가 · 일반 적 체력 -24%', extraSpawn: .34, enemy: function (e) { if (!e.boss) { e.hp *= .76; e.maxHp *= .76; } } },
    { id: 'kinetic-gamble', tier: '희귀', reward: 16, name: '가속 도박', detail: '이동속도 +20% · 적 투사체 속도 증가', start: function (p) { p.speed *= 1.2; }, enemyShotSpeed: 1.25 },
    { id: 'blackout', tier: '특수', reward: 25, name: '암전 전장', detail: '전장이 어두워짐 · 엘리트 적만 밝게 표시', dark: true },
    { id: 'volatile-field', tier: '혼돈', reward: 42, name: '불안정 지대', detail: '일정 시간마다 무작위 위험 구역 생성', hazards: true },
    { id: 'shielded-heart', tier: '희귀', reward: 18, name: '방벽 순환', detail: '회복 효과 감소 · 보호막 효과 증가', start: function (p) { p.regen *= .55; p.reduce += .08; } }
  ];

  function varietyById(list, id) { return list.find(function (entry) { return entry.id === id; }); }
  function varietyClamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function varietyShuffle(list) { return list.slice().sort(function () { return Math.random() - .5; }); }
  function varietySafeJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }
  function varietyPersistFusion(id) {
    var codex = varietySafeJson(FUSION_CODEX_KEY, {});
    codex[id] = { discoveredAt: Date.now(), version: VARIETY_VERSION };
    localStorage.setItem(FUSION_CODEX_KEY, JSON.stringify(codex));
  }

  function varietyBuildUi() {
    if (document.querySelector('#variety-mutation') || !document.querySelector('#game-shell')) return;
    document.querySelector('#game-shell').insertAdjacentHTML('beforeend', '<section id="variety-mutation" class="variety-mutation hidden" aria-live="polite"><p>이번 전투의 변이</p><div id="variety-mutation-list"></div></section><section id="variety-event" class="variety-event hidden" aria-modal="true" role="dialog"><p class="label">FIELD DECISION</p><h2 id="variety-event-title">전투 중 선택</h2><p id="variety-event-detail"></p><div id="variety-event-options" class="variety-event-options"></div></section><div id="variety-fusion-hud" class="variety-fusion-hud hidden"></div>');
    var base = document.querySelector('#base');
    if (base && !document.querySelector('#fusion-codex')) base.insertAdjacentHTML('beforeend', '<section id="fusion-codex" class="fusion-codex"><h3>✦ 융합 도감</h3><p>조합을 처음 완성하면 정체가 기록됩니다.</p><div id="fusion-codex-list"></div></section>');
    var baseButton = document.querySelector('#base-button');
    if (baseButton) baseButton.addEventListener('click', varietyRenderFusionCodex);
    varietyRenderFusionCodex();
  }

  function varietyRenderFusionCodex() {
    var list = document.querySelector('#fusion-codex-list');
    if (!list) return;
    var codex = varietySafeJson(FUSION_CODEX_KEY, {});
    list.innerHTML = FUSIONS.map(function (fusion) {
      var known = !!codex[fusion.id];
      return '<article class="fusion-codex-card ' + (known ? 'known' : 'unknown') + '"><b>' + (known ? fusion.name : '???') + '</b><small>' + (known ? fusion.detail : '아직 발견하지 못한 융합입니다.') + '</small><em>' + (fusion.secret ? '비밀 융합' : '전술 융합') + '</em></article>';
    }).join('');
  }

  function varietyShowMutations() {
    var box = document.querySelector('#variety-mutation'), list = document.querySelector('#variety-mutation-list');
    if (!box || !list || !varietyState.mutations.length) return;
    list.innerHTML = varietyState.mutations.map(function (id) {
      var mutation = varietyById(MUTATIONS, id);
      return mutation ? '<article class="mutation-card tier-' + mutation.tier + '"><b>' + mutation.tier + ' · ' + mutation.name + '</b><small>' + mutation.detail + '</small></article>' : '';
    }).join('');
    box.classList.remove('hidden');
    setTimeout(function () { if (varietyState.active) box.classList.add('hidden'); }, 5400);
  }

  function varietyChooseMutations() {
    var count = Math.random() < .08 ? 3 : Math.random() < .34 ? 2 : 1;
    var history = varietySafeJson(MUTATION_HISTORY_KEY, []);
    var picked = [];
    for (var attempt = 0; attempt < 8; attempt++) {
      picked = varietyShuffle(MUTATIONS).slice(0, count).map(function (mutation) { return mutation.id; });
      var signature = picked.slice().sort().join('|');
      if (!history.includes(signature) || attempt === 7) {
        history.unshift(signature);
        localStorage.setItem(MUTATION_HISTORY_KEY, JSON.stringify(history.slice(0, 6)));
        break;
      }
    }
    varietyState.mutations = picked;
    varietyState.mutationReward = picked.reduce(function (sum, id) { var mutation = varietyById(MUTATIONS, id); return sum + (mutation ? mutation.reward : 0); }, 0);
    picked.forEach(function (id) { var mutation = varietyById(MUTATIONS, id); if (mutation && mutation.start) mutation.start(player); });
  }

  function varietyMutateEnemy(enemy) {
    if (!enemy || enemy.varietyAdjusted) return enemy;
    enemy.varietyAdjusted = true;
    varietyState.mutations.forEach(function (id) {
      var mutation = varietyById(MUTATIONS, id);
      if (mutation && mutation.enemy) mutation.enemy(enemy);
      if (mutation && mutation.eliteChance && !enemy.boss && !enemy.elite && Math.random() < mutation.eliteChance) {
        enemy.elite = true;
        enemy.r *= 1.22; enemy.hp *= 2.15; enemy.maxHp *= 2.15; enemy.damage *= 1.35; enemy.color = '#ffe27a';
      }
    });
    return enemy;
  }

  function varietyStartRun() {
    varietyState.active = true;
    varietyState.runId++;
    varietyState.mutations = [];
    varietyState.mutationHazards = [];
    varietyState.fusionIds = {};
    varietyState.fusionCd = {};
    varietyState.fusionShots = [];
    varietyState.fusionZones = [];
    varietyState.event = null;
    varietyState.pendingObjective = null;
    varietyState.rewarded = false;
    varietyState.nextEventAt = 34 + Math.random() * 18;
    varietyChooseMutations();
    varietyShowMutations();
    varietyRenderFusionHud();
  }

  function varietyEndRun(win) {
    document.querySelector('#variety-mutation') && document.querySelector('#variety-mutation').classList.add('hidden');
    document.querySelector('#variety-event') && document.querySelector('#variety-event').classList.add('hidden');
    document.querySelector('#variety-fusion-hud') && document.querySelector('#variety-fusion-hud').classList.add('hidden');
    if (win && varietyState.active && !varietyState.rewarded && varietyState.mutationReward) {
      varietyState.rewarded = true;
      wallet += varietyState.mutationReward;
      localStorage.neonCoins = wallet;
      renderCoins();
      var detail = document.querySelector('#result-detail');
      if (detail) detail.textContent += ' · 변이 보상 🪙 +' + varietyState.mutationReward;
    }
    varietyState.active = false;
    varietyState.event = null;
  }

  function varietyTryUnlockFusions() {
    if (!player) return;
    FUSIONS.forEach(function (fusion) {
      if (varietyState.fusionIds[fusion.id] || !fusion.ready(player)) return;
      varietyState.fusionIds[fusion.id] = true;
      varietyPersistFusion(fusion.id);
      varietyRenderFusionCodex();
      pop((fusion.secret ? '✦ 비밀 ' : '✦ ') + '융합 발견: ' + fusion.name);
      burst(player.x, player.y, fusion.secret ? '#e7a8ff' : '#78e6ff', 20);
      varietyRenderFusionHud();
    });
  }

  function varietyRenderFusionHud() {
    var node = document.querySelector('#variety-fusion-hud');
    if (!node) return;
    var names = Object.keys(varietyState.fusionIds).map(function (id) { var fusion = varietyById(FUSIONS, id); return fusion ? fusion.name : ''; }).filter(Boolean);
    node.classList.toggle('hidden', !names.length || !run);
    node.innerHTML = names.map(function (name) { return '<span>✦ ' + name + '</span>'; }).join('');
  }

  function varietyTickFusions(dt) {
    varietyTryUnlockFusions();
    Object.keys(varietyState.fusionIds).forEach(function (id) { var fusion = varietyById(FUSIONS, id); if (fusion) fusion.tick(dt); });
    for (var i = varietyState.fusionShots.length - 1; i >= 0; i--) {
      var shot = varietyState.fusionShots[i], enemy = enemies.find(function (candidate) { return candidate.id === shot.targetId; }) || target();
      if (enemy) {
        var ux = enemy.x - shot.x, uy = enemy.y - shot.y, length = Math.hypot(ux, uy) || 1;
        shot.x += ux / length * shot.speed * dt; shot.y += uy / length * shot.speed * dt;
        if (length < enemy.r + shot.r + 8) {
          hurt(enemy, shot.damage);
          varietyState.fusionZones.push({ x: shot.x, y: shot.y, r: 96, l: 3.7, max: 3.7, damage: shot.damage * .22, color: '#ff633c' });
          burst(shot.x, shot.y, '#ffcf63', 16); shot.l = 0;
        }
      }
      shot.l -= dt;
      if (shot.l <= 0 || shot.x < -80 || shot.y < -80 || shot.x > W + 80 || shot.y > H + 80) varietyState.fusionShots.splice(i, 1);
    }
    for (var z = varietyState.fusionZones.length - 1; z >= 0; z--) {
      var zone = varietyState.fusionZones[z]; zone.l -= dt;
      enemies.slice().forEach(function (enemy) { if (Math.hypot(enemy.x - zone.x, enemy.y - zone.y) < zone.r + enemy.r) hurt(enemy, zone.damage * dt); });
      if (zone.l <= 0) varietyState.fusionZones.splice(z, 1);
    }
  }

  function varietyTickMutations(dt) {
    enemies.forEach(varietyMutateEnemy);
    if (varietyState.mutations.includes('kinetic-gamble')) enemyShots.forEach(function (shot) {
      if (shot.varietySpeedScaled || shot.meteor) return;
      shot.vx *= 1.25; shot.vy *= 1.25; shot.varietySpeedScaled = true;
    });
    if (varietyState.mutations.includes('volatile-field')) {
      varietyState.hazardTimer -= dt;
      if (varietyState.hazardTimer <= 0) {
        varietyState.hazardTimer = 7.2;
        varietyState.mutationHazards.push({ x: 100 + Math.random() * (W - 200), y: 90 + Math.random() * (H - 180), r: 72, l: 3.1 });
      }
    }
    for (var i = varietyState.mutationHazards.length - 1; i >= 0; i--) {
      var hazard = varietyState.mutationHazards[i]; hazard.l -= dt;
      if (Math.hypot(player.x - hazard.x, player.y - hazard.y) < hazard.r + player.r) player.hp -= 16 * dt;
      if (hazard.l <= 0) varietyState.mutationHazards.splice(i, 1);
    }
  }

  function varietyBoostRandomSkill(count) {
    var keys = ['lightning', 'molotov', 'ball', 'boom', 'brick', 'rpg', 'guardian', 'drill', 'durian', 'laser', 'mine', 'medic', 'forcefield'];
    var chosen = [];
    for (var i = 0; i < count; i++) {
      var key = keys[Math.floor(Math.random() * keys.length)];
      player[key] = (player[key] || 0) + 1; chosen.push(key);
    }
    varietyTryUnlockFusions();
    return chosen.length ? '무작위 전술 강화 +' + chosen.length : '전술 강화';
  }

  function varietyEventDefinition() {
    var definitions = [
      {
        title: '위험한 계약', detail: '지금의 생존력을 걸고 전투력을 바꿉니다.', options: [
          { label: '공격력 +30% / 최대 체력 -20%', apply: function () { player.damage *= 1.3; player.maxHp *= .8; player.hp = Math.min(player.hp, player.maxHp); return '위험한 계약을 수락했습니다.'; } },
          { label: '이동속도 +25% / 피해 감소 -15%', apply: function () { player.speed *= 1.25; player.reduce -= .15; return '질주의 계약을 수락했습니다.'; } },
          { label: '거절한다', apply: function () { return '계약을 거절했습니다.'; } }
        ]
      },
      {
        title: '수상한 상인', detail: '대가를 지불하면 즉시 전술을 강화해 줍니다.', options: [
          { label: '🪙 50 지불 · 무작위 스킬 2회 강화', apply: function () { if (wallet < 50) return '코인이 부족합니다.'; wallet -= 50; localStorage.neonCoins = wallet; renderCoins(); return varietyBoostRandomSkill(2); } },
          { label: '현재 HP 18% 지불 · 고급 전술 강화', apply: function () { player.hp = Math.max(1, player.hp - player.maxHp * .18); var note = varietyBoostRandomSkill(3); if (Math.random() < .06) { player.damage *= 1.22; note += ' · 숨겨진 보너스!'; } return note; } },
          { label: '상인을 공격한다 · 정예 전투', apply: function () { for (var i = 0; i < 3; i++) spawnEnemy(false); enemies.slice(-3).forEach(function (enemy) { enemy.hp *= 2.2; enemy.maxHp *= 2.2; enemy.damage *= 1.45; enemy.elite = true; enemy.color = '#ff70a6'; }); return '상인이 호위대를 불렀습니다!'; } }
        ]
      },
      {
        title: '봉인된 보급함', detail: '안전한 보상과 더 큰 위험 중 하나를 선택하세요.', options: [
          { label: '지금 연다 · 코인 +35', apply: function () { wallet += 35; localStorage.neonCoins = wallet; renderCoins(); return '보급함에서 코인 35개를 얻었습니다.'; } },
          { label: '적 30마리 처치 후 연다 · 보상 2배', apply: function () { varietyState.pendingObjective = { start: kills, goal: 30, reward: 80 }; return '봉인 유지: 적 30마리를 처치하세요.'; } },
          { label: '파괴한다 · 무작위 결과', apply: function () { if (Math.random() < .1) { wallet += 120; localStorage.neonCoins = wallet; renderCoins(); return '숨겨진 금고 발견! 코인 +120'; } if (Math.random() < .5) { player.hp = Math.min(player.maxHp, player.hp + player.maxHp * .22); return '치유 에너지가 흘러나왔습니다.'; } for (var i = 0; i < 2; i++) spawnEnemy(false); return '보급함이 경보를 울렸습니다!'; } }
        ]
      }
    ];
    return definitions[Math.floor(Math.random() * definitions.length)];
  }

  function varietyOpenEvent() {
    if (!varietyState.active || paused || !run || varietyState.event || (typeof rift !== 'undefined' && (rift.active || rift.portal))) return;
    var event = varietyEventDefinition(), root = document.querySelector('#variety-event');
    if (!root) return;
    varietyState.event = event; varietyState.previousPaused = paused; paused = true;
    document.querySelector('#variety-event-title').textContent = event.title;
    document.querySelector('#variety-event-detail').textContent = event.detail;
    var options = document.querySelector('#variety-event-options'); options.innerHTML = '';
    event.options.forEach(function (option) {
      var button = document.createElement('button'); button.innerHTML = '<b>' + option.label + '</b><small>선택</small>';
      button.onclick = function () {
        var result = option.apply();
        root.classList.add('hidden'); varietyState.event = null; paused = varietyState.previousPaused;
        pop(result); varietyState.nextEventAt = time + 46 + Math.random() * 28;
      };
      options.appendChild(button);
    });
    root.classList.remove('hidden');
  }

  function varietyTickEvents() {
    if (varietyState.pendingObjective && kills - varietyState.pendingObjective.start >= varietyState.pendingObjective.goal) {
      wallet += varietyState.pendingObjective.reward; localStorage.neonCoins = wallet; renderCoins();
      pop('봉인 해제 성공! 보급 보상 🪙 +' + varietyState.pendingObjective.reward);
      varietyState.pendingObjective = null;
    }
    if (time >= varietyState.nextEventAt && !varietyState.event && Math.random() < .72) varietyOpenEvent();
    else if (time >= varietyState.nextEventAt && !varietyState.event) varietyState.nextEventAt = time + 24 + Math.random() * 14;
  }

  function varietyDraw() {
    if (!run || !player) return;
    x.save();
    if (varietyState.mutations.includes('blackout')) {
      x.fillStyle = '#02040e99'; x.fillRect(0, 0, W, H);
      enemies.filter(function (enemy) { return enemy.elite; }).forEach(function (enemy) { x.strokeStyle = '#ffe871'; x.lineWidth = 3; x.shadowBlur = 18; x.shadowColor = '#ffe871'; x.beginPath(); x.arc(enemy.x, enemy.y, enemy.r + 8, 0, Math.PI * 2); x.stroke(); });
    }
    varietyState.mutationHazards.forEach(function (hazard) { x.globalAlpha = Math.max(0, hazard.l / .7); x.fillStyle = '#e34c8055'; x.strokeStyle = '#ff829f'; x.lineWidth = 3; x.beginPath(); x.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2); x.fill(); x.stroke(); });
    varietyState.fusionZones.forEach(function (zone) { x.globalAlpha = Math.min(.7, zone.l / Math.max(.1, zone.max)); x.fillStyle = zone.beam ? '#bd86ff66' : zone.color + '55'; x.strokeStyle = zone.beam ? '#f1d9ff' : zone.color; x.lineWidth = zone.beam ? 7 : 3; x.beginPath(); x.arc(zone.x, zone.y, zone.r, 0, Math.PI * 2); x.fill(); x.stroke(); if (zone.beam) { x.globalAlpha = .75; x.fillStyle = '#f5dcff88'; x.fillRect(zone.x - 17, 0, 34, zone.y); } });
    varietyState.fusionShots.forEach(function (shot) { x.save(); x.translate(shot.x, shot.y); x.shadowBlur = 18; x.shadowColor = shot.color; x.fillStyle = '#fff5ce'; x.beginPath(); x.moveTo(shot.r + 12, 0); x.lineTo(-shot.r, -shot.r * .65); x.lineTo(-shot.r, shot.r * .65); x.closePath(); x.fill(); x.fillStyle = shot.color; x.fillRect(-shot.r, -4, shot.r * 2, 8); x.restore(); });
    if (varietyState.fusionIds['blade-vortex']) {
      var radius = 148 + player.boom * 7; x.strokeStyle = '#7ce7ffcc'; x.lineWidth = 5; x.shadowBlur = 14; x.shadowColor = '#7ce7ff'; x.beginPath(); x.arc(player.x, player.y, radius, time * 3, time * 3 + Math.PI * 1.6); x.stroke();
    }
    x.restore();
  }

  function varietyLoop(now) {
    var dt = Math.min(.05, (now - varietyState.lastFrame) / 1000); varietyState.lastFrame = now;
    if (varietyState.active && run && !paused && player) {
      varietyTickFusions(dt); varietyTickMutations(dt); varietyTickEvents(); varietyRenderFusionHud();
    }
    if (run) varietyDraw();
    requestAnimationFrame(varietyLoop);
  }

  function varietyInstallWrappers() {
    if (varietyInstallWrappers.done) return; varietyInstallWrappers.done = true;
    var originalBegin = begin, originalEnd = end, originalSpawnEnemy = spawnEnemy, originalKillEnemy = killEnemy;
    begin = function () { var result = originalBegin.apply(this, arguments); if (run && player) varietyStartRun(); return result; };
    end = function (win) { varietyEndRun(!!win); return originalEnd.apply(this, arguments); };
    spawnEnemy = function (isBoss) {
      var result = originalSpawnEnemy.apply(this, arguments);
      if (!varietyState.active || !run) return result;
      if (!isBoss) {
        var enemy = result || enemies[enemies.length - 1]; varietyMutateEnemy(enemy);
        var swarm = varietyState.mutations.some(function (id) { var mutation = varietyById(MUTATIONS, id); return mutation && mutation.extraSpawn; });
        var swarmRule = varietyById(MUTATIONS, 'thin-swarm');
        if (swarm && swarmRule && Math.random() < swarmRule.extraSpawn) varietyMutateEnemy(originalSpawnEnemy(false) || enemies[enemies.length - 1]);
      } else if (varietyState.mutations.includes('twin-command')) {
        var runId = varietyState.runId;
        setTimeout(function () {
          if (!run || !varietyState.active || varietyState.runId !== runId || !boss || !enemies.includes(boss) || boss.varietyTwinScheduled) return;
          boss.varietyTwinScheduled = true;
          var twinHp = Math.max(1, boss.maxHp * .72);
          var twin = { id: nextId++, x: varietyClamp(boss.x + 120, 72, W - 72), y: varietyClamp(boss.y + 80, 72, H - 72), r: Math.max(28, boss.r * .82), hp: twinHp, maxHp: twinHp, speed: boss.speed * 1.08, damage: boss.damage * .9, color: '#ff6eb4', boss: true, name: boss.name + ' · 쌍둥이', patternCd: 2.1, varietyTwin: true };
          enemies.push(twin); pop('특수 변이: 두 번째 보스가 합류했습니다!');
        }, 3300);
      }
      return result;
    };
    killEnemy = function (enemy) {
      var result = originalKillEnemy.apply(this, arguments);
      if (enemy && enemy.boss && varietyState.active && varietyState.mutations.includes('twin-command')) {
        var remaining = enemies.find(function (candidate) { return candidate.boss; });
        if (remaining) { boss = remaining; bossDefeated = false; }
      }
      return result;
    };
  }

  varietyBuildUi();
  setTimeout(varietyInstallWrappers, 0);
  requestAnimationFrame(varietyLoop);
})();
