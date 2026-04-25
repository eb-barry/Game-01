// js/core.js
import { AudioManager } from './audio.js';
import { InputManager } from './input.js';
import { generateChapter2Config } from './levels.js';

// 🖼️ 去背工具函數
async function removeWhiteBg(src, threshold = 220) {
  return new Promise(res => {
    const img = new Image(); img.src = src;
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < data.data.length; i += 4) {
        if (data.data[i] > threshold && data.data[i+1] > threshold && data.data[i+2] > threshold) {
          data.data[i+3] = 0;
        }
      }
      ctx.putImageData(data, 0, 0);
      res(c);
    };
    img.onerror = () => res(null);
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
    
    // 🎯 敵方飛彈遞進難度配置
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
    console.log('✅ 資產載入與去背完成');
  }

  startGame() {
    if(this.state !== 'IDLE') return;
    this.state = 'PLAYING';
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.resetLevel();
  
    // ✅ 新增：確保遊戲開始時立即播放背景音樂
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
    if(this.level > 3) { 
      this.triggerChapterEnding(); 
      return; 
    }
    this.resetLevel();
    this.audio.resumeBGM();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  triggerChapterEnding() {
    console.log(`🎬 觸發第${this.chapter}章結束影片`);
    this.state = 'ENDING';
    this.audio.pauseBGM();
    if(this.callbacks.onChapterEnd) {
      this.callbacks.onChapterEnd(this.chapter);
    }
  }

  resumeGame() {
    this.state = 'PLAYING';
    this.lastTime = performance.now();
    this.audio.resumeBGM();
    this.loop(performance.now());
  }

  resetLevel() {
    console.log(`🔄 重置關卡: 第${this.chapter}章 第${this.level}關`);
    this.score = 0; 
    this.hp = this.maxHp;
    this.ufos = []; 
    this.bullets = []; 
    this.enemyBullets = [];
    this.bombs = []; 
    this.craters = []; 
    this.base = null; 
    this.inBase = false;
    this.player.x = this.canvas.width/2; 
    this.player.y = this.canvas.height-100;
    this.shootTimer = 0;
    
    if(this.chapter === 2) {
      this.input.setMode('gyro');
      const cfg = generateChapter2Config(this.level, this.canvas.width, this.canvas.height);
      this.bombs = cfg.bombs;
      this.craters = cfg.craters;
      this.base = cfg.base;
      this.maxHp = 5; 
      this.hp = 5;
      document.getElementById('instruction').textContent = cfg.instruction || '📱 傾斜手機移動';
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
    this.player.x = pos.x; 
    this.player.y = pos.y;

    // 🚀 戰機自動射擊：固定 2 發/秒 (500ms) - 無音效
    this.shootTimer += dt * 16.67;
    if(this.shootTimer >= 500) {
      this.bullets.push({ x: this.player.x, y: this.player.y-20, speed: 12, r: 6 });
      // ✅ 發射飛彈無音效
      this.shootTimer = 0;
    }

    if(this.chapter === 2) {
      // 第二章：迷宮玩法
      this.inBase = this.base && Math.hypot(this.player.x-this.base.x, this.player.y-this.base.y) < this.base.r;
      
      // 在基地內自動射擊
      if(this.inBase && Math.random() < 0.1) {
        this.bullets.push({ x: this.player.x, y: this.player.y-20, speed: 15, r: 6 });
      }
      
      // 基地內生成飛碟
      if(this.inBase && Math.random() < 0.03) {
        this.ufos.push({ 
          x: this.base.x + (Math.random()-0.5)*60, 
          y: this.base.y, 
          r: 20, 
          img: this.imgCache.u2 
        });
      }
      
      // 碰撞：玩家 vs 炸彈
      for(const b of this.bombs) {
        if(Math.hypot(this.player.x-b.x, this.player.y-b.y) < 30) { 
          this.takeDamage(); 
          break; 
        }
      }
      
      // 碰撞：玩家 vs 隕石坑 (即時失敗)
      for(const c of this.craters) {
        if(Math.hypot(this.player.x-c.x, this.player.y-c.y) < 35) {
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
            this.updateUI();
            if(this.base.hp <= 0) { 
              this.callbacks.onLevelComplete(this.level); 
              this.state = 'PAUSED'; 
            }
            break;
          }
        }
      }
    } else {
      // 第一章：傳統射擊玩法
      
      // 生成 UFO (依關卡使用不同圖片)
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
      
      // 更新 UFO 位置與發射飛彈
      this.ufos.forEach(u => { 
        u.x += u.vx; 
        u.y += u.vy;
        
        // 邊界反彈
        if (u.x < u.r || u.x > this.canvas.width - u.r) u.vx *= -1;
        
        // 敵方飛彈發射 (遞進難度)
        u.shootTimer -= dt * 16.67;
        if(u.shootTimer <= 0) {
          const cfg = this.ufoMissileConfig[this.level] || this.ufoMissileConfig[1];
          this.enemyBullets.push({ 
            x: u.x, 
            y: u.y+20, 
            speed: cfg.speed, 
            r: 6, 
            type: this.level 
          });
          u.shootTimer = cfg.fireRate;
        }
      });
      this.ufos = this.ufos.filter(u => u.y < this.canvas.height+50);
      
      // 玩家子彈移動
      this.bullets.forEach(b => b.y -= b.speed);
      this.bullets = this.bullets.filter(b => b.y > -10);
      
      // 敵方子彈移動
      this.enemyBullets.forEach(b => b.y += b.speed);
      this.enemyBullets = this.enemyBullets.filter(b => b.y < this.canvas.height+10);
      
      // 碰撞：玩家子彈 vs UFO
      for(let i=this.bullets.length-1; i>=0; i--) {
        for(let j=this.ufos.length-1; j>=0; j--) {
          if(Math.hypot(this.bullets[i].x-this.ufos[j].x, this.bullets[i].y-this.ufos[j].y) < 30) {
            this.ufos.splice(j,1); 
            this.bullets.splice(i,1); 
            this.score++; 
            this.updateUI();
            if(this.score >= 5) { 
              this.callbacks.onLevelComplete(this.level); 
              this.state = 'PAUSED'; 
            }
            break;
          }
        }
      }
      
      // 碰撞：敵方子彈 vs 玩家
      for(let i=this.enemyBullets.length-1; i>=0; i--) {
        if(Math.hypot(this.enemyBullets[i].x-this.player.x, this.enemyBullets[i].y-this.player.y) < 25) {
          this.enemyBullets.splice(i,1);
          this.takeDamage();
        }
      }
    }
  }

  takeDamage() {
    this.hp--;
    // ✅ 只在被擊中時播放音效
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
    
    // 背景色
    ctx.fillStyle = this.chapter===2 ? '#d4a373' : '#0a0a2a';
    ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
    
    // 第一章：星空背景
    if(this.chapter===1) {
      ctx.fillStyle='#fff';
      for(let i=0;i<50;i++) { 
        ctx.beginPath(); 
        ctx.arc((i*137)%this.canvas.width,(i*71)%this.canvas.height,1,0,Math.PI*2); 
        ctx.fill(); 
      }
    }
    
    // 第二章：沙漠場景
    if(this.chapter===2) {
      // 繪製隕石坑
      ctx.fillStyle='#3a2a1a';
      this.craters.forEach(c => { 
        ctx.beginPath(); 
        ctx.arc(c.x,c.y,c.r,0,Math.PI*2); 
        ctx.fill(); 
      });
      
      // 繪製炸彈
      this.bombs.forEach(b => { 
        if(this.imgCache.b1) {
          ctx.drawImage(this.imgCache.b1, b.x-b.r, b.y-b.r, b.r*2, b.r*2); 
        }
      });
      
      // 繪製基地
      if(this.base) {
        ctx.fillStyle='rgba(0,255,255,0.2)';
        ctx.beginPath(); 
        ctx.arc(this.base.x, this.base.y, this.base.r, 0, Math.PI*2); 
        ctx.fill();
        ctx.fillStyle='#fff'; 
        ctx.font='16px sans-serif'; 
        ctx.textAlign='center';
        ctx.fillText(`基地 HP: ${this.base.hp}`, this.base.x, this.base.y+5);
      }
    }
    
    // 繪製玩家戰機
    if(this.imgCache.jet) {
      ctx.drawImage(this.imgCache.jet, this.player.x-30, this.player.y-35, 60, 50);
    }
    
    // 繪製 UFO
    this.ufos.forEach(u => { 
      if(u.img) {
        ctx.drawImage(u.img, u.x-u.r, u.y-u.r, u.r*2, u.r*2); 
      }
    });
    
    // 繪製玩家子彈
    ctx.fillStyle = this.chapter===2 ? '#00ffff' : '#00ff00';
    this.bullets.forEach(b => { 
      ctx.beginPath(); 
      ctx.arc(b.x,b.y,b.r,0,Math.PI*2); 
      ctx.fill(); 
    });
    
    // 繪製敵方子彈 (依關卡特效)
    this.enemyBullets.forEach(b => {
      if(b.type === 1) { 
        ctx.fillStyle = '#ff0000'; 
      } else if(b.type === 2) { 
        ctx.shadowBlur = 10; 
        ctx.shadowColor = '#0044ff'; 
        ctx.fillStyle = '#ff0000'; 
      } else if(b.type === 3) { 
        ctx.shadowBlur = 15; 
        ctx.shadowColor = '#ff3300'; 
        ctx.fillStyle = '#800080'; 
      }
      ctx.beginPath(); 
      ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); 
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }
}