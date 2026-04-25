// js/input.js
export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.mode = 'touch'; // 'touch' | 'gyro'
    this.pos = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.gyro = { beta: 0, gamma: 0 };
    this.gyroEnabled = false;
    this.smoothing = 0.15;
    this._bind();
  }

  async enableGyro() {
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      const perm = await DeviceOrientationEvent.requestPermission();
      this.gyroEnabled = perm === 'granted';
    } else {
      this.gyroEnabled = true;
    }
    return this.gyroEnabled;
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'gyro' && !this.gyroEnabled) this.enableGyro();
  }

  _bind() {
    window.addEventListener('deviceorientation', e => {
      if (this.mode !== 'gyro' || !this.gyroEnabled) return;
      this.gyro.beta = this.gyro.beta * (1 - this.smoothing) + (e.beta || 0) * this.smoothing;
      this.gyro.gamma = this.gyro.gamma * (1 - this.smoothing) + (e.gamma || 0) * this.smoothing;
      
      // 映射陀螺儀到位置
      const w = this.canvas.width, h = this.canvas.height;
      this.target.x += (this.gyro.gamma / 45) * 4; // 左右傾斜
      this.target.y -= (this.gyro.beta / 90) * 5;  // 前後傾斜
      this.target.x = Math.max(30, Math.min(w - 30, this.target.x));
      this.target.y = Math.max(h * 0.2, Math.min(h - 50, this.target.y));
    });

    const start = (x, y) => { if(this.mode==='touch') { this.target.x=x; this.target.y=y; } };
    const move = (x, y) => {
      if(this.mode==='touch') {
        const dx = x - this.target.x, dy = y - this.target.y;
        this.target.x += dx * 0.15;
        this.target.y += dy * 0.15;
        this.target.x = Math.max(30, Math.min(this.canvas.width-30, this.target.x));
        this.target.y = Math.max(this.canvas.height*0.4, Math.min(this.canvas.height-30, this.target.y));
      }
    };
    this.canvas.addEventListener('touchstart', e => { e.preventDefault(); start(e.touches[0].clientX, e.touches[0].clientY); }, {passive:false});
    this.canvas.addEventListener('touchmove', e => { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); }, {passive:false});
    this.canvas.addEventListener('mousedown', e => start(e.clientX, e.clientY));
    this.canvas.addEventListener('mousemove', e => move(e.clientX, e.clientY));
  }

  update() {
    this.pos.x += (this.target.x - this.pos.x) * 0.2;
    this.pos.y += (this.target.y - this.pos.y) * 0.2;
    return { ...this.pos };
  }

  reset(x, y) { this.pos.x = this.target.x = x; this.pos.y = this.target.y = y; }
}