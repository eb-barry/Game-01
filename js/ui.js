// js/ui.js
// UI 元件：暱稱設定視窗 + 預設頭像選擇器

export class UIManager {
  constructor() {
    this.nickname = null;
    this.avatarIndex = null;
    this.avatarLibrary = this._generateAvatarLibrary();
  }

  // 生成預設頭像庫（程序化幾何圖案）
  _generateAvatarLibrary() {
    const avatars = [];
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe'];
    
    for (let i = 0; i < 24; i++) {
      avatars.push({
        id: i,
        // 使用 DiceBear 風格的程序化頭像
        url: `https://api.dicebear.com/7.x/shapes/svg?seed=${i}&backgroundColor=${colors[i % colors.length].replace('#', '')}`,
        // 本地 fallback（離線時使用）
        local: `data:image/svg+xml,${encodeURIComponent(this._generateLocalAvatar(i, colors[i % colors.length]))}`
      });
    }
    return avatars;
  }

  // 生成本地 SVG 頭像（離線備援）
  _generateLocalAvatar(seed, color) {
    const patterns = [
      `<circle cx="128" cy="128" r="100" fill="${color}"/>`,
      `<rect x="28" y="28" width="200" height="200" rx="40" fill="${color}"/>`,
      `<polygon points="128,28 228,228 28,228" fill="${color}"/>`,
      `<path d="M128 28 Q228 128 128 228 Q28 128 128 28" fill="${color}"/>`
    ];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">${patterns[seed % patterns.length]}</svg>`;
  }

  // 顯示暱稱設定視窗（首次遊戲時）
  showNicknameModal(onSubmit) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(10, 10, 42, 0.95); z-index: 10000;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      color: #fff; font-family: "Microsoft JhengHei", sans-serif;
    `;
    
    modal.innerHTML = `
      <h2 style="font-size: 24px; margin-bottom: 20px;">🎮 設定玩家名稱</h2>
      <input type="text" id="nickname-input" placeholder="輸入 2-12 字元" maxlength="12"
        style="padding: 12px 20px; font-size: 18px; border-radius: 8px; border: 2px solid #33ff33;
               background: #1a1a4e; color: #fff; width: 80%; max-width: 300px; margin-bottom: 10px;">
      <div id="nickname-error" style="color: #ff6b6b; font-size: 14px; min-height: 20px; margin-bottom: 15px;"></div>
      
      <h3 style="font-size: 18px; margin: 20px 0 10px;">🖼️ 選擇頭像</h3>
      <div id="avatar-grid" style="
        display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px;
        max-width: 400px; margin-bottom: 20px;
      "></div>
      
      <button id="nickname-submit" style="
        padding: 12px 40px; font-size: 18px; font-weight: bold;
        background: linear-gradient(135deg, #33ff33, #00aa00);
        color: #000; border: none; border-radius: 8px;
        cursor: pointer; box-shadow: 0 4px 15px rgba(51,255,51,0.4);
      ">開始遊戲</button>
    `;
    
    document.body.appendChild(modal);
    
    // 渲染頭像網格
    const grid = modal.querySelector('#avatar-grid');
    this.avatarLibrary.forEach((avatar, index) => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        width: 50px; height: 50px; border-radius: 50%; border: 3px solid transparent;
        background: #2a2a5e; cursor: pointer; transition: all 0.2s; overflow: hidden;
      `;
      btn.innerHTML = `<img src="${avatar.local}" style="width:100%;height:100%;object-fit:cover;">`;
      btn.addEventListener('click', () => {
        // 取消其他選擇
        grid.querySelectorAll('button').forEach(b => b.style.borderColor = 'transparent');
        // 選中當前
        btn.style.borderColor = '#33ff33';
        this.avatarIndex = index;
      });
      grid.appendChild(btn);
    });
    
    // 預設選擇第一個頭像
    grid.querySelector('button')?.click();
    
    // 暱稱輸入驗證
    const input = modal.querySelector('#nickname-input');
    const error = modal.querySelector('#nickname-error');
    const submitBtn = modal.querySelector('#nickname-submit');
    
    const blockedWords = ['admin', 'fuck', 'shit', 'damn', 'hell', '垃圾', '廢物'];
    
    function validateNickname(nick) {
      if (nick.length < 2 || nick.length > 12) {
        return '暱稱需 2-12 個字元';
      }
      if (!/^[\u4e00-\u9fa5a-zA-Z0-9]+$/.test(nick)) {
        return '僅支援中文、英文、數字';
      }
      if (blockedWords.some(word => nick.toLowerCase().includes(word))) {
        return '暱稱包含不雅詞彙';
      }
      return null;
    }
    
    input.addEventListener('input', () => {
      const err = validateNickname(input.value.trim());
      error.textContent = err || '';
      submitBtn.disabled = !!err || !this.avatarIndex;
    });
    
    submitBtn.addEventListener('click', () => {
      const nick = input.value.trim();
      const err = validateNickname(nick);
      
      if (err) {
        error.textContent = err;
        return;
      }
      if (!this.avatarIndex) {
        error.textContent = '請選擇一個頭像';
        return;
      }
      
      this.nickname = nick;
      this.avatarIndex = this.avatarIndex;
      
      modal.remove();
      onSubmit({ nickname: nick, avatarIndex: this.avatarIndex });
    });
    
    // Enter 鍵提交
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !submitBtn.disabled) {
        submitBtn.click();
      }
    });
    
    // 初始驗證
    submitBtn.disabled = true;
  }

  // 取得玩家資料
  getPlayerData() {
    return {
      nickname: this.nickname,
      avatarUrl: this.avatarIndex !== null ? this.avatarLibrary[this.avatarIndex].local : null
    };
  }

  // 檢查是否已設定（從 localStorage 讀取）
  async loadFromStorage(uid) {
    try {
      const saved = localStorage.getItem(`player_${uid}`);
      if (saved) {
        const data = JSON.parse(saved);
        this.nickname = data.nickname;
        this.avatarIndex = data.avatarIndex;
        return true;
      }
    } catch (e) {
      console.warn('Load player data failed:', e);
    }
    return false;
  }

  // 儲存玩家資料
  saveToStorage(uid) {
    try {
      localStorage.setItem(`player_${uid}`, JSON.stringify({
        nickname: this.nickname,
        avatarIndex: this.avatarIndex,
        savedAt: Date.now()
      }));
    } catch (e) {
      console.warn('Save player data failed:', e);
    }
  }
}