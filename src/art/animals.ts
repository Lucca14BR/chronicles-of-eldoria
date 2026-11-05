/** Farm animals, ranch buildings and ranch item icons (procedural pixel art). */
import Phaser from 'phaser';
import { PCanvas, shade, addTex, addSheet } from './pixel';
import { mulberry32 } from '../core/rng';

type P = PCanvas;
const OUT = '#24160f';

function shadow(p: P, cx: number, cy: number, rx: number, ry: number) {
  p.ellipse(cx, cy, rx, ry, '#10180c', 70);
}

// All animals face LEFT; sprites are flipped when walking right.
// frame: 0 idle, 1 walk A, 2 walk B, 3 grazing (head down)

function chicken(f: number, v: number): P {
  const p = new PCanvas(16, 16);
  const body = v ? '#c8864a' : '#f4f0e6';
  const bodyD = shade(body, -0.18);
  const leg = '#e8a030';
  const bob = f === 1 ? -1 : 0;
  const head = f === 3 ? 2 : 0;
  // legs
  const la = f === 1 ? 1 : f === 2 ? -1 : 0;
  p.vline(7 + la, 12, 3, leg);
  p.vline(10 - la, 12, 3, leg);
  p.px(6 + la, 14, leg);
  p.px(9 - la, 14, leg);
  // body + tail
  p.ellipse(9, 9.5 + bob, 5, 3.6, body);
  p.ellipse(10, 10.5 + bob, 4, 2.2, bodyD);
  p.rect(12, 5 + bob, 2, 4, body);
  p.px(14, 5 + bob, body);
  p.px(13, 4 + bob, bodyD);
  // wing
  p.ellipse(9.5, 9 + bob, 2.6, 1.6, shade(body, -0.08));
  p.hline(8, 10 + bob, 3, bodyD);
  // head
  const hy = 5 + bob + head;
  p.disc(4.5, hy, 2.4, body);
  p.rect(3, hy - 3, 3, 1, '#d8302a');
  p.px(4, hy - 4, '#d8302a');
  p.px(3, hy + 2, '#d8302a');
  p.px(1, hy, '#f0a020');
  p.px(2, hy, '#f0a020');
  p.px(3, hy - 1, '#1a1a1a');
  p.outline(OUT);
  shadow(p, 9, 15, 5, 1.2);
  return p;
}

function cow(f: number, v: number): P {
  const p = new PCanvas(32, 24);
  const base = v ? '#a8683a' : '#f4f0e6';
  const spot = v ? '#f4f0e6' : '#2a2226';
  const baseD = shade(base, -0.16);
  const legC = shade(base, -0.1);
  const graze = f === 3;
  // legs
  const legs = [9, 12, 23, 26];
  legs.forEach((x, i) => {
    const off = f === 1 ? (i % 2 ? 1 : -1) : f === 2 ? (i % 2 ? -1 : 1) : 0;
    p.rect(x + off, 17, 2, 5, i < 2 ? legC : baseD);
    p.rect(x + off, 21, 2, 1, '#3a2a20');
  });
  // body
  p.rect(8, 8, 21, 10, base);
  p.ellipse(18, 8.5, 10, 2.2, base);
  p.hline(9, 17, 19, baseD);
  p.vline(28, 9, 8, baseD);
  // spots
  p.ellipse(13, 11, 2.8, 2.2, spot);
  p.ellipse(22, 9.5, 3.2, 2, spot);
  p.ellipse(25, 14, 2, 1.8, spot);
  p.ellipse(17, 15, 1.8, 1.2, spot);
  // udder
  if (!v) {
    p.ellipse(21, 17.5, 2.2, 1.4, '#f0a0a8');
  }
  // tail
  p.vline(29, 9, 6, baseD);
  p.rect(29, 14, 2, 2, '#3a2a20');
  // head
  const hy = graze ? 11 : 6;
  p.rect(2, hy, 7, 7, base);
  p.rect(1, hy + 4, 5, 4, '#f0b0a8');
  p.px(2, hy + 6, '#8a4a4a');
  p.px(4, hy + 6, '#8a4a4a');
  p.px(4, hy + 2, '#1a1a1a');
  p.rect(7, hy - 1, 3, 2, base);
  p.px(9, hy - 1, baseD);
  p.px(3, hy - 1, '#e8dcc0');
  p.px(6, hy - 1, '#e8dcc0');
  p.px(3, hy - 2, '#e8dcc0');
  p.px(6, hy - 2, '#e8dcc0');
  if (!graze) p.rect(7, hy + 1, 2, 4, base);
  p.outline(OUT);
  shadow(p, 17, 22.5, 11, 1.5);
  return p;
}

function goat(f: number): P {
  const p = new PCanvas(24, 20);
  const base = '#e8dcc0';
  const baseD = shade(base, -0.18);
  const graze = f === 3;
  [7, 10, 17, 19].forEach((x, i) => {
    const off = f === 1 ? (i % 2 ? 1 : -1) : f === 2 ? (i % 2 ? -1 : 1) : 0;
    p.rect(x + off, 13, 2, 5, i < 2 ? base : baseD);
    p.px(x + off, 17, '#3a2a20');
    p.px(x + off + 1, 17, '#3a2a20');
  });
  p.ellipse(13.5, 10, 7.5, 4, base);
  p.hline(8, 13, 11, baseD);
  p.rect(20, 6, 2, 3, base);
  // head
  const hy = graze ? 9 : 4;
  p.rect(2, hy, 5, 5, base);
  p.rect(1, hy + 3, 3, 3, base);
  p.px(3, hy + 1, '#1a1a1a');
  p.rect(2, hy + 6, 2, 2, '#c8b898');
  p.line(5, hy - 1, 8, hy - 3, '#8a7a6a');
  p.line(6, hy - 1, 9, hy - 2, '#8a7a6a');
  p.px(7, hy + 1, baseD);
  if (!graze) p.rect(5, hy + 3, 3, 4, base);
  p.outline(OUT);
  shadow(p, 13, 18.5, 8, 1.3);
  return p;
}

function sheep(f: number, shorn: boolean): P {
  const p = new PCanvas(24, 20);
  const wool = shorn ? '#f0dcd0' : '#f4f0e8';
  const woolD = shorn ? '#d8c0b4' : '#d8d0c4';
  const dark = '#3a3036';
  const graze = f === 3;
  [8, 11, 16, 18].forEach((x, i) => {
    const off = f === 1 ? (i % 2 ? 1 : -1) : f === 2 ? (i % 2 ? -1 : 1) : 0;
    p.rect(x + off, 13, 2, 5, dark);
  });
  const rnd = mulberry32(7);
  if (shorn) {
    p.ellipse(13.5, 10.5, 6.5, 3.5, wool);
    p.hline(8, 13, 11, woolD);
  } else {
    p.ellipse(13.5, 9.5, 8, 5, woolD);
    for (let i = 0; i < 10; i++) p.disc(7 + rnd() * 13, 6 + rnd() * 7, 2.2 + rnd(), i % 3 ? wool : woolD);
  }
  const hy = graze ? 9 : 4;
  p.rect(2, hy, 5, 6, dark);
  p.rect(1, hy + 3, 3, 3, dark);
  p.px(3, hy + 1, '#f0f0f0');
  p.rect(6, hy, 2, 2, dark);
  if (!shorn) p.ellipse(5, hy - 0.5, 2.5, 1.5, wool);
  if (!graze) p.rect(5, hy + 3, 3, 4, shorn ? wool : woolD);
  p.outline(OUT);
  shadow(p, 13, 18.5, 8, 1.3);
  return p;
}

function coop(): P {
  const p = new PCanvas(48, 48);
  // walls
  p.rect(4, 20, 40, 24, '#b88a52');
  for (let x = 4; x < 44; x += 4) p.vline(x, 20, 24, '#9a6c3c');
  p.hline(4, 30, 40, '#9a6c3c');
  p.rect(2, 42, 44, 4, '#8a8378');
  // little door + ramp
  p.rect(20, 30, 9, 12, '#5e3a1e');
  p.rect(21, 31, 7, 11, '#2a1a10');
  p.line(18, 46, 22, 42, '#a8743f');
  p.line(31, 46, 27, 42, '#a8743f');
  p.rect(21, 42, 7, 4, '#a8743f');
  for (let y = 43; y < 46; y += 2) p.hline(21, y, 7, '#7a4a26');
  // window
  p.rect(8, 25, 8, 7, '#4a2e18');
  p.rect(9, 26, 6, 5, '#f0d890');
  p.vline(12, 26, 5, '#4a2e18');
  // nest box
  p.rect(32, 24, 10, 6, '#8a5a32');
  p.rect(33, 23, 8, 2, '#e8c860');
  p.px(35, 23, '#f4f0e6');
  p.px(38, 23, '#f4f0e6');
  // roof
  for (let y = 4; y < 22; y++) {
    const half = Math.floor(((y - 4) / 18) * 24) + 3;
    for (let x = 24 - half; x < 24 + half; x++) {
      if (x < 0 || x >= 48) continue;
      let c = y % 3 === 0 ? '#8a3226' : '#b5452e';
      if (x === 24 - half || x === 24 + half - 1) c = '#6a2a20';
      p.px(x, y, c);
    }
  }
  p.hline(0, 21, 48, '#5a2018');
  p.rect(22, 2, 4, 3, '#e8c040');
  p.outline(OUT);
  return p;
}

function barn(): P {
  const p = new PCanvas(80, 66);
  const red = '#a8382a';
  const redD = '#842a20';
  const white = '#f4ece0';
  // walls
  p.rect(4, 28, 72, 34, red);
  for (let x = 6; x < 76; x += 5) p.vline(x, 28, 34, redD);
  p.rect(2, 62, 76, 4, '#8a8378');
  p.hline(2, 62, 76, '#a39c90');
  // gambrel roof
  const rows = 28;
  for (let y = 0; y < rows; y++) {
    const t = y / rows;
    const half = t < 0.45 ? 18 + Math.floor((t / 0.45) * 14) : 32 + Math.floor(((t - 0.45) / 0.55) * 8);
    for (let x = 40 - half; x < 40 + half; x++) {
      let c = y % 3 === 0 ? '#5a2a24' : '#6e3028';
      if (x === 40 - half || x === 40 + half - 1) c = '#3a1a14';
      p.px(x, y + 2, c);
    }
  }
  p.hline(0, 29, 80, white);
  p.hline(18, 2, 44, '#8a4038');
  // hay loft
  p.rect(32, 10, 16, 12, white);
  p.rect(34, 12, 12, 9, '#3a2014');
  p.rect(35, 15, 10, 6, '#e0c060');
  // big doors
  p.rect(24, 38, 32, 24, white);
  p.rect(26, 40, 13, 22, redD);
  p.rect(41, 40, 13, 22, redD);
  p.line(26, 40, 38, 61, white);
  p.line(38, 40, 26, 61, white);
  p.line(41, 40, 53, 61, white);
  p.line(53, 40, 41, 61, white);
  // side windows
  for (const wx of [8, 62]) {
    p.rect(wx, 36, 10, 9, white);
    p.rect(wx + 1, 37, 8, 7, '#3b5a7a');
    p.vline(wx + 5, 37, 7, white);
  }
  p.outline(OUT);
  return p;
}

function hayBale(): P {
  const p = new PCanvas(16, 16);
  p.rect(1, 4, 14, 11, '#e0c060');
  p.rect(1, 4, 14, 3, '#f0d880');
  for (let i = 0; i < 12; i++) p.px(2 + ((i * 5) % 12), 7 + ((i * 3) % 7), '#c8a040');
  p.vline(5, 4, 11, '#9a6a2a');
  p.vline(11, 4, 11, '#9a6a2a');
  p.outline(OUT);
  return p;
}

function trough(): P {
  const p = new PCanvas(32, 16);
  p.rect(1, 6, 30, 7, '#8a5a32');
  p.hline(1, 6, 30, '#a8743f');
  p.rect(3, 4, 26, 3, '#e0c060');
  for (let x = 4; x < 28; x += 3) p.px(x, 3, '#c8a040');
  p.rect(2, 13, 2, 3, '#5e3a1e');
  p.rect(28, 13, 2, 3, '#5e3a1e');
  p.outline(OUT);
  return p;
}

/** Draws ranch item icons. Returns false when the id is not a ranch item. */
export function animalIcon(id: string, p: P): boolean {
  switch (id) {
    case 'pail':
      p.rect(4, 6, 9, 8, '#9aa0a8');
      p.ellipse(8.5, 6, 4.5, 1.6, '#c8cdd6');
      p.ellipse(8.5, 6, 3.2, 0.8, '#f4f4f4');
      p.hline(4, 9, 9, '#7a808a');
      p.hline(5, 13, 7, '#6a707a');
      p.line(4, 6, 8, 1, '#5a5a62');
      p.line(13, 6, 9, 1, '#5a5a62');
      return true;
    case 'shears':
      p.line(4, 12, 12, 2, '#c8cdd6');
      p.line(5, 12, 13, 3, '#9aa0a8');
      p.line(12, 12, 4, 2, '#c8cdd6');
      p.disc(4, 13, 2, '#a8743f');
      p.disc(12, 13, 2, '#a8743f');
      p.px(8, 7, '#5a5a62');
      return true;
    case 'hay':
      p.ellipse(8, 9, 6, 5, '#e0c060');
      for (let i = 0; i < 6; i++) p.line(3 + i * 2, 5, 4 + i * 2, 13, i % 2 ? '#c8a040' : '#f0d880');
      p.hline(2, 9, 12, '#9a6a2a');
      return true;
    case 'egg':
    case 'egg_large': {
      const big = id === 'egg_large';
      p.ellipse(8, 9, big ? 5 : 4, big ? 6 : 5, '#f4ece0');
      p.ellipse(7, 7, 1.6, 2, '#ffffff');
      p.hline(5, big ? 14 : 13, 6, '#d8ccb8');
      if (big) {
        p.px(13, 2, '#fff6c0');
        p.px(12, 3, '#fff6c0');
        p.px(14, 3, '#fff6c0');
      }
      return true;
    }
    case 'milk':
    case 'milk_large':
    case 'goat_milk': {
      const big = id === 'milk_large';
      p.rect(big ? 4 : 5, 6, big ? 8 : 6, 9, '#f8f8f4');
      p.rect(6, 2, 4, 4, '#e8e8e0');
      p.rect(6, 1, 4, 2, id === 'goat_milk' ? '#a8743f' : '#3a6ab0');
      p.rect(big ? 4 : 5, 9, big ? 8 : 6, 3, id === 'goat_milk' ? '#c8a060' : '#6a9ad0');
      p.vline(6, 7, 7, '#ffffff');
      if (big) p.rect(12, 8, 2, 4, '#e8e8e0');
      return true;
    }
    case 'wool':
      p.disc(8, 9, 5.5, '#f4f0e8');
      p.disc(5, 7, 3, '#ffffff');
      p.disc(11, 7, 3, '#f0ece0');
      p.disc(8, 12, 3, '#e0d8cc');
      return true;
    case 'cheese':
      for (let y = 0; y < 8; y++) p.hline(2 + Math.floor(y / 2), 6 + y, 13 - Math.floor(y / 2) * 2 + 0, y === 0 ? '#f8e080' : '#f0c840');
      p.rect(2, 6, 13, 8, '#f0c840');
      p.hline(2, 6, 13, '#f8e080');
      p.disc(5, 10, 1.2, '#c8a020');
      p.disc(10, 9, 1, '#c8a020');
      p.disc(12, 12, 0.9, '#c8a020');
      p.hline(2, 13, 13, '#c8a020');
      return true;
    case 'omelet':
      p.ellipse(8, 11, 7, 3, '#e8e8e0');
      p.ellipse(8, 10, 5, 2.2, '#f8d040');
      p.px(6, 9, '#4a9a3a');
      p.px(10, 10, '#d84030');
      return true;
    case 'cloth':
      p.rect(2, 5, 12, 8, '#d8ccf0');
      p.rect(2, 5, 12, 2, '#ece4fc');
      for (let x = 3; x < 14; x += 3) p.vline(x, 7, 6, '#b8a8d8');
      p.ellipse(3, 9, 2, 4, '#c8b8e8');
      return true;
  }
  return false;
}

export function buildAnimalArt(scene: Phaser.Scene) {
  addSheet(scene, 'an_chicken_0', [0, 1, 2, 3].map((f) => chicken(f, 0)));
  addSheet(scene, 'an_chicken_1', [0, 1, 2, 3].map((f) => chicken(f, 1)));
  addSheet(scene, 'an_cow_0', [0, 1, 2, 3].map((f) => cow(f, 0)));
  addSheet(scene, 'an_cow_1', [0, 1, 2, 3].map((f) => cow(f, 1)));
  addSheet(scene, 'an_goat_0', [0, 1, 2, 3].map((f) => goat(f)));
  addSheet(scene, 'an_sheep_0', [0, 1, 2, 3].map((f) => sheep(f, false)));
  addSheet(scene, 'an_sheep_shorn', [0, 1, 2, 3].map((f) => sheep(f, true)));
  addTex(scene, 'coop', coop());
  addTex(scene, 'barn', barn());
  addTex(scene, 'hay_bale', hayBale());
  addTex(scene, 'trough', trough());
  for (const k of ['an_chicken_0', 'an_chicken_1', 'an_cow_0', 'an_cow_1', 'an_goat_0', 'an_sheep_0', 'an_sheep_shorn']) {
    if (!scene.anims.exists(k + '_walk')) scene.anims.create({ key: k + '_walk', frames: [1, 0, 2, 0].map((frame) => ({ key: k, frame })), frameRate: 6, repeat: -1 });
  }
}
