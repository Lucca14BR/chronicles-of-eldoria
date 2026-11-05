import Phaser from 'phaser';
import type { Drop } from '../data/objects';

export interface EnemyDef {
  name: string;
  tex: string;
  anim: string;
  hp: number;
  dmg: number;
  speed: number;
  fly?: boolean;
  hop?: boolean;
  xp: number;
  drops: Drop[];
  h: number;
}

export const ENEMIES: Record<string, EnemyDef> = {
  slime_green: { name: 'Slime Verde', tex: 'slime_green', anim: 'anim_slime_green', hp: 14, dmg: 6, speed: 46, hop: true, xp: 6, drops: [{ id: 'gel', min: 1, max: 2 }], h: 16 },
  slime_blue: { name: 'Slime Azul', tex: 'slime_blue', anim: 'anim_slime_blue', hp: 26, dmg: 10, speed: 52, hop: true, xp: 10, drops: [{ id: 'gel', min: 1, max: 3 }, { id: 'copper_ore', min: 1, max: 2, chance: 0.3 }], h: 16 },
  slime_purple: { name: 'Slime Arcano', tex: 'slime_purple', anim: 'anim_slime_purple', hp: 40, dmg: 15, speed: 56, hop: true, xp: 16, drops: [{ id: 'gel', min: 2, max: 3 }, { id: 'crystal', min: 1, max: 1, chance: 0.2 }], h: 16 },
  bat: { name: 'Morcego', tex: 'bat', anim: 'anim_bat', hp: 12, dmg: 7, speed: 62, fly: true, xp: 8, drops: [{ id: 'coal', min: 1, max: 1, chance: 0.3 }], h: 16 },
  skeleton: { name: 'Esqueleto', tex: 'skeleton', anim: 'anim_skeleton', hp: 55, dmg: 18, speed: 40, xp: 22, drops: [{ id: 'bone', min: 1, max: 2 }, { id: 'iron_ore', min: 1, max: 2, chance: 0.4 }, { id: 'old_coin', min: 1, max: 1, chance: 0.15 }], h: 24 },
};

export class Enemy {
  sprite: Phaser.Physics.Arcade.Sprite;
  shadow: Phaser.GameObjects.Image;
  hp: number;
  def: EnemyDef;
  private think = 0;
  private stun = 0;
  dead = false;
  private hopT = 0;

  constructor(private scene: Phaser.Scene, public kind: string, x: number, y: number) {
    this.def = ENEMIES[kind];
    this.hp = this.def.hp;
    this.shadow = scene.add.image(x, y, 'shadow').setOrigin(0.5, 0.6);
    this.sprite = scene.physics.add.sprite(x, y, this.def.tex, 0).setOrigin(0.5, 1);
    this.sprite.play(this.def.anim);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 7).setOffset(3, this.def.h - 8);
    body.setCollideWorldBounds(true);
    this.think = Math.random() * 500;
  }

  update(dt: number, px: number, py: number) {
    if (this.dead) return;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const dx = px - this.sprite.x;
    const dy = py - this.sprite.y;
    const d = Math.hypot(dx, dy);
    if (this.stun > 0) {
      this.stun -= dt;
      body.velocity.scale(0.9);
    } else {
      this.think -= dt;
      const aggro = d < 16 * 7;
      if (this.def.hop) {
        this.hopT -= dt;
        if (this.hopT <= 0) {
          this.hopT = 700 + Math.random() * 500;
          if (aggro) body.setVelocity((dx / d) * this.def.speed * 1.6, (dy / d) * this.def.speed * 1.6);
          else {
            const a = Math.random() * Math.PI * 2;
            body.setVelocity(Math.cos(a) * 20, Math.sin(a) * 20);
          }
        } else body.velocity.scale(0.94);
      } else if (this.def.fly) {
        if (this.think <= 0) {
          this.think = 250;
          const wob = (Math.random() - 0.5) * 1.2;
          const ang = Math.atan2(dy, dx) + wob;
          const sp = aggro ? this.def.speed : 22;
          body.setVelocity(Math.cos(ang) * sp, Math.sin(ang) * sp);
        }
      } else {
        if (aggro) body.setVelocity((dx / d) * this.def.speed, (dy / d) * this.def.speed);
        else if (this.think <= 0) {
          this.think = 1500;
          const a = Math.random() * Math.PI * 2;
          body.setVelocity(Math.cos(a) * 15, Math.sin(a) * 15);
        }
        this.sprite.setFlipX(dx > 0);
      }
    }
    this.sprite.setDepth(this.sprite.y + (this.def.fly ? 20 : 0));
    this.shadow.setPosition(this.sprite.x, this.sprite.y - 1).setDepth(this.sprite.y - 1000);
  }

  hit(dmg: number, fromX: number, fromY: number): boolean {
    if (this.dead) return false;
    this.hp -= dmg;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const dx = this.sprite.x - fromX,
      dy = this.sprite.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    body.setVelocity((dx / d) * 180, (dy / d) * 180);
    this.stun = 260;
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.sprite.clearTint());
    if (this.hp <= 0) {
      this.dead = true;
      body.enable = false;
      this.scene.tweens.add({
        targets: [this.sprite, this.shadow],
        alpha: 0,
        scaleX: 1.4,
        scaleY: 0.4,
        duration: 260,
        onComplete: () => this.destroy(),
      });
      return true;
    }
    return false;
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
