// 전투 모드: 정복은 기존 맵 규칙, 무한/보스 러시는 별도 전투 규칙을 사용한다.
const gameModes = [
  { id: 'conquest', icon: '⚔', name: '정복 모드', detail: '맵을 하나씩 정복해 최후의 신전에 도전합니다.' },
  { id: 'endless', icon: '∞', name: '무한 모드', detail: '끝없이 강해지는 적 속에서 생존 시간을 겨룹니다.' },
  { id: 'bossrush', icon: '👑', name: '보스 러시', detail: '보스를 연속 격파하고 대량 경험치를 획득합니다.' }
];

let selectedMode = localStorage.neonMode || 'conquest';
let activeMode = 'conquest';
let endlessBest = Number(localStorage.neonEndlessBest || 0);
let bossRushWave = 0;
let bossRushBoss = null;
let bossRushDelay = 0;

const bossRushNames = [
  'MK-1 훈련 로봇', '라바 타이탄', '네온 코어', '샌드 웜', '프로스트 타이탄',
  '베놈 킹', '레드 드래곤', '오비탈 코어', '크라켄', '창조자 오메가'
];

function renderModes() {
  const list = $('#mode-list'), play = $('#mode-play');
  if (!list || !play) return;
  list.innerHTML = gameModes.map(mode => `<button class="mode-card ${mode.id === selectedMode ? 'selected' : ''}" data-mode="${mode.id}">
    <span>${mode.icon}</span><b>${mode.name}</b><small>${mode.detail}</small>${mode.id === selectedMode ? '<em>선택됨</em>' : ''}
  </button>`).join('');
  play.textContent = `${gameModes.find(mode => mode.id === selectedMode).name} 플레이`;
  list.querySelectorAll('[data-mode]').forEach(button => button.onclick = () => {
    selectedMode = button.dataset.mode;
    localStorage.neonMode = selectedMode;
    renderModes();
    pop(`${gameModes.find(mode => mode.id === selectedMode).name} 선택`);
  });
}

function grantBossRushXp() {
  // 보스 1회 처치마다 다음 레벨 요구치보다 많은 경험치를 지급한다.
  player.xp += Math.ceil(player.next * 1.35);
  if (player.xp >= player.next) {
    player.xp -= player.next;
    player.level++;
    player.next = Math.floor(player.next * 1.28);
    levelUp();
  }
}

function spawnBossRushBoss() {
  const wave = bossRushWave;
  const scale = 1 + wave * 0.28;
  const hue = (wave * 43 + 285) % 360;
  const hp = Math.floor(430 * scale);
  const e = {
    id: nextId++, x: W / 2, y: 118, r: Math.min(62, 42 + wave * 1.5),
    hp, maxHp: hp, speed: 30 + wave * 2.2, damage: 12 + wave * 1.8,
    color: `hsl(${hue} 88% 63%)`, boss: true,
    name: bossRushNames[wave % bossRushNames.length], patternCd: 1.6
  };
  enemies.push(e);
  boss = e;
  bossRushBoss = e;
  pop(`👑 BOSS ${wave + 1} · ${e.name}`);
}

function beginSelectedMode() {
  $('#modes').classList.add('hidden');
  $('#menu').classList.remove('hidden');
  activeMode = selectedMode;

  // 모드는 맵 잠금과 무관하게 별도 전장으로 시작한다.
  if (activeMode !== 'conquest') selected = 0;
  tryBegin();
  if (!run) return;

  if (activeMode === 'endless') {
    stage = 0;
    stageKills = 0;
    stageThreat = 1;
    ui.map.textContent = '∞ 무한 모드';
    pop('∞ 무한 모드 시작! 시간이 지날수록 적이 급격히 강해집니다.');
  }
  if (activeMode === 'bossrush') {
    enemies = [];
    boss = null;
    stage = 0;
    stageKills = 0;
    bossRushWave = 0;
    bossRushBoss = null;
    bossRushDelay = .7;
    ui.map.textContent = '👑 보스 러시';
    pop('👑 보스 러시 시작! 보스를 쓰러뜨리면 대량 경험치를 얻습니다.');
  }
}

// 기존 전투를 감싸 모드별 규칙만 바꾼다.
const normalClearStage = clearStage;
clearStage = function () {
  if (activeMode !== 'endless') return normalClearStage();
  stage++;
  stageKills = 0;
  boss = null;
  bossSpawned = false;
  bossDefeated = false;
  // 스테이지가 계속될수록 체력·공격력·이동 속도에 모두 곱해지는 위협도.
  stageThreat = 1 + stage * .14;
  player.hp = Math.min(player.maxHp, player.hp + 8);
  pop(`∞ STAGE ${stage + 1} · 위협도 x${stageThreat.toFixed(1)}`);
};

const normalSpawnEnemy = spawnEnemy;
spawnEnemy = function (isBoss = false) {
  // 보스 러시에는 일반 몬스터가 생성되지 않는다.
  if (activeMode === 'bossrush' && !isBoss) return;
  return normalSpawnEnemy(isBoss);
};

const normalEnd = end;
end = function (win = false) {
  if (activeMode === 'endless') {
    const score = Math.floor(time);
    if (score > endlessBest) {
      endlessBest = score;
      localStorage.neonEndlessBest = endlessBest;
    }
  }
  normalEnd(win);
  if (activeMode === 'endless') {
    $('#result-detail').textContent += ` · ∞ 최고 기록 ${endlessBest}초`;
  }
};

// 기존 캔버스 루프를 유지하면서, 모드 전장에는 맵 이름/배경 대신 모드 정보를 표시한다.
const normalUpdate = update;
update = function (dt) {
  normalUpdate(dt);
  if (!run) return;
  if (activeMode === 'endless') {
    ui.map.textContent = '∞ 무한 회랑';
    ui.stageLabel.textContent = `∞ WAVE ${stage + 1} · 위협도 x${stageThreat.toFixed(1)}`;
    ui.stageText.textContent = `${stageKills} / ${Math.floor(12 + stage * 5)} 처치`;
  } else if (activeMode === 'bossrush') {
    ui.map.textContent = '👑 보스 러시 전장';
    ui.stageLabel.textContent = `👑 BOSS RUSH · WAVE ${bossRushWave + 1}`;
    ui.stageText.textContent = bossRushBoss ? `BOSS HP ${Math.max(0, Math.ceil(bossRushBoss.hp))}` : '다음 보스 준비 중';
  }
};

const normalDraw = draw;
draw = function () {
  // 기존 맵 선택값을 바꾸지 않고도 모드별 전장 색을 사용한다.
  const originalBackground = maps[selected].bg;
  if (run && activeMode === 'endless') maps[selected].bg = '#090d20';
  if (run && activeMode === 'bossrush') maps[selected].bg = '#1a091d';
  normalDraw();
  maps[selected].bg = originalBackground;
};

// 보스 러시 감독: 죽은 보스를 감지해 경험치를 지급하고 다음 보스를 중앙에 소환한다.
let modeLastFrame = performance.now();
function updateBossRushMode(now) {
  const dt = Math.min(.1, (now - modeLastFrame) / 1000);
  modeLastFrame = now;
  if (run && activeMode === 'bossrush' && !paused) {
    if (bossRushBoss && !enemies.includes(bossRushBoss)) {
      bossRushWave++;
      bossRushBoss = null;
      boss = null;
      bossRushDelay = 1.1;
      grantBossRushXp();
    }
    if (!bossRushBoss) {
      bossRushDelay -= dt;
      if (bossRushDelay <= 0) spawnBossRushBoss();
    }
  }
  requestAnimationFrame(updateBossRushMode);
}
requestAnimationFrame(updateBossRushMode);

$('#mode-button').onclick = () => {
  renderModes();
  $('#menu').classList.add('hidden');
  $('#modes').classList.remove('hidden');
};
$('#mode-play').onclick = beginSelectedMode;
$('#retry-button').onclick = () => {
  activeMode = selectedMode;
  beginSelectedMode();
};
renderModes();
