// js/levels.js
export function generateChapter2Config(level, width, height) {
  console.log(`🏗️ 生成第二章第${level}關配置`);
  
  const bombCounts = { 1: 15, 2: 18, 3: 22 };
  const craterCounts = { 1: 3, 2: 3, 3: 4 };
  const bombCount = bombCounts[level] || 15;
  const craterCount = craterCounts[level] || 3;

  // 🛡️ 安全區域：起點、基地、底部 20% 全域
  const safeZones = [
    { x: width / 2, y: height - 60, r: 80 },
    { x: width / 2, y: 60, r: 70 },
    { x: width / 2, y: height * 0.9, r: width / 2 } // 底部 20% 安全區
  ];

  // 生成炸彈
  const bombs = [];
  let attempts = 0;
  while (bombs.length < bombCount && attempts < 1000) {
    attempts++;
    const b = {
      x: Math.random() * (width - 100) + 50,
      y: Math.random() * (height * 0.6) + height * 0.1, // 限制在 10%~70% 高度
      r: 12
    };
    const overlap = safeZones.some(s => Math.hypot(b.x - s.x, b.y - s.y) < b.r + s.r) ||
                    bombs.some(ob => Math.hypot(b.x - ob.x, b.y - ob.y) < b.r + ob.r + 15);
    if (!overlap) bombs.push(b);
  }
  console.log(`✅ 生成 ${bombs.length}/${bombCount} 個炸彈`);

  // 生成隕石坑
  const craters = [];
  for (let i = 0; i < craterCount; i++) {
    let c, tries = 0;
    do {
      tries++;
      c = {
        x: Math.random() * (width - 120) + 60,
        y: Math.random() * (height * 0.5) + height * 0.2, // 20%~70% 高度
        r: 35
      };
    } while (tries < 100 && (
      safeZones.some(s => Math.hypot(c.x - s.x, c.y - s.y) < c.r + s.r + 10) ||
      craters.some(oc => Math.hypot(c.x - oc.x, c.y - oc.y) < c.r + oc.r + 30)
    ));
    craters.push(c);
  }
  console.log(`✅ 生成 ${craters.length} 個隕石坑`);

  return {
    bombs,
    craters,
    base: { x: width / 2, y: 60, r: 50, hp: 5 },
    instruction: '📱 傾斜手機：向下=前進，左右=轉向。抵達頂部基地後射擊飛碟'
  };
}