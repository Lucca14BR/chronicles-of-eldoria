/** Procedural object art: nature, crops, buildings, furniture, creatures, effects. */
import Phaser from 'phaser';
import { PCanvas, shade, mix, addTex, addSheet } from './pixel';
import { mulberry32 } from '../core/rng';
import { CROPS, CropDef } from '../data/crops';

type P = PCanvas;
const OUT = '#24160f';

function shadowEllipse(p: P, cx: number, cy: number, rx: number, ry: number, a = 70) {
  p.ellipse(cx, cy, rx, ry, '#10180c', a);
}

// ---------------------------------------------------------------- trees
const LEAF: string[][] = [
  ['#9ad866', '#76c24c', '#5aa83e', '#428e34', '#2f722b'],
  ['#78c450', '#56a83c', '#438f34', '#33762c', '#255c24'],
  ['#f4bf4a', '#e8952e', '#d0682a', '#ac482a', '#7e3222'],
  ['#e8eef6', '#cfd9e6', '#b2c0d4', '#90a0b8', '#6c7c96'],
];
const BLOSSOM = ['#ffe0ea', '#f9bcd2', '#ee9ab8', '#d07898', '#a05a78'];
const BARK = { base: '#7a4e2c', dark: '#5a3820', light: '#9a6a3e' };

function trunk(p: P, x: number, y0: number, y1: number, w: number) {
  for (let y = y0; y <= y1; y++) {
    p.hline(x, y, w, BARK.base);
    p.px(x, y, BARK.light);
    p.px(x + w - 1, y, BARK.dark);
    if ((y * 7) % 5 === 0) p.px(x + 2, y, BARK.dark);
  }
  // roots
  p.hline(x - 2, y1, w + 4, BARK.base);
  p.px(x - 2, y1, BARK.dark);
  p.px(x + w + 1, y1, BARK.dark);
  p.hline(x - 1, y1 - 1, w + 2, BARK.base);
}

function canopy(p: P, balls: [number, number, number][], pal: string[], seed: number) {
  const rnd = mulberry32(seed);
  for (const [x, y, r] of balls) p.ball(x, y, r, pal, rnd);
  // leaf texture
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      if (p.alpha(x, y) === 0) continue;
      const r = rnd();
      if (r < 0.06) p.px(x, y, pal[0]);
      else if (r < 0.12) p.px(x, y, pal[3]);
    }
}

function drawOak(season: number, cherry = false): P {
  const p = new PCanvas(32, 46);
  trunk(p, 13, 26, 42, 6);
  if (season === 3 && !cherry) {
    // bare branches with snow
    const br: [number, number, number, number][] = [
      [16, 28, 6, 10],
      [16, 28, 26, 10],
      [15, 22, 9, 4],
      [17, 20, 24, 3],
      [16, 26, 16, 4],
      [10, 14, 5, 8],
      [22, 12, 28, 7],
    ];
    for (const [a, b, c, d] of br) {
      p.line(a, b, c, d, BARK.base);
      p.line(a + 1, b, c + 1, d, BARK.dark);
    }
    for (const [, , c, d] of br) {
      p.px(c, d - 1, '#ffffff');
      p.px(c + 1, d - 1, '#e8eef6');
    }
    p.outline(OUT);
    shadowEllipse(p, 16, 43, 9, 2.5);
    return p;
  }
  const pal = cherry && season === 0 ? BLOSSOM : LEAF[season];
  canopy(
    p,
    [
      [16, 14, 11],
      [9, 20, 8],
      [23, 20, 8],
      [11, 10, 7],
      [21, 9, 7],
      [16, 24, 8],
    ],
    pal,
    season * 31 + (cherry ? 7 : 1),
  );
  if (season === 3) for (let x = 6; x < 27; x++) for (let y = 0; y < 20; y++) if (p.alpha(x, y) && p.alpha(x, y - 1) === 0) p.px(x, y, '#ffffff');
  if (season === 1 && !cherry) {
    // a few apples-ish highlights? keep leaves only, plus small birds' nest hint
  }
  p.outline(OUT);
  shadowEllipse(p, 16, 43, 11, 3);
  return p;
}

function drawPine(season: number): P {
  const p = new PCanvas(24, 46);
  trunk(p, 10, 36, 42, 4);
  const pal = season === 2 ? ['#5aa060', '#3f8a4a', '#2f6f3c', '#245a30', '#1a4426'] : season === 3 ? ['#4a8a5a', '#3a7a4a', '#2f6a3e', '#245a32', '#1a4426'] : ['#5fae5a', '#3f9248', '#2f7a3c', '#246432', '#1a4c26'];
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const top = 1 + i * 8;
    const hgt = 14;
    const maxHalf = 4 + i * 2.6;
    for (let y = 0; y < hgt; y++) {
      const half = Math.max(1, (y / hgt) * maxHalf);
      for (let x = Math.floor(12 - half); x <= Math.ceil(12 + half) - 1; x++) {
        const lx = (x - 12 + half) / (half * 2);
        const idx = Math.max(0, Math.min(pal.length - 1, Math.floor(lx * 3 + (y / hgt) * 2)));
        p.px(x, top + y, pal[idx]);
      }
    }
    if (season === 3)
      for (let y = 0; y < 6; y++) {
        const half = Math.max(1, (y / hgt) * maxHalf);
        for (let x = Math.floor(12 - half); x <= Math.ceil(12 + half) - 1; x++) if ((x + y) % 3 !== 0) p.px(x, top + y, '#f4f8fc');
      }
  }
  p.outline(OUT);
  shadowEllipse(p, 12, 43, 8, 2.5);
  return p;
}

function drawSapling(season: number): P {
  const p = new PCanvas(16, 20);
  p.vline(8, 10, 8, BARK.base);
  const pal = LEAF[season === 3 ? 1 : season];
  p.ball(8, 8, 4.5, pal);
  p.ball(5, 11, 3, pal);
  p.ball(11, 11, 3, pal);
  if (season === 3) p.hline(5, 4, 6, '#ffffff');
  p.outline(OUT);
  shadowEllipse(p, 8, 18, 5, 1.5);
  return p;
}

function drawBush(season: number, berries: boolean): P {
  const p = new PCanvas(16, 16);
  const pal = LEAF[season];
  p.ball(8, 8, 6.5, pal);
  p.ball(4, 10, 4, pal);
  p.ball(12, 10, 4, pal);
  if (berries) {
    [
      [5, 7],
      [9, 6],
      [11, 10],
      [6, 11],
      [8, 9],
      [12, 7],
    ].forEach(([x, y]) => {
      p.px(x, y, '#5a3a8a');
      p.px(x + 1, y, '#3e2668');
      p.px(x, y - 1, '#9a7ad0');
    });
  }
  p.outline(OUT);
  shadowEllipse(p, 8, 15, 6, 1.5);
  return p;
}

function drawWeed(season: number, v: number): P {
  const p = new PCanvas(16, 16);
  const pal = LEAF[season === 3 ? 3 : season];
  const rnd = mulberry32(v * 13 + season);
  for (let i = 0; i < 6; i++) {
    const x = 3 + Math.floor(rnd() * 10);
    const h = 4 + Math.floor(rnd() * 6);
    p.line(x, 14, x + Math.floor(rnd() * 3) - 1, 14 - h, pal[1 + Math.floor(rnd() * 3)]);
  }
  p.ball(8, 11, 3.5, pal);
  if (v === 1) {
    p.ball(4, 12, 2.5, pal);
    p.ball(12, 12, 2.5, pal);
  }
  p.outline(OUT);
  return p;
}

function drawStone(v: number, size = 16): P {
  const p = new PCanvas(size, size);
  const c = ['#9a958c', '#8f8a80', '#a8a296'][v % 3];
  const pal = [shade(c, 0.35), shade(c, 0.15), c, shade(c, -0.18), shade(c, -0.35)];
  const rnd = mulberry32(v * 7 + size);
  if (size === 16) {
    p.ball(8, 10, 5.5, pal, rnd);
    p.ball(5, 11, 3.5, pal, rnd);
  } else {
    p.ball(16, 18, 12, pal, rnd);
    p.ball(9, 22, 7, pal, rnd);
    p.ball(24, 22, 7, pal, rnd);
    p.line(12, 12, 16, 20, shade(c, -0.4));
    p.line(16, 20, 20, 22, shade(c, -0.4));
  }
  p.outline(OUT);
  shadowEllipse(p, size / 2, size - 2, size / 2.6, 1.5);
  return p;
}

function drawOre(c: string, glow = false): P {
  const p = drawStone(1);
  const spots = [
    [5, 9],
    [9, 7],
    [10, 11],
    [6, 12],
  ];
  for (const [x, y] of spots) {
    p.rect(x, y, 2, 2, c);
    p.px(x, y, shade(c, 0.5));
  }
  if (glow) {
    p.rect(7, 5, 2, 4, c);
    p.px(7, 5, '#ffffff');
  }
  return p;
}

function drawBranch(): P {
  const p = new PCanvas(16, 16);
  p.line(2, 11, 13, 8, BARK.base);
  p.line(2, 12, 13, 9, BARK.dark);
  p.line(7, 10, 9, 5, BARK.base);
  p.line(10, 9, 13, 12, BARK.base);
  p.px(9, 4, '#5fa83a');
  p.outline(OUT);
  return p;
}

function drawForage(kind: string, season: number): P {
  const p = new PCanvas(16, 16);
  if (kind === 'herb') {
    p.vline(8, 6, 8, '#3e7a2e');
    p.ellipse(5, 8, 2.5, 1.5, '#5fae48');
    p.ellipse(11, 7, 2.5, 1.5, '#5fae48');
    p.ellipse(5, 12, 2.5, 1.5, '#4f9a3c');
    p.ellipse(11, 11, 2.5, 1.5, '#4f9a3c');
    p.ellipse(8, 4, 1.5, 2, '#7cc45a');
  } else if (kind === 'mushroom') {
    p.rect(5, 10, 2, 4, '#efe6d2');
    p.ellipse(6, 9, 3.5, 2.5, '#c8402e');
    p.px(5, 8, '#ffffff');
    p.rect(10, 11, 2, 3, '#efe6d2');
    p.ellipse(11, 10, 2.5, 2, '#a86a3a');
  } else {
    const cols = season === 2 ? ['#e8862a', '#c8402e'] : ['#f08fb0', '#f2d24a', '#9fb8f0'];
    [
      [5, 6],
      [10, 5],
      [8, 10],
    ].forEach(([x, y], i) => {
      p.vline(x, y + 1, 14 - y, '#3e7a2e');
      p.disc(x, y, 1.8, cols[i % cols.length]);
      p.px(x, y, '#f8e070');
    });
  }
  p.outline(OUT);
  return p;
}

// ---------------------------------------------------------------- crops
function drawCrop(d: CropDef, stage: number, dead = false): P {
  const p = new PCanvas(16, 24);
  const leaf = dead ? '#8a6a3a' : d.leaf;
  const leafD = shade(leaf, -0.25);
  const leafL = shade(leaf, 0.25);
  const c = d.color;
  const base = 21;
  if (stage === 0) {
    p.ellipse(8, 21, 4, 1.5, '#6e4a29');
    p.px(6, 20, '#d8c090');
    p.px(9, 21, '#d8c090');
    p.px(8, 20, '#c8b080');
    return p;
  }
  if (stage === 1) {
    p.vline(8, 17, 5, leafD);
    p.ellipse(6, 17, 2, 1, leaf);
    p.ellipse(10, 16, 2, 1, leafL);
    p.outline(OUT);
    return p;
  }
  const lv = (x: number, y: number, rx: number, ry: number) => {
    p.ellipse(x, y, rx, ry, leaf);
    p.px(Math.floor(x - rx / 2), Math.floor(y - ry / 2), leafL);
  };
  switch (d.style) {
    case 'root':
    case 'leafy': {
      const s = stage === 2 ? 0.7 : 1;
      lv(5, base - 5 * s, 3 * s, 2);
      lv(11, base - 5 * s, 3 * s, 2);
      lv(8, base - 8 * s, 2.5 * s, 3 * s);
      p.vline(8, base - 4, 4, leafD);
      if (stage >= 3 && d.style === 'leafy') {
        lv(4, base - 2, 3, 2);
        lv(12, base - 2, 3, 2);
      }
      if (stage === 4) {
        if (d.style === 'root') {
          p.ellipse(8, base - 1, 3.5, 2.5, c);
          p.ellipse(8, base - 2, 3.5, 1.2, mix(c, '#b06ab0', 0.6));
          p.px(7, base - 1, '#ffffff');
        } else if (d.id === 'cabbage') {
          p.disc(8, base - 4, 4.5, c);
          p.ellipse(8, base - 5, 2.5, 2, shade(c, 0.25));
        } else {
          p.ellipse(5, base, 2.5, 1.5, c);
          p.ellipse(11, base, 2, 1.5, c);
        }
      }
      break;
    }
    case 'grain': {
      const h = stage === 2 ? 8 : stage === 3 ? 13 : 15;
      const col = stage === 4 ? '#c8a040' : leaf;
      for (let i = 0; i < 4; i++) {
        const x = 4 + i * 2 + (i % 2);
        p.line(x, base, x + (i % 2 ? 1 : -1), base - h, i % 2 ? shade(col, -0.15) : col);
        if (stage === 4) {
          for (let k = 0; k < 4; k++) p.px(x + (i % 2 ? 1 : -1) + (k % 2), base - h + k, c);
        }
      }
      break;
    }
    case 'vine': {
      const h = stage === 2 ? 10 : 16;
      p.vline(8, base - h, h + 1, '#8a6a3a');
      p.vline(9, base - h, h + 1, '#6e4a29');
      for (let y = base - 2; y > base - h; y -= 4) {
        lv(5, y, 3, 2);
        lv(12, y - 2, 3, 2);
      }
      if (stage === 4) {
        [
          [5, base - 6],
          [12, base - 9],
          [6, base - 12],
        ].forEach(([x, y]) => {
          if (d.id === 'eggplant') {
            p.ellipse(x, y + 1, 1.8, 2.8, c);
            p.px(x - 1, y, shade(c, 0.4));
          } else {
            p.disc(x, y, 2, c);
            p.px(x - 1, y - 1, shade(c, 0.5));
          }
        });
      }
      break;
    }
    case 'tall': {
      const h = stage === 2 ? 10 : stage === 3 ? 17 : 20;
      p.vline(7, base - h, h + 1, leafD);
      p.vline(8, base - h, h + 1, leaf);
      for (let y = base - 3; y > base - h + 2; y -= 4) {
        p.line(8, y, 13, y - 3, leaf);
        p.line(7, y - 1, 2, y - 4, leafL);
      }
      if (stage === 4) {
        p.ellipse(11, base - 10, 1.8, 3.5, c);
        p.px(11, base - 13, '#c8a040');
        p.line(10, base - 7, 12, base - 13, leafL);
      }
      break;
    }
    case 'ground': {
      const s = stage === 2 ? 0.7 : 1;
      lv(4, base - 2, 3.5 * s, 2.5 * s);
      lv(12, base - 3, 3.5 * s, 2.5 * s);
      lv(8, base - 6 * s, 3 * s, 2.5 * s);
      p.line(2, base, 14, base - 1, leafD);
      if (stage === 4) {
        p.ellipse(8, base - 3, 5.5, 4.5, c);
        p.ellipse(7, base - 4, 3, 2, shade(c, 0.25));
        if (d.id === 'melon') for (let x = 4; x < 13; x += 3) p.vline(x, base - 6, 6, shade(c, -0.25));
        else {
          p.vline(6, base - 6, 7, shade(c, -0.2));
          p.vline(10, base - 6, 7, shade(c, -0.2));
          p.rect(7, base - 9, 2, 2, '#5a7a2a');
        }
      } else if (stage === 3) p.disc(8, base - 2, 2, mix(c, leaf, 0.5));
      break;
    }
    case 'bush': {
      const s = stage === 2 ? 0.7 : 1;
      p.ball(8, base - 4 * s, 5 * s, [leafL, leaf, leaf, leafD]);
      p.ball(4, base - 2, 3 * s, [leafL, leaf, leafD]);
      p.ball(12, base - 2, 3 * s, [leafL, leaf, leafD]);
      if (stage === 3) {
        p.px(6, base - 4, '#f4f0e6');
        p.px(10, base - 6, '#f4f0e6');
      }
      if (stage === 4)
        [
          [5, base - 3],
          [10, base - 5],
          [8, base - 1],
          [12, base - 2],
        ].forEach(([x, y]) => {
          p.px(x, y, c);
          p.px(x + 1, y, c);
          p.px(x, y + 1, shade(c, -0.2));
          p.px(x + 1, y + 1, shade(c, -0.2));
        });
      break;
    }
  }
  p.outline(OUT);
  return p;
}

// ---------------------------------------------------------------- buildings
export interface BuildingOpts {
  w: number;
  h: number;
  roof: string;
  wall?: string;
  beam?: string;
  thatch?: boolean;
  doorX: number; // center px
  windows: number[]; // window left x positions
  chimney?: boolean;
  roofH?: number;
  sign?: string; // sign color
  stoneWall?: boolean;
}

export function drawBuilding(o: BuildingOpts): P {
  const p = new PCanvas(o.w, o.h);
  const rnd = mulberry32(o.w * 3 + o.h + o.doorX);
  const roofH = o.roofH ?? Math.floor(o.h * 0.5);
  const wallTop = roofH - 2;
  const foundY = o.h - 5;
  const wall = o.wall || '#ebdfc4';
  const beam = o.beam || '#6b4426';
  // chimney (behind roof)
  if (o.chimney) {
    const cx = Math.floor(o.w * 0.72);
    p.rect(cx, 0, 8, 14, '#8a8378');
    for (let y = 1; y < 14; y += 3) p.hline(cx, y, 8, '#6e685e');
    p.hline(cx - 1, 0, 10, '#6e685e');
  }
  // walls
  const wx0 = 3,
    wx1 = o.w - 4;
  for (let y = wallTop; y < foundY; y++)
    for (let x = wx0; x <= wx1; x++) {
      let c = wall;
      if (o.stoneWall) {
        const row = Math.floor((y - wallTop) / 5);
        const off = row % 2 ? 4 : 0;
        c = (x + off) % 8 === 0 || (y - wallTop) % 5 === 0 ? '#6e685e' : rnd() < 0.15 ? '#9c958a' : '#8f897e';
      } else if (rnd() < 0.08) c = shade(wall, -0.06);
      p.px(x, y, c);
    }
  if (!o.stoneWall) {
    // timber frame
    const panels = Math.max(2, Math.round((wx1 - wx0) / 18));
    for (let i = 0; i <= panels; i++) {
      const x = Math.round(wx0 + ((wx1 - wx0 - 2) * i) / panels);
      p.rect(x, wallTop, 3, foundY - wallTop, beam);
      p.vline(x, wallTop, foundY - wallTop, shade(beam, 0.15));
    }
    p.rect(wx0, wallTop, wx1 - wx0 + 1, 3, beam);
    const midY = wallTop + Math.floor((foundY - wallTop) * 0.45);
    p.rect(wx0, midY, wx1 - wx0 + 1, 2, beam);
    // diagonal braces in first and last panel
    const pw = (wx1 - wx0) / panels;
    p.line(wx0 + 3, midY - 1, wx0 + pw - 1, wallTop + 3, beam);
    p.line(wx1 - 3, midY - 1, wx1 - pw + 1, wallTop + 3, beam);
  }
  // wall shadow under roof
  p.hline(wx0, wallTop + 3, wx1 - wx0 + 1, shade(wall, -0.3));
  // foundation
  for (let y = foundY; y < o.h; y++)
    for (let x = wx0 - 1; x <= wx1 + 1; x++) {
      const c = (x + (y % 2 ? 3 : 0)) % 6 === 0 ? '#5e5850' : y === foundY ? '#a39c90' : '#8a8378';
      p.px(x, y, c);
    }
  // windows
  for (const wxp of o.windows) {
    const wy = wallTop + 7;
    p.rect(wxp - 1, wy - 1, 12, 11, '#4a2e18');
    p.rect(wxp, wy, 10, 9, '#3b5a7a');
    p.rect(wxp, wy, 4, 3, '#5a7a9a');
    p.vline(wxp + 4, wy, 9, '#4a2e18');
    p.hline(wxp, wy + 4, 10, '#4a2e18');
    p.px(wxp + 1, wy + 1, '#8ab0d0');
    // flower box
    p.rect(wxp - 2, wy + 10, 14, 3, '#7a4a26');
    p.hline(wxp - 2, wy + 10, 14, '#9a6a3a');
    for (let k = 0; k < 6; k++) p.px(wxp - 1 + k * 2, wy + 9, ['#e84a5a', '#f2d24a', '#f08fb0', '#ffffff'][k % 4]);
    for (let k = 0; k < 6; k++) p.px(wxp + k * 2, wy + 9, '#4f9a3c');
  }
  // door
  const dw = 14;
  const dh = Math.min(22, foundY - wallTop - 3);
  const dx = o.doorX - dw / 2;
  const dy = foundY - dh;
  p.rect(dx - 2, dy - 2, dw + 4, dh + 2, '#4a2e18');
  p.rect(dx, dy, dw, dh, '#7a4a26');
  for (let x = dx + 3; x < dx + dw; x += 4) p.vline(x, dy, dh, '#5e3a1e');
  p.hline(dx, dy + 4, dw, '#5e3a1e');
  p.hline(dx, dy + dh - 5, dw, '#5e3a1e');
  p.rect(dx + dw - 4, dy + Math.floor(dh / 2), 2, 2, '#e0c050');
  p.rect(dx - 3, o.h - 3, dw + 6, 3, '#a39c90');
  p.hline(dx - 3, o.h - 3, dw + 6, '#bdb6aa');
  // sign
  if (o.sign) {
    const sx = dx + dw + 4;
    p.rect(sx, dy - 2, 12, 8, '#8a5a32');
    p.rect(sx + 1, dy - 1, 10, 6, o.sign);
    p.vline(sx + 5, dy - 5, 3, '#3a3a42');
  }
  // roof
  const ov = 3;
  for (let y = 0; y < roofH; y++) {
    const inset = Math.max(0, Math.floor((roofH - y) * 0.18) - 1);
    const x0 = -ov + inset + ov,
      x1 = o.w - 1 - inset;
    const yy = y + (o.chimney ? 6 : 2);
    if (yy >= wallTop + 4) break;
    for (let x = x0; x <= x1; x++) {
      let c = o.roof;
      const row = Math.floor(yy / 4);
      if (o.thatch) {
        c = rnd() < 0.3 ? shade(o.roof, -0.15) : rnd() < 0.2 ? shade(o.roof, 0.15) : o.roof;
        if (yy % 4 === 3) c = shade(o.roof, -0.25);
      } else {
        if (yy % 4 === 3) c = shade(o.roof, -0.3);
        else if ((x + (row % 2) * 3) % 6 === 0) c = shade(o.roof, -0.2);
        else if (yy % 4 === 0) c = shade(o.roof, 0.15);
      }
      if (x === x0 || x === x1) c = shade(o.roof, -0.4);
      p.px(x, yy, c);
    }
  }
  // ridge + eave
  const ridgeY = o.chimney ? 6 : 2;
  p.hline(8, ridgeY, o.w - 16, shade(o.roof, 0.35));
  p.hline(0, wallTop + 3, o.w, shade(o.roof, -0.45));
  p.hline(1, wallTop + 2, o.w - 2, shade(o.roof, -0.25));
  p.outline(OUT);
  return p;
}

function drawForge(): P {
  const p = new PCanvas(80, 64);
  const rnd = mulberry32(99);
  // stone back wall + chimney
  p.rect(4, 18, 72, 40, '#8a8378');
  for (let y = 18; y < 58; y += 5) for (let x = 4; x < 76; x++) if ((x + (y % 2 ? 4 : 0)) % 8 === 0) p.vline(x, y, 5, '#6e685e');
  for (let y = 18; y < 58; y += 5) p.hline(4, y, 72, '#6e685e');
  p.rect(54, 0, 14, 30, '#7a746c');
  for (let y = 2; y < 30; y += 4) p.hline(54, y, 14, '#5e5850');
  // furnace mouth
  p.rect(52, 36, 18, 16, '#3a3530');
  p.ellipse(61, 46, 6, 5, '#f08a2a');
  p.ellipse(61, 47, 4, 3, '#f8d060');
  p.rect(50, 34, 22, 3, '#5e5850');
  // roof (wooden lean-to)
  for (let y = 10; y < 22; y++)
    for (let x = 0; x < 80; x++) {
      let c = '#8a5a32';
      if (y % 3 === 0) c = '#6e4626';
      if (rnd() < 0.08) c = '#a8743f';
      p.px(x, y, c);
    }
  p.hline(0, 22, 80, '#4a2e18');
  // posts
  p.rect(2, 22, 4, 38, '#6e4626');
  p.rect(74, 22, 4, 38, '#6e4626');
  // tools on wall
  p.line(12, 28, 18, 40, '#8a5a32');
  p.rect(10, 26, 5, 3, '#9aa0a8');
  p.line(24, 28, 24, 42, '#8a5a32');
  p.rect(22, 26, 5, 4, '#9aa0a8');
  p.rect(32, 30, 12, 8, '#5a3a22');
  p.rect(33, 31, 10, 6, '#c8a040');
  // floor
  p.rect(4, 58, 72, 6, '#6e685e');
  p.outline(OUT);
  return p;
}

function drawStall(): P {
  const p = new PCanvas(48, 44);
  // counter
  p.rect(2, 24, 44, 14, '#9a6436');
  for (let x = 2; x < 46; x += 5) p.vline(x, 24, 14, '#7a4a26');
  p.hline(2, 24, 44, '#c08a50');
  p.rect(0, 22, 48, 3, '#7a4a26');
  // produce crates
  const goods = ['#e0402e', '#f2cf3a', '#8ccf5a', '#e8862a', '#6a3a8a'];
  goods.forEach((g, i) => {
    const x = 3 + i * 9;
    p.rect(x, 17, 8, 5, '#8a5a32');
    for (let k = 0; k < 4; k++) p.disc(x + 2 + (k % 2) * 4, 17 + Math.floor(k / 2), 1.8, g);
  });
  // posts
  p.rect(2, 6, 2, 18, '#6e4626');
  p.rect(44, 6, 2, 18, '#6e4626');
  // awning stripes
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 48; x++) {
      const c = Math.floor(x / 6) % 2 ? '#f4ece0' : '#c8402e';
      p.px(x, y, y === 9 ? shade(c, -0.3) : y === 0 ? shade(c, 0.2) : c);
    }
  for (let x = 0; x < 48; x += 6) {
    p.px(x + 2, 10, Math.floor(x / 6) % 2 ? '#d8cfc0' : '#a8302a');
    p.px(x + 3, 10, Math.floor(x / 6) % 2 ? '#d8cfc0' : '#a8302a');
  }
  p.outline(OUT);
  shadowEllipse(p, 24, 41, 22, 2.5);
  return p;
}

function drawFountain(frame: number): P {
  const p = new PCanvas(48, 44);
  p.ellipse(24, 32, 23, 10, '#8a8378');
  p.ellipse(24, 31, 21, 8.5, '#a39c90');
  p.ellipse(24, 31, 18, 6.5, '#3f86c6');
  p.ellipse(22, 30, 10, 3, '#6fb0e0');
  for (let i = 0; i < 6; i++) p.px(12 + i * 4 + frame, 31 + (i % 2), '#d6eef8');
  p.rect(21, 12, 6, 18, '#a39c90');
  p.vline(21, 12, 18, '#bdb6aa');
  p.vline(26, 12, 18, '#7a746c');
  p.ellipse(24, 12, 7, 3, '#8a8378');
  p.ellipse(24, 11, 5, 2, '#3f86c6');
  // water jets
  const jy = frame ? 1 : 0;
  p.line(24, 9, 24, 2 + jy, '#a8d8f0');
  p.line(23, 4 + jy, 16, 12, '#a8d8f0');
  p.line(25, 4 + jy, 32, 12, '#a8d8f0');
  p.px(16, 13 + jy, '#ffffff');
  p.px(32, 13 + jy, '#ffffff');
  p.px(24, 2 + jy, '#ffffff');
  p.outline(OUT);
  return p;
}

function drawWell(): P {
  const p = new PCanvas(32, 40);
  p.ellipse(16, 30, 13, 7, '#8a8378');
  p.rect(3, 24, 26, 8, '#8a8378');
  for (let x = 3; x < 29; x += 5) p.vline(x, 24, 8, '#6e685e');
  p.ellipse(16, 24, 12, 5, '#a39c90');
  p.ellipse(16, 24, 9, 3.5, '#1a2a3a');
  p.rect(4, 6, 3, 20, '#6e4626');
  p.rect(25, 6, 3, 20, '#6e4626');
  for (let y = 0; y < 8; y++) p.hline(1 + y, y + 1, 30 - y * 2, y % 2 ? '#a8443a' : '#c8503a');
  p.hline(7, 12, 18, '#5e3e22');
  p.vline(16, 12, 8, '#d8c8a0');
  p.rect(14, 19, 5, 4, '#7a4a26');
  p.outline(OUT);
  shadowEllipse(p, 16, 37, 13, 2);
  return p;
}

function drawNoticeboard(): P {
  const p = new PCanvas(32, 36);
  p.rect(3, 14, 3, 22, '#6e4626');
  p.rect(26, 14, 3, 22, '#6e4626');
  p.rect(1, 2, 30, 20, '#7a4a26');
  p.rect(3, 4, 26, 16, '#a8743f');
  p.rect(5, 6, 8, 10, '#efe6d2');
  p.rect(15, 5, 7, 7, '#f4ecd8');
  p.rect(22, 9, 6, 8, '#e8dcc0');
  p.hline(6, 8, 6, '#8a7a6a');
  p.hline(6, 10, 5, '#8a7a6a');
  p.hline(16, 7, 5, '#8a7a6a');
  p.px(9, 6, '#c8402e');
  p.px(18, 5, '#3a6ab0');
  p.px(25, 9, '#c8402e');
  p.hline(0, 1, 32, '#5e3a1e');
  p.outline(OUT);
  shadowEllipse(p, 16, 34, 13, 1.8);
  return p;
}

function drawLamp(lit: boolean): P {
  const p = new PCanvas(16, 40);
  p.rect(7, 12, 2, 26, '#3a3a42');
  p.vline(7, 12, 26, '#5a5a66');
  p.rect(4, 36, 8, 3, '#3a3a42');
  p.rect(4, 4, 8, 9, '#2a2a32');
  p.rect(5, 5, 6, 7, lit ? '#f8d070' : '#6a6a5a');
  if (lit) p.rect(6, 6, 3, 3, '#fff2b0');
  p.hline(3, 3, 10, '#3a3a42');
  p.px(7, 1, '#3a3a42');
  p.px(8, 1, '#3a3a42');
  p.hline(6, 2, 4, '#3a3a42');
  p.outline(OUT);
  return p;
}

function drawBench(): P {
  const p = new PCanvas(32, 20);
  p.rect(2, 2, 28, 4, '#8a5a32');
  p.hline(2, 2, 28, '#a8743f');
  p.rect(1, 9, 30, 4, '#a8743f');
  p.hline(1, 9, 30, '#c89058');
  p.rect(3, 6, 2, 3, '#6e4626');
  p.rect(27, 6, 2, 3, '#6e4626');
  p.rect(3, 13, 2, 5, '#6e4626');
  p.rect(27, 13, 2, 5, '#6e4626');
  p.outline(OUT);
  return p;
}

function drawBarrel(): P {
  const p = new PCanvas(16, 20);
  p.ellipse(8, 11, 6.5, 8, '#9a6436');
  p.rect(2, 4, 13, 14, '#9a6436');
  for (let x = 4; x < 14; x += 3) p.vline(x, 4, 14, '#7a4a26');
  p.hline(2, 6, 13, '#5e646e');
  p.hline(2, 15, 13, '#5e646e');
  p.ellipse(8.5, 4, 6, 2, '#b07a46');
  p.ellipse(8.5, 4, 4, 1, '#8a5a32');
  p.outline(OUT);
  return p;
}

function drawCrate(): P {
  const p = new PCanvas(16, 16);
  p.rect(1, 2, 14, 13, '#a8743f');
  p.rect(1, 2, 14, 2, '#c89058');
  p.line(2, 4, 13, 14, '#7a4a26');
  p.line(13, 4, 2, 14, '#7a4a26');
  p.hline(1, 8, 14, '#8a5a32');
  p.outline(OUT);
  return p;
}

function drawFence(mask: number): P {
  // mask: 1=N 2=E 4=S 8=W connections
  const p = new PCanvas(16, 20);
  const wood = '#a8743f',
    dark = '#7a4a26',
    light = '#c89058';
  if (mask & 2) {
    p.rect(8, 8, 8, 2, wood);
    p.rect(8, 13, 8, 2, wood);
    p.hline(8, 8, 8, light);
  }
  if (mask & 8) {
    p.rect(0, 8, 8, 2, wood);
    p.rect(0, 13, 8, 2, wood);
    p.hline(0, 8, 8, light);
  }
  if (mask & 1) p.rect(7, 0, 2, 6, wood);
  if (mask & 4) p.rect(7, 16, 2, 4, wood);
  p.rect(6, 4, 4, 14, wood);
  p.vline(9, 4, 14, dark);
  p.hline(6, 4, 4, light);
  p.px(6, 3, wood);
  p.px(7, 3, light);
  p.px(8, 3, wood);
  p.outline(OUT);
  return p;
}

function drawSign(): P {
  const p = new PCanvas(16, 20);
  p.rect(7, 8, 2, 11, '#6e4626');
  p.rect(1, 2, 14, 8, '#a8743f');
  p.hline(1, 2, 14, '#c89058');
  p.hline(3, 5, 10, '#5e3a1e');
  p.hline(3, 7, 7, '#5e3a1e');
  p.outline(OUT);
  return p;
}

function drawShipBin(): P {
  const p = new PCanvas(32, 24);
  p.rect(1, 6, 30, 16, '#9a6436');
  for (let x = 1; x < 31; x += 6) p.vline(x, 6, 16, '#7a4a26');
  p.rect(0, 3, 32, 5, '#7a4a26');
  p.hline(0, 3, 32, '#a8743f');
  p.rect(13, 12, 6, 5, '#e0c050');
  p.px(15, 14, '#8a6a2a');
  p.px(16, 14, '#8a6a2a');
  p.outline(OUT);
  return p;
}

function drawWorkbench(): P {
  const p = new PCanvas(32, 24);
  p.rect(1, 6, 30, 6, '#a8743f');
  p.hline(1, 6, 30, '#c89058');
  p.hline(1, 11, 30, '#7a4a26');
  p.rect(2, 12, 3, 11, '#6e4626');
  p.rect(27, 12, 3, 11, '#6e4626');
  p.rect(5, 17, 22, 2, '#7a4a26');
  // tools
  p.rect(5, 3, 6, 3, '#9aa0a8');
  p.line(14, 5, 20, 2, '#8a5a32');
  p.rect(22, 2, 6, 4, '#d8c8a0');
  p.hline(23, 3, 4, '#8a7a6a');
  p.outline(OUT);
  return p;
}

function drawChest(open: boolean, ornate = false): P {
  const w = ornate ? 32 : 16;
  const p = new PCanvas(w, ornate ? 24 : 16);
  const b = ornate ? '#6a3a8a' : '#9a6436';
  const trim = ornate ? '#e0b040' : '#c8a040';
  const y0 = ornate ? 8 : 4;
  const h = ornate ? 15 : 11;
  p.rect(1, y0, w - 2, h, b);
  p.rect(1, y0, w - 2, 4, shade(b, 0.15));
  p.hline(1, y0 + 4, w - 2, '#2a1a10');
  p.vline(1, y0, h, trim);
  p.vline(w - 2, y0, h, trim);
  if (ornate) p.vline(w / 2, y0, h, trim);
  p.rect(w / 2 - 1, y0 + 3, 3, 3, '#f0d060');
  if (open) {
    p.rect(1, y0 - 4, w - 2, 4, shade(b, -0.2));
    p.rect(3, y0 + 1, w - 6, 3, '#2a1a10');
    p.px(w / 2, y0 + 2, '#f8e070');
  }
  p.outline(OUT);
  return p;
}

function drawFurnace(on: boolean): P {
  const p = new PCanvas(16, 24);
  p.rect(1, 6, 14, 17, '#8a8378');
  for (let y = 6; y < 23; y += 4) p.hline(1, y, 14, '#6e685e');
  p.rect(3, 0, 6, 7, '#7a746c');
  p.rect(4, 13, 8, 7, '#2a1a14');
  if (on) {
    p.rect(5, 16, 6, 4, '#f08a2a');
    p.rect(6, 17, 3, 2, '#f8d060');
  }
  p.outline(OUT);
  return p;
}

function drawAnvil(): P {
  const p = new PCanvas(16, 16);
  p.rect(2, 5, 12, 3, '#5e646e');
  p.hline(2, 5, 12, '#8a929e');
  p.rect(0, 5, 3, 2, '#5e646e');
  p.rect(6, 8, 4, 3, '#4a4f58');
  p.rect(3, 11, 10, 4, '#7a4a26');
  p.outline(OUT);
  return p;
}

function drawCampfire(f: number): P {
  const p = new PCanvas(16, 16);
  p.line(2, 14, 13, 11, '#6e4626');
  p.line(2, 11, 13, 14, '#8a5a32');
  for (let i = 0; i < 6; i++) p.px(3 + i * 2, 14 - (i % 2), '#8a8378');
  const fh = [6, 7, 5][f];
  p.ellipse(8, 12 - fh / 2, 3.5, fh / 2 + 1, '#e8602a');
  p.ellipse(8, 12 - fh / 3, 2.2, fh / 3 + 0.5, '#f8b040');
  p.px(8, 11, '#fff0a0');
  p.px(7 + f, 12 - fh - 1, '#f8a040');
  p.outline(OUT);
  return p;
}

function drawAlchemy(): P {
  const p = new PCanvas(32, 26);
  p.rect(1, 10, 30, 5, '#5a3a6a');
  p.hline(1, 10, 30, '#7a5a8a');
  p.rect(2, 15, 3, 10, '#4a2e18');
  p.rect(27, 15, 3, 10, '#4a2e18');
  p.disc(7, 6, 3.5, '#c8dce8');
  p.disc(7, 7, 2.5, '#8ad0f0');
  p.rect(14, 1, 3, 9, '#c8dce8');
  p.rect(14, 5, 3, 5, '#d05ae0');
  p.ellipse(23, 7, 4, 3, '#3a3a42');
  p.ellipse(23, 6, 3, 1, '#6ad04a');
  p.px(22, 3, '#a8f090');
  p.px(24, 1, '#a8f090');
  p.outline(OUT);
  return p;
}

function drawTorch(f: number): P {
  const p = new PCanvas(16, 24);
  p.rect(7, 9, 2, 14, '#8a5a32');
  p.rect(6, 8, 4, 2, '#5e3e22');
  const h = f ? 6 : 5;
  p.ellipse(8, 8 - h / 2, 2.5, h / 2 + 0.5, '#e8602a');
  p.ellipse(8, 8 - h / 3, 1.5, h / 3, '#f8d060');
  p.outline(OUT);
  return p;
}

function drawScarecrow(): P {
  const p = new PCanvas(16, 32);
  p.vline(8, 10, 21, '#8a5a32');
  p.hline(1, 13, 14, '#8a5a32');
  p.rect(4, 11, 8, 10, '#5a7aa8');
  p.rect(6, 13, 4, 2, '#c8402e');
  p.hline(4, 20, 8, '#d8b85a');
  p.disc(8, 7, 3.5, '#e8d090');
  p.px(7, 7, '#2a1a14');
  p.px(9, 7, '#2a1a14');
  p.hline(7, 9, 3, '#8a5a32');
  p.rect(3, 3, 10, 2, '#c8a040');
  p.rect(5, 0, 6, 3, '#c8a040');
  p.outline(OUT);
  shadowEllipse(p, 8, 30, 5, 1.5);
  return p;
}

function drawSprinkler(q: boolean): P {
  const p = new PCanvas(16, 16);
  const c = q ? '#c8a040' : '#d2783c';
  p.rect(4, 8, 8, 6, c);
  p.hline(4, 8, 8, shade(c, 0.3));
  p.rect(7, 4, 2, 4, '#9aa0a8');
  p.rect(6, 3, 4, 1, '#c8cdd6');
  if (q) {
    p.px(5, 10, '#8ad0f0');
    p.px(10, 10, '#8ad0f0');
  }
  p.outline(OUT);
  return p;
}

function drawTable(): P {
  const p = new PCanvas(32, 24);
  p.rect(1, 4, 30, 9, '#a8743f');
  p.hline(1, 4, 30, '#c89058');
  p.hline(1, 12, 30, '#7a4a26');
  p.rect(2, 13, 3, 10, '#6e4626');
  p.rect(27, 13, 3, 10, '#6e4626');
  p.ellipse(10, 7, 3, 1.5, '#e8e8e0');
  p.rect(20, 3, 3, 4, '#efe6d2');
  p.px(21, 2, '#f8c040');
  p.outline(OUT);
  return p;
}

function drawChair(): P {
  const p = new PCanvas(16, 20);
  p.rect(4, 1, 8, 9, '#8a5a32');
  p.rect(5, 2, 6, 7, '#a8743f');
  p.rect(3, 10, 10, 3, '#a8743f');
  p.hline(3, 10, 10, '#c89058');
  p.rect(4, 13, 2, 6, '#6e4626');
  p.rect(10, 13, 2, 6, '#6e4626');
  p.outline(OUT);
  return p;
}

function drawBookshelf(): P {
  const p = new PCanvas(32, 36);
  p.rect(1, 1, 30, 34, '#6e4626');
  p.vline(1, 1, 34, '#8a5a32');
  const cols = ['#b84a3a', '#3a6ab0', '#4a8a3a', '#c8a040', '#7a3a8a', '#d8cfc0'];
  for (let s = 0; s < 3; s++) {
    const y = 3 + s * 11;
    p.rect(3, y, 26, 9, '#3a2416');
    let x = 4;
    let k = s * 2;
    while (x < 27) {
      const w = 2 + ((x + s) % 3 === 0 ? 1 : 0);
      const h = 6 + ((x * 3 + s) % 3);
      p.rect(x, y + 9 - h, w, h, cols[k % cols.length]);
      p.px(x, y + 9 - h, shade(cols[k % cols.length], 0.3));
      x += w + 1;
      k++;
    }
    p.hline(3, y + 9, 26, '#a8743f');
  }
  p.outline(OUT);
  return p;
}

function drawPlantPot(): P {
  const p = new PCanvas(16, 24);
  p.rect(4, 15, 8, 8, '#b8603a');
  p.hline(3, 15, 10, '#d07a4a');
  p.vline(11, 16, 7, '#8a4428');
  p.ball(8, 10, 5, ['#8ad060', '#6fbf4c', '#4f9a3c', '#3a7a30']);
  p.ball(5, 7, 3, ['#8ad060', '#6fbf4c', '#4f9a3c']);
  p.ball(11, 6, 3, ['#8ad060', '#6fbf4c', '#4f9a3c']);
  p.outline(OUT);
  return p;
}

function drawRug(): P {
  const p = new PCanvas(48, 32);
  p.rect(0, 0, 48, 32, '#c8a040');
  p.rect(2, 2, 44, 28, '#8b2a2a');
  p.rect(5, 5, 38, 22, '#a83a3a');
  p.rect(7, 7, 34, 18, '#8b2a2a');
  for (let x = 9; x < 40; x += 6) {
    p.px(x, 16, '#e0c050');
    p.px(x + 1, 15, '#e0c050');
    p.px(x + 1, 17, '#e0c050');
    p.px(x + 2, 16, '#e0c050');
  }
  for (let x = 0; x < 48; x += 2) {
    p.px(x, 0, '#e8d8a0');
    p.px(x, 31, '#e8d8a0');
  }
  return p;
}

function drawBanner(): P {
  const p = new PCanvas(16, 32);
  p.rect(7, 0, 2, 32, '#6e4626');
  p.hline(1, 2, 14, '#5e3e22');
  p.rect(2, 3, 12, 20, '#3a5a9a');
  for (let i = 0; i < 6; i++) {
    p.px(2 + i, 23 + Math.floor(i / 2), '#3a5a9a');
    p.px(13 - i, 23 + Math.floor(i / 2), '#3a5a9a');
  }
  p.vline(13, 3, 20, '#2a4478');
  p.rect(5, 8, 6, 6, '#e0c050');
  p.px(7, 7, '#e0c050');
  p.px(8, 7, '#e0c050');
  p.rect(7, 10, 2, 2, '#3a5a9a');
  p.outline(OUT);
  return p;
}

function drawFlowerBed(season: number): P {
  const p = new PCanvas(16, 16);
  p.rect(1, 9, 14, 6, '#7a5233');
  p.hline(1, 9, 14, '#9a6c42');
  const cols = season === 3 ? ['#e8eef6', '#c8d4e4', '#e8eef6', '#f4f8fc'] : ['#f08fb0', '#f2d24a', '#9fb8f0', '#e8543c'];
  cols.forEach((c, i) => {
    p.vline(3 + i * 3, 5, 4, '#3e7a2e');
    p.disc(3 + i * 3, 4.5, 1.6, c);
  });
  p.outline(OUT);
  return p;
}

function drawBed(): P {
  const p = new PCanvas(32, 34);
  p.rect(1, 1, 30, 8, '#6e4626');
  p.hline(1, 1, 30, '#8a5a32');
  p.rect(2, 8, 28, 24, '#8a5a32');
  p.rect(3, 9, 26, 6, '#f4ece0');
  p.ellipse(10, 12, 6, 2.5, '#ffffff');
  p.ellipse(22, 12, 6, 2.5, '#ffffff');
  p.rect(3, 15, 26, 15, '#3a5aa8');
  p.hline(3, 15, 26, '#5a7ac8');
  for (let y = 18; y < 30; y += 4) p.hline(3, y, 26, '#2f4a8a');
  p.rect(1, 30, 30, 3, '#6e4626');
  p.outline(OUT);
  return p;
}

function drawFireplace(f: number): P {
  const p = new PCanvas(32, 40);
  p.rect(0, 4, 32, 36, '#8a8378');
  for (let y = 4; y < 40; y += 5) for (let x = 0; x < 32; x++) if ((x + (y % 2 ? 4 : 0)) % 8 === 0) p.vline(x, y, 5, '#6e685e');
  for (let y = 4; y < 40; y += 5) p.hline(0, y, 32, '#6e685e');
  p.rect(0, 0, 32, 5, '#6e4626');
  p.hline(0, 0, 32, '#8a5a32');
  p.rect(6, 18, 20, 20, '#2a1a14');
  p.line(8, 37, 23, 34, '#6e4626');
  p.line(8, 34, 23, 37, '#8a5a32');
  const h = [9, 11, 10][f];
  p.ellipse(16, 36 - h / 2, 6, h / 2, '#e8602a');
  p.ellipse(16, 36 - h / 3, 3.5, h / 3, '#f8b040');
  p.px(16, 34, '#fff0a0');
  p.outline(OUT);
  return p;
}

function drawCaveEntrance(): P {
  const p = new PCanvas(48, 48);
  p.ellipse(24, 30, 20, 20, '#5e5850');
  p.ellipse(24, 32, 14, 16, '#0a0608');
  p.rect(10, 32, 28, 16, '#0a0608');
  p.rect(8, 14, 4, 34, '#6e4626');
  p.rect(36, 14, 4, 34, '#6e4626');
  p.rect(6, 12, 36, 5, '#8a5a32');
  p.hline(6, 12, 36, '#a8743f');
  p.rect(18, 4, 12, 7, '#a8743f');
  p.hline(20, 7, 8, '#4a2e18');
  p.vline(23, 10, 3, '#3a3a42');
  p.outline(OUT);
  return p;
}

function drawLadder(down: boolean): P {
  if (down) {
    const p = new PCanvas(16, 16);
    p.ellipse(8, 8, 7, 6, '#0a0608');
    p.vline(4, 3, 10, '#a8743f');
    p.vline(11, 3, 10, '#a8743f');
    for (let y = 4; y < 13; y += 3) p.hline(4, y, 8, '#8a5a32');
    p.outline('#3a2e27');
    return p;
  }
  const p = new PCanvas(16, 32);
  p.vline(3, 0, 32, '#a8743f');
  p.vline(12, 0, 32, '#a8743f');
  p.vline(4, 0, 32, '#7a4a26');
  p.vline(13, 0, 32, '#7a4a26');
  for (let y = 3; y < 32; y += 5) p.hline(4, y, 8, '#8a5a32');
  p.outline(OUT);
  return p;
}

function drawPillar(broken: boolean): P {
  const h = broken ? 26 : 44;
  const p = new PCanvas(16, h);
  const c = '#b0ab9a';
  p.rect(1, h - 5, 14, 5, '#8d8a7a');
  p.rect(3, broken ? 4 : 5, 10, h - 9, c);
  for (let x = 4; x < 13; x += 3) p.vline(x, 6, h - 11, '#8d8a7a');
  p.vline(3, 5, h - 9, '#cfcab8');
  if (!broken) {
    p.rect(1, 1, 14, 5, '#9d9a8a');
    p.hline(1, 1, 14, '#cfcab8');
  } else {
    for (let x = 3; x < 13; x++) if ((x * 7) % 3 === 0) p.clear(x, 4);
  }
  for (let i = 0; i < 8; i++) p.px(3 + ((i * 5) % 10), h - 6 - i * 3, '#5f7a3a');
  p.outline(OUT);
  return p;
}

function drawRuinWall(): P {
  const p = new PCanvas(32, 32);
  for (let y = 6; y < 30; y++)
    for (let x = 0; x < 32; x++) {
      const top = 6 + Math.floor(Math.abs(Math.sin(x * 0.7)) * 6);
      if (y < top) continue;
      const row = Math.floor(y / 5);
      let c = (x + (row % 2) * 4) % 8 === 0 || y % 5 === 0 ? '#6d6a5c' : '#9d9a8a';
      if ((x * 13 + y * 7) % 11 === 0) c = '#5f7a3a';
      p.px(x, y, c);
    }
  p.rect(0, 29, 32, 3, '#6d6a5c');
  p.outline(OUT);
  return p;
}

function drawStatue(): P {
  const p = new PCanvas(32, 50);
  const c = '#a8a496';
  p.rect(4, 38, 24, 12, '#8d8a7a');
  p.hline(4, 38, 24, '#bdb8a8');
  p.rect(10, 16, 12, 22, c);
  p.vline(10, 16, 22, '#c8c4b4');
  p.disc(16, 11, 5, c);
  p.rect(6, 18, 4, 12, c);
  p.rect(22, 18, 4, 10, c);
  p.line(25, 6, 25, 30, '#8d8a7a');
  p.rect(23, 4, 5, 3, '#8d8a7a');
  p.hline(10, 26, 12, '#8d8a7a');
  for (let i = 0; i < 10; i++) p.px(6 + ((i * 7) % 20), 40 + (i % 8), '#5f7a3a');
  p.line(14, 14, 18, 22, '#7a7668');
  p.outline(OUT);
  return p;
}

function drawGate(): P {
  const p = new PCanvas(96, 80);
  // towers
  for (const tx of [0, 70]) {
    p.rect(tx, 10, 26, 70, '#8d8a7a');
    for (let y = 10; y < 80; y += 6) p.hline(tx, y, 26, '#6d6a5c');
    for (let y = 10; y < 80; y += 6) for (let x = tx; x < tx + 26; x += 8) p.vline(x + ((y / 6) % 2 ? 4 : 0), y, 6, '#6d6a5c');
    for (let x = tx; x < tx + 26; x += 6) p.rect(x, 4, 4, 6, '#8d8a7a');
    p.rect(tx + 10, 24, 6, 9, '#1a1418');
    p.rect(tx + 4, 40, 18, 26, '#3a5a9a');
    p.rect(tx + 10, 48, 6, 6, '#e0c050');
  }
  // arch
  p.rect(26, 20, 44, 60, '#9d9a8a');
  for (let y = 20; y < 80; y += 6) p.hline(26, y, 44, '#7d7a6c');
  p.ellipse(48, 46, 15, 16, '#1a1418');
  p.rect(33, 46, 30, 34, '#1a1418');
  // portcullis
  for (let x = 35; x < 62; x += 4) p.vline(x, 34, 46, '#5e646e');
  for (let y = 40; y < 80; y += 6) p.hline(33, y, 30, '#5e646e');
  for (let x = 26; x < 70; x += 6) p.rect(x, 14, 4, 6, '#9d9a8a');
  p.outline(OUT);
  return p;
}

function drawBridgeSite(): P {
  const p = new PCanvas(32, 24);
  p.rect(2, 14, 12, 8, '#8a5a32');
  for (let y = 14; y < 22; y += 3) p.hline(2, y, 12, '#6e4626');
  p.rect(18, 2, 2, 20, '#6e4626');
  p.rect(14, 2, 16, 9, '#a8743f');
  p.hline(14, 2, 16, '#c89058');
  p.hline(16, 5, 12, '#5e3a1e');
  p.hline(16, 8, 8, '#5e3a1e');
  p.rect(24, 16, 6, 6, '#9a958c');
  p.outline(OUT);
  return p;
}

function drawWaterfall(f: number): P {
  const p = new PCanvas(48, 40);
  for (let y = 0; y < 34; y++)
    for (let x = 4; x < 44; x++) {
      const band = (x + Math.floor((y + f * 4) / 3)) % 5;
      p.px(x, y, band === 0 ? '#c8e8f8' : band < 3 ? '#6fb0e0' : '#4a92d0');
    }
  for (let x = 0; x < 48; x++) {
    const h = 34 + Math.floor(Math.abs(Math.sin((x + f * 3) * 0.6)) * 4);
    for (let y = 30; y < h; y++) p.px(x, y, (x + y + f) % 3 ? '#e8f6fc' : '#c8e8f8');
  }
  p.vline(3, 0, 34, '#5e5850');
  p.vline(44, 0, 34, '#5e5850');
  return p;
}

function drawReeds(season: number): P {
  const p = new PCanvas(16, 20);
  const c = season === 2 ? '#a8903a' : season === 3 ? '#b8b0a0' : '#5a8a3a';
  for (let i = 0; i < 5; i++) {
    const x = 3 + i * 2.5;
    p.line(x, 19, x + (i % 2 ? 1 : -1), 6 + (i % 3) * 2, i % 2 ? shade(c, -0.2) : c);
  }
  p.rect(5, 4, 2, 4, '#7a4a26');
  p.rect(10, 6, 2, 4, '#7a4a26');
  p.outline(OUT);
  return p;
}

function drawLily(): P {
  const p = new PCanvas(16, 16);
  p.ellipse(7, 9, 5, 3.5, '#4f9a3c');
  p.line(7, 9, 11, 7, '#3e7a2e');
  p.ellipse(11, 11, 3, 2, '#5fae48');
  p.disc(7, 8, 1.5, '#f8c8d8');
  p.px(7, 8, '#f8e070');
  return p;
}

function drawHut(): P {
  return drawBuilding({ w: 64, h: 64, roof: '#5a7a3a', thatch: true, doorX: 32, windows: [10], chimney: true, wall: '#c8b088', beam: '#5e3e22', roofH: 32 });
}

function drawWindmill(): P {
  const p = new PCanvas(64, 96);
  // tower (tapered)
  for (let y = 24; y < 92; y++) {
    const half = 14 + Math.floor(((y - 24) / 68) * 8);
    for (let x = 32 - half; x < 32 + half; x++) {
      let c = '#ebdfc4';
      if (x === 32 - half || x === 32 + half - 1) c = '#b8a888';
      if ((y - 24) % 12 === 0) c = '#c8b898';
      p.px(x, y, c);
    }
  }
  for (let y = 88; y < 96; y++) for (let x = 8; x < 56; x++) p.px(x, y, (x + y) % 6 === 0 ? '#5e5850' : '#8a8378');
  p.rect(26, 72, 12, 16, '#7a4a26');
  p.vline(31, 72, 16, '#5e3a1e');
  p.rect(28, 44, 8, 8, '#3b5a7a');
  p.vline(32, 44, 8, '#4a2e18');
  // cap roof
  for (let y = 8; y < 26; y++) {
    const half = Math.floor(((y - 8) / 18) * 17) + 2;
    for (let x = 32 - half; x < 32 + half; x++) p.px(x, y, y % 3 === 0 ? '#8a3a2a' : '#b5452e');
  }
  p.outline(OUT);
  return p;
}

function drawSails(): P {
  const p = new PCanvas(64, 64);
  for (let a = 0; a < 4; a++) {
    const ang = (a * Math.PI) / 2 + Math.PI / 4;
    const dx = Math.cos(ang),
      dy = Math.sin(ang);
    for (let r = 3; r < 30; r++) {
      const x = 32 + dx * r,
        y = 32 + dy * r;
      p.px(x, y, '#6e4626');
      if (r > 8) {
        for (let k = 1; k < 6; k++) {
          const sx = x + -dy * k,
            sy = y + dx * k;
          p.px(sx, sy, (r + k) % 4 === 0 ? '#a8743f' : '#efe6d2');
        }
      }
    }
  }
  p.disc(32, 32, 3, '#5e3e22');
  p.outline(OUT);
  return p;
}

function drawShed(): P {
  return drawBuilding({ w: 64, h: 64, roof: '#7a5a3a', doorX: 32, windows: [], wall: '#a8743f', beam: '#6e4626', roofH: 30, sign: '#c8a040' });
}

function drawWorkshop(): P {
  return drawBuilding({ w: 80, h: 64, roof: '#5a5a6a', doorX: 24, windows: [46, 60], chimney: true, wall: '#d8c8a8', roofH: 30, sign: '#7a9ac8' });
}

// ---------------------------------------------------------------- creatures
function drawSlime(c: string, f: number): P {
  const p = new PCanvas(16, 16);
  const sq = [0, 1, -1][f];
  const rx = 6 + sq;
  const ry = 5 - sq;
  p.ellipse(8, 15 - ry, rx, ry, c);
  p.ellipse(8, 15 - ry * 1.2, rx * 0.6, ry * 0.5, shade(c, 0.25));
  p.hline(8 - rx + 1, 14, rx * 2 - 2, shade(c, -0.3));
  p.px(6 - Math.floor(rx / 4), 15 - ry - 1, '#ffffff');
  const ey = 15 - ry + 1;
  p.px(6, ey, '#1a1a1a');
  p.px(10, ey, '#1a1a1a');
  p.px(6, ey - 1, '#1a1a1a');
  p.px(10, ey - 1, '#1a1a1a');
  p.outline(OUT);
  return p;
}

function drawBat(f: number): P {
  const p = new PCanvas(16, 16);
  const c = '#4a3a5a';
  p.ellipse(8, 8, 3, 3, c);
  p.px(7, 5, c);
  p.px(9, 5, c);
  p.px(7, 8, '#f04040');
  p.px(9, 8, '#f04040');
  if (f === 0) {
    p.line(5, 8, 1, 3, c);
    p.line(5, 9, 1, 4, c);
    p.line(11, 8, 15, 3, c);
    p.line(11, 9, 15, 4, c);
    p.line(1, 4, 4, 7, shade(c, -0.2));
    p.line(15, 4, 12, 7, shade(c, -0.2));
  } else {
    p.line(5, 8, 1, 12, c);
    p.line(5, 7, 1, 11, c);
    p.line(11, 8, 15, 12, c);
    p.line(11, 7, 15, 11, c);
  }
  p.outline(OUT);
  return p;
}

function drawSkeleton(f: number): P {
  const p = new PCanvas(16, 24);
  const b = '#e8e2d0',
    d = '#b8b0a0';
  p.ellipse(8, 6, 4, 4, b);
  p.rect(6, 6, 1, 2, '#1a1418');
  p.rect(9, 6, 1, 2, '#1a1418');
  p.hline(6, 9, 4, d);
  p.vline(8, 10, 7, b);
  for (let y = 11; y < 16; y += 2) p.hline(5, y, 7, b);
  const s = f ? 1 : -1;
  p.line(4, 11, 3, 16 + s, b);
  p.line(12, 11, 13, 16 - s, b);
  p.line(7, 17, 6 - s, 22, b);
  p.line(9, 17, 10 + s, 22, b);
  p.line(13, 16 - s, 14, 9, '#9aa0a8');
  p.outline(OUT);
  return p;
}

// ---------------------------------------------------------------- effects
function drawLight(size: number): P {
  const p = new PCanvas(size, size);
  const r = size / 2;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.sqrt((x + 0.5 - r) ** 2 + (y + 0.5 - r) ** 2) / r;
      if (d >= 1) continue;
      const a = Math.pow(1 - d, 1.4);
      p.px(x, y, '#ffffff', Math.round(a * 255));
    }
  return p;
}

function small(w: number, h: number, fn: (p: P) => void): P {
  const p = new PCanvas(w, h);
  fn(p);
  return p;
}

export function buildObjectArt(scene: Phaser.Scene) {
  for (let s = 0; s < 4; s++) {
    addTex(scene, 'tree_oak_' + s, drawOak(s));
    addTex(scene, 'tree_cherry_' + s, drawOak(s, true));
    addTex(scene, 'tree_pine_' + s, drawPine(s));
    addTex(scene, 'sapling_' + s, drawSapling(s));
    addTex(scene, 'bush_' + s, drawBush(s, false));
    addSheet(scene, 'weed_' + s, [drawWeed(s, 0), drawWeed(s, 1)]);
    addTex(scene, 'reeds_' + s, drawReeds(s));
    addTex(scene, 'flower_bed_' + s, drawFlowerBed(s));
    addTex(scene, 'forage_flower_' + s, drawForage('flower', s));
  }
  addTex(scene, 'bush_berry', drawBush(1, true));
  addSheet(scene, 'stone_small', [drawStone(0), drawStone(1), drawStone(2)]);
  addTex(scene, 'boulder', drawStone(0, 32));
  addTex(scene, 'ore_copper', drawOre('#e0884a'));
  addTex(scene, 'ore_iron', drawOre('#e8d8d0'));
  addTex(scene, 'ore_gold', drawOre('#f2c23a'));
  addTex(scene, 'ore_coal', drawOre('#2a2a32'));
  addTex(scene, 'ore_crystal', drawOre('#8ae0f8', true));
  addTex(scene, 'branch', drawBranch());
  addTex(scene, 'forage_herb', drawForage('herb', 0));
  addTex(scene, 'forage_mushroom', drawForage('mushroom', 0));

  for (const d of Object.values(CROPS)) {
    addSheet(scene, 'crop_' + d.id, [0, 1, 2, 3, 4].map((s) => drawCrop(d, s)).concat([drawCrop(d, 3, true)]));
  }

  addTex(scene, 'house_player', drawBuilding({ w: 80, h: 80, roof: '#b5452e', doorX: 40, windows: [12, 58], chimney: true, roofH: 40 }));
  addTex(scene, 'house_blue', drawBuilding({ w: 80, h: 80, roof: '#3e5f9a', doorX: 28, windows: [48, 62], chimney: true, roofH: 40 }));
  addTex(scene, 'house_green', drawBuilding({ w: 80, h: 80, roof: '#4f7a3a', doorX: 52, windows: [10, 24], roofH: 40, wall: '#e8d8b8' }));
  addTex(scene, 'house_thatch', drawBuilding({ w: 80, h: 80, roof: '#c8a05a', thatch: true, doorX: 40, windows: [12, 58], roofH: 40, chimney: true }));
  addTex(scene, 'house_ranch', drawBuilding({ w: 80, h: 80, roof: '#8a3a2a', doorX: 40, windows: [12, 58], chimney: true, roofH: 40, wall: '#d8b888', beam: '#5e3e22' }));
  addTex(scene, 'house_stone', drawBuilding({ w: 96, h: 80, roof: '#6a4a8a', doorX: 48, windows: [14, 72], stoneWall: true, roofH: 40, sign: '#e0c050' }));
  addTex(scene, 'forge', drawForge());
  addTex(scene, 'stall', drawStall());
  addSheet(scene, 'fountain', [drawFountain(0), drawFountain(1)]);
  addTex(scene, 'well', drawWell());
  addTex(scene, 'noticeboard', drawNoticeboard());
  addSheet(scene, 'lamppost', [drawLamp(false), drawLamp(true)]);
  addTex(scene, 'bench', drawBench());
  addTex(scene, 'barrel', drawBarrel());
  addTex(scene, 'crate', drawCrate());
  addSheet(scene, 'fence', Array.from({ length: 16 }, (_, m) => drawFence(m)));
  addTex(scene, 'sign', drawSign());
  addTex(scene, 'shipbin', drawShipBin());
  addTex(scene, 'workbench', drawWorkbench());
  addSheet(scene, 'chest', [drawChest(false), drawChest(true)]);
  addSheet(scene, 'ancient_chest', [drawChest(false, true), drawChest(true, true)]);
  addSheet(scene, 'furnace', [drawFurnace(false), drawFurnace(true)]);
  addTex(scene, 'anvil', drawAnvil());
  addSheet(scene, 'campfire', [drawCampfire(0), drawCampfire(1), drawCampfire(2)]);
  addTex(scene, 'alchemy', drawAlchemy());
  addSheet(scene, 'torch', [drawTorch(0), drawTorch(1)]);
  addTex(scene, 'scarecrow', drawScarecrow());
  addTex(scene, 'sprinkler', drawSprinkler(false));
  addTex(scene, 'sprinkler2', drawSprinkler(true));
  addTex(scene, 'table', drawTable());
  addTex(scene, 'chair', drawChair());
  addTex(scene, 'bookshelf', drawBookshelf());
  addTex(scene, 'plant_pot', drawPlantPot());
  addTex(scene, 'rug', drawRug());
  addTex(scene, 'banner', drawBanner());
  addTex(scene, 'bed', drawBed());
  addSheet(scene, 'fireplace', [drawFireplace(0), drawFireplace(1), drawFireplace(2)]);
  addTex(scene, 'cave_entrance', drawCaveEntrance());
  addTex(scene, 'ladder_down', drawLadder(true));
  addTex(scene, 'ladder_up', drawLadder(false));
  addTex(scene, 'pillar', drawPillar(false));
  addTex(scene, 'pillar_broken', drawPillar(true));
  addTex(scene, 'ruin_wall', drawRuinWall());
  addTex(scene, 'statue', drawStatue());
  addTex(scene, 'gate_royal', drawGate());
  addTex(scene, 'bridge_site', drawBridgeSite());
  addSheet(scene, 'waterfall', [drawWaterfall(0), drawWaterfall(1), drawWaterfall(2)]);
  addTex(scene, 'lily', drawLily());
  addTex(scene, 'hut', drawHut());
  addTex(scene, 'windmill', drawWindmill());
  addTex(scene, 'windmill_sails', drawSails());
  addTex(scene, 'shed', drawShed());
  addTex(scene, 'workshop', drawWorkshop());

  addSheet(scene, 'slime_green', [0, 1, 2].map((f) => drawSlime('#6ad04a', f)));
  addSheet(scene, 'slime_blue', [0, 1, 2].map((f) => drawSlime('#4a9ae0', f)));
  addSheet(scene, 'slime_purple', [0, 1, 2].map((f) => drawSlime('#a050d0', f)));
  addSheet(scene, 'bat', [drawBat(0), drawBat(1)]);
  addSheet(scene, 'skeleton', [drawSkeleton(0), drawSkeleton(1)]);

  addTex(scene, 'light', drawLight(128));
  addTex(scene, 'shadow', small(12, 5, (p) => p.ellipse(6, 2.5, 6, 2.5, '#10180c', 90)));
  addTex(scene, 'raindrop', small(2, 7, (p) => p.rect(0, 0, 1, 7, '#a8c8e8', 180)));
  addTex(scene, 'snowflake', small(3, 3, (p) => {
    p.px(1, 0, '#ffffff');
    p.hline(0, 1, 3, '#ffffff');
    p.px(1, 2, '#ffffff');
  }));
  for (let s = 0; s < 4; s++) addTex(scene, 'leaf_' + s, small(3, 3, (p) => p.rect(0, 0, 3, 2, LEAF[s][1])));
  addTex(scene, 'dust', small(3, 3, (p) => p.disc(1.5, 1.5, 1.5, '#d8c8a8')));
  addTex(scene, 'chip_wood', small(3, 2, (p) => p.rect(0, 0, 3, 2, '#a8743f')));
  addTex(scene, 'chip_stone', small(3, 3, (p) => p.rect(0, 0, 3, 3, '#8a8378')));
  addTex(scene, 'water_drop', small(2, 2, (p) => p.rect(0, 0, 2, 2, '#8ad0f0')));
  addTex(scene, 'spark', small(3, 3, (p) => {
    p.px(1, 0, '#fff6c0');
    p.hline(0, 1, 3, '#fff6c0');
    p.px(1, 2, '#fff6c0');
  }));
  addTex(scene, 'bobber', small(6, 7, (p) => {
    p.rect(1, 0, 4, 3, '#e03a3a');
    p.rect(1, 3, 4, 3, '#f4f4f4');
    p.outline(OUT);
  }));
  addTex(scene, 'exclaim', small(8, 14, (p) => {
    p.rect(2, 0, 4, 8, '#f8e040');
    p.rect(2, 10, 4, 3, '#f8e040');
    p.outline(OUT);
  }));
  addTex(scene, 'firefly', small(3, 3, (p) => {
    p.px(1, 1, '#f8ffa0');
    p.px(0, 1, '#c8e060', 120);
    p.px(2, 1, '#c8e060', 120);
    p.px(1, 0, '#c8e060', 120);
    p.px(1, 2, '#c8e060', 120);
  }));
  addTex(scene, 'smoke', small(6, 6, (p) => p.disc(3, 3, 3, '#c8c4bc', 150)));
  addTex(scene, 'cursor', small(18, 18, (p) => {
    for (let i = 0; i < 5; i++) {
      p.px(i, 0, '#ffffff');
      p.px(0, i, '#ffffff');
      p.px(17 - i, 0, '#ffffff');
      p.px(17, i, '#ffffff');
      p.px(i, 17, '#ffffff');
      p.px(0, 17 - i, '#ffffff');
      p.px(17 - i, 17, '#ffffff');
      p.px(17, 17 - i, '#ffffff');
    }
  }));
  addTex(scene, 'pixel', small(1, 1, (p) => p.px(0, 0, '#ffffff')));
  addTex(scene, 'heart_fx', small(7, 6, (p) => {
    p.rect(0, 1, 3, 2, '#e8404a');
    p.rect(4, 1, 3, 2, '#e8404a');
    p.rect(1, 0, 2, 1, '#e8404a');
    p.rect(4, 0, 2, 1, '#e8404a');
    p.rect(1, 3, 5, 1, '#e8404a');
    p.rect(2, 4, 3, 1, '#e8404a');
    p.px(3, 5, '#e8404a');
  }));
}

export function makeObjectAnims(scene: Phaser.Scene) {
  const mk = (key: string, tex: string, frames: number[], rate: number) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({ key, frames: frames.map((frame) => ({ key: tex, frame })), frameRate: rate, repeat: -1 });
  };
  mk('anim_fountain', 'fountain', [0, 1], 4);
  mk('anim_campfire', 'campfire', [0, 1, 2], 7);
  mk('anim_fireplace', 'fireplace', [0, 1, 2], 6);
  mk('anim_torch', 'torch', [0, 1], 5);
  mk('anim_waterfall', 'waterfall', [0, 1, 2], 8);
  mk('anim_slime_green', 'slime_green', [0, 1, 0, 2], 6);
  mk('anim_slime_blue', 'slime_blue', [0, 1, 0, 2], 6);
  mk('anim_slime_purple', 'slime_purple', [0, 1, 0, 2], 6);
  mk('anim_bat', 'bat', [0, 1], 10);
  mk('anim_skeleton', 'skeleton', [0, 1], 5);
}

export { mix };
