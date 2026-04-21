async function startGame() {
  ensureAudioContext();  // 1. 解鎖 AudioContext
  unlockSFX();           // 2. 解鎖 SFX
  await delay(100ms);    // 3. 等待音訊上下文完全就緒
  playBGM();             // 4. 播放 BGM
  // 5. 啟動遊戲
}