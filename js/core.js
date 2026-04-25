// js/core.js
import { AudioManager } from './audio.js';
import { InputManager } from './input.js';
import { generateChapter2Config } from './levels.js';

// 🖼️ 去背工具函數 - 返回可繪製的 Canvas
async function removeWhiteBg(src, threshold = 220) {
  return new Promise(res => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < data.data.length; i += 4) {
        if (data.data[i] > threshold && data.data[i+1] > threshold && data.data[i+2] > threshold) {
          data.data[i+3] = 0; // 白色轉透明
        }
      }
      ctx.putImageData(data, 0, 0);
      res(c); // ✅ 返回 Canvas 物件，可直接 drawImage
    };
    img.onerror = (e) => {
      console.error(`❌ 圖片載入失敗: ${src}`, e);
      res(null);
    };
  });
}

export class GameCore {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.audio = new AudioManager();
    this.input = new InputManager(this.canvas);
    this.vfx = { flash: document.getElementById('red-flash') || document.createElement('div') };
    
    this.state = 'IDLE';
    this.chapter = 1;
    this.level = 1;
    this.score = 0;
    this.hp = 5;
    this.maxHp = 5;
    this.player = { x: 0, y: 0, w: 60, h: 50 };
    this.ufos = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.bombs = [];
    this.craters = [];
    this.base = null;
    this.inBase = false;
    this.loopId = null;
    this.lastTime = 0;
    this.shootTimer = 0;
    
    this.ufoMissileConfig = {
      1: { speed: 4.0, fireRate: 1500 },
      2: { speed: 4.6, fireRate: 1100 },
      3: { speed: 5.4, fireRate: 800 }
    };

    this.imgCache = {};
    this.loadAssets();
  }

  async loadAssets() {
    console.log('🖼️ 載入圖片資產...');
    const loadAndProcess = async (src) => await removeWhiteBg(`assets/images/${src}`);
    
    this.imgCache = {
      jet: await loadAndProcess('JET.png'),
      u1: await loadAndProcess('UFO.png'),
      u2: await loadAndProcess('UFO-2.png'),
      u3: await loadAndProcess('UFO-3.png'),
      b1: await loadAndProcess('BOMB-01.png'),
      b2: await loadAndProcess('BOMB-02.png'),
      b3: await loadAndProcess('BOMB-03.png')
    };
    
    // ✅ 驗證圖片是否載入成功
    Object.entries(this.imgCache).forEach(([key, val]) => {
      if(val) console.log(`✅ ${key} 去背完成 (${val.width}x${val.height})`);
      else console.warn(`⚠️ ${key} 載入失敗`);
    });
    console.log('✅ 資產載入完成');
  }

  startGame() {
    if(this.state !== 'IDLE') return;
    this.state = 'PLAYING';
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.resetLevel();
    this.audio.playBGM();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
    console.log('🎮 遊戲迴圈啟動');
  }

  startNextChapter(ch) {
    console.log(`🔄 進入下一章: 第${ch}章`);
    this.chapter = ch;
    this.level = 1;
    this.state = 'PLAYING';
    this.audio.resumeBGM();
    this.resetLevel();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  restartChapter2() {
    this.chapter = 2;
    this.level = 1;
    this.state = 'PLAYING';
    this.audio.resumeBGM();
    this.resetLevel();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  nextLevel() {
    this.level++;
    if(this.level > 3) { this.triggerChapterEnding(); return; }
    this.resetLevel();
    this.audio.resumeBGM();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  triggerChapterEnding() {
    console.log(`🎬 觸發第${this.chapter}章結束影片`);
    this.state = 'ENDING';
    this.audio.pauseBGM();
    if(this.callbacks.onChapterEnd) this.callbacks.onChapterEnd(this.chapter);
  }

  resumeGame() {
    this.state = 'PLAYING';
    this.lastTime = performance.now();
    this.audio.resumeBGM();
    this.loop(performance.now());
  }

  resetLevel() {
    console.log(`🔄 重置關卡: 第${this.chapter}章 第${this.level}關`);
    this.score = 0; this.hp = this.maxHp;
    this.ufos = []; this.bullets = []; this.enemyBullets = [];
    this.bombs = []; this.craters = []; this.base = null; this.inBase = false;
    this.player.x = this.canvas.width/2; this.player.y = this.canvas.height-100;
    this.shootTimer = 0;
    
    if(this.chapter === 2) {
      console.log('🏜️ 載入第二章配置...');
      this.input.setMode('gyro');
      const cfg = generateChapter2Config(this.level, this.canvas.width, this.canvas.height);
      console.log('📦 第二章配置:', cfg);
      this.bombs = cfg.bombs || [];
      this.craters = cfg.craters || [];
      this.base = cfg.base || null;
      this.maxHp = 5; this.hp = 5;
      document.getElementById('instruction').textContent = cfg.instruction || '📱 傾斜手機移動，避開炸彈與隕石坑';
    } else {
      this.input.setMode('touch');
      document.getElementById('instruction').textContent = '👆 拖曳畫面控制戰機移動（自動射擊）';
    }
    
    this.input.reset(this.player.x, this.player.y);
    this.updateUI();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    // 重設玩家位置避免跑出畫面
    this.player.x = Math.min(this.player.x, this.canvas.width - 30);
    this.player.y = Math.min(this.player.y, this.canvas.height - 30);
  }

  updateUI() {
    document.getElementById('score').textContent = this.score;
    document.getElementById('level').textContent = this.level;
    document.getElementById('target').textContent = this.chapter===2 ? (this.base?.hp || 5) : 5;
    document.getElementById('hp-bar').style.width = (this.hp/this.maxHp*100)+'%';
  }

  loop(timestamp) {
    if(this.state !== 'PLAYING') return;
    const dt = Math.min((timestamp-this.lastTime)/16.67, 2);
    this.lastTime = timestamp;
    this.update(dt);
    this.draw();
    this.loopId = requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    const pos = this.input.update();
    this.player.x = pos.x; this.player.y = pos.y;

    // 🚀 戰機自動射擊：固定 2 發/秒 (500ms) - 無音效
    this.shootTimer += dt * 16.67;
    if(this.shootTimer >= 500) {
      this.bullets.push({ x: this.player.x, y: this.player.y-20, speed: 12, r: 6 });
      this.shootTimer = 0;
    }

    if(this.chapter === 2) {
      // ✅ 第二章：迷宮玩法
      // 檢查是否進入基地範圍
      if(this.base) {
        const distToBase = Math.hypot(this.player.x - this.base.x, this.player.y - this.base.y);
        this.inBase = distToBase < (this.base.r + 30); // 30 是玩家半徑
      }
      
      // 在基地內自動射擊
      if(this.inBase && Math.random() < 0.15) {
        this.bullets.push({ x: this.player.x, y: this.player.y-20, speed: 15, r: 6 });
      }
      
      // 基地內生成飛碟 (僅在基地內)
      if(this.inBase && Math.random() < 0.05 && this.ufos.length < 3) {
        const ufoImg = this.level === 1 ? this.imgCache.u1 : 
                       this.level === 2 ? this.imgCache.u2 : 
                       this.imgCache.u3;
        this.ufos.push({ 
          x: this.base.x + (Math.random()-0.5)*80, 
          y: this.base.y + (Math.random()-0.5)*40, 
          r: 20, 
          img: ufoImg,
          vx: (Math.random()-0.5)*0.5,
          vy: (Math.random()-0.5)*0.5
        });
      }
      
      // 更新基地內飛碟位置
      this.ufos.forEach(u => {
        u.x += u.vx; u.y += u.vy;
        // 限制在基地範圍內
        if(Math.hypot(u.x-this.base.x, u.y-this.base.y) > this.base.r - 20) {
          u.vx *= -1; u.vy *= -1;
        }
      });
      
      // 碰撞：玩家 vs 炸彈
      for(const b of this.bombs) {
        if(Math.hypot(this.player.x-b.x, this.player.y-b.y) < 30) { 
          this.takeDamage(); 
          break; 
        }
      }
      
      // 碰撞：玩家 vs 隕石坑 (即時失敗)
      for(const c of this.craters) {
        if(Math.hypot(this.player.x-c.x, this.player.y-c.y) < c.r + 20) {
          console.log('💥 墜入隕石坑');
          this.callbacks.onGameOver('crater'); 
          this.state = 'GAME_OVER'; 
          return;
        }
      }
      
      // 碰撞：子彈 vs 基地飛碟
      for(let i=this.bullets.length-1; i>=0; i--) {
        for(let j=this.ufos.length-1; j>=0; j--) {
          if(Math.hypot(this.bullets[i].x-this.ufos[j].x, this.bullets[i].y-this.ufos[j].y) < 25) {
            this.ufos.splice(j,1); 
            this.bullets.splice(i,1); 
            this.score++;
            if(this.base) this.base.hp--;
            console.log(`🎯 擊中飛碟！基地剩餘 HP: ${this.base.hp}`);
            this.updateUI();
            if(this.base.hp <= 0) { 
              console.log('🏆 基地摧毀！關卡完成');
              this.callbacks.onLevelComplete(this.level); 
              this.state = 'PAUSED'; 
            }
            break;
          }
        }
      }
    } else {
      // 第一章：傳統射擊玩法
      if(Math.random()<0.02 && this.ufos.length<5) {
        const ufoImg = this.level === 1 ? this.imgCache.u1 : 
                       this.level === 2 ? this.imgCache.u2 : 
                       this.imgCache.u3;
        this.ufos.push({ 
          x: Math.random()*(this.canvas.width-80)+40, 
          y: -40, 
          vx: (Math.random()-0.5)*2, 
          vy: 1.5, 
          r: 26, 
          img: ufoImg, 
          shootTimer: Math.random() * 1500 
        });
      }
      
      this.ufos.forEach(u => { 
        u.x += u.vx; u.y += u.vy;
        if (u.x < u.r || u.x > this.canvas.width - u.r) u.vx *= -1;
        u.shootTimer -= dt * 16.67;
        if(u.shootTimer <= 0) {
          const cfg = this.ufoMissileConfig[this.level] || this.ufoMissileConfig[1];
          this.enemyBullets.push({ x: u.x, y: u.y+20, speed: cfg.speed, r: 6, type: this.level });
          u.shootTimer = cfg.fireRate;
        }
      });
      this.ufos = this.ufos.filter(u => u.y < this.canvas.height+50);
      
      this.bullets.forEach(b => b.y -= b.speed);
      this.bullets = this.bullets.filter(b => b.y > -10);
      this.enemyBullets.forEach(b => b.y += b.speed);
      this.enemyBullets = this.enemyBullets.filter(b => b.y < this.canvas.height+10);
      
      for(let i=this.bullets.length-1; i>=0; i--) {
        for(let j=this.ufos.length-1; j>=0; j--) {
          if(Math.hypot(this.bullets[i].x-this.ufos[j].x, this.bullets[i].y-this.ufos[j].y) < 30) {
            this.ufos.splice(j,1); this.bullets.splice(i,1); this.score++; this.updateUI();
            if(this.score >= 5) { this.callbacks.onLevelComplete(this.level); this.state = 'PAUSED'; }
            break;
          }
        }
      }
      
      for(let i=this.enemyBullets.length-1; i>=0; i--) {
        if(Math.hypot(this.enemyBullets[i].x-this.player.x, this.enemyBullets[i].y-this.player.y) < 25) {
          this.enemyBullets.splice(i,1); this.takeDamage();
        }
      }
    }
  }

  takeDamage() {
    this.hp--;
    this.audio.play('hit');
    if(navigator.vibrate) navigator.vibrate(200);
    this.vfx.flash.style.opacity = 1;
    setTimeout(() => this.vfx.flash.style.opacity = 0, 150);
    this.updateUI();
    if(this.hp <= 0) {
      this.callbacks.onGameOver('damage');
      this.state = 'GAME_OVER';
    }
  }

  draw() {
    const ctx = this.ctx;
    
    // 🎨 背景繪製
    if(this.chapter === 2) {
      // 第二章：沙漠背景
      const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
      gradient.addColorStop(0, '#f4d7a8'); // 天空
      gradient.addColorStop(0.6, '#d4a373'); // 沙漠
      gradient.addColorStop(1, '#8b6f47'); // 遠景
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // 繪製隕石坑
      ctx.fillStyle = '#3a2a1a';
      this.craters.forEach(c => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
        // 隕石坑陰影
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      
      // 繪製炸彈
      this.bombs.forEach(b => {
        if(this.imgCache.b1) {
          // ✅ 正確繪製去背後的 Canvas
          ctx.drawImage(this.imgCache.b1, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
        } else {
          // 備援：繪製簡單圖形
          ctx.fillStyle = '#ff6600';
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
        }
      });
      
      // 繪製基地 (頂部圓形區域)
      if(this.base) {
        // 基地外圈光暈
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.inBase ? '#00ffff' : '#0088aa';
        ctx.fillStyle = this.inBase ? 'rgba(0,255,255,0.3)' : 'rgba(0,136,170,0.2)';
        ctx.beginPath();
        ctx.arc(this.base.x, this.base.y, this.base.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // 基地中心
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.base.x, this.base.y, this.base.r * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // 基地文字
        ctx.fillStyle = '#000';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`BASE`, this.base.x, this.base.y - 5);
        ctx.fillText(`HP: ${this.base.hp}`, this.base.x, this.base.y + 12);
        
        // 進入基地提示
        if(this.inBase) {
          ctx.fillStyle = '#00ff00';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText('🎯 射擊飛碟！', this.base.x, this.base.y - 30);
        }
      }
    } else {
      // 第一章：星空背景
      ctx.fillStyle = '#0a0a2a';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = '#fff';
      for(let i = 0; i < 60; i++) {
        ctx.beginPath();
        ctx.arc((i*137)%this.canvas.width, (i*71)%this.canvas.height, 1+(i%3), 0, Math.PI*2);
        ctx.fill();
      }
    }
    
    // 🛸 繪製玩家戰機
    if(this.imgCache.jet) {
      // ✅ 正確繪製去背後的 Canvas
      ctx.drawImage(this.imgCache.jet, this.player.x - 30, this.player.y - 35, 60, 50);
    } else {
      // 備援：三角形
      ctx.fillStyle = '#444';
      ctx.beginPath();
      ctx.moveTo(this.player.x, this.player.y - 25);
      ctx.lineTo(this.player.x + 30, this.player.y + 20);
      ctx.lineTo(this.player.x - 30, this.player.y + 20);
      ctx.closePath();
      ctx.fill();
    }
    
    // 👽 繪製基地內飛碟
    this.ufos.forEach(u => {
      if(u.img) {
        // ✅ 正確繪製去背後的 Canvas
        ctx.drawImage(u.img, u.x - u.r, u.y - u.r, u.r * 2, u.r * 2);
      } else {
        // 備援：圓形
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath(); ctx.ellipse(u.x, u.y, u.r*1.4, u.r*0.5, 0, 0, Math.PI*2); ctx.fill();
      }
    });
    
    // 🔫 繪製玩家子彈
    ctx.fillStyle = this.chapter === 2 ? '#00ffff' : '#00ff00';
    this.bullets.forEach(b => {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
    });
    
    // 💣 繪製敵方子彈 (第一章專用)
    if(this.chapter === 1) {
      this.enemyBullets.forEach(b => {
        if(b.type === 1) { ctx.fillStyle = '#ff0000'; }
        else if(b.type === 2) { ctx.shadowBlur = 10; ctx.shadowColor = '#0044ff'; ctx.fillStyle = '#ff0000'; }
        else if(b.type === 3) { ctx.shadowBlur = 15; ctx.shadowColor = '#ff3300'; ctx.fillStyle = '#800080'; }
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      });
    }
  }
}