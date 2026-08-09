/*
 * Online co-op lobby foundation.  The local game remains single-player until
 * a server URL is supplied by the authoritative room service.  The message
 * contract here deliberately keeps simulation authority out of the browser.
 */
(function () {
  const COOP_SERVER_KEY = 'neonCoopServerUrl';
  const COOP_ROOM_KEY = 'neonCoopLastRoom';
  const MAX_PLAYERS = 5;
  const COOP_BALANCE = {
    1: { bossHp: 1, spawn: 1, elite: 1, pattern: 1 },
    2: { bossHp: 1.8, spawn: 1.5, elite: 1.2, pattern: 1 },
    3: { bossHp: 2.5, spawn: 1.9, elite: 1.4, pattern: 1.18 },
    4: { bossHp: 3.2, spawn: 2.3, elite: 1.6, pattern: 1.35 },
    5: { bossHp: 4, spawn: 2.7, elite: 1.8, pattern: 1.55 }
  };
  const coop = { socket: null, connected: false, roomCode: localStorage.getItem(COOP_ROOM_KEY) || '', members: [], host: false, outbox: [] };

  function accountProfile() {
    return typeof window.NEON_ACCOUNT?.getSession === 'function' ? window.NEON_ACCOUNT.getSession() : null;
  }
  function playerCard() {
    const data = typeof characterNow === 'function' ? characterNow() : { name: '훈련 요원', icon: '◉' };
    const weapon = equipped?.weapon?.name || '기본 무기';
    const account = typeof playerLevelState === 'function' ? playerLevelState() : { level: 1 };
    const profile = accountProfile();
    return { id: profile?.userId || 'local', nickname: profile?.nickname || 'PLAYER', agent: data.name, icon: data.icon || '◉', level: account.level || 1, weapon, ready: false };
  }
  function roomCode() { return Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join(''); }
  function serverUrl() { return String(localStorage.getItem(COOP_SERVER_KEY) || window.NEON_COOP_CONFIG?.serverUrl || '').trim(); }
  function isConfigured() { return /^wss:\/\//.test(serverUrl()); }
  function injectUi() {
    const shell = document.querySelector('#game-shell');
    if (!shell || document.querySelector('#coop-lobby')) return;
    shell.insertAdjacentHTML('beforeend', `<section id="coop-lobby" class="screen hidden modal-screen coop-lobby"><button id="coop-close" class="close">×</button><p class="label">NEON SQUAD · ONLINE CO-OP</p><h2>파티 로비</h2><p id="coop-status">협동 서버를 확인하고 있습니다.</p><section class="coop-code"><label>ROOM CODE <input id="coop-room-code" maxlength="5" autocomplete="off" spellcheck="false" placeholder="N7K4P"></label><button id="coop-create">방 만들기</button><button id="coop-copy">코드 복사</button><button id="coop-join">참가</button></section><div id="coop-party" class="coop-party"></div><section class="coop-balance"><b>협동 난이도</b><div id="coop-balance-list"></div></section><button id="coop-ready" class="coop-ready">준비 완료</button><button id="coop-start" class="coop-start" disabled>작전 시작</button><small class="coop-note">전투 상태·적·드롭은 협동 서버가 최종 판단합니다.</small></section>`);
    document.querySelector('#coop-close').onclick = closeLobby;
    document.querySelector('#coop-create').onclick = createRoom;
    document.querySelector('#coop-copy').onclick = copyRoomCode;
    document.querySelector('#coop-join').onclick = joinRoom;
    document.querySelector('#coop-ready').onclick = toggleReady;
    document.querySelector('#coop-start').onclick = requestStart;
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
      coop.socket.onclose = () => { coop.connected = false; renderLobby(); };
      coop.socket.onerror = () => { coop.connected = false; renderLobby(); };
      coop.socket.onmessage = event => receive(event.data);
    } catch (_) { coop.connected = false; renderLobby(); }
  }
  function receive(raw) {
    let message; try { message = JSON.parse(raw); } catch (_) { return; }
    if (message.type === 'room-state') { coop.roomCode = message.roomCode || coop.roomCode; coop.members = Array.isArray(message.members) ? message.members.slice(0, MAX_PLAYERS) : coop.members; coop.host = !!message.host; localStorage.setItem(COOP_ROOM_KEY, coop.roomCode); renderLobby(); }
    if (message.type === 'room-error') pop(message.message || '방 연결에 실패했습니다.');
    if (message.type === 'start-approved') {
      closeLobby();
      document.querySelector('#modes')?.classList.add('hidden');
      document.querySelector('#menu')?.classList.remove('hidden');
      // 현재 서버는 방·준비 상태를 권한 있게 판정한다. 실제 적/드롭 동기화가
      // 추가되기 전까지는 같은 작전을 각 클라이언트에서 즉시 시작한다.
      activeMode = 'conquest';
      tryBegin();
      if (run) pop(`NEON SQUAD · ${message.players?.length || coop.members.length}명 작전 시작!`);
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
  function installModeCard() {
    if (!gameModes.some(mode => mode.id === 'coop')) gameModes.push({ id: 'coop', icon: '♧', name: '온라인 협동', detail: '방 코드로 최대 5명까지 파티를 구성합니다.' });
    const baseRender = renderModes; renderModes = function () { const result = baseRender.apply(this, arguments); const play = document.querySelector('#mode-play'); if (selectedMode === 'coop' && play) play.textContent = '온라인 협동 파티 로비'; return result; };
    const originalPlay = document.querySelector('#mode-play')?.onclick;
    document.querySelector('#mode-play').onclick = function () { if (selectedMode === 'coop') { openLobby(); return; } originalPlay?.apply(this, arguments); };
    renderModes();
  }
  window.NEON_COOP = { balance: COOP_BALANCE, setServer(url) { localStorage.setItem(COOP_SERVER_KEY, String(url || '')); }, openLobby };
  setTimeout(installModeCard, 0);
})();
