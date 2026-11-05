/** Title-screen panorama layers (480x270 pixel art). */
import Phaser from 'phaser';
import { PCanvas, mix, shade, addTex } from './pixel';
import { mulberry32, fbm } from '../core/rng';

export const MW = 480;
export const MH = 270;

function sky(): PCanvas {
  const p = new PCanvas(MW, MH);
  const stops = ['#1a1238', '#3a2458', '#7a3a6a', '#c8584a', '#f09048', '#f8c070'];
  for (let y = 0; y < MH; y++) {
    const t = Math.min(1, y / 190);
    const f = t * (stops.length - 1);
    const i = Math.floor(f);
    const c = mix(stops[i], stops[Math.min(stops.length - 1, i + 1)], f - i);
    // dithered banding
    for (let x = 0; x < MW; x++) {
      const d = ((x + y) % 2) * 0.06;
      p.px(x, y, d && i < stops.length - 1 ? mix(c, stops[i + 1], d) : c);
    }
  }
  const rnd = mulberry32(5);
  for (let i = 0; i < 160; i++) {
    const x = Math.floor(rnd() * MW),
      y = Math.floor(rnd() * 110);
    p.px(x, y, rnd() < 0.2 ? '#ffffff' : '#c8c0f0', Math.floor(120 + rnd() * 135));
  }
  // sun
  p.disc(330, 176, 26, '#fbe08a', 90);
  p.disc(330, 176, 19, '#fdeaa0');
  p.disc(330, 176, 15, '#fff4c8');
  return p;
}

function mountains(far: boolean): PCanvas {
  const p = new PCanvas(MW, MH);
  const base = far ? 150 : 175;
  const amp = far ? 60 : 45;
  const col = far ? '#5a3a6a' : '#3e2a52';
  const hi = far ? '#8a5a7a' : '#6a4a6a';
  for (let x = 0; x < MW; x++) {
    const n = fbm(x * (far ? 0.012 : 0.018), far ? 1 : 7, far ? 3 : 9, 4);
    const top = Math.floor(base - n * amp - (far ? Math.abs(Math.sin(x * 0.02)) * 20 : 0));
    for (let y = top; y < MH; y++) p.px(x, y, y < top + 2 ? hi : col);
    if (far && top < 112) for (let y = top; y < Math.min(top + 6, 112); y++) p.px(x, y, '#e8d8f0');
  }
  return p;
}

function castle(): PCanvas {
  const p = new PCanvas(MW, MH);
  const stone = '#2e2240';
  const lit = '#3e2e52';
  // hill
  for (let x = 120; x < 360; x++) {
    const h = 186 - Math.floor(Math.sin(((x - 120) / 240) * Math.PI) * 34);
    for (let y = h; y < MH; y++) p.px(x, y, '#241a30');
  }
  const tower = (x: number, w: number, top: number, roof = true) => {
    p.rect(x, top, w, 190 - top, stone);
    p.vline(x, top, 190 - top, lit);
    for (let i = 0; i < w; i += 3) p.rect(x + i, top - 3, 2, 3, stone);
    if (roof) {
      for (let y = 0; y < w + 4; y++) p.hline(x + Math.floor(y / 2) - 1, top - 3 - (w + 4) + y, Math.max(1, w + 2 - (w + 4 - y)), '#4a2a3a');
      for (let y = 0; y < w * 1.2; y++) {
        const half = (y / (w * 1.2)) * (w / 2 + 2);
        p.hline(Math.floor(x + w / 2 - half), Math.floor(top - 3 - w * 1.2 + y), Math.ceil(half * 2), y % 3 === 0 ? '#5a2a3a' : '#6a3044');
      }
      p.vline(x + Math.floor(w / 2), top - 3 - Math.floor(w * 1.2) - 6, 6, '#8a6a4a');
      p.rect(x + Math.floor(w / 2) + 1, top - 3 - Math.floor(w * 1.2) - 6, 4, 2, '#c8402e');
    }
  };
  p.rect(176, 140, 130, 50, stone);
  for (let i = 176; i < 306; i += 4) p.rect(i, 136, 2, 4, stone);
  tower(160, 18, 112);
  tower(300, 18, 118);
  tower(212, 14, 96);
  tower(258, 14, 100);
  tower(232, 20, 70);
  p.rect(232, 150, 20, 40, '#1a1424');
  return p;
}

export const CASTLE_WINDOWS: [number, number][] = [
  [166, 130],
  [170, 150],
  [306, 136],
  [310, 156],
  [217, 112],
  [263, 116],
  [238, 88],
  [244, 104],
  [190, 160],
  [200, 160],
  [280, 160],
  [290, 160],
  [238, 128],
];

function forest(layer: number): PCanvas {
  const p = new PCanvas(MW, MH);
  const rnd = mulberry32(17 + layer);
  const col = layer === 0 ? '#1e1a2a' : '#120e1a';
  const base = layer === 0 ? 214 : 236;
  for (let x = 0; x < MW; x++) {
    const h = base - Math.floor(fbm(x * 0.05, layer * 3, 21 + layer) * 18);
    for (let y = h; y < MH; y++) p.px(x, y, col);
  }
  const n = layer === 0 ? 40 : 30;
  for (let i = 0; i < n; i++) {
    const x = Math.floor(rnd() * MW);
    const hgt = (layer === 0 ? 30 : 46) + Math.floor(rnd() * 26);
    const w = (layer === 0 ? 7 : 11) + Math.floor(rnd() * 6);
    const by = base + 8;
    for (let y = 0; y < hgt; y++) {
      const half = (y / hgt) * w;
      if (y % 7 > 4) continue;
      p.hline(Math.floor(x - half), by - hgt + y, Math.ceil(half * 2), col);
    }
    p.rect(x - 1, by - 4, 2, 8, col);
  }
  if (layer === 1) {
    // foreground cliff + hero silhouette with cape
    for (let x = 0; x < 150; x++) {
      const h = 222 + Math.floor(Math.pow(x / 150, 2) * 40);
      for (let y = h; y < MH; y++) p.px(x, y, '#0a0810');
    }
    const hx = 74,
      hy = 222;
    p.rect(hx - 3, hy - 22, 7, 13, '#0a0810');
    p.disc(hx, hy - 25, 3.5, '#0a0810');
    p.rect(hx - 3, hy - 9, 3, 9, '#0a0810');
    p.rect(hx + 1, hy - 9, 3, 9, '#0a0810');
    for (let y = 0; y < 18; y++) p.hline(hx - 4 - Math.floor(y * 0.5), hy - 21 + y, 4 + Math.floor(y * 0.3), '#3a0a14');
    p.line(hx + 5, hy - 16, hx + 12, hy - 2, '#0a0810');
    // companion
    p.ellipse(hx + 18, hy - 4, 5, 3.5, '#0a0810');
    p.disc(hx + 22, hy - 9, 2.5, '#0a0810');
    p.px(hx + 21, hy - 12, '#0a0810');
    p.px(hx + 23, hy - 12, '#0a0810');
  }
  return p;
}

function lake(): PCanvas {
  const p = new PCanvas(MW, MH);
  for (let y = 192; y < 232; y++)
    for (let x = 150; x < MW; x++) {
      const t = (y - 192) / 40;
      let c = mix('#c87a5a', '#3a2a52', t);
      if ((x * 7 + y * 13) % 23 === 0) c = shade(c, 0.3);
      p.px(x, y, c);
    }
  for (let y = 196; y < 230; y += 3) p.hline(300 + Math.floor(Math.sin(y) * 8), y, 30 - (y - 196) / 2, '#f8d890');
  return p;
}

function cloud(seed: number): PCanvas {
  const p = new PCanvas(120, 30);
  const rnd = mulberry32(seed);
  for (let i = 0; i < 9; i++) p.ellipse(15 + rnd() * 90, 18 + rnd() * 6, 10 + rnd() * 14, 5 + rnd() * 5, '#f0a0a0', 200);
  for (let i = 0; i < 6; i++) p.ellipse(20 + rnd() * 80, 14 + rnd() * 4, 8 + rnd() * 10, 3 + rnd() * 3, '#ffd0b8', 220);
  return p;
}

export function buildMenuArt(scene: Phaser.Scene) {
  addTex(scene, 'm_sky', sky());
  addTex(scene, 'm_mtn_far', mountains(true));
  addTex(scene, 'm_mtn', mountains(false));
  addTex(scene, 'm_castle', castle());
  addTex(scene, 'm_lake', lake());
  addTex(scene, 'm_forest0', forest(0));
  addTex(scene, 'm_forest1', forest(1));
  addTex(scene, 'm_cloud0', cloud(3));
  addTex(scene, 'm_cloud1', cloud(8));
  const win = new PCanvas(2, 3);
  win.rect(0, 0, 2, 3, '#ffd070');
  addTex(scene, 'm_win', win);
}
