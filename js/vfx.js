// js/vfx.js
// 視覺特效：隕石坑傷害反饋 + 粒子系統

export class VFXManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.screenShake = { active: false, intensity: 0, duration: 0 };
    this.flashEffects = [];
  }

  // 隕石坑傷害特效
  triggerCraterDamage(x, y, damage) {
    // 1. 螢幕震動
    this.screenShake = {
      active: true,
      intensity: 3 + damage,
      duration: 200, // ms
      startTime: Date.now()
    };
    
    // 2. 紅色閃光環
    this.flashEffects.push({
      x, y,
      radius: 20,
      maxRadius: 80,
      alpha: 0.8,
      decay: 0.03,
      color: `rgba(255, ${50 + damage * 20}, 0, 0.6)`
    });
    
    // 3. 傷害粒子
    for (let i = 0; i < 15 + damage * 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1, // 向上噴發
        life: 1,
        decay: 0.02 + Math.random() * 0.01,
        color: `hsl(${10 + damage * 10}, 100%, ${50 + Math.random() * 20}%)`,
        size: Math.random() * 4 + 2
      });
    }
    
    // 4. 數字傷害顯示
    this.particles.push({
      x, y: y - 20,
      vx: 0, vy: -1.5,
      life: 1, decay: 0.015,
      text: `-${damage}`,
      fontSize: 18 + damage * 2,
      color: '#ff3333',
      isText: true
    });
  }

  // 戰艦爆炸特效
  triggerExplosion(x, y) {
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.015 + Math.random() * 0.01,
        color: ['#ff0000', '#ff6600', '#ffcc00', '#ffffff'][Math.floor(Math.random() * 4)],
        size: Math.random() * 6 + 3
      });
    }
    
    // 爆炸閃光
    this.flashEffects.push({
      x, y,
      radius: 10,
      maxRadius: 150,
      alpha: 1,
      decay: 0.05,
      color: 'rgba(255, 200, 100, 0.9)'
    });
  }

  // 更新特效
  update(deltaTime) {
    // 更新螢幕震動
    if (this.screenShake.active) {
      const elapsed = Date.now() - this.screenShake.startTime;
      if (elapsed >= this.screenShake.duration) {
        this.screenShake.active = false;
      }
    }
    
    // 更新閃光效果
    for (let i = this.flashEffects.length - 1; i >= 0; i--) {
      const flash = this.flashEffects[i];
      flash.radius += (flash.maxRadius - flash.radius) * 0.1;
      flash.alpha -= flash.decay;
      if (flash.alpha <= 0) {
        this.flashEffects.splice(i, 1);
      }
    }
    
    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // 重力
      p.life -= p.decay;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // 繪製特效
  draw(ctx, cameraOffset = { x: 0, y: 0 }) {
    // 繪製閃光效果
    for (const flash of this.flashEffects) {
      ctx.save();
      ctx.globalAlpha = flash.alpha;
      ctx.fillStyle = flash.color;
      ctx.beginPath();
      ctx.arc(flash.x - cameraOffset.x, flash.y - cameraOffset.y, flash.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    // 繪製粒子
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.life;
      
      if (p.isText) {
        ctx.fillStyle = p.color;
        ctx.font = `bold ${p.fontSize}px "Microsoft JhengHei"`;
        ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x - cameraOffset.x, p.y - cameraOffset.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x - cameraOffset.x, p.y - cameraOffset.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // 取得螢幕震動偏移
  getShakeOffset() {
    if (!this.screenShake.active) return { x: 0, y: 0 };
    
    const elapsed = Date.now() - this.screenShake.startTime;
    const progress = Math.min(1, elapsed / this.screenShake.duration);
    const intensity = this.screenShake.intensity * (1 - progress);
    
    return {
      x: (Math.random() - 0.5) * intensity * 2,
      y: (Math.random() - 0.5) * intensity * 2
    };
  }

  // 清除所有特效
  clear() {
    this.particles = [];
    this.flashEffects = [];
    this.screenShake.active = false;
  }
}