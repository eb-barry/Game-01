// js/ranking.js
// Firebase 排行榜：前 30 名 + 個人最佳，含防作弊驗證

import { getDatabase, ref, set, get, query, orderByChild, limitToLast, onValue } 
       from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

export class RankingManager {
  constructor(firebaseConfig, playerId) {
    this.db = getDatabase();
    this.playerId = playerId;
    this.MAX_SCORE = 15000;
    this.TOP_N = 30;
  }

  // 提交分數（含基礎防作弊）
  async submitScore(score, level, playTimeSec, damageTaken) {
    // 1. 客戶端基礎驗證
    if (!Number.isInteger(score) || score < 0 || score > this.MAX_SCORE) {
      console.warn('Invalid score:', score);
      return false;
    }
    
    // 2. 計算完整性 token（簡單防篡改）
    const timestamp = Date.now();
    const token = this._generateIntegrityToken(score, level, timestamp);
    
    // 3. 準備資料
    const playerData = {
      score,
      level,
      playTimeSec,
      damageTaken,
      timestamp,
      token,
      submittedAt: timestamp
    };
    
    try {
      // 4. 讀取現有最佳分數
      const currentRef = ref(this.db, `players/${this.playerId}`);
      const snapshot = await get(currentRef);
      const existing = snapshot.val();
      
      // 5. 僅更新若新分數更高
      if (!existing || score > (existing.bestScore || 0)) {
        await set(currentRef, {
          bestScore: score,
          bestLevel: Math.max(level, existing?.bestLevel || 0),
          nickname: window.uiManager?.getPlayerData()?.nickname || `Player_${this.playerId.slice(0,6)}`,
          avatarIndex: window.uiManager?.getPlayerData()?.avatarIndex || 0,
          lastPlayed: timestamp,
          history: existing?.history ? [...existing.history.slice(-9), playerData] : [playerData]
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Submit score failed:', err);
      return false;
    }
  }

  // 產生完整性 token（防作弊基礎）
  _generateIntegrityToken(score, level, timestamp, salt = 'galaxy-defense-secret-2024') {
    // 簡單 hash：score|level|timestamp|salt
    const str = `${score}|${level}|${timestamp}|${salt}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // 取得排行榜（前 30 名 + 個人排名）
  async getLeaderboard() {
    try {
      const playersRef = ref(this.db, 'players');
      const q = query(playersRef, orderByChild('bestScore'), limitToLast(50));
      const snapshot = await get(q);
      
      const allPlayers = [];
      snapshot.forEach(child => {
        allPlayers.push({
          uid: child.key,
          ...child.val()
        });
      });
      
      // 排序：分數降序
      allPlayers.sort((a, b) => (b.bestScore || 0) - (a.bestScore || 0));
      
      // 取前 30 名
      const top30 = allPlayers.slice(0, this.TOP_N);
      
      // 找個人排名
      const myIndex = allPlayers.findIndex(p => p.uid === this.playerId);
      const myRank = myIndex >= 0 ? myIndex + 1 : null;
      const myData = myIndex >= 0 ? allPlayers[myIndex] : null;
      
      return {
        top30,
        myRank,
        myData,
        totalPlayers: allPlayers.length
      };
    } catch (err) {
      console.error('Get leaderboard failed:', err);
      return { top30: [], myRank: null, myData: null, totalPlayers: 0 };
    }
  }

  // 渲染排行榜到 GLOBAL-RANKING-01.png 模板
  async renderToTemplate(canvas, templateImage) {
    const ctx = canvas.getContext('2d');
    const data = await this.getLeaderboard();
    
    // 1. 繪製模板背景
    ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);
    
    // 2. 設定文字樣式
    ctx.font = 'bold 16px "Microsoft JhengHei"';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    
    // 3. 繪製前 30 名（留白區域：假設從 y=120 開始）
    const startY = 120;
    const rowHeight = 32;
    
    data.top30.forEach((player, index) => {
      const y = startY + index * rowHeight;
      
      // 排名（金/銀/銅色）
      const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
      ctx.fillStyle = index < 3 ? rankColors[index] : '#fff';
      ctx.fillText(`#${index + 1}`, 30, y + 20);
      
      // 頭像（程序化生成）
      const avatarUrl = player.avatarIndex !== undefined 
        ? `https://api.dicebear.com/7.x/shapes/svg?seed=${player.avatarIndex}`
        : `https://api.dicebear.com/7.x/shapes/svg?seed=${player.uid.slice(0,8)}`;
      
      // 暱稱 + 分數
      ctx.fillStyle = '#fff';
      ctx.fillText(player.nickname || 'Anonymous', 80, y + 20);
      ctx.textAlign = 'right';
      ctx.fillText(player.bestScore?.toLocaleString() || 0, canvas.width - 40, y + 20);
      ctx.textAlign = 'left';
    });
    
    // 4. 繪製個人排名（若未入前 30）
    if (data.myData && (!data.myRank || data.myRank > 30)) {
      const y = startY + 30 * rowHeight + 20;
      ctx.fillStyle = '#33ff33';
      ctx.fillText(`You: #${data.myRank || 'N/A'}`, 30, y);
      ctx.fillText(data.myData.nickname || 'You', 80, y);
      ctx.textAlign = 'right';
      ctx.fillText(data.myData.bestScore?.toLocaleString() || 0, canvas.width - 40, y);
    }
    
    // 5. 返回 canvas 作為圖片
    return canvas.toDataURL('image/png');
  }
}

// Firebase 安全規則範例（請手動貼到 Firebase Console）
/*
{
  "rules": {
    "players": {
      "$uid": {
        ".write": "$uid === auth.uid",
        ".validate": "
          newData.hasChildren(['bestScore', 'nickname', 'avatarIndex', 'timestamp']) &&
          newData.child('bestScore').isNumber() && 
          newData.child('bestScore').val() >= 0 && 
          newData.child('bestScore').val() <= 15000 &&
          newData.child('timestamp').isNumber() &&
          newData.child('timestamp').val() <= now &&
          newData.child('timestamp').val() > (now - 3600000)
        ",
        "bestScore": {
          ".validate": "newData.isNumber() && (newData.val() >= data.val() || !data.exists())"
        }
      },
      ".read": true
    }
  }
}
*/