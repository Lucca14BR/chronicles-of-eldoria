import Phaser from 'phaser';
import { TILE, AnimalState } from '../core/state';
import { ANIMALS, AnimalDef } from '../data/animals';
import type { NPCHost } from './NPC';

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** A farm animal wandering inside a rectangle of tiles. `state` is null for Marta's ranch animals. */
export class Animal {
  sprite: Phaser.Physics.Arcade.Sprite;
  shadow: Phaser.GameObjects.Image;
  def: AnimalDef;
  private path: [number, number][] = [];
  private idleT = 0;
  private bubble: Phaser.GameObjects.Image | null = null;
  private emote: Phaser.GameObjects.Image | null = null;
  private texKey: string;
  leaving = false;

  constructor(private host: NPCHost, kind: string, x: number, y: number, public bounds: Bounds, public state: AnimalState | null, variant = 0) {
    this.def = ANIMALS[kind];
    const s = host.phaser;
    this.texKey = this.def.tex + '_' + Math.min(variant, this.def.variants - 1);
    this.shadow = s.add.image(0, 0, 'shadow').setOrigin(0.5, 0.6).setScale(this.def.w / 14, 1);
    this.sprite = s.physics.add.sprite(x * TILE + 8, y * TILE + 14, this.texKey, 0).setOrigin(0.5, 1);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.def.body[0], this.def.body[1]).setOffset((this.def.w - this.def.body[0]) / 2, this.def.h - this.def.body[1] - 1);
    body.setImmovable(true);
    body.pushable = false;
    this.idleT = Math.random() * 3000;
    this.refreshLook();
  }

  get name() {
    return this.state?.name || this.def.name;
  }

  refreshLook() {
    if (this.def.id === 'sheep' && this.state && !this.state.product) {
      if (this.texKey !== 'an_sheep_shorn') {
        this.texKey = 'an_sheep_shorn';
        this.sprite.setTexture(this.texKey, 0);
      }
    } else if (this.def.id === 'sheep' && this.texKey === 'an_sheep_shorn') {
      this.texKey = 'an_sheep_0';
      this.sprite.setTexture(this.texKey, 0);
    }
    const want = !!this.state?.product;
    if (want && !this.bubble) {
      this.bubble = this.host.phaser.add.image(0, 0, 'icon_' + this.state!.product).setScale(0.7);
      this.host.phaser.tweens.add({ targets: this.bubble, scale: 0.8, duration: 600, yoyo: true, repeat: -1 });
    } else if (!want && this.bubble) {
      this.bubble.destroy();
      this.bubble = null;
    }
  }

  cell(): [number, number] {
    return [Math.floor(this.sprite.x / TILE), Math.floor((this.sprite.y - 3) / TILE)];
  }

  private pickTarget() {
    const b = this.bounds;
    for (let i = 0; i < 10; i++) {
      const x = b.x0 + Math.floor(Math.random() * (b.x1 - b.x0 + 1));
      const y = b.y0 + Math.floor(Math.random() * (b.y1 - b.y0 + 1));
      if (!this.host.walkable(x, y)) continue;
      const [cx, cy] = this.cell();
      if (Math.abs(cx - x) + Math.abs(cy - y) > 7) continue;
      const p = this.host.path(cx, cy, x, y);
      if (p && p.length < 14) {
        this.path = p;
        return;
      }
    }
  }

  /** Walk back to a cell and disappear (going inside for the night). */
  goHome(x: number, y: number, onDone: () => void) {
    this.leaving = true;
    const [cx, cy] = this.cell();
    this.path = this.host.path(cx, cy, x, y) || [];
    this.leaveT = 9000;
    this.onHome = onDone;
  }

  private leaveT = 0;
  private onHome: (() => void) | null = null;

  private finishLeaving() {
    const fn = this.onHome;
    this.onHome = null;
    fn?.();
  }

  update(dt: number, paused: boolean) {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (paused) {
      body.setVelocity(0, 0);
      this.sync();
      return;
    }
    if (this.leaving) {
      this.leaveT -= dt;
      if (!this.path.length || this.leaveT <= 0) {
        body.setVelocity(0, 0);
        this.finishLeaving();
        this.sync();
        return;
      }
    }
    if (this.path.length) {
      const [nx, ny] = this.path[0];
      const tx = nx * TILE + 8,
        ty = ny * TILE + 14;
      const dx = tx - this.sprite.x,
        dy = ty - this.sprite.y;
      const d = Math.hypot(dx, dy);
      if (d < 1.5) {
        this.sprite.setPosition(tx, ty);
        this.path.shift();
        if (!this.path.length) {
          body.setVelocity(0, 0);
          this.sprite.anims.stop();
          this.sprite.setFrame(0);
          this.idleT = 2500 + Math.random() * 5000;
          if (this.leaving) this.finishLeaving();
        }
      } else {
        const sp = this.def.speed * (this.leaving ? 1.8 : 1);
        body.setVelocity((dx / d) * sp, (dy / d) * sp);
        if (Math.abs(dx) > 0.5) this.sprite.setFlipX(dx > 0);
        const anim = this.texKey + '_walk';
        if (this.sprite.anims.currentAnim?.key !== anim || !this.sprite.anims.isPlaying) this.sprite.play(anim);
      }
    } else if (!this.leaving) {
      body.setVelocity(0, 0);
      this.idleT -= dt;
      if (this.idleT <= 0) {
        if (Math.random() < 0.35) {
          // graze for a moment
          this.sprite.setFrame(3);
          this.idleT = 1500 + Math.random() * 2500;
          this.host.phaser.time.delayedCall(1400, () => this.sprite.active && !this.path.length && this.sprite.setFrame(0));
        } else this.pickTarget();
      }
    }
    this.sync();
  }

  private sync() {
    const s = this.sprite;
    s.setDepth(s.y);
    this.shadow.setPosition(s.x, s.y - 1).setDepth(s.y - 1000);
    if (this.bubble) this.bubble.setPosition(s.x, s.y - this.def.h - 6).setDepth(s.y + 3);
    if (this.emote) this.emote.setPosition(s.x, s.y - this.def.h - 4).setDepth(s.y + 4);
  }

  showHeart() {
    this.emote?.destroy();
    const sc = this.host.phaser;
    this.emote = sc.add.image(this.sprite.x, this.sprite.y - this.def.h - 4, 'heart_fx').setScale(1.4);
    sc.tweens.add({
      targets: this.emote,
      y: '-=8',
      alpha: 0,
      duration: 1200,
      onComplete: () => {
        this.emote?.destroy();
        this.emote = null;
      },
    });
    sc.tweens.add({ targets: this.sprite, scaleY: 0.9, duration: 90, yoyo: true });
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    this.bubble?.destroy();
    this.emote?.destroy();
  }
}
