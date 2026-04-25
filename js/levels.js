// js/levels.js
export function generateChapter2Config(level, width, height) {
  console.log(`🏗️ 生成第二章第${level}關配置 (${width}x${height})`);
  
  // 難度設定：炸彈數量逐關 +20%
  const bombCounts = { 1: 15, 2: 18, 3: 22 };
  const craterCounts = { 1: 3, 2: 3, 3: 4 };
  
  const bombCount = bombCounts[level] || 15;
  const craterCount = craterCounts[level] || 3;
  
  // 安全區域：起點與基地附近不生成炸彈
  const safeZones = [
    { x: width/2, y: height - 80, r: 60 }, // 起點
    { x: width/2, y: 60, r: 70 }            // 基地
  ];
  
  // 生成炸彈（確保不重疊安全區）
  const bombs = [];
  let attempts = 0;
  while(bombs.length < bombCount && attempts < 500) {
    attempts++;
    const b = {
      x: Math.random() * (width - 80) + 40,
      y: Math.random() * (height * 0.6) + height * 0.2,
      r: 12
    };
    // 檢查是否與安全區或其他炸彈重疊
    const overlap = safeZones.some(s => Math.hypot(b.x - s.x, b.y - s.y) < b.r + s.r) ||
                   bombs.some(ob => Math.hypot(b.x - ob.x, b.y - ob.y) < b.r + ob.r + 10);
    if(!overlap) bombs.push(b);
  }
  console.log(`✅ 生成 ${bombs.length}/${bombCount} 個炸彈`);
  
  // 生成隕石坑
  const craters = [];
  for(let i = 0; i < craterCount; i++) {
    let c;
    let tries = 0;
    do {
      tries++;
      c = {
        x: Math.random() * (width - 100) + 50,
        y: Math.random() * (height * 0.5) + height * 0.3,
        r: 35
      };
    } while(tries < 50 && (
      safeZones.some(s => Math.hypot(c.x - s.x, c.y - s.y) < c.r + s.r) ||
      craters.some(oc => Math.hypot(c.x - oc.x, c.y - oc.y) < c.r + oc.r + 20)
    ));
    craters.push(c);
  }
  console.log(`✅ 生成 ${craters.length} 個隕石坑`);
  
  // 頂部基地配置
  const base = {
    x: width / 2,
    y: 60,
    r: 50,
    hp: 5 // 需要擊落 5 架飛碟
  };
  
  return {
    bombs,
    craters,
    base,
    instruction: '📱 傾斜手機移動戰艦，避開炸彈與隕石坑，抵達頂部基地射擊飛碟'
  };
}