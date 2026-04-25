// js/audio.js
export class AudioManager {
  constructor() {
    this.unlocked = false;
    this.bgm = new Audio('assets/audio/BGM.mp3');
    this.bgm.loop = true;
    this.bgm.volume = 0.8; // 80% 音量
    this.bgm.preload = 'auto';
    
    // ✅ 只保留必要的音效
    this.sfx = {
      hit: new Audio('assets/audio/CANNON.mp3'),    // 被擊中時播放
      lose: new Audio('assets/audio/GAMELOSE.mp3')  // 遊戲結束播放
    };
    Object.values(this.sfx).forEach(a => { a.volume = 0.4; a.preload = 'auto'; });
    
    this._setupDebug();
  }

  _setupDebug() {
    const check = (audio, name) => {
      audio.addEventListener('canplaythrough', () => console.log(`✅ ${name} 就緒`));
      audio.addEventListener('error', (e) => console.error(`❌ ${name} 載入失敗:`, e));
    };
    check(this.bgm, 'BGM.mp3');
    Object.entries(this.sfx).forEach(([k, a]) => check(a, k));
  }

  async unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    console.log('🔊 嘗試解鎖音訊...');
    try {
      await this.bgm.play();
      this.bgm.pause();
      console.log('✅ 音訊解鎖成功');
    } catch (e) {
      console.warn('⚠️ 音訊自動播放被阻擋:', e.message);
    }
  }

  playBGM() {
    if (!this.unlocked) this.unlock();
    this.bgm.currentTime = 0;
    this.bgm.play().catch(e => console.warn('BGM 播放失敗:', e.message));
  }

  pauseBGM() { this.bgm.pause(); }
  resumeBGM() { if(this.unlocked) this.bgm.play().catch(()=>{}); }

  play(name) {
    const audio = this.sfx[name];
    if (audio && this.unlocked) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  }
}