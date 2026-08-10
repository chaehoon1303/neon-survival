/*
 * NEON SURVIVOR co-op room authority.
 *
 * The room remains lightweight, but it also relays a small combat snapshot:
 * the host owns enemy HP/defeat and guests send damage intents back to it.
 * This keeps every client in the same battle without trusting client rewards.
 */
const MAX_PLAYERS = 5;

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

function cleanText(value, limit) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, limit);
}

function cleanProfile(value) {
  const profile = value && typeof value === 'object' ? value : {};
  return {
    id: cleanText(profile.id, 96),
    nickname: cleanText(profile.nickname, 18) || 'SURVIVOR',
    agent: cleanText(profile.agent, 32) || '훈련 요원',
    icon: cleanText(profile.icon, 16) || '◉',
    level: Math.max(1, Math.min(100, Number(profile.level) || 1)),
    weapon: cleanText(profile.weapon, 32) || '기본 무기',
    ready: false
  };
}

function roomCode(value) {
  const code = cleanText(value, 5).toUpperCase();
  return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(code) ? code : '';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/') return json({ service: 'NEON SURVIVOR co-op room server', status: 'online', version: 1, websocket: '/ws', capacity: MAX_PLAYERS });
    if (url.pathname !== '/ws') return json({ error: 'not found' }, 404);
    if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'websocket upgrade required' }, 426);
    const id = env.NEON_COOP_LOBBY.idFromName('room-lobby-v1');
    return env.NEON_COOP_LOBBY.get(id).fetch(request);
  }
};

export class NeonCoopLobby {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.rooms = new Map();
    this.ready = this.restore();
  }

  async restore() {
    const stored = await this.ctx.storage.get('rooms');
    for (const [code, room] of Object.entries(stored || {})) {
      if (room?.hostId && Array.isArray(room.members)) this.rooms.set(code, room);
    }
  }

  async persist() {
    await this.ctx.storage.put('rooms', Object.fromEntries(this.rooms));
  }

  async fetch(request) {
    await this.ready;
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: '', roomCode: '' });
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket, raw) {
    return this.handle(socket, raw);
  }

  webSocketClose(socket) {
    return this.leave(socket);
  }

  webSocketError(socket) {
    return this.leave(socket);
  }

  async handle(socket, raw) {
    await this.ready;
    let message;
    try { message = JSON.parse(raw); } catch (_) { return this.error(socket, '메시지를 읽을 수 없습니다.'); }
    const type = cleanText(message?.type, 32);
    if (type === 'create-room') return this.create(socket, message);
    if (type === 'join-room') return this.join(socket, message);
    if (type === 'set-ready') return this.setReady(socket, message);
    if (type === 'request-start') return this.start(socket, message);
    if (type === 'player-state') return this.playerState(socket, message);
    if (type === 'enemy-snapshot') return this.enemySnapshot(socket, message);
    if (type === 'damage-event') return this.damageEvent(socket, message);
    if (type === 'battle-ended') return this.battleEnded(socket, message);
    return this.error(socket, '알 수 없는 협동 요청입니다.');
  }

  async create(socket, message) {
    const code = roomCode(message.roomCode), profile = cleanProfile(message.profile);
    if (!code || !profile.id) return this.error(socket, '올바른 방 코드와 플레이어 정보가 필요합니다.');
    if (this.rooms.has(code)) return this.error(socket, '이미 사용 중인 방 코드입니다. 다시 만들어 주세요.');
    await this.leave(socket, false);
    this.rooms.set(code, { hostId: profile.id, members: [profile], createdAt: Date.now() });
    socket.serializeAttachment({ playerId: profile.id, roomCode: code });
    await this.persist();
    this.broadcast(code);
  }

  async join(socket, message) {
    const code = roomCode(message.roomCode), profile = cleanProfile(message.profile), room = this.rooms.get(code);
    if (!code || !profile.id) return this.error(socket, '올바른 방 코드와 플레이어 정보가 필요합니다.');
    if (!room) return this.error(socket, '방을 찾을 수 없습니다. 코드를 확인하세요.');
    if (room.members.some(member => member.id === profile.id)) return this.error(socket, '같은 계정은 하나의 방에 한 번만 참가할 수 있습니다.');
    if (room.members.length >= MAX_PLAYERS) return this.error(socket, '이 방은 이미 5명으로 가득 찼습니다.');
    await this.leave(socket, false);
    room.members.push(profile);
    socket.serializeAttachment({ playerId: profile.id, roomCode: code });
    await this.persist();
    this.broadcast(code);
  }

  async setReady(socket, message) {
    const attachment = socket.deserializeAttachment() || {}, room = this.rooms.get(attachment.roomCode);
    if (!room || message.roomCode !== attachment.roomCode) return this.error(socket, '참가 중인 방이 없습니다.');
    const member = room.members.find(entry => entry.id === attachment.playerId);
    if (!member) return this.error(socket, '플레이어 정보를 찾을 수 없습니다.');
    member.ready = Boolean(message.ready);
    await this.persist();
    this.broadcast(attachment.roomCode);
  }

  async start(socket, message) {
    const attachment = socket.deserializeAttachment() || {}, room = this.rooms.get(attachment.roomCode);
    if (!room || message.roomCode !== attachment.roomCode) return this.error(socket, '참가 중인 방이 없습니다.');
    if (attachment.playerId !== room.hostId) return this.error(socket, '방장만 작전을 시작할 수 있습니다.');
    if (room.members.length < 2) return this.error(socket, '협동 작전은 2명 이상 필요합니다.');
    if (!room.members.every(member => member.ready)) return this.error(socket, '모든 플레이어가 준비해야 합니다.');
    this.broadcast(attachment.roomCode, { type: 'start-approved', roomCode: attachment.roomCode, matchId: crypto.randomUUID(), hostId: room.hostId, spawn: { x: 640, y: 360 }, players: room.members.map(member => ({ ...member })) });
  }

  playerState(socket, message) {
    const attachment = socket.deserializeAttachment() || {}, room = this.rooms.get(attachment.roomCode), state = message.player;
    if (!room || message.roomCode !== attachment.roomCode || !state || state.id !== attachment.playerId) return this.error(socket, '전투 연결을 확인할 수 없습니다.');
    const player = { id: attachment.playerId, nickname: cleanText(state.nickname, 18) || 'SURVIVOR', agent: cleanText(state.agent, 32) || '훈련 요원', icon: cleanText(state.icon, 16) || '◉', x: Math.max(20, Math.min(1260, Number(state.x) || 640)), y: Math.max(20, Math.min(700, Number(state.y) || 360)), hp: Math.max(0, Math.min(10000, Number(state.hp) || 0)), maxHp: Math.max(1, Math.min(10000, Number(state.maxHp) || 100)) };
    this.broadcast(attachment.roomCode, { type: 'player-state', roomCode: attachment.roomCode, player });
  }

  enemySnapshot(socket, message) {
    const attachment = socket.deserializeAttachment() || {}, room = this.rooms.get(attachment.roomCode);
    if (!room || message.roomCode !== attachment.roomCode || attachment.playerId !== room.hostId) return this.error(socket, '전투 권한을 확인할 수 없습니다.');
    const input = Array.isArray(message.enemies) ? message.enemies.slice(0, 180) : [];
    const enemies = input.map(enemy => ({
      id: Math.max(1, Math.floor(Number(enemy.id) || 0)),
      x: Math.max(-1280, Math.min(2560, Number(enemy.x) || 0)),
      y: Math.max(-720, Math.min(1440, Number(enemy.y) || 0)),
      r: Math.max(5, Math.min(120, Number(enemy.r) || 14)),
      hp: Math.max(0, Math.min(10000000, Number(enemy.hp) || 0)),
      maxHp: Math.max(1, Math.min(10000000, Number(enemy.maxHp) || 1)),
      speed: Math.max(0, Math.min(2000, Number(enemy.speed) || 0)),
      damage: Math.max(0, Math.min(100000, Number(enemy.damage) || 0)),
      color: cleanText(enemy.color, 40) || '#f05272',
      boss: Boolean(enemy.boss),
      elite: Boolean(enemy.elite),
      name: cleanText(enemy.name, 40)
    }));
    this.broadcast(attachment.roomCode, { type: 'enemy-snapshot', roomCode: attachment.roomCode, enemies, stage: Math.max(0, Math.floor(Number(message.stage) || 0)), stageKills: Math.max(0, Math.floor(Number(message.stageKills) || 0)), stageThreat: Math.max(1, Math.min(100, Number(message.stageThreat) || 1)) });
  }

  damageEvent(socket, message) {
    const attachment = socket.deserializeAttachment() || {}, room = this.rooms.get(attachment.roomCode), damage = Number(message.damage);
    if (!room || message.roomCode !== attachment.roomCode || !room.members.some(member => member.id === attachment.playerId)) return this.error(socket, '전투 연결을 확인할 수 없습니다.');
    if (!Number.isFinite(damage) || damage <= 0 || damage > 250000) return;
    this.broadcast(attachment.roomCode, { type: 'damage-event', roomCode: attachment.roomCode, fromId: attachment.playerId, targetId: Math.max(1, Math.floor(Number(message.targetId) || 0)), damage: Math.min(250000, damage) });
  }

  battleEnded(socket, message) {
    const attachment = socket.deserializeAttachment() || {}, room = this.rooms.get(attachment.roomCode);
    if (!room || message.roomCode !== attachment.roomCode || attachment.playerId !== room.hostId) return this.error(socket, '작전 종료 권한을 확인할 수 없습니다.');
    this.broadcast(attachment.roomCode, { type: 'battle-ended', roomCode: attachment.roomCode, win: Boolean(message.win) });
  }

  async leave(socket, announce = true) {
    await this.ready;
    const attachment = socket.deserializeAttachment() || {}, room = this.rooms.get(attachment.roomCode);
    if (!room || !attachment.playerId) return;
    room.members = room.members.filter(member => member.id !== attachment.playerId);
    if (!room.members.length) this.rooms.delete(attachment.roomCode);
    else if (room.hostId === attachment.playerId) room.hostId = room.members[0].id;
    socket.serializeAttachment({ playerId: '', roomCode: '' });
    await this.persist();
    if (announce && this.rooms.has(attachment.roomCode)) this.broadcast(attachment.roomCode);
  }

  broadcast(code, directMessage) {
    const room = this.rooms.get(code);
    if (!room && !directMessage) return;
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = socket.deserializeAttachment() || {};
      if (attachment.roomCode !== code) continue;
      const payload = directMessage || { type: 'room-state', roomCode: code, host: attachment.playerId === room.hostId, members: room.members.map(member => ({ ...member })) };
      try { socket.send(JSON.stringify(payload)); } catch (_) { /* disconnect cleanup will run separately */ }
    }
  }

  error(socket, message) {
    try { socket.send(JSON.stringify({ type: 'room-error', message })); } catch (_) {}
  }
}
