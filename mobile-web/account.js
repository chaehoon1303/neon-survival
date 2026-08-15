/*
 * Account and cloud-save foundation.  It deliberately keeps every existing
 * `neon*` localStorage key intact.  Credentials never live in this file:
 * account-config.js may expose only a Supabase publishable key and a separate
 * authoritative progress API URL.
 */
(function () {
  const SESSION_KEY = 'neonAccountSession';
  const SNAPSHOT_KEY = 'neonAccountSnapshot';
  const CHANGE_KEY = 'neonAccountLastLocalChange';
  const GUEST_IDENTITY_KEY = 'neonGuestIdentity';
  const EXPLICIT_LOGOUT_KEY = 'neonAccountExplicitLogout';
  const SAVE_VERSION = 1;
  const ACCOUNT_KEYS = new Set([SESSION_KEY, SNAPSHOT_KEY, CHANGE_KEY, GUEST_IDENTITY_KEY, EXPLICIT_LOGOUT_KEY, 'neonCoopServerUrl', 'neonCoopLastRoom']);
  const config = window.NEON_ACCOUNT_CONFIG || {};
  const account = { supabase: null, session: null, saving: false, queued: false, lastHash: '', saveTimer: 0, cloudLastSavedAt: 0 };

  function safeJson(value, fallback) { try { return JSON.parse(value); } catch (_) { return fallback; } }
  function now() { return Date.now(); }
  function uid() { return crypto?.randomUUID?.() || `guest-${now()}-${Math.random().toString(36).slice(2, 10)}`; }
  function nickname() { return `NEON_${Math.floor(100 + Math.random() * 900)}`; }
  function readSession() { return safeJson(localStorage.getItem(SESSION_KEY) || 'null', null); }
  function writeSession(session) {
    account.session = session;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.removeItem(EXPLICIT_LOGOUT_KEY);
    if (session?.guest) localStorage.setItem(GUEST_IDENTITY_KEY, JSON.stringify(session));
  }
  function recoverGuestSession() {
    if (localStorage.getItem(EXPLICIT_LOGOUT_KEY) === '1') return null;
    const backup = safeJson(localStorage.getItem(GUEST_IDENTITY_KEY) || 'null', null);
    if (backup?.userId) return { ...backup, guest: true, provider: 'guest', updatedAt: now() };
    /* 이전 빌드에서 게스트 세션 키만 사라진 경우 진행 변경 시각으로 복구한다. */
    if (localStorage.getItem(CHANGE_KEY) !== null) return { userId: uid(), nickname: nickname(), provider: 'guest', guest: true, recovered: true, createdAt: now(), updatedAt: now() };
    return null;
  }
  function hasAuthConfig() { return /^https:\/\//.test(config.supabaseUrl || '') && /^(sb_publishable_|eyJ)/.test(config.supabasePublishableKey || ''); }
  function hasProgressApi() { return /^https:\/\//.test(config.progressApiBase || ''); }
  function saveIndicator(state, detail = '') { const node = document.querySelector('#cloud-save-indicator'); if (!node) return; node.className = `cloud-save-indicator ${state}`; node.textContent = state === 'saving' ? '저장 중…' : state === 'saved' ? `✓ 저장 완료${detail ? ` · ${detail}` : ''}` : state === 'offline' ? '⚠ 오프라인 · 기기에 임시 저장' : state === 'guest' ? '게스트 · 기기 저장' : '클라우드 대기'; }
  function profileData() {
    const records = safeJson(localStorage.getItem('neonRecords') || '{}', {}), level = safeJson(localStorage.getItem('neonPlayerLevel') || '{}', {}), mastery = safeJson(localStorage.getItem('neonWeaponMastery') || '{}', {}), secrets = safeJson(localStorage.getItem('neonSecretArchive') || '{}', {});
    const masters = Object.values(mastery).filter(entry => Number(entry?.xp || 0) >= 11400).length;
    return { level: level.level || 1, hours: Math.floor((records.totalTime || records.bestSurvival || 0) / 3600), stage: Number(localStorage.getItem('neonUnlocked') || 0) + 1, masters, secrets: Object.keys(secrets).length, totalSecrets: 5 };
  }
  function groupForKey(key) {
    if (/Inventory|Equipped|Gear|StarterWeapon/.test(key)) return 'inventory';
    if (/Operative|SelectedCharacter/.test(key)) return 'characters';
    if (/Unlocked|Stage|Base|Mode|Endless|Bounty|Season|Core/.test(key)) return 'world';
    if (/Codex|Fusion|Secret|Achievement|Records|WeaponMastery|Relic/.test(key)) return 'collection';
    if (/PlayerLevel|Coins|Quest|Attendance/.test(key)) return 'progress';
    return 'settings';
  }
  function parseStored(value) { const parsed = safeJson(value, undefined); return parsed === undefined ? value : parsed; }
  function stringifyStored(value) { return typeof value === 'string' ? value : JSON.stringify(value); }
  function captureSnapshot() {
    const groups = { profile: {}, progress: {}, inventory: {}, characters: {}, world: {}, collection: {}, settings: {} };
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith('neon') || ACCOUNT_KEYS.has(key)) continue;
      groups[groupForKey(key)][key] = parseStored(localStorage.getItem(key));
    }
    return { saveVersion: SAVE_VERSION, updatedAt: Number(localStorage.getItem(CHANGE_KEY) || now()), groups };
  }
  function snapshotHash(snapshot) { return JSON.stringify(snapshot.groups); }
  function unionArray(a, b) { const seen = new Set(), out = []; [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].forEach(item => { const key = item?.instanceId || item?.id || `${item?.slot || ''}:${item?.name || JSON.stringify(item)}`; if (!seen.has(key)) { seen.add(key); out.push(item); } }); return out; }
  function mergeValue(local, remote) {
    if (local === undefined) return remote;
    if (remote === undefined) return local;
    if (Array.isArray(local) || Array.isArray(remote)) return unionArray(local, remote);
    if (typeof local === 'number' && typeof remote === 'number') return Math.max(local, remote);
    if (local && remote && typeof local === 'object' && typeof remote === 'object') return { ...remote, ...local };
    return local;
  }
  function mergeSnapshots(local, remote) {
    const merged = { saveVersion: SAVE_VERSION, updatedAt: Math.max(local.updatedAt || 0, remote?.updatedAt || 0), groups: {} };
    for (const group of Object.keys(local.groups)) { const left = local.groups[group] || {}, right = remote?.groups?.[group] || {}; merged.groups[group] = {}; new Set([...Object.keys(left), ...Object.keys(right)]).forEach(key => { merged.groups[group][key] = mergeValue(left[key], right[key]); }); }
    return merged;
  }
  function applySnapshot(snapshot) { if (!snapshot?.groups) return; Object.values(snapshot.groups).forEach(group => Object.entries(group || {}).forEach(([key, value]) => { if (key.startsWith('neon') && !ACCOUNT_KEYS.has(key)) localStorage.setItem(key, stringifyStored(value)); })); localStorage.setItem(CHANGE_KEY, String(snapshot.updatedAt || now())); }
  function markChanged() { localStorage.setItem(CHANGE_KEY, String(now())); scheduleSave(); }
  function migrationAvailable() { const snapshot = captureSnapshot(); return Object.values(snapshot.groups).some(group => Object.keys(group).length); }
  async function initSupabase() {
    if (!hasAuthConfig()) return null;
    if (account.supabase) return account.supabase;
    try { const module = await import('https://esm.sh/@supabase/supabase-js@2'); account.supabase = module.createClient(config.supabaseUrl, config.supabasePublishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }); return account.supabase; } catch (error) { console.warn('계정 인증 모듈을 불러오지 못했습니다.', error); return null; }
  }
  async function formalSession() { const client = await initSupabase(); if (!client) return null; const { data } = await client.auth.getSession(); return data?.session || null; }
  async function adoptFormalSession(session) {
    if (!session?.user) return;
    const previous = readSession(), metadata = session.user.user_metadata || {}, provider = session.user.app_metadata?.provider || 'email';
    writeSession({ userId: session.user.id, nickname: metadata.nickname || metadata.full_name || previous?.nickname || `NEON_${session.user.id.slice(0, 4).toUpperCase()}`, provider, guest: false, linkedGuestId: previous?.guest ? previous.userId : null, createdAt: previous?.createdAt || now(), updatedAt: now() });
    await requestCloudSync(true);
    hideLogin(); renderAccount();
  }
  async function signIn(provider) {
    const client = await initSupabase();
    if (!client) { setLoginMessage('인증 서비스 설정이 아직 완료되지 않았습니다. 게스트 플레이는 바로 가능합니다.'); return; }
    const { error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo: `${location.origin}${location.pathname}` } });
    if (error) setLoginMessage(error.message);
  }
  async function signInEmail() {
    const input = document.querySelector('#account-email'), email = String(input?.value || '').trim(), client = await initSupabase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) { setLoginMessage('이메일 주소를 확인하세요.'); return; }
    if (!client) { setLoginMessage('인증 서비스 설정이 아직 완료되지 않았습니다.'); return; }
    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}${location.pathname}` } });
    setLoginMessage(error ? error.message : '이메일로 안전한 로그인 링크를 보냈습니다.');
  }
  function startGuest() { const previous = readSession() || recoverGuestSession(); if (!previous) writeSession({ userId: uid(), nickname: nickname(), provider: 'guest', guest: true, createdAt: now(), updatedAt: now() }); else writeSession(previous); localStorage.setItem(CHANGE_KEY, String(now())); hideLogin(); saveIndicator('guest'); renderAccount(); }
  function setLoginMessage(message) { const node = document.querySelector('#account-login-message'); if (node) node.textContent = message; }
  function showLogin() { document.querySelector('#account-gate')?.classList.remove('hidden'); }
  function hideLogin() { document.querySelector('#account-gate')?.classList.add('hidden'); }
  async function accessToken() { const session = await formalSession(); return session?.access_token || ''; }
  async function remoteRequest(method, path, payload) {
    const token = await accessToken(); if (!token || !hasProgressApi()) throw new Error('클라우드 서버에 연결되지 않았습니다.');
    const response = await fetch(`${config.progressApiBase.replace(/\/$/, '')}${path}`, { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: payload ? JSON.stringify(payload) : undefined, cache: 'no-store', keepalive: method !== 'GET' });
    if (!response.ok) throw new Error(`클라우드 저장 오류 (${response.status})`);
    return response.status === 204 ? null : response.json();
  }
  async function requestCloudSync(initial = false) {
    const session = account.session || readSession();
    if (!session || session.guest) { saveIndicator('guest'); return; }
    if (!navigator.onLine) { saveIndicator('offline'); return; }
    if (!hasProgressApi()) { saveIndicator('pending'); return; }
    try {
      const local = captureSnapshot(), response = await remoteRequest('GET', '/v1/progress'); const remote = response?.progress;
      if (remote?.groups) { const merged = mergeSnapshots(local, remote); applySnapshot(merged); localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(merged)); await remoteRequest('PUT', '/v1/progress', merged); account.cloudLastSavedAt = now(); saveIndicator('saved', '동기화'); }
      else { await remoteRequest('PUT', '/v1/progress', local); localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(local)); account.cloudLastSavedAt = now(); saveIndicator('saved'); }
      if (initial) setLoginMessage('계정 연결 및 진행 데이터 동기화가 완료되었습니다.');
    } catch (error) { console.warn(error); saveIndicator(navigator.onLine ? 'pending' : 'offline'); }
    renderAccount();
  }
  async function flushSave() {
    if (account.saving || !account.queued) return;
    account.queued = false; const session = account.session || readSession();
    if (!session || session.guest) { saveIndicator('guest'); return; }
    if (!navigator.onLine) { saveIndicator('offline'); account.queued = true; return; }
    if (!hasProgressApi()) { saveIndicator('pending'); return; }
    account.saving = true; saveIndicator('saving');
    try { const snapshot = captureSnapshot(); await remoteRequest('PUT', '/v1/progress', snapshot); localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot)); account.cloudLastSavedAt = now(); saveIndicator('saved'); } catch (error) { console.warn(error); account.queued = true; saveIndicator(navigator.onLine ? 'pending' : 'offline'); } finally { account.saving = false; if (account.queued) scheduleSave(); renderAccount(); }
  }
  function scheduleSave() { clearTimeout(account.saveTimer); account.queued = true; account.saveTimer = setTimeout(flushSave, 1800); }
  async function uploadLocalMigration() { const session = account.session || readSession(); if (!session || session.guest) { setAccountMessage('먼저 Google·Apple·이메일 계정을 연결하세요.'); return; } if (!hasProgressApi()) { setAccountMessage('클라우드 서버가 아직 연결되지 않았습니다. 로컬 데이터는 안전하게 유지됩니다.'); return; } account.queued = true; await flushSave(); setAccountMessage('기존 기기 진행 데이터를 계정에 저장했습니다.'); }
  function setAccountMessage(message) { const node = document.querySelector('#account-message'); if (node) node.textContent = message; }
  async function logout() { const client = await initSupabase(); if (client) await client.auth.signOut(); localStorage.removeItem(SESSION_KEY); localStorage.setItem(EXPLICIT_LOGOUT_KEY, '1'); account.session = null; showLogin(); renderAccount(); }
  function renderAccount() {
    const screen = document.querySelector('#account'), session = account.session || readSession(), profile = profileData(); if (!screen) return;
    const cloud = session?.guest ? '기기 저장 · 계정 연결 가능' : hasProgressApi() ? '클라우드 동기화 사용' : '클라우드 서버 연결 대기';
    screen.querySelector('#account-profile').innerHTML = session ? `<i>${session.nickname.slice(0, 1)}</i><div><small>PLAYER PROFILE</small><b>${session.nickname}</b><span>LV.${profile.level} · ${session.provider === 'guest' ? 'GUEST' : session.provider.toUpperCase()}</span></div>` : '<b>계정을 불러오는 중…</b>';
    screen.querySelector('#account-details').innerHTML = `<span><b>PLAYER ID</b><small>${session?.userId || '-'}</small></span><span><b>플레이 시간</b><small>${profile.hours}시간</small></span><span><b>최고 지역</b><small>${profile.stage} 구역</small></span><span><b>무기 MASTER</b><small>${profile.masters}</small></span><span><b>비밀 발견</b><small>${profile.secrets} / ${profile.totalSecrets}</small></span><span><b>클라우드</b><small>${cloud}</small></span>`;
    const canMigrate = !!session && !session.guest && migrationAvailable();
    screen.querySelector('#account-migration').classList.toggle('hidden', !canMigrate);
    screen.querySelector('#account-status').textContent = account.cloudLastSavedAt ? `마지막 저장 ${new Date(account.cloudLastSavedAt).toLocaleTimeString('ko-KR')}` : cloud;
    screen.querySelector('#account-link').textContent = session?.guest ? '계정 연결' : '클라우드 동기화';
  }
  function injectUi() {
    const shell = document.querySelector('#game-shell'); if (!shell || document.querySelector('#account-gate')) return;
    shell.insertAdjacentHTML('beforeend', `<section id="account-gate" class="account-gate hidden" aria-modal="true"><div class="account-terminal"><p>NEON ROGUELITE</p><h1>NEON<br><span>SURVIVOR</span></h1><b>WELCOME, SURVIVOR</b><small id="account-login-message">신원을 확인하거나 게스트로 출격하세요.</small><button id="account-google" class="account-oauth google">G Google로 계속하기</button><button id="account-apple" class="account-oauth apple">● Apple로 계속하기</button><div class="account-email"><input id="account-email" type="email" placeholder="이메일 주소" autocomplete="email"><button id="account-email-login">이메일로 로그인</button></div><i>────────</i><button id="account-guest" class="account-guest">게스트로 시작</button><em>비밀번호를 이 게임에서 저장하지 않습니다.</em></div></section><section id="account" class="screen hidden modal-screen account-screen"><button id="account-close" class="close">×</button><p class="label">ACCOUNT TERMINAL</p><h2>계정</h2><section id="account-profile" class="account-profile"></section><section id="account-details" class="account-details"></section><p id="account-status" class="account-status"></p><p id="account-message" class="account-message"></p><section id="account-migration" class="account-migration"><b>기존 게임 데이터를 발견했습니다.</b><small>이 기기의 진행도는 삭제하지 않고 계정 클라우드 세이브에 복사합니다.</small><button id="account-migrate">이 데이터를 계정에 저장</button></section><div class="account-actions"><button id="account-link">계정 연결</button><button id="account-sync">지금 동기화</button><button id="account-logout">로그아웃</button></div></section><div id="cloud-save-indicator" class="cloud-save-indicator">클라우드 대기</div>`);
    document.querySelector('#account-google').onclick = () => signIn('google'); document.querySelector('#account-apple').onclick = () => signIn('apple'); document.querySelector('#account-email-login').onclick = signInEmail; document.querySelector('#account-guest').onclick = startGuest;
    document.querySelector('#account-close').onclick = () => document.querySelector('#account').classList.add('hidden'); document.querySelector('#account-migrate').onclick = uploadLocalMigration; document.querySelector('#account-link').onclick = showLogin; document.querySelector('#account-sync').onclick = () => requestCloudSync(false); document.querySelector('#account-logout').onclick = logout;
    const settings = document.querySelector('#settings'); if (settings && !document.querySelector('#account-open')) settings.insertAdjacentHTML('beforeend', '<button id="account-open" class="account-open">◉ 계정 / 클라우드 저장</button>'); document.querySelector('#account-open')?.addEventListener('click', () => { document.querySelector('#settings').classList.add('hidden'); document.querySelector('#account').classList.remove('hidden'); renderAccount(); });
  }
  async function initialize() {
    injectUi(); account.session = readSession();
    if (!account.session) { const recovered = recoverGuestSession(); if (recovered) writeSession(recovered); }
    const formal = await formalSession(); if (formal) await adoptFormalSession(formal);
    if (!account.session) showLogin(); else { hideLogin(); saveIndicator(account.session.guest ? 'guest' : hasProgressApi() ? 'pending' : 'pending'); }
    account.lastHash = snapshotHash(captureSnapshot()); renderAccount();
    setInterval(() => { const snapshot = captureSnapshot(), hash = snapshotHash(snapshot); if (hash !== account.lastHash) { account.lastHash = hash; markChanged(); } }, 4000);
    addEventListener('online', () => { if (account.queued) flushSave(); else requestCloudSync(false); }); addEventListener('offline', () => saveIndicator('offline')); addEventListener('pagehide', () => { if (account.queued) flushSave(); }); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && account.queued) flushSave(); });
  }
  window.NEON_ACCOUNT = { captureSnapshot, requestCloudSync, setConfig(next) { Object.assign(config, next || {}); }, getSession() { return account.session || readSession(); } };
  setTimeout(initialize, 0);
})();
