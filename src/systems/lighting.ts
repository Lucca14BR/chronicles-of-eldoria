/** Darkness overlay with soft light holes + warm additive glows. */
import Phaser from 'phaser';

export interface Light {
  x: number;
  y: number;
  r: number;
  color: number;
  flicker?: boolean;
}

export interface Ambient {
  color: number;
  alpha: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function lerpColor(a: number, b: number, t: number) {
  const r = lerp((a >> 16) & 255, (b >> 16) & 255, t);
  const g = lerp((a >> 8) & 255, (b >> 8) & 255, t);
  const bl = lerp(a & 255, b & 255, t);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}

const NIGHT = 0x0b0f2e;
const DUSK = 0xb4561e;
const DAWN = 0x4a3a6a;

/** Outdoor ambient light for a time of day (minutes) and weather. */
export function outdoorAmbient(min: number, overcast: number): Ambient {
  const h = min / 60;
  let color = NIGHT;
  let alpha = 0;
  if (h < 5 || h >= 24) {
    alpha = 0.74;
  } else if (h < 7) {
    const t = (h - 5) / 2;
    color = lerpColor(NIGHT, DAWN, t);
    alpha = lerp(0.74, 0.0, t);
  } else if (h < 17) {
    alpha = 0;
  } else if (h < 19) {
    const t = (h - 17) / 2;
    color = DUSK;
    alpha = lerp(0, 0.24, t);
  } else if (h < 21) {
    const t = (h - 19) / 2;
    color = lerpColor(DUSK, NIGHT, t);
    alpha = lerp(0.24, 0.66, t);
  } else {
    alpha = lerp(0.66, 0.74, Math.min(1, (h - 21) / 3));
  }
  if (overcast > 0) {
    const gray = 0x2a3040;
    if (alpha < overcast) {
      color = alpha < 0.05 ? gray : lerpColor(color, gray, 0.5);
      alpha = Math.max(alpha, overcast);
    }
  }
  return { color, alpha };
}

export class Lighting {
  private rt: Phaser.GameObjects.RenderTexture | null = null;
  private stamp: Phaser.GameObjects.Image;
  private glows: Phaser.GameObjects.Image[] = [];
  private w = 0;
  private h = 0;

  constructor(private scene: Phaser.Scene) {
    this.stamp = scene.make.image({ key: 'light', add: false });
    this.stamp.setOrigin(0.5);
  }

  private ensure(w: number, h: number) {
    if (this.rt && this.w === w && this.h === h) return;
    this.rt?.destroy();
    this.w = w;
    this.h = h;
    this.rt = this.scene.add.renderTexture(0, 0, w, h).setOrigin(0, 0).setDepth(90000);
  }

  update(lights: Light[], amb: Ambient) {
    const cam = this.scene.cameras.main;
    const view = cam.worldView;
    const w = Math.ceil(view.width) + 4;
    const h = Math.ceil(view.height) + 4;
    this.ensure(w, h);
    const rt = this.rt!;
    const ox = Math.floor(view.x) - 2;
    const oy = Math.floor(view.y) - 2;
    rt.setPosition(ox, oy);
    rt.clear();
    let gi = 0;
    if (amb.alpha > 0.01) {
      rt.fill(amb.color, amb.alpha);
      const now = this.scene.time.now;
      const strength = Math.min(1, amb.alpha / 0.5);
      for (const l of lights) {
        if (l.x + l.r < ox || l.y + l.r < oy || l.x - l.r > ox + w || l.y - l.r > oy + h) continue;
        let r = l.r;
        if (l.flicker) r *= 0.94 + Math.sin(now * 0.013 + l.x) * 0.03 + Math.random() * 0.03;
        this.stamp.setScale((r * 2) / 128);
        rt.erase(this.stamp, l.x - ox, l.y - oy);
        if (l.color !== 0xffffff) {
          let g = this.glows[gi];
          if (!g) {
            g = this.scene.add.image(0, 0, 'light').setBlendMode(Phaser.BlendModes.ADD).setDepth(90001);
            this.glows.push(g);
          }
          g.setVisible(true)
            .setPosition(l.x, l.y)
            .setScale((r * 1.6) / 128)
            .setTint(l.color)
            .setAlpha(0.32 * strength);
          gi++;
        }
      }
    }
    for (let i = gi; i < this.glows.length; i++) this.glows[i].setVisible(false);
    rt.setVisible(amb.alpha > 0.01);
  }

  destroy() {
    this.rt?.destroy();
    this.rt = null;
    this.glows.forEach((g) => g.destroy());
    this.glows = [];
  }
}
