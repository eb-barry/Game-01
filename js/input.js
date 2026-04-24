// js/input.js
// 控制輸入抽象層：支援觸控拖曳 + 陀螺儀傾斜，關卡級切換

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.mode = 'touch'; // 'touch' | 'gyro'
    this.position = { x: 0, y: 0 };
    this.targetPosition = { x: 0, y: 0 };
    
    // 陀螺儀參數
    this.gyroData = { alpha: 0, beta: 0, gamma: 0 };
    this.gyroEnabled = false;
    this.gyroSensitivity = 2.5;
    this.gyroSmoothing = 0.1; // 指數移動平均係數
    
    // 漸進式難度參數（第二章專用）
    this.gyroDifficulty = {
      level1: { sensitivity: 1.8, deadZone: 5, maxSpeed: 3 },
      level2: { sensitivity: 2.5, deadZone: 3, maxSpeed: 5 },
      level3: { sensitivity: 3.2, deadZone: 1, maxSpeed: 7 }
    };
    
    // 觸控參數
    this.isTouching = false;
    this.touchStart = { x: 0, y: 0 };
    
    this._bindEvents();
  }

  // 設定控制模式（關卡載入時呼叫）
  setMode(mode, level = 1) {
    this.mode = mode;
    if (mode === 'gyro' && level >= 1 && level <= 3) {
      const params = this.gyroDifficulty[`level${level}`];
      this.gyroSensitivity = params.sensitivity;
      this._updateGyroParams(params);
    }
  }

  // 更新陀螺儀參數（漸進式難度）
  _updateGyroParams(params) {
    this.gyroDeadZone = params.deadZone;
    this.gyroMaxSpeed = params.maxSpeed;
  }

  // 綁定事件監聽
  _bindEvents() {
    // 觸控事件
    this.canvas.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', () => this._onTouchEnd());
    
    // 滑鼠事件（桌面測試用）
    this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this._onMouseUp());
    
    // 陀螺儀事件
    window.addEventListener('deviceorientation', (e) => this._onDeviceOrientation(e));
  }

  // 🔐 請求陀螺儀權限（iOS 13+）
  async requestGyroPermission() {
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          this.gyroEnabled = true;
          return true;
        }
      } catch (err) {
        console.warn('Gyro permission error:', err);
      }
    } else {
      // 非 iOS 13+ 裝置
      this.gyroEnabled = true;
      return true;
    }
    return false;
  }

  // 觸控處理
  _onTouchStart(e) {
    if (this.mode !== 'touch') return;
    e.preventDefault();
    this.isTouching = true;
    this.touchStart.x = e.touches[0].clientX;
    this.touchStart.y = e.touches[0].clientY;
    this.targetPosition.x = this.position.x;
    this.targetPosition.y = this.position.y;
  }

  _onTouchMove(e) {
    if (this.mode !== 'touch' || !this.isTouching) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - this.touchStart.x;
    const dy = touch.clientY - this.touchStart.y;
    
    this.targetPosition.x += dx * 1.2;
    this.targetPosition.y += dy * 1.2;
    
    this.touchStart.x = touch.clientX;
    this.touchStart.y = touch.clientY;
  }

  _onTouchEnd() {
    this.isTouching = false;
  }

  // 滑鼠處理（桌面測試）
  _onMouseDown(e) { this._onTouchStart({ preventDefault: () => {}, touches: [{ clientX: e.clientX, clientY: e.clientY }] }); }
  _onMouseMove(e) { this._onTouchMove({ preventDefault: () => {}, touches: [{ clientX: e.clientX, clientY: e.clientY }] }); }
  _onMouseUp() { this._onTouchEnd(); }

  // 陀螺儀處理
  _onDeviceOrientation(e) {
    if (this.mode !== 'gyro' || !this.gyroEnabled) return;
    
    // 平滑處理
    this.gyroData.gamma = this.gyroData.gamma * (1 - this.gyroSmoothing) + (e.gamma || 0) * this.gyroSmoothing;
    this.gyroData.beta = this.gyroData.beta * (1 - this.gyroSmoothing) + (e.beta || 0) * this.gyroSmoothing;
    
    // 死區處理
    const gamma = Math.abs(this.gyroData.gamma) < this.gyroDeadZone ? 0 : this.gyroData.gamma;
    const beta = Math.abs(this.gyroData.beta) < this.gyroDeadZone ? 0 : this.gyroData.beta;
    
    // 轉換為目標位置（第二章：前後傾斜=上下移動，左右傾斜=左右移動）
    this.targetPosition.x += gamma * this.gyroSensitivity;
    this.targetPosition.y -= beta * this.gyroSensitivity * 0.7; // 前後移動稍慢
    
    // 速度限制
    const dx = this.targetPosition.x - this.position.x;
    const dy = this.targetPosition.y - this.position.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > this.gyroMaxSpeed) {
      const ratio = this.gyroMaxSpeed / dist;
      this.targetPosition.x = this.position.x + dx * ratio;
      this.targetPosition.y = this.position.y + dy * ratio;
    }
  }

  // 更新位置（每幀呼叫）
  update(bounds, deltaTime = 1) {
    // 平滑移動到目標位置
    const lerp = 0.15 * deltaTime;
    this.position.x += (this.targetPosition.x - this.position.x) * lerp;
    this.position.y += (this.targetPosition.y - this.position.y) * lerp;
    
    // 邊界限制
    this.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, this.position.x));
    this.position.y = Math.max(bounds.minY, Math.min(bounds.maxY, this.position.y));
    
    return { ...this.position };
  }

  // 取得當前位置
  getPosition() {
    return { ...this.position };
  }

  // 重設位置
  resetPosition(x, y) {
    this.position.x = this.targetPosition.x = x;
    this.position.y = this.targetPosition.y = y;
  }

  // 清除事件監聽（場景切換時呼叫）
  destroy() {
    // 可在此移除事件監聽器
  }
}