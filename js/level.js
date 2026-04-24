// js/levels.js
// 關卡配置：模板 + 隨機微調，保證合理路徑

// 第二章炸彈模板（保證有解的路徑）
export const chapter2Templates = {
  level1: [
    {
      id: 'template-A',
      bombs: [
        // 左側障礙
        { x: 100, y: 200 }, { x: 80, y: 350 }, { x: 120, y: 500 },
        // 右側障礙
        { x: canvas.width - 100, y: 250 }, { x: canvas.width - 90, y: 400 },
        // 中間引導路徑（炸彈間隙）
        { x: canvas.width/2 - 80, y: 300 }, { x: canvas.width/2 + 80, y: 450 },
      ],
      craters: [{ x: canvas.width/2, y: canvas.height - 150, r: 35 }],
      basePath: [
        { x: canvas.width/2, y: canvas.height - 100 }, // 起點
        { x: canvas.width/2 - 40, y: canvas.height - 300 },
        { x: canvas.width/2 + 40, y: canvas.height - 500 },
        { x: canvas.width/2, y: 50 } // 終點（基地）
      ]
    },
    {
      id: 'template-B',
      bombs: [
        // 不同佈局
        { x: 150, y: 180 }, { x: 200, y: 320 }, { x: 130, y: 480 },
        { x: canvas.width - 150, y: 220 }, { x: canvas.width - 180, y: 380 },
        { x: canvas.width/2 - 100, y: 280 }, { x: canvas.width/2 + 100, y: 420 },
      ],
      craters: [{ x: canvas.width/3, y: canvas.height - 200, r: 35 }],
      basePath: [
        { x: canvas.width/2, y: canvas.height - 100 },
        { x: canvas.width/2 + 50, y: canvas.height - 350 },
        { x: canvas.width/2 - 30, y: canvas.height - 550 },
        { x: canvas.width/2, y: 50 }
      ]
    }
  ],
  
  level2: [
    {
      id: 'template-C',
      bombs: [
        // +20% 炸彈數量
        { x: 90, y: 180 }, { x: 110, y: 280 }, { x: 85, y: 380 }, { x: 120, y: 480 },
        { x: canvas.width - 90, y: 200 }, { x: canvas.width - 110, y: 300 }, { x: canvas.width - 95, y: 420 },
        { x: canvas.width/2 - 90, y: 250 }, { x: canvas.width/2 + 90, y: 350 },
        { x: canvas.width/2 - 60, y: 450 }, { x: canvas.width/2 + 60, y: 520 },
      ],
      craters: [
        { x: canvas.width/3, y: canvas.height - 180, r: 35 },
        { x: canvas.width*2/3, y: canvas.height - 250, r: 35 }
      ],
      basePath: [
        { x: canvas.width/2, y: canvas.height - 100 },
        { x: canvas.width/2 - 30, y: canvas.height - 320 },
        { x: canvas.width/2 + 40, y: canvas.height - 480 },
        { x: canvas.width/2 - 20, y: canvas.height - 620 },
        { x: canvas.width/2, y: 50 }
      ]
    }
  ],
  
  level3: [
    {
      id: 'template-E',
      bombs: [
        // +20% 炸彈數量（相對於 level2）
        { x: 80, y: 160 }, { x: 100, y: 240 }, { x: 75, y: 320 }, { x: 110, y: 400 }, { x: 90, y: 480 },
        { x: canvas.width - 80, y: 180 }, { x: canvas.width - 100, y: 260 }, { x: canvas.width - 85, y: 360 }, { x: canvas.width - 105, y: 440 },
        { x: canvas.width/2 - 100, y: 220 }, { x: canvas.width/2 + 100, y: 300 },
        { x: canvas.width/2 - 70, y: 380 }, { x: canvas.width/2 + 70, y: 460 },
        { x: canvas.width/2 - 50, y: 540 }, { x: canvas.width/2 + 50, y: 600 },
      ],
      craters: [
        { x: canvas.width/4, y: canvas.height - 200, r: 35 },
        { x: canvas.width/2, y: canvas.height - 350, r: 35 },
        { x: canvas.width*3/4, y: canvas.height - 280, r: 35 }
      ],
      basePath: [
        { x: canvas.width/2, y: canvas.height - 100 },
        { x: canvas.width/2 - 40, y: canvas.height - 280 },
        { x: canvas.width/2 + 50, y: canvas.height - 420 },
        { x: canvas.width/2 - 30, y: canvas.height - 560 },
        { x: canvas.width/2 + 20, y: canvas.height - 680 },
        { x: canvas.width/2, y: 50 }
      ]
    }
  ]
};

// 隨機微調函數：在模板基礎上添加小幅隨機偏移
export function applyRandomOffset(template, variance = 12) {
  return {
    ...template,
    bombs: template.bombs.map(bomb => ({
      ...bomb,
      x: bomb.x + (Math.random() - 0.5) * variance,
      y: bomb.y + (Math.random() - 0.5) * variance
    })),
    craters: template.craters.map(crater => ({
      ...crater,
      x: crater.x + (Math.random() - 0.5) * 8,
      y: crater.y + (Math.random() - 0.5) * 8
    }))
  };
}

// 關卡配置主函數
export function getLevelConfig(chapter, level, canvas) {
  if (chapter !== 2) return null;
  
  const templates = chapter2Templates[`level${level}`];
  if (!templates || templates.length === 0) return null;
  
  // 隨機選擇模板 + 隨機微調
  const template = templates[Math.floor(Math.random() * templates.length)];
  const randomized = applyRandomOffset(template);
  
  return {
    chapter,
    level,
    controlMode: 'gyro', // 第二章使用陀螺儀
    bombImage: `assets/images/BOMB-0${level}.png`,
    ufoImage: `assets/images/UFO-${level}.png`,
    background: 'assets/images/desert-bg.png', // 清晨沙漠背景
    bombs: randomized.bombs,
    craters: randomized.craters,
    basePath: randomized.basePath,
    winCondition: {
      type: 'reachBase', // 到達基地後消滅飛碟
      baseY: 50,
      baseRadius: 40,
      ufosToDestroy: 8 + level * 2
    },
    damageConfig: {
      bombDamage: 1,
      craterDamage: 2,
      craterKnockback: 50,
      craterStunTime: 800 // ms
    },
    maxHp: 5, // 第二章只有 5 血（挑戰性）
    timeLimit: 120 + level * 30 // 秒
  };
}