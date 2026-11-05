import Phaser from 'phaser';
import { MW, MH, CASTLE_WINDOWS } from '../art/menuArt';
import { MainMenu } from '../ui/mainmenu';
import { newGame, loadGame } from '../systems/save';
import { audio } from '../systems/audio';
import { ui } from '../ui/UI';

export class MenuScene extends Phaser.Scene {
  private layers: { img: Phaser.GameObjects.Image; depth: number }[] = [];
  private clouds: Phaser.GameObjects.Image[] = [];
  private menu!: MainMenu;
  private root!: Phaser.GameObjects.Container;
  private wins: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('Menu');
  }

  create() {
    this.layers = [];
    this.clouds = [];
    this.wins = [];
    this.cameras.main.setBackgroundColor('#120c10');
    this.root = this.add.container(0, 0);
    const add = (k: string, depth: number) => {
      const img = this.add.image(0, 0, k).setOrigin(0, 0);
      this.root.add(img);
      this.layers.push({ img, depth });
      return img;
    };
    add('m_sky', 0);
    for (let i = 0; i < 4; i++) {
      const c = this.add.image(Math.random() * MW, 30 + Math.random() * 70, 'm_cloud' + (i % 2)).setAlpha(0.7);
      this.root.add(c);
      this.clouds.push(c);
    }
    add('m_mtn_far', 0.08);
    add('m_mtn', 0.15);
    add('m_castle', 0.22);
    for (const [x, y] of CASTLE_WINDOWS) {
      const w = this.add.image(x, y, 'm_win').setOrigin(0, 0);
      this.root.add(w);
      this.wins.push(w);
    }
    add('m_lake', 0.25);
    add('m_forest0', 0.4);
    add('m_forest1', 0.7);
    const flies = this.add.particles(0, 0, 'firefly', {
      x: { min: 0, max: MW },
      y: { min: 150, max: MH },
      speedX: { min: -6, max: 6 },
      speedY: { min: -8, max: 4 },
      lifespan: 4000,
      frequency: 200,
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
    });
    this.root.add(flies);
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));

    this.menu = new MainMenu({
      newGame: (slot, name, look) => {
        newGame(slot, name, look);
        this.startGame();
      },
      load: (slot) => {
        if (!loadGame(slot)) {
          alert('Não foi possível carregar este jogo salvo.');
          return;
        }
        this.startGame();
      },
    });
    this.menu.title();
    const unlock = () => {
      audio.init();
      audio.setMusic('menu');
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    if (audio.ctx) audio.setMusic('menu');
  }

  private layout() {
    const w = this.scale.width,
      h = this.scale.height;
    const s = Math.max(w / MW, h / MH);
    this.root.setScale(s);
    this.root.setPosition((w - MW * s) / 2, (h - MH * s) / 2);
  }

  private startGame() {
    this.menu.hide();
    audio.init();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (!ui.root) ui.init();
      this.scene.start('Game');
    });
  }

  update(t: number) {
    const ptr = this.input.activePointer;
    const mx = (ptr.x / this.scale.width - 0.5) * 2;
    for (const l of this.layers) l.img.x = -mx * l.depth * 10;
    for (const c of this.clouds) {
      c.x += 0.05;
      if (c.x > MW + 60) c.x = -60;
    }
    for (let i = 0; i < this.wins.length; i++) this.wins[i].setAlpha(0.75 + Math.sin(t * 0.003 + i * 1.7) * 0.25);
    for (const w of this.wins) w.x = w.x; // static
  }
}
