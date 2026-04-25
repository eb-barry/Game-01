// js/input.js
export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.mode = 'touch'; // 'touch' | 'gyro'
    this.pos = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.gyro = { beta: 0, gamma: 0 };
    this.isGyroReady = false;
    this.smoothing = 0.15;
    this._bind();
  }

  // ✅ 新增：設定輸入模式
  setMode(mode) {
    this.mode = mode;
    console.log(`🎮 輸入模式切換為: ${mode}`);
    if (mode === 'gyro' && !this.isGyroReady) {
      this.requestPermission();
    }
  }

  // ✅ 新增：安全請求陀螺儀權限
  async requestPermission() {
    console.log("📡 請求陀螺儀權限...");
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          this.isGyroReady = true;
          console.log("✅ 陀螺儀權限已獲取");
        } else {
          console.warn("⚠️ 使用者拒絕陀螺儀權限，切換回觸控模式");
          this.mode = 'touch';
        }
      } catch (error) {
        console.error("❌ 陀螺儀權限請求錯誤:", error);
        this.mode = 'touch';
      }
    } else {
      // 非 iOS 13+ 或 Android
      this.isGyroReady = true;
      console.log("✅ 非 iOS 13+ 裝置，自動啟用陀螺儀");
    }
  }

  _bind() {
    // 陀螺儀事件
    window.addEventListener('deviceorientation', (e) => this._handleGyro(e));
    
    // 觸控事件
    const start = (x, y) => { if(this.mode==='touch') { this.target.x=x; this.target.y=y; } };
    const move = (x, y) => {
      if(this.mode!=='touch') return;
      const dx = x - this.target.x, dy = y - this.target.y;
      this.target.x += dx * 0.15;
      this.target.y += dy * 0.15;
      this.target.x = Math.max(30, Math.min(this.canvas.width-30, this.target.x));
      this.target.y = Math.max(this.canvas.height*0.4, Math.min(this.canvas.height-30, this.target.y));
    };
    
    this.canvas.addEventListener('touchstart', e => { e.preventDefault(); start(e.touches[0].clientX, e.touches[0].clientY); }, {passive:false});
    this.canvas.addEventListener('touchmove', e => { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); }, {passive:false});
    this.canvas.addEventListener('mousedown', e => start(e.clientX, e.clientY));
    this.canvas.addEventListener('mousemove', e => move(e.clientX, e.clientY));
  }

  _handleGyro(e) {
    if (this.mode !== 'gyro' || !this.isGyroReady) return;
    
    this.gyro.beta = this.gyro.beta * (1 - this.smoothing) + (e.beta || 0) * this.smoothing;
    this.gyro.gamma = this.gyro.gamma * (1 - this.smoothing) + (e.gamma || 0) * this.smoothing;
    
    // 映射到目標位置
    const w = this.canvas.width, h = this.canvas.height;
    this.target.x = (w / 2) + (this.gyro.gamma * 4); 
    this.target.y = (h - 100) - (this.gyro.beta * 3);
    this.target.x = Math.max(30, Math.min(w - 30, this.target.x));
    this.target.y = Math.max(h * 0.2, Math.min(h - 50, this.target.y));
  }

  update() {
    // 平滑移動
    this.pos.x += (this.target.x - this.pos.x) * 0.2;
    this.pos.y += (this.target.y - this.pos.y) * 0.2;
    return { ...this.pos };
  }

  reset(x, y) { 
    this.pos.x = this.target.x = x; 
    this.pos.y = this.target.y = y; 
  }
}