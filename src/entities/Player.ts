import Phaser from 'phaser';
import { TILE, Facing, S } from '../core/state';
import { speedMul } from '../systems/progress';

export class Player {
  sprite: Phaser.Physics.Arcade.Sprite;
  shadow: Phaser.GameObjects.Image;
  tool: Phaser.GameObjects.Image;
  facing: Facing = 'down';
  busy = 0; // ms remaining of action lock
  invuln = 0;
  private stepT = 0;
  moving = false;

  constructor(private scene: Phaser.Scene, x: number, y: number) {
    this.shadow = scene.add.image(x, y, 'shadow').setOrigin(0.5, 0.6);
    this.sprite = scene.physics.add.sprite(x, y, 'player', 0).setOrigin(0.5, 1);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 6).setOffset(3, 18);
    body.setCollideWorldBounds(true);
    this.tool = scene.add.image(x, y, 'icon_axe').setVisible(false).setOrigin(0.15, 0.85);
  }

  get x() {
    return this.sprite.x;
  }
  get y() {
    return this.sprite.y;
  }

  /** Tile under the player's feet. */
  cell(): [number, number] {
    return [Math.floor(this.sprite.x / TILE), Math.floor((this.sprite.y - 3) / TILE)];
  }

  facingCell(): [number, number] {
    const [cx, cy] = this.cell();
    const d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[this.facing];
    return [cx + d[0], cy + d[1]];
  }

  face(dir: Facing) {
    this.facing = dir;
    this.idleFrame();
  }

  faceToward(wx: number, wy: number) {
    const dx = wx - this.sprite.x;
    const dy = wy - (this.sprite.y - 6);
    if (Math.abs(dx) > Math.abs(dy)) this.face(dx < 0 ? 'left' : 'right');
    else this.face(dy < 0 ? 'up' : 'down');
  }

  idleFrame() {
    this.sprite.anims.stop();
    const f = { down: 0, up: 3, left: 6, right: 6 }[this.facing];
    this.sprite.setFrame(f);
    this.sprite.setFlipX(this.facing === 'right');
  }

  update(dt: number, input: { x: number; y: number; run: boolean }, locked: boolean, onStep: () => void) {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.busy = Math.max(0, this.busy - dt);
    if (this.invuln > 0) {
      this.invuln -= dt;
      this.sprite.setAlpha(Math.floor(this.invuln / 80) % 2 ? 0.4 : 1);
      if (this.invuln <= 0) this.sprite.setAlpha(1);
    }
    let vx = 0,
      vy = 0;
    if (!locked && this.busy <= 0) {
      vx = input.x;
      vy = input.y;
    }
    const len = Math.hypot(vx, vy);
    const exhausted = S().player.st <= 0;
    const speed = (input.run && !exhausted ? 112 : 76) * speedMul() * (exhausted ? 0.7 : 1);
    if (len > 0) {
      body.setVelocity((vx / len) * speed, (vy / len) * speed);
      if (Math.abs(vx) > Math.abs(vy)) this.facing = vx < 0 ? 'left' : 'right';
      else this.facing = vy < 0 ? 'up' : 'down';
      const anim = 'player_walk_' + (this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing);
      this.sprite.setFlipX(this.facing === 'right');
      if (this.sprite.anims.currentAnim?.key !== anim || !this.sprite.anims.isPlaying) this.sprite.play(anim);
      this.sprite.anims.timeScale = speed / 76;
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = 330 * (76 / speed);
        onStep();
      }
      this.moving = true;
    } else {
      body.setVelocity(0, 0);
      if (this.moving || this.sprite.anims.isPlaying) this.idleFrame();
      this.moving = false;
      this.stepT = 0;
    }
    this.sprite.setDepth(this.sprite.y);
    this.shadow.setPosition(this.sprite.x, this.sprite.y - 1).setDepth(this.sprite.y - 1000);
  }

  /** Swing a tool icon in front of the character. */
  swing(iconKey: string, duration = 280) {
    this.busy = duration;
    const s = this.sprite;
    const f = this.facing;
    this.tool.setTexture(iconKey).setVisible(true);
    const off = { down: [4, -6], up: [-3, -14], left: [-6, -9], right: [6, -9] }[f];
    this.tool.setPosition(s.x + off[0], s.y + off[1]);
    this.tool.setFlipX(f === 'left');
    this.tool.setDepth(f === 'up' ? s.y - 1 : s.y + 1);
    const from = f === 'left' ? 40 : -40;
    const to = f === 'left' ? -70 : 70;
    this.tool.setAngle(from);
    this.scene.tweens.add({
      targets: this.tool,
      angle: to,
      duration: duration * 0.6,
      ease: 'Quad.easeIn',
      onComplete: () => this.scene.time.delayedCall(duration * 0.3, () => this.tool.setVisible(false)),
    });
    const bodyF = { down: 0, up: 3, left: 6, right: 6 }[f];
    s.anims.stop();
    s.setFrame(bodyF + 1);
    this.scene.time.delayedCall(duration * 0.6, () => s.setFrame(bodyF));
  }

  holdItem(iconKey: string | null) {
    if (!iconKey) return;
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    this.tool.destroy();
  }
}
