import { InputManager } from './input.js';
import { getLevelConfig } from './levels.js';
import { Renderer } from './renderer.js';
import { VFXManager } from './vfx.js';
import { AudioManager } from './audio.js';
import { clamp } from './main.js';

export class GameCore {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.state = 'INIT'; // INIT, CHAPTER_TRANS, PLAYING, PAUSED, GAME_OVER
    this.chapter = 1; this.level = 1; this.score = 0; this.hp = 10;
    this.input = new InputManager(this.canvas);
    this.renderer = new Renderer(this.canvas);
    this.vfx = new VFXManager(this.canvas);
    this.audio = new AudioManager();
    this.loopId = null;
    this.lastTime = 0;
    this.entities = { player: {x:0,y:0, w:60, h:50, vx:0, vy:0}, bombs:[], craters:[], ufos:[], bullets:[] };
  }

  async start() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    await this.loadChapter(1);
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if(this.entities.player) {
      this.entities.player.x = this.canvas.width/2;
      this.entities.player.y = this.canvas.height - 100;
    }
  }

  async loadChapter(ch) {
    this.chapter = ch; this.level = 1;
    if (ch > 1) await this.callbacks.onChapterStart(ch);
    this.loadLevel(ch, 1);
  }

  loadLevel(ch, lv) {
    this.state = 'PLAYING';
    this.level = lv;
    const cfg = getLevelConfig(ch, lv, this.canvas.width, this.canvas.height);
    if (!cfg) return;
    
    this.config = cfg;
    this.input.setMode(cfg.controlMode, lv);
    this.input.resetPosition(this.canvas.width/2, this.canvas.height - 100);
    this.hp = cfg.maxHp || 10;
    this.score = 0;
    this.entities.bombs = cfg.bombs.map(b => ({...b, r: 12}));
    this.entities.craters = cfg.craters;
    this.entities.ufos = [];
    this.entities.bullets = [];
    this.audio.playBGM();
  }

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 16.67, 2);
    this.lastTime = timestamp;
    if (this.state === 'PLAYING') this.update(dt);
    this.draw();
    this.loopId = requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    const p = this.entities.player;
    const bounds = { minX: p.w/2, maxX: this.canvas.width - p.w/2, minY: this.canvas.height*0.4, maxY: this.canvas.height - 30 };
    const pos = this.input.update(bounds, dt);
    p.x = pos.x; p.y = pos.y;

    // 碰撞檢測簡化版
    this.entities.bombs.forEach(b => {
      const dx = p.x - b.x, dy = p.y - b.y;
      if (Math.hypot(dx,dy) < p.w/2 + b.r) {
        this.hp -= this.config.damageConfig?.bombDamage || 1;
        this.vfx.triggerCraterDamage(b.x, b.y, 1);
        this.audio.play('hit');
      }
    });
    this.entities.craters.forEach(c => {
      const dx = p.x - c.x, dy = p.y - c.y;
      if (Math.hypot(dx,dy) < p.w/2 + c.r) {
        this.hp -= this.config.damageConfig?.craterDamage || 2;
        this.vfx.triggerCraterDamage(c.x, c.y, 2);
        this.audio.play('crater');
      }
    });

    if (this.hp <= 0) this.gameOver();
    if (this.score >= (this.config.winCondition?.ufosToDestroy || 10)) this.levelComplete();
  }

  draw() {
    this.ctx.fillStyle = '#0a0a2a';
    this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
    this.renderer.drawBackground(this.ctx);
    this.renderer.drawEntities(this.ctx, this.entities, this.config);
    this.vfx.draw(this.ctx);
    this.renderer.drawHUD(this.ctx, {score:this.score, hp:this.hp, chapter:this.chapter, level:this.level});
  }

  levelComplete() {
    this.state = 'PAUSED';
    this.audio.stopBGM();
    this.audio.play('next-level');
    // 簡化：直接進下一關或章節結尾
    if (this.level < 3) this.loadLevel(this.chapter, this.level + 1);
    else this.callbacks.onChapterEnd(this.chapter);
  }

  gameOver() {
    this.state = 'GAME_OVER';
    this.audio.play('game-lose');
    this.vfx.triggerExplosion(this.entities.player.x, this.entities.player.y);
    setTimeout(() => this.callbacks.onGameOver(), 1500);
  }

  destroy() { cancelAnimationFrame(this.loopId); }
}