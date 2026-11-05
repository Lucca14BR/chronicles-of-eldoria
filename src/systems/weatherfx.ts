/** Rain, snow, storms, falling leaves and fireflies. */
import Phaser from 'phaser';
import type { Weather } from '../core/state';
import { audio } from './audio';

export class WeatherFx {
  private emitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private leaves: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private flies: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private flash: Phaser.GameObjects.Rectangle | null = null;
  private nextBolt = 0;
  weather: Weather = 'sun';

  constructor(private scene: Phaser.Scene) {}

  set(weather: Weather, outdoor: boolean, season: number) {
    this.clear();
    this.weather = weather;
    if (!outdoor) return;
    const s = this.scene;
    if (weather === 'rain' || weather === 'storm') {
      this.emitter = s.add.particles(0, 0, 'raindrop', {
        x: { min: 0, max: 1500 },
        y: { min: -40, max: 0 },
        speedX: weather === 'storm' ? -120 : -50,
        speedY: { min: 340, max: 420 },
        lifespan: 900,
        quantity: weather === 'storm' ? 7 : 4,
        frequency: 16,
        alpha: { start: 0.8, end: 0.4 },
        rotate: weather === 'storm' ? 17 : 7,
      });
    } else if (weather === 'snow') {
      this.emitter = s.add.particles(0, 0, 'snowflake', {
        x: { min: 0, max: 1500 },
        y: { min: -20, max: 0 },
        speedX: { min: -25, max: 10 },
        speedY: { min: 25, max: 55 },
        lifespan: 7000,
        quantity: 2,
        frequency: 60,
        alpha: { start: 0.95, end: 0.6 },
        scale: { min: 0.6, max: 1.2 },
      });
    }
    this.emitter?.setDepth(90010);
    if (weather === 'sun' && (season === 2 || season === 0)) {
      this.leaves = s.add.particles(0, 0, season === 0 ? 'heart_fx' : 'leaf_2', {
        x: { min: 0, max: 1500 },
        y: { min: -10, max: 0 },
        speedX: { min: 10, max: 40 },
        speedY: { min: 14, max: 30 },
        lifespan: 9000,
        frequency: season === 0 ? 900 : 380,
        rotate: { min: 0, max: 360 },
        scale: season === 0 ? 0.35 : 1,
        tint: season === 0 ? 0xf8c8d8 : undefined,
        alpha: 0.85,
      });
      this.leaves.setDepth(89990);
    }
  }

  setFireflies(on: boolean) {
    if (on && !this.flies) {
      this.flies = this.scene.add.particles(0, 0, 'firefly', {
        x: { min: 0, max: 1500 },
        y: { min: 0, max: 900 },
        speedX: { min: -8, max: 8 },
        speedY: { min: -8, max: 8 },
        lifespan: 4000,
        frequency: 260,
        alpha: { start: 0, end: 1, ease: 'Sine.easeInOut', yoyo: true } as any,
        blendMode: 'ADD',
      });
      this.flies.setDepth(90020);
    } else if (!on && this.flies) {
      this.flies.destroy();
      this.flies = null;
    }
  }

  update(time: number) {
    const cam = this.scene.cameras.main;
    const v = cam.worldView;
    for (const e of [this.emitter, this.leaves]) e?.setPosition(v.x - 60, v.y - 10);
    this.flies?.setPosition(v.x, v.y);
    if (this.weather === 'storm' && time > this.nextBolt) {
      this.nextBolt = time + 7000 + Math.random() * 12000;
      if (!this.flash) this.flash = this.scene.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setOrigin(0).setDepth(90030);
      this.flash.setPosition(v.x, v.y).setSize(v.width + 4, v.height + 4).setAlpha(0.55);
      this.scene.tweens.add({ targets: this.flash, alpha: 0, duration: 380 });
      setTimeout(() => audio.play('fall'), 500 + Math.random() * 800);
    }
  }

  clear() {
    this.emitter?.destroy();
    this.leaves?.destroy();
    this.flies?.destroy();
    this.flash?.destroy();
    this.emitter = this.leaves = this.flies = null;
    this.flash = null;
  }
}
