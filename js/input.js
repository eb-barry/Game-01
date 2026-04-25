// js/input.js
export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.mode = 'touch';
    this.pos = { x: canvas.width/2, y: canvas.height - 100 };
    this.target = { x: canvas.width/2, y: canvas.height - 100 };
    this.gyro = { beta: 0, gamma: 0 };
    this.isGyroReady = false;
    this.smoothing = 0.1;
    this.maxSpeed = 8; // 最大移動速度
    this._bind();
  }

  setMode(mode) {
    this.mode = mode;
    console.log(`🎮 輸入模式: ${mode}`);
    if (mode === 'gyro' && !this.isGyroReady) {
      this.requestPermission();
    }
  }

  async requestPermission() {
    console.log("📡 請求陀螺儀權限...");
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        this.isGyroReady = (permission === 'granted');
        console.log(this.isGyroReady ? "✅ 權限已獲取" : "⚠️ 權限被拒絕");
      } catch (e) {
        console.error("❌ 權限錯誤:", e);
        this.isGyroReady = false;
      }
    } else {
      this.isGyroReady = true;
    }
  }

  _bind() {
    window.addEventListener('deviceorientation', (e) => this._handleGyro(e));
    
    // 觸控備援
    const start = (x, y) => { if(this.mode==='touch') { this.target.x=x; this.target.y=y; } };
    const move = (x, y) => {
      if(this.mode!=='touch') return;
      this.target.x += (x - this.target.x) * 0.15;
      this.target.y += (y - this.target.y) * 0.15;
      this._clampTarget();
    };
    this.canvas.addEventListener('touchstart', e => { e.preventDefault(); start(e.touches[0].clientX, e.touches[0].clientY); }, {passive:false});
    this.canvas.addEventListener('touchmove', e => { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); }, {passive:false});
    this.canvas.addEventListener('mousedown', e => start(e.clientX, e.clientY));
    this.canvas.addEventListener('mousemove', e => move(e.clientX, e.clientY));
  }

  _handleGyro(e) {
    if (this.mode !== 'gyro' || !this.isGyroReady) return;
    
    // 平滑處理
    this.gyro.beta = this.gyro.beta * (1 - this.smoothing) + (e.beta || 0) * this.smoothing;
    this.gyro.gamma = this.gyro.gamma * (1 - this.smoothing) + (e.gamma || 0) * this.smoothing;
    
    const w = this.canvas.width, h = this.canvas.height;
    
    // ✅ 修正映射邏輯：
    // - beta: 螢幕向下傾斜(負值) → 戰機向上移動(前進)
    // - gamma: 螢幕向右傾斜(正值) → 戰機向右移動
    const tiltForward = -this.gyro.beta;  // 負 beta = 向前
    const tiltSide = this.gyro.gamma;      // 正 gamma = 向右
    
    // ✅ 速度與傾斜度成正比：傾斜越大，移動越快
    const speedX = Math.min(this.maxSpeed, Math.abs(tiltSide)) * Math.sign(tiltSide);
    const speedY = Math.min(this.maxSpeed, Math.abs(tiltForward)) * Math.sign(tiltForward);
    
    this.target.x += speedX * 1.5;  // 左右移動稍快
    this.target.y -= speedY * 1.2;  // 前後移動(注意: y 軸向下為正，所以用減號)
    
    this._clampTarget();
  }

  _clampTarget() {
    const w = this.canvas.width, h = this.canvas.height;
    this.target.x = Math.max(30, Math.min(w - 30, this.target.x));
    this.target.y = Math.max(h * 0.2, Math.min(h - 30, this.target.y)); // 限制在螢幕 20%~95%
  }

  update() {
    // 平滑追蹤目標
    this.pos.x += (this.target.x - this.pos.x) * 0.15;
    this.pos.y += (this.target.y - this.pos.y) * 0.15;
    return { ...this.pos };
  }

  reset(x, y) { 
    this.pos.x = this.target.x = x; 
    this.pos.y = this.target.y = y; 
  }
}