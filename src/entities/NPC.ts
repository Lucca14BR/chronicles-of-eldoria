import Phaser from 'phaser';
import { TILE, Facing } from '../core/state';
import type { NPCDef, SchedEntry } from '../data/npcs';

export interface NPCHost {
  phaser: Phaser.Scene;
  path(sx: number, sy: number, tx: number, ty: number): [number, number][] | null;
  walkable(x: number, y: number): boolean;
}

const SPEED = 38;

export class NPC {
  sprite: Phaser.Physics.Arcade.Sprite;
  shadow: Phaser.GameObjects.Image;
  private path: [number, number][] = [];
  private entry: SchedEntry | null = null;
  hidden = false;
  talking = false;
  private wanderT = 0;
  facing: Facing = 'down';
  emote: Phaser.GameObjects.Image | null = null;

  constructor(private host: NPCHost, public def: NPCDef) {
    const s = host.phaser;
    this.shadow = s.add.image(0, 0, 'shadow').setOrigin(0.5, 0.6);
    this.sprite = s.physics.add.sprite(0, 0, 'npc_' + def.id, 0).setOrigin(0.5, 1);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 6).setOffset(3, 18);
    body.setImmovable(true);
    body.pushable = false;
  }

  schedule(rainy: boolean) {
    return rainy && this.def.rain ? this.def.rain : this.def.schedule;
  }

  entryAt(min: number, rainy: boolean): SchedEntry {
    const sch = this.schedule(rainy);
    let e = sch[0];
    for (const s of sch) if (s.t <= min) e = s;
    if (min < sch[0].t) e = sch[sch.length - 1];
    return e;
  }

  cell(): [number, number] {
    return [Math.floor(this.sprite.x / TILE), Math.floor((this.sprite.y - 3) / TILE)];
  }

  private setCell(x: number, y: number) {
    this.sprite.setPosition(x * TILE + 8, y * TILE + 14);
  }

  /** Snap to where the schedule says the NPC should be now. */
  place(min: number, rainy: boolean) {
    const e = this.entryAt(min, rainy);
    this.entry = e;
    this.path = [];
    this.setCell(e.x, e.y);
    this.setHidden(!!e.hide);
    this.face(e.face || 'down');
  }

  setHidden(h: boolean) {
    this.hidden = h;
    this.sprite.setVisible(!h);
    this.shadow.setVisible(!h);
    (this.sprite.body as Phaser.Physics.Arcade.Body).enable = !h;
  }

  face(f: Facing) {
    this.facing = f;
    this.sprite.anims.stop();
    this.sprite.setFrame({ down: 0, up: 3, left: 6, right: 6 }[f]);
    this.sprite.setFlipX(f === 'right');
  }

  faceToward(x: number, y: number) {
    const dx = x - this.sprite.x,
      dy = y - this.sprite.y;
    if (Math.abs(dx) > Math.abs(dy)) this.face(dx < 0 ? 'left' : 'right');
    else this.face(dy < 0 ? 'up' : 'down');
  }

  onMinute(min: number, rainy: boolean) {
    const e = this.entryAt(min, rainy);
    if (e !== this.entry) {
      this.entry = e;
      if (this.hidden) {
        // leave the house from the door cell we were hidden at
        this.setHidden(false);
      }
      this.goto(e.x, e.y);
    }
  }

  private goto(tx: number, ty: number) {
    const [cx, cy] = this.cell();
    const p = this.host.path(cx, cy, tx, ty);
    if (p) this.path = p;
    else {
      // unreachable: teleport discreetly
      this.setCell(tx, ty);
      this.path = [];
    }
  }

  update(dt: number) {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (this.hidden) return;
    if (this.talking) {
      body.setVelocity(0, 0);
      this.sync();
      return;
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
        if (!this.path.length) this.arrived();
      } else {
        body.setVelocity((dx / d) * SPEED, (dy / d) * SPEED);
        const f: Facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
        this.facing = f;
        const anim = 'npc_' + this.def.id + '_walk_' + (f === 'left' || f === 'right' ? 'side' : f);
        this.sprite.setFlipX(f === 'right');
        if (this.sprite.anims.currentAnim?.key !== anim || !this.sprite.anims.isPlaying) this.sprite.play(anim);
      }
    } else {
      body.setVelocity(0, 0);
      if (this.entry?.wander) {
        this.wanderT -= dt;
        if (this.wanderT <= 0) {
          this.wanderT = 3000 + Math.random() * 5000;
          const r = this.entry.wander;
          for (let i = 0; i < 8; i++) {
            const x = this.entry.x + Math.round((Math.random() * 2 - 1) * r);
            const y = this.entry.y + Math.round((Math.random() * 2 - 1) * r);
            if (this.host.walkable(x, y)) {
              this.goto(x, y);
              break;
            }
          }
        }
      }
    }
    this.sync();
  }

  private arrived() {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    const e = this.entry;
    if (!e) return;
    const [cx, cy] = this.cell();
    if (cx === e.x && cy === e.y) {
      if (e.hide) this.setHidden(true);
      else this.face(e.face || 'down');
    } else this.face(this.facing);
  }

  private sync() {
    this.sprite.setDepth(this.sprite.y);
    this.shadow.setPosition(this.sprite.x, this.sprite.y - 1).setDepth(this.sprite.y - 1000);
    if (this.emote) this.emote.setPosition(this.sprite.x, this.sprite.y - 28).setDepth(this.sprite.y + 2);
  }

  showEmote(key: string) {
    this.emote?.destroy();
    const s = this.host.phaser;
    this.emote = s.add.image(this.sprite.x, this.sprite.y - 28, key).setScale(1.4);
    s.tweens.add({
      targets: this.emote,
      y: '-=8',
      alpha: 0,
      duration: 1400,
      onComplete: () => {
        this.emote?.destroy();
        this.emote = null;
      },
    });
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    this.emote?.destroy();
  }
}
