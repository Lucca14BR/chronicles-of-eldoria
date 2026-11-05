import Phaser from 'phaser';
import '@fontsource/medievalsharp';
import '@fontsource/alegreya/400.css';
import '@fontsource/alegreya/700.css';
import '@fontsource/alegreya/400-italic.css';
import './ui/style.css';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { G } from './core/state';
import { saveGame, loadGame } from './systems/save';

function boot() {
  // background tabs can report a 0x0 viewport; WebGL needs a real size
  if (window.innerWidth < 2 || window.innerHeight < 2) {
    setTimeout(boot, 100);
    return;
  }
  const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#120c10',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  input: { mouse: { preventDefaultWheel: true } },
  scene: [BootScene, MenuScene, GameScene],
  render: { antialias: false, powerPreference: 'high-performance' },
});
  (window as any).__eldoria = game;
  (window as any).__dbg = { G, saveGame, loadGame }; // handy for testing from the console
  // Some embedders resize the viewport without firing window 'resize'.
  const host = document.getElementById('game')!;
  new ResizeObserver(() => {
    if (game.scale.width !== host.clientWidth || game.scale.height !== host.clientHeight) game.scale.refresh();
  }).observe(host);
}
boot();

document.fonts?.ready.then(() => document.body.classList.add('fonts-ready'));
