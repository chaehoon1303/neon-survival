/*
 * Online co-op lobby and lightweight combat synchronization. The local game
 * stays fully playable alone; when a server URL is configured, the host owns
 * enemy state while guests send validated damage intents to the room.
 */
(function () {
  const COOP_SERVER_KEY = 'neonCoopServerUrl';
  const COOP_ROOM_KEY = 'neonCoopLastRoom';
  const COOP_GUEST_ID_KEY = 'neonCoopGuestId';
  const MAX_PLAYERS = 5;
  const COOP_BALANCE = {
    1: { bossHp: 1, spawn: 1, elite: 1, pattern: 1 },
    2: { bossHp: 1.8, spawn: 1.5, elite: 1.2, pattern: 1 },
    3: { bossHp: 2.5, spawn: 1.9, elite: 1.4, pattern: 1.18 },
    4: { bossHp: 3.2, spawn: 2.3, elite: 1.6, pattern: 1.35 },
    5: { bossHp: 4, spawn: 2.7, elite: 1.8, pattern: 1.55 }
  };
  const coop = { socket: null, connected: false, roomCode: localStorage.getItem(COOP_ROOM_KEY) || '', members: [], host: false, outbox: [], battle: { active: false, matchId: '', hostId: '', isHost: false, spawn: { x: 640, y: 360 }, remote: new Map(), remoteEnemies: new Map(), nextSend: 0, nextEnemySend: 0, dead: false, abandoned: false, reviveTimer: 0, applyingRemoteDamage: false } };

  function accountProfile() {
    return typeof window.NEON_ACCOUNT?.getSession === 'function' ? window.NEON_ACCOUNT.getSession() : null;
  }
  function guestId() {
    let id = localStorage.getItem(COOP_GUEST_ID_KEY);
    if (!id) {
      id = `guest-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
      localStorage.setItem(COOP_GUEST_ID_KEY, id);
    }
    return id;
  }
  function playerCard() {
    const data = typeof characterNow === 'function' ? characterNow() : { name: '훈련 요원', icon: '◉' };
    const weapon = equipped?.weapon?.name || '기본 무기';
    const account = typeof playerLevelState === 'function' ? playerLevelState() : { level: 1 };
    const profile = accountProfile();
    return { id: profile?.userId || guestId(), nickname: profile?.nickname || `GUEST_${guestId().slice(-4).toUpperCase()}`, agent: data.name, icon: data.icon || '◉', level: account.level || 1, weapon, ready: false };
  }
  function roomCode() { return Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join(''); }
  function serverUrl() { return String(localStorage.getItem(COOP_SERVER_KEY) || window.NEON_COOP_CONFIG?.serverUrl || '').trim(); }
  function isConfigured() { return /^wss:\/\//.test(serverUrl()); }
  function injectUi() {
    const shell = document.querySelector('#game-shell');
    if (!shell || document.querySelector('#coop-lobby')) return;
    shell.insertAdjacentHTML('beforeend', `<section id="coop-lobby" class="screen hidden modal-screen coop-lobby"><button id="coop-close" class="close">×</button><p class="label">NEON SQUAD · ONLINE CO-OP</p><h2>파티 로비</h2><p id="coop-status">협동 서버를 확인하고 있습니다.</p><section class="coop-code"><label>ROOM CODE <input id="coop-room-code" maxlength="5" autocomplete="off" spellcheck="false" placeholder="N7K4P"></label><button id="coop-create">방 만들기</button><button id="coop-copy">코드 복사</button><button id="coop-join">참가</button></section><div id="coop-party" class="coop-party"></div><section class="coop-balance"><b>협동 난이도</b><div id="coop-balance-list"></div></section><button id="coop-ready" class="coop-ready">준비 완료</button><button id="coop-start" class="coop-start" disabled>작전 시작</button><small class="coop-note">같은 좌표에서 시작하며, 적 위치·체력·피해 이벤트를 파티와 동기화합니다.</small></section><section id="coop-death" class="screen hidden coop-death" role="dialog" aria-modal="true"><div><p class="label">OPERATIVE DOWN</p><h2>전투 중 쓰러졌습니다</h2><p id="coop-death-detail">동료가 작전을 계속하면 잠시 후 부활합니다.</p><button id="coop-wait-revive" class="coop-revive">부활 대기</button><button id="coop-abandon" class="coop-abandon">포기하고 메인 화면으로</button></div></section>`);
    document.querySelector('#coop-close').onclick = closeLobby;
    document.querySelector('#coop-create').onclick = createRoom;
    document.querySelector('#coop-copy').onclick = copyRoomCode;
    document.querySelector('#coop-join').onclick = joinRoom;
    document.querySelector('#coop-ready').onclick = toggleReady;
    document.querySelector('#coop-start').onclick = requestStart;
    document.querySelector('#coop-wait-revive').onclick = () => { document.querySelector('#coop-death-detail').textContent = '동료가 살아있는 동안 부활을 준비합니다.'; };
    document.querySelector('#coop-abandon').onclick = abandonBattle;
    // 이동·스킬 단축키가 창 전체에 등록되어 있어도 방 코드 입력은 완전히
    // 독립된 텍스트 입력으로 동작해야 한다.
    const roomInput = document.querySelector('#coop-room-code');
    roomInput?.addEventListener('keydown', event => event.stopPropagation());
    roomInput?.addEventListener('keyup', event => event.stopPropagation());
  }
  function openLobby() { injectUi(); coop.members = coop.members.length ? coop.members : [playerCard()]; document.querySelector('#coop-lobby').classList.remove('hidden'); renderLobby(); if (isConfigured()) connect(); }
  function closeLobby() { document.querySelector('#coop-lobby')?.classList.add('hidden'); }
  function renderLobby() {
    const status = document.querySelector('#coop-status'), room = document.querySelector('#coop-room-code'), party = document.querySelector('#coop-party'), balance = document.querySelector('#coop-balance-list'), ready = document.querySelector('#coop-ready'), start = document.querySelector('#coop-start');
    if (!status || !room || !party || !balance || !ready || !start) return;
    room.value = coop.roomCode;
    status.textContent = coop.connected ? `서버 연결됨 · 방 ${coop.roomCode || '생성 대기'}` : isConfigured() ? '협동 서버에 연결 중…' : '협동 서버 준비 중 · 현재는 방 로비 UI와 난이도 설정만 확인할 수 있습니다.';
    party.innerHTML = Array.from({ length: MAX_PLAYERS }, (_, index) => {
      const member = coop.members[index];
      return member ? `<article class="coop-member ${member.ready ? 'ready' : ''}"><i>${member.icon}</i><div><b>${member.nickname}</b><small>${member.agent} · LV.${member.level}</small><em>${member.weapon}</em></div><span>${member.ready ? 'READY' : index === 0 ? 'HOST' : 'WAITING'}</span></article>` : `<article class="coop-member waiting"><i>＋</i><div><b>PLAYER ${index + 1}</b><small>WAITING...</small></div><span>EMPTY</span></article>`;
    }).join('');
    const count = Math.max(1, coop.members.length), rule = COOP_BALANCE[count];
    balance.innerHTML = `<span><b>${count}명</b><small>보스 HP ×${rule.bossHp}</small></span><span><b>적 수</b><small>×${rule.spawn}</small></span><span><b>엘리트</b><small>×${rule.elite}</small></span><span><b>패턴</b><small>${count >= 5 ? '협동 장치' : count >= 4 ? '위험 구역 추가' : count >= 3 ? '다중 조준' : '기본'}</small></span>`;
    const local = coop.members.find(member => member.id === playerCard().id); ready.textContent = local?.ready ? '준비 취소' : '준비 완료'; start.disabled = !coop.connected || !coop.host || coop.members.length < 2 || !coop.members.every(member => member.ready);
  }
  function send(message) {
    if (coop.socket?.readyState === WebSocket.OPEN) { coop.socket.send(JSON.stringify(message)); return; }
    coop.outbox.push(message);
    connect();
  }
  function connect() {
    if (!isConfigured() || coop.socket?.readyState === WebSocket.OPEN || coop.socket?.readyState === WebSocket.CONNECTING) return;
    try {
      coop.socket = new WebSocket(serverUrl());
      coop.socket.onopen = () => { coop.connected = true; const queued = coop.outbox.splice(0); queued.forEach(message => coop.socket.send(JSON.stringify(message))); renderLobby(); };
      coop.socket.onclose = () => { coop.connected = false; coop.battle.active = false; coop.battle.remote.clear(); coop.battle.remoteEnemies.clear(); hideDeathScreen(); renderLobby(); };
      coop.socket.onerror = () => { coop.connected = false; renderLobby(); };
      coop.socket.onmessage = event => receive(event.data);
    } catch (_) { coop.connected = false; renderLobby(); }
  }
  function receive(raw) {
    let message; try { message = JSON.parse(raw); } catch (_) { return; }
    if (message.type === 'room-state') { coop.roomCode = message.roomCode || coop.roomCode; coop.members = Array.isArray(message.members) ? message.members.slice(0, MAX_PLAYERS) : coop.members; coop.host = !!message.host; localStorage.setItem(COOP_ROOM_KEY, coop.roomCode); renderLobby(); }
    if (message.type === 'room-error') pop(message.message || '방 연결에 실패했습니다.');
    if (message.type === 'player-state' && message.player?.id !== playerCard().id) {
      coop.battle.remote.set(message.player.id, message.player);
      checkTeamStatus();
    }
    if (message.type === 'enemy-snapshot' && coop.battle.active && !coop.battle.isHost) applyEnemySnapshot(message);
    if (message.type === 'damage-event' && coop.battle.active && coop.battle.isHost && message.fromId !== playerCard().id) {
      const targetEnemy = enemies.find(enemy => enemy.id === Number(message.targetId));
      if (targetEnemy) { coop.battle.applyingRemoteDamage = true; baseHurt(targetEnemy, Number(message.damage)); coop.battle.applyingRemoteDamage = false; }
    }
    if (message.type === 'battle-ended' && coop.battle.active && !coop.battle.isHost) {
      coop.battle.active = false; coop.battle.dead = false; hideDeathScreen(); baseEnd(Boolean(message.win));
    }
    if (message.type === 'start-approved') {
      // 서버가 보낸 방 멤버 수와 현재 로비의 멤버 수가 일치할 때만 출격한다.
      // 늦게 도착한 이전 room-state 때문에 누군가 로비에 남는 일을 막는다.
      if (!Array.isArray(message.players) || message.players.length < 2) { pop('협동 파티 정보를 다시 확인하는 중입니다.'); return; }
      coop.members = message.players.slice(0, MAX_PLAYERS);
      closeLobby();
      document.querySelector('#modes')?.classList.add('hidden');
      document.querySelector('#menu')?.classList.remove('hidden');
      // 현재 서버는 방·준비 상태를 권한 있게 판정한다. 실제 적/드롭 동기화가
      // 추가되기 전까지는 같은 작전을 각 클라이언트에서 즉시 시작한다.
      activeMode = 'conquest';
      const startCoopBattle = () => {
        tryBegin();
        if (!run) return;
        const spawn = message.spawn || { x: 640, y: 360 };
        player.x = spawn.x; player.y = spawn.y;
        coop.battle.active = true; coop.battle.matchId = message.matchId || ''; coop.battle.hostId = message.hostId || message.players[0]?.id || ''; coop.battle.isHost = coop.battle.hostId === playerCard().id; coop.battle.spawn = spawn; coop.battle.remote.clear(); coop.battle.remoteEnemies.clear(); coop.battle.nextSend = 0; coop.battle.nextEnemySend = 0; coop.battle.dead = false; coop.battle.abandoned = false;
        pop(`NEON SQUAD · ${message.players.length}명 작전 시작!`);
      };
      // 작전 UX가 로드된 빌드에서는 팀 전원이 같은 3·2·1 출격 흐름을
      // 거친다. 이전 빌드와 서버 프로토콜은 기존 즉시 시작으로 호환한다.
      if (typeof operationQueueCoopDeploy === 'function') operationQueueCoopDeploy(message, startCoopBattle);
      else startCoopBattle();
    }
  }
  function createRoom() {
    if (!isConfigured()) { pop('협동 서버 주소가 아직 설정되지 않았습니다.'); return; }
    coop.roomCode = roomCode(); coop.host = true; coop.members = [playerCard()]; localStorage.setItem(COOP_ROOM_KEY, coop.roomCode); connect(); send({ type: 'create-room', roomCode: coop.roomCode, profile: playerCard(), capacity: MAX_PLAYERS, balance: COOP_BALANCE }); renderLobby();
  }
  function joinRoom() {
    const input = document.querySelector('#coop-room-code'), code = String(input?.value || '').trim().toUpperCase();
    if (!code) { pop('방 코드를 입력하세요.'); return; }
    if (!isConfigured()) { pop('협동 서버 주소가 아직 설정되지 않았습니다.'); return; }
    coop.roomCode = code; coop.host = false; connect(); send({ type: 'join-room', roomCode: code, profile: playerCard() }); renderLobby();
  }
  async function copyRoomCode() { if (!coop.roomCode) { pop('먼저 방을 만들어 주세요.'); return; } try { await navigator.clipboard.writeText(coop.roomCode); pop(`방 코드 ${coop.roomCode} 복사 완료`); } catch (_) { const input = document.querySelector('#coop-room-code'); input?.select(); document.execCommand('copy'); pop(`방 코드 ${coop.roomCode} 복사 완료`); } }
  function toggleReady() { const local = coop.members.find(member => member.id === playerCard().id); if (!local) return; local.ready = !local.ready; send({ type: 'set-ready', roomCode: coop.roomCode, ready: local.ready }); renderLobby(); }
  function requestStart() { send({ type: 'request-start', roomCode: coop.roomCode }); }
  // 전투 코어를 감싸되 싱글플레이에서는 원래 함수를 그대로 사용한다.
  const baseHurt = hurt, baseKillEnemy = killEnemy, baseSpawnEnemy = spawnEnemy, baseClearStage = clearStage, baseEnd = end;
  function sendEnemySnapshot(now) {
    const battle = coop.battle;
    if (!battle.active || !battle.isHost || !run || coop.socket?.readyState !== WebSocket.OPEN || now < battle.nextEnemySend) return;
    battle.nextEnemySend = now + 120;
    send({ type: 'enemy-snapshot', roomCode: coop.roomCode, stage, stageKills, stageThreat, enemies: enemies.map(enemy => ({ id: enemy.id, x: enemy.x, y: enemy.y, r: enemy.r, hp: enemy.hp, maxHp: enemy.maxHp, speed: enemy.speed, damage: enemy.damage, color: enemy.color, boss: enemy.boss, elite: enemy.elite, name: enemy.name })) });
  }
  function applyEnemySnapshot(message) {
    const incoming = Array.isArray(message.enemies) ? message.enemies : [];
    const current = new Map(enemies.map(enemy => [enemy.id, enemy]));
    enemies.length = 0;
    for (const raw of incoming) {
      const old = current.get(raw.id);
      enemies.push({ ...(old || {}), ...raw, _coopRemote: true, hit: old?.hit || {}, variantReady: old?.variantReady || false });
    }
    stage = Number.isFinite(message.stage) ? message.stage : stage;
    stageKills = Number.isFinite(message.stageKills) ? message.stageKills : stageKills;
    stageThreat = Number.isFinite(message.stageThreat) ? message.stageThreat : stageThreat;
    boss = enemies.find(enemy => enemy.boss) || null;
    bossDefeated = !boss && Boolean(stageInfo().boss) && incoming.length === 0;
  }
  function showDeathScreen() {
    const panel = document.querySelector('#coop-death');
    if (!panel) return;
    panel.classList.remove('hidden');
    document.querySelector('#coop-death-detail').textContent = '동료가 작전을 계속하면 5초 뒤 자동으로 부활합니다.';
  }
  function hideDeathScreen() { document.querySelector('#coop-death')?.classList.add('hidden'); }
  function aliveTeammateCount() {
    return [...coop.battle.remote.values()].filter(member => Number(member.hp) > 0).length;
  }
  function checkTeamStatus() {
    const battle = coop.battle;
    if (!battle.active || !battle.dead) return;
    const expected = Math.max(0, coop.members.length - 1), known = battle.remote.size;
    if (known >= expected && aliveTeammateCount() === 0) {
      document.querySelector('#coop-death-detail').textContent = '모든 팀원이 쓰러졌습니다. 작전을 포기하고 메인 화면으로 돌아가세요.';
      const wait = document.querySelector('#coop-wait-revive'); if (wait) wait.disabled = true;
    }
  }
  function reviveOperative() {
    const battle = coop.battle;
    if (!battle.active || !battle.dead || (aliveTeammateCount() === 0 && coop.members.length > 1)) return;
    battle.dead = false; battle.reviveTimer = 0; run = true; paused = false; player.x = battle.spawn.x; player.y = battle.spawn.y; player.hp = Math.max(1, player.maxHp * .42); ui.hud.classList.remove('hidden'); hideDeathScreen(); pop('동료 지원으로 전투에 복귀했습니다!');
  }
  function abandonBattle() {
    const battle = coop.battle;
    battle.abandoned = true; battle.active = false; battle.dead = false; battle.remote.clear(); battle.remoteEnemies.clear(); hideDeathScreen();
    try { coop.socket?.close(); } catch (_) {}
    baseEnd(false); ui.result.classList.add('hidden'); ui.menu.classList.remove('hidden'); document.querySelector('#modes')?.classList.add('hidden');
  }
  hurt = function (enemy, damage) {
    const battle = coop.battle;
    if (battle.active && !battle.isHost && enemy?._coopRemote && !battle.applyingRemoteDamage) send({ type: 'damage-event', roomCode: coop.roomCode, targetId: enemy.id, damage: Number(damage) || 0 });
    return baseHurt(enemy, damage);
  };
  killEnemy = function (enemy) {
    // 게스트의 로컬 예측 처치는 보상/스테이지를 건드리지 않고, 다음 호스트
    // 스냅샷에서 실제 처치 결과를 받는다.
    if (coop.battle.active && !coop.battle.isHost && enemy?._coopRemote) { enemy.hp = 1; return; }
    return baseKillEnemy(enemy);
  };
  spawnEnemy = function (isBoss = false) { if (coop.battle.active && !coop.battle.isHost) return; return baseSpawnEnemy(isBoss); };
  clearStage = function (...args) { if (coop.battle.active && !coop.battle.isHost) return; return baseClearStage.apply(this, args); };
  end = function (win = false) {
    const battle = coop.battle;
    if (battle.active && !win && !battle.abandoned) {
      battle.dead = true; run = false; paused = true; ui.hud.classList.add('hidden'); showDeathScreen(); sendBattleState(performance.now()); checkTeamStatus(); clearTimeout(battle.reviveTimer); battle.reviveTimer = setTimeout(reviveOperative, 5000); return;
    }
    if (battle.active && battle.isHost && coop.socket?.readyState === WebSocket.OPEN) send({ type: 'battle-ended', roomCode: coop.roomCode, win: Boolean(win) });
    battle.active = false; battle.dead = false; hideDeathScreen(); return baseEnd.apply(this, arguments);
  };
  function installModeCard() {
    if (!gameModes.some(mode => mode.id === 'coop')) gameModes.push({ id: 'coop', icon: 'icon-operative', name: '온라인 협동', detail: '방 코드로 최대 5명까지 파티를 구성합니다.' });
    const baseRender = renderModes; renderModes = function () { const result = baseRender.apply(this, arguments); const play = document.querySelector('#mode-play'); if (selectedMode === 'coop' && play) play.textContent = '온라인 협동 파티 로비'; return result; };
    const originalPlay = document.querySelector('#mode-play')?.onclick;
    document.querySelector('#mode-play').onclick = function () { if (selectedMode === 'coop') { openLobby(); return; } originalPlay?.apply(this, arguments); };
    renderModes();
  }
  function sendBattleState(now) {
    if (coop.battle.active && coop.socket?.readyState === WebSocket.OPEN && (run || coop.battle.dead) && now >= coop.battle.nextSend) {
      const profile = accountProfile(), data = typeof characterNow === 'function' ? characterNow() : { name: '훈련 요원', icon: '◉' };
      coop.battle.nextSend = now + 100;
      send({ type: 'player-state', roomCode: coop.roomCode, player: { id: playerCard().id, nickname: profile?.nickname || playerCard().nickname, agent: data.name, icon: data.icon || '◉', x: player.x, y: player.y, hp: coop.battle.dead ? 0 : player.hp, maxHp: player.maxHp } });
    }
    sendEnemySnapshot(now);
    requestAnimationFrame(sendBattleState);
  }
  function drawRemotePlayers() {
    if (coop.battle.active && run && typeof x !== 'undefined') {
      for (const member of coop.battle.remote.values()) {
        x.save(); x.globalAlpha = .95; x.translate(member.x, member.y); const down = Number(member.hp) <= 0; x.fillStyle = down ? '#ff657f' : '#8cf3ff'; x.shadowBlur = 18; x.shadowColor = down ? '#ff4268' : '#5be7ff'; x.beginPath(); x.arc(0, 0, 16, 0, Math.PI * 2); x.fill(); x.fillStyle = '#0a1a31'; x.beginPath(); x.arc(0, 0, 8, 0, Math.PI * 2); x.fill(); x.shadowBlur = 0; x.fillStyle = '#e8fbff'; x.font = 'bold 12px sans-serif'; x.textAlign = 'center'; x.fillText(down ? 'DOWN' : (member.nickname || 'SURVIVOR'), 0, -24); x.fillStyle = '#18334c'; x.fillRect(-24, 20, 48, 5); x.fillStyle = down ? '#ff657f' : '#54efa2'; x.fillRect(-24, 20, 48 * Math.max(0, Math.min(1, member.hp / Math.max(1, member.maxHp))), 5); x.restore();
      }
    }
    requestAnimationFrame(drawRemotePlayers);
  }
  window.NEON_COOP = { balance: COOP_BALANCE, setServer(url) { localStorage.setItem(COOP_SERVER_KEY, String(url || '')); }, openLobby };
  requestAnimationFrame(sendBattleState);
  requestAnimationFrame(drawRemotePlayers);
  setTimeout(installModeCard, 0);
})();
