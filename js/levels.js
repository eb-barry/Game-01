// js/levels.js
export const LEVELS = {
  1: { // 第一章：飽和攻擊 (觸控)
    inputMode: 'touch',
    targets: 5, // 調試用
    maxUFOs: 5,
    bg: 'space',
    ufoImg: 'UFO.png',
    instruction: '👆 拖曳畫面控制戰機移動（自動射擊）'
  },
  2: { // 第二章：夜襲 (陀螺儀迷宮)
    inputMode: 'gyro',
    targets: 5, // 調試用：擊落基地飛碟數
    bg: 'desert',
    ufoImg: 'UFO-2.png',
    bombImg: ['BOMB-01.png', 'BOMB-02.png', 'BOMB-03.png'],
    maxHp: 5,
    instruction: '📱 傾斜手機移動戰艦，避開炸彈與隕石坑，抵達頂部基地射擊',
    difficulty: {
      1: { bombs: 15, craters: 3 },
      2: { bombs: 18, craters: 3 }, // +20%
      3: { bombs: 22, craters: 4 }  // +20%
    }
  }
};

export function generateChapter2Config(level, width, height) {
  const cfg = LEVELS[2].difficulty[level];
  const bombs = [];
  const safeZones = [{ x: width/2, y: height-50, r: 40 }, { x: width/2, y: height/2, r: 30 }];
  
  // 生成炸彈（確保不重疊安全區）
  for(let i=0; i<cfg.bombs; i++) {
    let b;
    do {
      b = { x: Math.random()*(width-60)+30, y: Math.random()*(height*0.6)+height*0.2, r: 12 };
    } while(safeZones.some(s => Math.hypot(b.x-s.x, b.y-s.y) < b.r + s.r));
    bombs.push(b);
  }
  
  // 生成隕石坑 (3-4個)
  const craters = [];
  for(let i=0; i<cfg.craters; i++) {
    craters.push({ x: Math.random()*(width-80)+40, y: Math.random()*(height*0.5)+height*0.3, r: 35 });
  }
  
  // 頂部基地
  const base = { x: width/2, y: 60, r: 50, hp: cfg.bombs }; // 基地血量等於炸彈數
  
  return { bombs, craters, base, ...LEVELS[2] };
}