// js/core.js
import { AudioManager } from './audio.js';
import { InputManager } from './input.js';
import { generateChapter2Config } from './levels.js';

async function removeWhiteBg(src, threshold = 220) {
  return new Promise(res => {
    const img = new Image(); img.crossOrigin = 'anonymous'; img.src = src;
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
    
    this.ufoMissileConfig = { 1:{speed:4,rate:1500}, 2:{speed:4.6,rate:1100}, 3:{speed:5.4,rate:800} };
    this.imgCache = {};
    this.loadAssets();
  }

  async loadAssets() {
    console.log('🖼️ 載入圖片資產...');
    const load = async (src) => await removeWhiteBg(`assets/images/${src}`);
    this.imgCache = {
      jet: await load('JET.png'),
      u1: await load('UFO.png'), u2: await load('UFO-2.png'), u3: await load('UFO-3.png'),
      b1: await load('BOMB-01.png'), b2: await load('BOMB-02.png'), b3: await load('BOMB-03.png')
    };
    Object.entries(this.imgCache).forEach(([k,v]) => v ? console.log(`✅ ${k} 載入`) : console.warn(`⚠️ ${k} 失敗`));
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
    console.log('🎮 遊戲啟動');
  }

  startNextChapter(ch) {
    this.chapter = ch; this.level = 1; this.state = 'PLAYING';
    this.audio.resumeBGM(); this.resetLevel();
    this.lastTime = performance.now(); this.loop(this.lastTime);
  }

  restartChapter2() {
    this.chapter = 2; this.level = 1; this.state = 'PLAYING';
    this.audio.resumeBGM(); this.resetLevel();
    this.lastTime = performance.now(); this.loop(this.lastTime);
  }

  nextLevel() {
    this.level++;
    if(this.level > 3) { this.triggerChapterEnding(); return; }
    this.resetLevel(); this.audio.resumeBGM();
    this.lastTime = performance.now(); this.loop(this.lastTime);
  }

  triggerChapterEnding() {
    this.state = 'ENDING'; this.audio.pauseBGM();
    if(this.callbacks.onChapterEnd) this.callbacks.onChapterEnd(this.chapter);
  }

  resumeGame() {
    this.state = 'PLAYING'; this.lastTime = performance.now();
    this.audio.resumeBGM(); this.loop(performance.now());
  }

  resetLevel() {
    this.score = 0; this.hp = this.maxHp;
    this.ufos = []; this.bullets = []; this.enemyBullets = [];
    this.bombs = []; this.craters = []; this.base = null; this.inBase = false;
    this.player.x = this.canvas.width/2; this.player.y = this.canvas.height-100;
    this.shootTimer = 0;
    
    if(this.chapter === 2) {
      this.input.setMode('gyro');
      const cfg = generateChapter2Config(this.level, this.canvas.width, this.canvas.height);
      this.bombs = cfg.bombs; this.craters = cfg.craters; this.base = cfg.base;
      document.getElementById('instruction').textContent = cfg.instruction;
    } else {
      this.input.setMode('touch');
      document.getElementById('instruction').textContent = '👆 拖曳畫面控制戰機移動（自動射擊）';
    }
    this.input.reset(this.player.x, this.player.y);
    this.updateUI();
  }

  resize() {
    this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight;
    this.player.x = Math.min(this.player.x, this.canvas.width-30);
    this.player.y = Math.min(this.player.y, this.canvas.height-30);
  }

  updateUI() {
    document.getElementById('score').textContent = this.score;
    document.getElementById('level').textContent = this.level;
    document.getElementById('target').textContent = this.chapter===2 ? (this.base?.hp||5) : 5;
    document.getElementById('hp-bar').style.width = (this.hp/this.maxHp*100)+'%';
  }

  loop(timestamp) {
    if(this.state !== 'PLAYING') return;
    const dt = Math.min((timestamp-this.lastTime)/16.67, 2);
    this.lastTime = timestamp;
    this.update(dt); this.draw();
    this.loopId = requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    const pos = this.input.update();
    this.player.x = pos.x; this.player.y = pos.y;

    // 🎯 射擊邏輯
    if(this.chapter === 2) {
      // 第二章：僅在基地內射擊
      this.inBase = this.base && Math.hypot(this.player.x-this.base.x, this.player.y-this.base.y) < (this.base.r + 25);
      if(this.inBase) {
        this.shootTimer += dt * 16.67;
        if(this.shootTimer >= 400) {
          this.bullets.push({x:this.player.x, y:this.player.y-20, speed:15, r:6});
          this.shootTimer = 0;
        }
        // 基地內生成飛碟
        if(Math.random()<0.04 && this.ufos.length<3) {
          const img = this.level===1?this.imgCache.u1:this.level===2?this.imgCache.u2:this.imgCache.u3;
          this.ufos.push({x:this.base.x+(Math.random()-0.5)*60, y:this.base.y, r:20, img, vx:(Math.random()-0.5)*0.5, vy:(Math.random()-0.5)*0.5});
        }
        this.ufos.forEach(u => { u.x+=u.vx; u.y+=u.vy; if(Math.hypot(u.x-this.base.x,u.y-this.base.y)>this.base.r-15){u.vx*=-1;u.vy*=-1;} });
      }
    } else {
      // 第一章：自動射擊
      this.shootTimer += dt * 16.67;
      if(this.shootTimer >= 500) {
        this.bullets.push({x:this.player.x, y:this.player.y-20, speed:12, r:6});
        this.shootTimer = 0;
      }
      // 生成敵方 UFO
      if(Math.random()<0.02 && this.ufos.length<5) {
        const img = this.level===1?this.imgCache.u1:this.level===2?this.imgCache.u2:this.imgCache.u3;
        this.ufos.push({x:Math.random()*(this.canvas.width-80)+40, y:-40, vx:(Math.random()-0.5)*2, vy:1.5, r:26, img, shootTimer:Math.random()*1500});
      }
      this.ufos.forEach(u => {
        u.x+=u.vx; u.y+=u.vy;
        if(u.x<u.r||u.x>this.canvas.width-u.r) u.vx*=-1;
        u.shootTimer-=dt*16.67;
        if(u.shootTimer<=0) {
          const c=this.ufoMissileConfig[this.level]||this.ufoMissileConfig[1];
          this.enemyBullets.push({x:u.x, y:u.y+20, speed:c.speed, r:6, type:this.level});
          u.shootTimer=c.rate;
        }
      });
      this.ufos = this.ufos.filter(u => u.y < this.canvas.height+50);
      this.enemyBullets.forEach(b => b.y+=b.speed);
      this.enemyBullets = this.enemyBullets.filter(b => b.y < this.canvas.height+10);
    }

    // 子彈移動與過濾
    this.bullets.forEach(b => b.y -= b.speed);
    this.bullets = this.bullets.filter(b => b.y > -10);

    // 碰撞：子彈 vs UFO
    for(let i=this.bullets.length-1; i>=0; i--) {
      for(let j=this.ufos.length-1; j>=0; j--) {
        if(Math.hypot(this.bullets[i].x-this.ufos[j].x, this.bullets[i].y-this.ufos[j].y) < 25) {
          this.ufos.splice(j,1); this.bullets.splice(i,1); this.score++;
          if(this.base) this.base.hp--;
          this.updateUI();
          if(this.base && this.base.hp<=0) { this.callbacks.onLevelComplete(this.level); this.state='PAUSED'; }
          break;
        }
      }
    }

    // 碰撞：玩家 vs 障礙物
    if(this.chapter === 2) {
      for(const b of this.bombs) if(Math.hypot(this.player.x-b.x, this.player.y-b.y)<30) { this.takeDamage(); break; }
      for(const c of this.craters) if(Math.hypot(this.player.x-c.x, this.player.y-c.y)<c.r+20) { this.callbacks.onGameOver('crater'); this.state='GAME_OVER'; return; }
    } else {
      for(let i=this.enemyBullets.length-1; i>=0; i--) {
        if(Math.hypot(this.enemyBullets[i].x-this.player.x, this.enemyBullets[i].y-this.player.y)<25) {
          this.enemyBullets.splice(i,1); this.takeDamage();
        }
      }
    }
  }

  takeDamage() {
    this.hp--; this.audio.play('hit');
    if(navigator.vibrate) navigator.vibrate(200);
    this.vfx.flash.style.opacity=1; setTimeout(()=>this.vfx.flash.style.opacity=0, 150);
    this.updateUI();
    if(this.hp<=0) {
      this.state='GAME_OVER';
      this.callbacks.onGameOver(this.chapter===2 ? 'ch2_retry' : 'damage');
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = this.chapter===2 ? '#d4a373' : '#0a0a2a';
    ctx.fillRect(0,0,this.canvas.width,this.canvas.height);

    if(this.chapter===1) {
      ctx.fillStyle='#fff';
      for(let i=0;i<60;i++) { ctx.beginPath(); ctx.arc((i*137)%this.canvas.width,(i*71)%this.canvas.height,1+(i%3),0,Math.PI*2); ctx.fill(); }
    } else {
      // 沙漠背景與隕石坑
      const grad = ctx.createLinearGradient(0,0,0,this.canvas.height);
      grad.addColorStop(0,'#f4d7a8'); grad.addColorStop(0.6,'#d4a373'); grad.addColorStop(1,'#8b6f47');
      ctx.fillStyle=grad; ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
      ctx.fillStyle='#3a2a1a';
      this.craters.forEach(c => { ctx.beginPath(); ctx.arc(c.x,c.y,c.r,0,Math.PI*2); ctx.fill(); });
      this.bombs.forEach(b => { if(this.imgCache.b1) ctx.drawImage(this.imgCache.b1, b.x-b.r, b.y-b.r, b.r*2, b.r*2); });
      // 基地
      if(this.base) {
        ctx.shadowBlur=20; ctx.shadowColor=this.inBase?'#00ffff':'#0088aa';
        ctx.fillStyle=this.inBase?'rgba(0,255,255,0.3)':'rgba(0,136,170,0.2)';
        ctx.beginPath(); ctx.arc(this.base.x,this.base.y,this.base.r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        ctx.fillStyle='#fff'; ctx.font='bold 14px sans-serif'; ctx.textAlign='center';
        ctx.fillText(`BASE HP:${this.base.hp}`, this.base.x, this.base.y+5);
        if(this.inBase) { ctx.fillStyle='#00ff00'; ctx.fillText('🎯 射擊飛碟！', this.base.x, this.base.y-35); }
      }
    }

    // 玩家戰機
    if(this.imgCache.jet) ctx.drawImage(this.imgCache.jet, this.player.x-30, this.player.y-35, 60, 50);
    // UFO
    this.ufos.forEach(u => { if(u.img) ctx.drawImage(u.img, u.x-u.r, u.y-u.r, u.r*2, u.r*2); });
    // 子彈
    ctx.fillStyle = this.chapter===2 ? '#00ffff' : '#00ff00';
    this.bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill(); });
    if(this.chapter===1) {
      this.enemyBullets.forEach(b => {
        ctx.fillStyle = b.type===1?'#ff0000':b.type===2?'#ff0000':'#800080';
        if(b.type>1){ctx.shadowBlur=10;ctx.shadowColor=b.type===2?'#0044ff':'#ff3300';}
        ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      });
    }
  }
}