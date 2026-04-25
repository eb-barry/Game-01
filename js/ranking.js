// js/ranking.js
import { getDatabase, ref, set, get, query, orderByChild, limitToLast } 
       from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

export class RankingManager {
  constructor(uid) {
    this.db = getDatabase();
    this.uid = uid;
    this.MAX_SCORE = 20000;
  }

  async submitScore(score, level) {
    if (!Number.isInteger(score) || score < 0 || score > this.MAX_SCORE) return false;
    
    const ts = Date.now();
    try {
      const curRef = ref(this.db, `players/${this.uid}`);
      const snap = await get(curRef);
      const ex = snap.val();
      
      if (!ex || score > (ex.bestScore || 0)) {
        await set(curRef, {
          bestScore: score,
          bestLevel: Math.max(level, ex?.bestLevel || 0),
          nickname: window.GAME?.ui?.getPlayerData()?.nickname || `Player_${this.uid.slice(0,6)}`,
          avatarIndex: window.GAME?.ui?.getPlayerData()?.avatarIdx || 0,
          timestamp: ts,
          history: ex?.history ? [...ex.history.slice(-4), {score, level, ts}] : [{score, level, ts}]
        });
        console.log('✅ 分數已提交至 Firebase');
        return true;
      }
      return false;
    } catch (e) {
      console.error('❌ 提交分數失敗:', e);
      return false;
    }
  }

  async getLeaderboard() {
    try {
      const q = query(ref(this.db, 'players'), orderByChild('bestScore'), limitToLast(50));
      const snap = await get(q);
      const arr = [];
      snap.forEach(c => arr.push({ uid: c.key, ...c.val() }));
      
      arr.sort((a, b) => (b.bestScore || 0) - (a.bestScore || 0));
      const top = arr.slice(0, 30);
      const mi = arr.findIndex(p => p.uid === this.uid);
      
      return { 
        top30: top, 
        myRank: mi >= 0 ? mi + 1 : null, 
        myData: mi >= 0 ? arr[mi] : null, 
        total: arr.length 
      };
    } catch (e) {
      console.error('❌ 獲取排行榜失敗:', e);
      return { top30: [], myRank: null, myData: null, total: 0 };
    }
  }
}