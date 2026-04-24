export class Renderer {
  constructor(canvas) { this.canvas = canvas; }
  drawBackground(ctx) {
    ctx.fillStyle = '#0b0f2a'; ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
    for(let i=0;i<60;i++){ctx.fillStyle=`rgba(255,255,255,${0.2+(i%4)*0.15})`; ctx.beginPath(); ctx.arc((i*137)%this.canvas.width,(i*89)%this.canvas.height,1+(i%3),0,Math.PI*2); ctx.fill();}
  }
  drawEntities(ctx, e, cfg) {
    // 戰機
    ctx.fillStyle='#444'; ctx.beginPath(); ctx.moveTo(e.player.x,e.player.y-25); ctx.lineTo(e.player.x+30,e.player.y+20); ctx.lineTo(e.player.x-30,e.player.y+20); ctx.fill();
    // 炸彈
    e.bombs.forEach(b=>{ctx.fillStyle='#ffaa00'; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();});
    // 隕石坑
    e.craters.forEach(c=>{ctx.strokeStyle='rgba(255,50,50,0.6)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(c.x,c.y,c.r,0,Math.PI*2); ctx.stroke();});
  }
  drawHUD(ctx, ui) {
    ctx.fillStyle='#fff'; ctx.font='18px "Microsoft JhengHei"'; ctx.fillText(`擊中: ${ui.score}`, 12, 24);
    ctx.fillStyle='#fff'; ctx.font='16px "Microsoft JhengHei"'; ctx.fillText(`第 ${ui.chapter} 關`, 12, 48);
    ctx.fillStyle='#222'; ctx.fillRect(this.canvas.width-150,12,140,14);
    ctx.fillStyle=ui.hp>6?'#33ff33':ui.hp>3?'#ffaa00':'#ff3333';
    ctx.fillRect(this.canvas.width-150,12,(ui.hp/10)*140,14);
  }
}