// js/input.js
export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.gyro = { beta: 0, gamma: 0 };
    this.isGyroReady = false;
    this.smoothing = 0.15;
    this._bind();
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
          console.warn("⚠️ 使用者拒絕陀螺儀權限");
        }
      } catch (error) {
        console.error("❌ 陀螺儀權限請求錯誤:", error);
      }
    } else {
      // 非 iOS 13+ 或 Android
      this.isGyroReady = true;
      console.log("✅ 非 iOS 13+ 裝置，自動啟用陀螺儀");
    }
  }

  _bind() {
    window.addEventListener('deviceorientation', (e) => this.handleOrientation(e));
  }

  handleOrientation(e) {
    // ✅ 若未獲得權限，直接返回，防止卡死
    if (!this.isGyroReady) return;
    
    this.gyro.beta = this.gyro.beta * (1 - this.smoothing) + (e.beta || 0) * this.smoothing;
    this.gyro.gamma = this.gyro.gamma * (1 - this.smoothing) + (e.gamma || 0) * this.smoothing;
  }

  update() {
    // 簡單的映射邏輯
    const w = this.canvas.width, h = this.canvas.height;
    // 如果未就緒，回傳中心點，防止戰機消失
    if (!this.isGyroReady) return { x: w / 2, y: h - 100 };

    // 根據傾斜角度移動
    const targetX = (w / 2) + (this.gyro.gamma * 4); 
    const targetY = (h - 100) - (this.gyro.beta * 3);

    return {
      x: Math.max(30, Math.min(w - 30, targetX)),
      y: Math.max(h * 0.2, Math.min(h - 50, targetY))
    };
  }
}