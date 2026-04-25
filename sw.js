/**
 * 銀河護衛 - 完整遊戲邏輯與過場動畫系統
 * 嚴格依照需求整合：三關前後過場、自動射擊、拖曳控制、音訊解鎖、PWA相容
 */

// ================= 全域設定與狀態 =================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = 'MENU'; // MENU | PRE_LEVEL | PLAYING | POST_LEVEL | GAME_OVER
let currentLevel = 1;
const maxLevels = 3;
let levelHits = 0;
const hitsRequired = 20;

// 遊戲實體
let player = { x: 0, y: 0, size: 40, speed: 0 };
let enemies = [];
let bullets = [];
let particles = [];
let stars = []; // 背景星空

// 計時器
let lastTime = 0;
let spawnTimer = 0;
let shootTimer = 0;

// 音訊與工具
let audioCtx = null;
function ensureAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
function unlockSFX() { /* 保留您原有的 SFX 解鎖邏輯 */ }
function playBGM() { /* 保留您原有的 BGM 播放邏輯 */ }
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// ================= Canvas 初始化與背景星空 =================
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (gameState === 'MENU' || gameState === 'PLAYING') {
    player.x = canvas.width / 2;
    player.y = canvas.height - 120;
  }
  initStars();
}
function initStars() {
  stars = [];
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 1 + 0.3
    });
  }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ================= 輸入控制 (拖曳移動) =================
let isDragging = false;
let dragOffsetX = 0, dragOffsetY = 0;

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}
canvas.addEventListener('mousedown', e => handleStart(getPos(e)));
canvas.addEventListener('mousemove', e => handleMove(getPos(e)));
canvas.addEventListener('mouseup', handleEnd);
canvas.addEventListener('touchstart', e => { e.preventDefault(); handleStart(getPos(e.touches[0])); }, { passive: false });
canvas.addEventListener('touchmove', e => { e.preventDefault(); handleMove(getPos(e.touches[0])); }, { passive: false });
canvas.addEventListener('touchend', handleEnd);

function handleStart(pos) {
  if (gameState !== 'PLAYING') return;
  isDragging = true;
  dragOffsetX = pos.x - player.x;
  dragOffsetY = pos.y - player.y;
}
function handleMove(pos) {
  if (!isDragging || gameState !== 'PLAYING') return;
  player.x = Math.max(player.size/2, Math.min(canvas.width - player.size/2, pos.x - dragOffsetX));
  player.y = Math.max(player.size/2, Math.min(canvas.height - player.size/2, pos.y - dragOffsetY));
}
function handleEnd() { isDragging = false; }

// ================= 過場動畫系統 =================
function showPreLevel(level) {
  return new Promise(resolve => {
    const overlay = document.getElementById('preLevelOverlay');
    const img = document.getElementById('preLevelImg');
    const loader = overlay.querySelector('.loading-ring');
    
    overlay.classList.remove('hidden');
    loader.style.display = 'block';
    img.style.opacity = '0';
    img.src = `CHAPTER-0${level}.png`;
    gameState = 'PRE_LEVEL';

    img.onload = () => {
      loader.style.display = 'none';
      img.style.opacity = '1';
    };

    const dismiss = () => {
      overlay.classList.add('hidden');
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('click', dismiss);
      window.removeEventListener('touchstart', dismiss);
      gameState = 'PLAYING';
      resolve();
    };
    window.addEventListener('keydown', dismiss, { once: true });
    window.addEventListener('click', dismiss, { once: true });
    window.addEventListener('touchstart', dismiss, { once: true });
  });
}

function showPostLevel(level) {
  return new Promise(resolve => {
    const overlay = document.getElementById('postLevelOverlay');
    const video = document.getElementById('postLevelVideo');
    const prompt = document.getElementById('postLevelPrompt');
    
    // 嚴格對應：第一關->01, 第二關->02, 第三關->03
    const videoFile = `CHAPTER-0${level}-ENDING.mp4`;
    video.src = videoFile;
    video.load();
    
    // 處理行動裝置自動播放策略
    const playVideo = () => {
      video.play().catch(err => {
        console.warn('影片自動播放被瀏覽器策略攔截，將等待使用者點擊後繼續:', err);
      });
    };

    prompt.textContent = level === maxLevels ? '點擊任意鍵結束遊戲' : '點擊任意鍵繼續';
    overlay.classList.remove('hidden');
    gameState = 'POST_LEVEL';
    
    // 延遲一點點確保 DOM 渲染完成後嘗試播放
    setTimeout(playVideo, 150);

    const dismiss = () => {
      overlay.classList.add('hidden');
      video.pause();
      video.currentTime = 0;
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('click', dismiss);
      window.removeEventListener('touchstart', dismiss);
      resolve();
    };
    window.addEventListener('keydown', dismiss, { once: true });
    window.addEventListener('click', dismiss, { once: true });
    window.addEventListener('touchstart', dismiss, { once: true });
  });
}

// ================= 遊戲流程控制 =================
async function startGame() {
  ensureAudioContext();  // 1. 解鎖 AudioContext
  unlockSFX();           // 2. 解鎖 SFX
  await delay(100);      // 3. 等待音訊上下文完全就緒
  playBGM();             // 4. 播放 BGM
  
  document.getElementById('menuScreen').classList.add('hidden');
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('levelEndScreen').classList.add('hidden');

  for (let level = 1; level <= maxLevels; level++) {
    currentLevel = level;
    levelHits = 0;
    updateHUD();

    // 1. 顯示關卡開始圖片
    await showPreLevel(level);

    // 2. 啟動該關卡遊戲循環
    await runLevelGameplay();

    // 3. 顯示關卡結束動畫
    await showPostLevel(level);

    if (level === maxLevels) {
      endGame(true);
    } else {
      // 準備下一關 (可在此加入短暫延遲或提示)
      await delay(300);
    }
  }
}

function updateHUD() {
  document.getElementById('hud').textContent = `擊中: ${levelHits} / ${hitsRequired} 第 ${currentLevel} 關`;
}

function endGame(victory = false) {
  gameState = 'GAME_OVER';
  const title = document.getElementById('gameOverTitle');
  title.textContent = victory ? '🎉 恭喜您完成三關挑戰！' : 'GAME OVER';
  document.getElementById('gameOverScreen').classList.remove('hidden');
}

// ================= 遊戲核心循環 =================
function runLevelGameplay() {
  return new Promise(resolve => {
    gameState = 'PLAYING';
    enemies = []; bullets = []; particles = [];
    player.x = canvas.width / 2;
    player.y = canvas.height - 120;
    lastTime = performance.now();
    
    function loop(timestamp) {
      if (gameState !== 'PLAYING') return;
      const dt = Math.min((timestamp - lastTime) / 16.67, 2.5); // 限制最大 delta 防跳躍
      lastTime = timestamp;

      update(dt);
      draw();

      if (levelHits >= hitsRequired) {
        resolve(); // 關卡通過，跳出循環
        return;
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });
}

function update(dt) {
  // 背景星空移動
  stars.forEach(s => {
    s.y += s.speed * dt;
    if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
  });

  // 自動射擊 (維持您原有參數)
  shootTimer += dt;
  if (shootTimer > 12) {
    bullets.push({ x: player.x, y: player.y - player.size/2, speed: 10, size: 6 });
    shootTimer = 0;
  }

  // 子彈移動與清理
  bullets = bullets.filter(b => {
    b.y -= b.speed * dt;
    return b.y > -10;
  });

  // 敵人生成 (依關卡難度遞增)
  spawnTimer += dt;
  const spawnRate = Math.max(18, 45 - currentLevel * 9);
  if (spawnTimer > spawnRate) {
    enemies.push({
      x: Math.random() * (canvas.width - 50) + 25,
      y: -40,
      size: 32 + Math.random() * 12,
      speed: 2 + currentLevel * 0.6 + Math.random() * 0.5,
      hp: 1
    });
    spawnTimer = 0;
  }

  // 敵人移動與碰撞判定
  enemies = enemies.filter(e => {
    e.y += e.speed * dt;
    if (e.y > canvas.height + 40) return false;

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      const dist = Math.hypot(b.x - e.x, b.y - e.y);
      if (dist < (e.size/2 + b.size/2)) {
        bullets.splice(i, 1);
        levelHits++;
        updateHUD();
        createExplosion(e.x, e.y);
        // 可在此加入 hitSFX()
        return false;
      }
    }
    return true;
  });

  // 粒子物理更新
  particles = particles.filter(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.15 * dt; // 重力
    p.life -= dt;
    p.size *= 0.97;
    return p.life > 0 && p.size > 0.5;
  });
}

function createExplosion(x, y) {
  const colors = ['#ff4d4d', '#ffaa00', '#ffff4d', '#00ffaa', '#4d9fff'];
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 / 12) * i + Math.random() * 0.5;
    const speed = 2 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 18 + Math.random() * 8,
      size: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}

function draw() {
  // 清空與背景
  ctx.fillStyle = '#0a0a2a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 繪製星空
  ctx.fillStyle = '#ffffff';
  stars.forEach(s => {
    ctx.globalAlpha = 0.4 + Math.random() * 0.4;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  });
  ctx.globalAlpha = 1;

  // 玩家戰機
  ctx.fillStyle = '#00d2ff';
  ctx.shadowColor = '#00d2ff';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - player.size/2);
  ctx.lineTo(player.x - player.size/2, player.y + player.size/2);
  ctx.lineTo(player.x + player.size/2, player.y + player.size/2);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // 子彈
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 8;
  bullets.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size/2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.shadowBlur = 0;

  // 敵人飛碟
  enemies.forEach(e => {
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, e.size/2, e.size/3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#88ccff';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size/4, 0, Math.PI * 2);
    ctx.fill();
  });

  // 爆炸粒子
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 20);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ================= 事件綁定 =================
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('nextBtn').addEventListener('click', () => {
  document.getElementById('levelEndScreen').classList.add('hidden');
  // 由 startGame 的 for 循環自動接管下一關
});
document.getElementById('restartBtn').addEventListener('click', () => location.reload());
document.getElementById('endGameBtn').addEventListener('click', () => {
  gameState = 'GAME_OVER';
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('menuScreen').classList.remove('hidden');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  resizeCanvas();
});

// 初始化
resizeCanvas();