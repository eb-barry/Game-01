export class AudioManager {
  constructor(){this.bgm=document.getElementById('bgm')||new Audio('assets/audio/BGM.mp3');this.bgm.loop=true;this.bgm.volume=0.35;}
  playBGM(){this.bgm.play().catch(()=>{});}
  stopBGM(){this.bgm.pause();this.bgm.currentTime=0;}
  play(type){
    const src = type==='hit'?'assets/audio/CANNON.mp3':type==='crater'?'assets/audio/CANNON.mp3':type==='game-lose'?'assets/audio/GAMELOSE.mp3':'assets/audio/NEXT-LEVEL.mp3';
    const a=new Audio(src); a.volume=type==='game-lose'?0.6:0.4; a.play().catch(()=>{});
  }
}