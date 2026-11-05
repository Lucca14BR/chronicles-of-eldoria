/** Procedural seasonal tileset generation (16x16 tiles, extruded). */
import Phaser from 'phaser';
import { PCanvas, shade, mix } from './pixel';
import { mulberry32, hash2 } from '../core/rng';
import { TS, N, E, S_, W } from '../world/terrain';

interface GrassPal {
  base: string;
  dark: string;
  light: string;
  hi: string;
  flowers: string[];
  forest: string;
  forestDark: string;
  forestLight: string;
}

export const GRASS_PAL: GrassPal[] = [
  { base: '#5fa83a', dark: '#4a8f2e', light: '#77bf48', hi: '#98d45f', flowers: ['#f4f0e6', '#f2d24a', '#f08fb0', '#9fb8f0'], forest: '#3f8a33', forestDark: '#2f6f2a', forestLight: '#55a13d' },
  { base: '#4f9a32', dark: '#3d8128', light: '#66b13e', hi: '#86c851', flowers: ['#f2d24a', '#e8543c', '#f4f0e6', '#c06ad8'], forest: '#36782c', forestDark: '#285f24', forestLight: '#4b9136' },
  { base: '#9a9a3c', dark: '#7f7c2e', light: '#b4aa48', hi: '#d2b45a', flowers: ['#d86a2a', '#c8402e', '#e8a83a', '#8a4a2a'], forest: '#7a7130', forestDark: '#5f5626', forestLight: '#9a8a3a' },
  { base: '#e6edf4', dark: '#c6d3e2', light: '#f6f9fc', hi: '#ffffff', flowers: ['#c6d3e2', '#aebfd4', '#ffffff', '#d8e4f0'], forest: '#d4dde8', forestDark: '#b2c1d4', forestLight: '#eaf0f6' },
];

const EXT = 1; // extrusion
const CELL = 16 + EXT * 2;
const COLS = 16;

function paintGrass(p: PCanvas, pal: GrassPal, rnd: () => number, season: number, flowers: boolean, forest = false) {
  const base = forest ? pal.forest : pal.base;
  const dark = forest ? pal.forestDark : pal.dark;
  const light = forest ? pal.forestLight : pal.light;
  p.fill(base);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const r = rnd();
      if (r < 0.1) p.px(x, y, dark);
      else if (r < 0.14) p.px(x, y, light);
    }
  const tufts = forest ? 6 : 5;
  for (let i = 0; i < tufts; i++) {
    const x = 1 + Math.floor(rnd() * 14);
    const y = 2 + Math.floor(rnd() * 13);
    if (season === 3) {
      p.px(x, y, pal.hi);
      p.px(x + 1, y, pal.dark);
      continue;
    }
    p.px(x, y, light);
    p.px(x, y - 1, pal.hi);
    p.px(x - 1, y, light);
    p.px(x + 1, y + 1, dark);
    p.px(x - 1, y + 1, dark);
  }
  if (season === 2 && !forest) {
    for (let i = 0; i < 3; i++) p.px(Math.floor(rnd() * 16), Math.floor(rnd() * 16), rnd() < 0.5 ? '#c8702a' : '#d89a3a');
  }
  if (flowers) {
    for (let i = 0; i < 4; i++) {
      const x = 2 + Math.floor(rnd() * 12);
      const y = 2 + Math.floor(rnd() * 12);
      const c = pal.flowers[Math.floor(rnd() * pal.flowers.length)];
      p.px(x, y + 1, dark);
      p.px(x - 1, y, c);
      p.px(x + 1, y, c);
      p.px(x, y - 1, c);
      p.px(x, y, '#f8e070');
    }
  }
}

function fringe(p: PCanvas, mask: number, col: string, shadow: string, seed: number, depthMax = 3) {
  for (let i = 0; i < 16; i++) {
    const d = 1 + Math.floor(hash2(i, seed, 7) * depthMax);
    if (mask & N) {
      for (let k = 0; k < d; k++) p.px(i, k, col);
      p.px(i, d, shadow);
    }
    if (mask & S_) {
      for (let k = 0; k < d; k++) p.px(i, 15 - k, col);
    }
    if (mask & W) {
      for (let k = 0; k < d; k++) p.px(k, i, col);
      p.px(d, i, shadow);
    }
    if (mask & E) {
      for (let k = 0; k < d; k++) p.px(15 - k, i, col);
      p.px(15 - d, i, shadow);
    }
  }
}

function paintDirt(p: PCanvas, rnd: () => number, mask: number, pal: GrassPal, season: number) {
  const base = season === 3 ? '#c9b8a2' : '#b08654';
  p.fill(base);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const r = rnd();
      if (r < 0.1) p.px(x, y, season === 3 ? '#b3a18c' : '#98703f');
      else if (r < 0.15) p.px(x, y, season === 3 ? '#ddd0be' : '#c49a68');
    }
  for (let i = 0; i < 3; i++) {
    const x = 1 + Math.floor(rnd() * 14),
      y = 1 + Math.floor(rnd() * 14);
    p.px(x, y, '#d2b088');
    p.px(x, y + 1, '#7f5c35');
  }
  fringe(p, mask, pal.base, shade(base, -0.25), mask * 31 + 3, 3);
  // grass blades over the fringe
  for (let i = 0; i < 16; i += 3) {
    if (mask & N) p.px(i + 1, 3, pal.light);
    if (mask & S_) p.px(i, 12, pal.dark);
  }
}

function paintStone(p: PCanvas, rnd: () => number, mask: number, pal: GrassPal, season: number) {
  const mortar = '#6c675f';
  p.fill(mortar);
  const rows = [0, 5, 10];
  rows.forEach((ry, ri) => {
    const off = ri % 2 === 0 ? 0 : 3;
    for (let sx = -off; sx < 16; sx += 6) {
      const w = 5;
      const h = ri === 2 ? 5 : 4;
      const tone = rnd();
      const c = tone < 0.33 ? '#a6a096' : tone < 0.66 ? '#9b958a' : '#b0aa9f';
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const px = sx + x,
            py = ry + y;
          if ((x === 0 || x === w - 1) && (y === 0 || y === h - 1)) continue;
          let col = c;
          if (y === 0) col = shade(c, 0.25);
          else if (y === h - 1) col = shade(c, -0.22);
          p.px(px, py, col);
        }
    }
  });
  if (season === 3) for (let i = 0; i < 8; i++) p.px(Math.floor(rnd() * 16), Math.floor(rnd() * 16), '#eef3f8');
  if (mask) fringe(p, mask, pal.base, '#55524c', mask * 17 + 9, 2);
}

function paintWater(p: PCanvas, rnd: () => number, mask: number, season: number, deep = false) {
  const base = deep ? '#2c64a2' : season === 3 ? '#5c9ccc' : '#3f86c6';
  const d = deep ? '#244f86' : season === 3 ? '#4b88ba' : '#3274b2';
  const l = season === 3 ? '#9ccbe8' : '#6fb0e0';
  p.fill(base);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (rnd() < 0.08) p.px(x, y, d);
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(rnd() * 12),
      y = 2 + Math.floor(rnd() * 12);
    p.hline(x, y, 3 + Math.floor(rnd() * 2), l);
  }
  if (rnd() < 0.5) p.px(Math.floor(rnd() * 16), Math.floor(rnd() * 16), '#c8e8f8');
  const foam = '#d6eef8';
  if (mask & N) {
    p.hline(0, 0, 16, '#6b5032');
    p.hline(0, 1, 16, '#4e3a26');
    p.hline(0, 2, 16, shade(base, -0.2));
    for (let i = 0; i < 16; i++) if (hash2(i, mask, 3) < 0.6) p.px(i, 3, foam);
  }
  if (mask & S_) {
    p.hline(0, 15, 16, foam);
    for (let i = 0; i < 16; i++) if (hash2(i, mask, 5) < 0.5) p.px(i, 14, l);
  }
  if (mask & W) {
    p.vline(0, 0, 16, '#5c4530');
    p.vline(1, 0, 16, foam);
  }
  if (mask & E) {
    p.vline(15, 0, 16, '#5c4530');
    p.vline(14, 0, 16, foam);
  }
}

function paintSand(p: PCanvas, rnd: () => number, season: number) {
  p.fill(season === 3 ? '#e6e2d6' : '#e2cc8e');
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const r = rnd();
      if (r < 0.1) p.px(x, y, season === 3 ? '#d2cdbf' : '#cdb579');
      else if (r < 0.16) p.px(x, y, season === 3 ? '#f4f2ea' : '#f0dea8');
    }
  if (rnd() < 0.5) {
    const x = 3 + Math.floor(rnd() * 10),
      y = 3 + Math.floor(rnd() * 10);
    p.px(x, y, '#f4ece0');
    p.px(x + 1, y, '#e0a890');
  }
}

function paintTilled(p: PCanvas, rnd: () => number, wet: boolean, fert: boolean) {
  const base = wet ? '#5a3b22' : '#8a5f36';
  const furrow = wet ? '#432b18' : '#6e4a29';
  const hi = wet ? '#6e4a2e' : '#a37446';
  p.fill(base);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (rnd() < 0.12) p.px(x, y, rnd() < 0.5 ? furrow : hi);
  for (let y = 2; y < 16; y += 4) {
    p.hline(1, y, 14, furrow);
    p.hline(1, y - 1, 14, hi);
  }
  p.hline(0, 0, 16, shade(base, -0.3));
  p.vline(0, 0, 16, shade(base, -0.2));
  p.hline(0, 15, 16, shade(base, 0.12));
  if (wet) for (let i = 0; i < 4; i++) p.px(2 + Math.floor(rnd() * 12), 2 + Math.floor(rnd() * 12), '#7c5a3e');
  if (fert) for (let i = 0; i < 7; i++) p.px(2 + Math.floor(rnd() * 12), 2 + Math.floor(rnd() * 12), '#d8d0a0');
}

function paintRock(p: PCanvas, rnd: () => number, face: boolean, season: number) {
  const top = '#8a8378';
  p.fill(top);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (rnd() < 0.14) p.px(x, y, rnd() < 0.5 ? '#7a7368' : '#9c958a');
  // blocky facets
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(rnd() * 12),
      y = Math.floor(rnd() * 8);
    p.hline(x, y, 4, '#a39c90');
    p.hline(x, y + 3, 4, '#6e685e');
  }
  if (season === 3) {
    for (let y = 0; y < (face ? 6 : 16); y++) for (let x = 0; x < 16; x++) if (rnd() < 0.55) p.px(x, y, '#eef3f8');
  }
  if (face) {
    const fc = '#5e5850';
    for (let y = 6; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        let c = fc;
        if ((x + Math.floor(hash2(x, 3, 9) * 3)) % 4 === 0) c = '#4c4740';
        if (rnd() < 0.08) c = '#6e685e';
        p.px(x, y, c);
      }
    p.hline(0, 6, 16, '#a39c90');
    p.hline(0, 15, 16, '#3a3530');
  }
}

function paintMGround(p: PCanvas, rnd: () => number, season: number) {
  p.fill(season === 3 ? '#dfe4ea' : '#9c9184');
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const r = rnd();
      if (r < 0.12) p.px(x, y, season === 3 ? '#c3ccd8' : '#867c70');
      else if (r < 0.18) p.px(x, y, season === 3 ? '#f8fafc' : '#b3a99b');
    }
  for (let i = 0; i < 2; i++) {
    const x = 1 + Math.floor(rnd() * 13),
      y = 1 + Math.floor(rnd() * 13);
    p.rect(x, y, 2, 1, '#bdb3a5');
    p.rect(x, y + 1, 2, 1, '#6e655a');
  }
}

function paintWood(p: PCanvas, rnd: () => number) {
  p.fill('#a0703f');
  for (let y = 0; y < 16; y += 4) {
    p.hline(0, y, 16, '#7a5230');
    const seam = Math.floor(hash2(y, 1, 5) * 16);
    p.vline(seam, y, 4, '#7a5230');
    for (let x = 0; x < 16; x++) if (rnd() < 0.1) p.px(x, y + 1 + Math.floor(rnd() * 3), '#b07f4c');
    p.px((seam + 3) % 16, y + 2, '#5e3e24');
  }
}

function paintWallTop(p: PCanvas) {
  p.fill('#3b2a1e');
  p.hline(0, 7, 16, '#4e3828');
  p.hline(0, 8, 16, '#2c1f16');
}

function paintWallFace(p: PCanvas, rnd: () => number) {
  p.fill('#c4a274');
  for (let x = 0; x < 16; x += 4) p.vline(x, 2, 9, '#b38f62');
  for (let i = 0; i < 6; i++) p.px(Math.floor(rnd() * 16), 2 + Math.floor(rnd() * 9), '#d2b388');
  p.hline(0, 0, 16, '#5e4030');
  p.hline(0, 1, 16, '#8a6444');
  p.rect(0, 11, 16, 5, '#7a5233');
  p.hline(0, 11, 16, '#9a6c42');
  p.vline(8, 12, 4, '#5e3e24');
  p.hline(0, 15, 16, '#4a3020');
}

function paintCave(p: PCanvas, rnd: () => number) {
  p.fill('#4a3b32');
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const r = rnd();
      if (r < 0.12) p.px(x, y, '#3a2e27');
      else if (r < 0.18) p.px(x, y, '#5a4a3e');
    }
  if (rnd() < 0.6) {
    const x = 2 + Math.floor(rnd() * 11),
      y = 2 + Math.floor(rnd() * 11);
    p.rect(x, y, 2, 1, '#6a5848');
    p.rect(x, y + 1, 2, 1, '#2e241e');
  }
}

function paintCaveWall(p: PCanvas, rnd: () => number, face: boolean) {
  p.fill('#2a2026');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (rnd() < 0.15) p.px(x, y, rnd() < 0.5 ? '#342830' : '#211a1f');
  if (face) {
    for (let y = 5; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        let c = '#3d2f33';
        if ((x + Math.floor(hash2(x, 7, 2) * 3)) % 4 === 0) c = '#30252a';
        if (rnd() < 0.08) c = '#4c3b40';
        p.px(x, y, c);
      }
    p.hline(0, 5, 16, '#55444a');
    p.hline(0, 15, 16, '#1a1418');
  }
}

function paintBridge(p: PCanvas, rnd: () => number, horizontal: boolean) {
  // horizontal = walking east-west across a vertical river
  p.fill('#2f6fae');
  if (horizontal) {
    for (let x = 0; x < 16; x += 4) {
      p.rect(x, 1, 4, 14, rnd() < 0.5 ? '#9a683a' : '#8a5c33');
      p.vline(x, 1, 14, '#5e3e22');
      p.px(x + 2, 3, '#4a301a');
      p.px(x + 2, 12, '#4a301a');
    }
    p.hline(0, 0, 16, '#6a4528');
    p.hline(0, 1, 16, '#b07a46');
    p.hline(0, 14, 16, '#b07a46');
    p.hline(0, 15, 16, '#4a301a');
  } else {
    for (let y = 0; y < 16; y += 4) {
      p.rect(1, y, 14, 4, rnd() < 0.5 ? '#9a683a' : '#8a5c33');
      p.hline(1, y, 14, '#5e3e22');
      p.px(3, y + 2, '#4a301a');
      p.px(12, y + 2, '#4a301a');
    }
    p.vline(0, 0, 16, '#4a301a');
    p.vline(1, 0, 16, '#b07a46');
    p.vline(14, 0, 16, '#b07a46');
    p.vline(15, 0, 16, '#4a301a');
  }
}

function paintRuin(p: PCanvas, rnd: () => number, season: number) {
  p.fill('#5d5a50');
  for (let by = 0; by < 16; by += 8)
    for (let bx = 0; bx < 16; bx += 8) {
      const c = rnd() < 0.5 ? '#8d8a7a' : '#837f70';
      p.rect(bx + 1, by + 1, 6, 6, c);
      p.hline(bx + 1, by + 1, 6, shade(c, 0.2));
      p.hline(bx + 1, by + 6, 6, shade(c, -0.2));
    }
  for (let i = 0; i < 6; i++) p.px(Math.floor(rnd() * 16), Math.floor(rnd() * 16), season === 3 ? '#e8eef4' : '#5f7a3a');
  if (rnd() < 0.5) p.line(2, 3, 6, 9, '#4a473f');
}

function paintMarble(p: PCanvas, rnd: () => number, v: number) {
  const a = v ? '#e8e4d8' : '#d8d2c4';
  p.fill(a);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (rnd() < 0.05) p.px(x, y, shade(a, 0.08));
  // veins
  let x = Math.floor(rnd() * 16);
  for (let y = 0; y < 16; y++) {
    x += Math.floor(rnd() * 3) - 1;
    p.px(((x % 16) + 16) % 16, y, shade(a, -0.15));
  }
  p.hline(0, 0, 16, shade(a, 0.15));
  p.vline(0, 0, 16, shade(a, 0.1));
  p.hline(0, 15, 16, shade(a, -0.2));
  p.vline(15, 0, 16, shade(a, -0.15));
}

function paintTile(idx: number, season: number): PCanvas {
  const p = new PCanvas(16, 16);
  const rnd = mulberry32(idx * 977 + season * 13 + 1);
  const pal = GRASS_PAL[season];
  if (idx < TS.flowers) paintGrass(p, pal, rnd, season, false);
  else if (idx < TS.fgrass) paintGrass(p, pal, rnd, season, true);
  else if (idx < TS.dirt) paintGrass(p, pal, rnd, season, false, true);
  else if (idx < TS.stone) paintDirt(p, rnd, idx - TS.dirt, pal, season);
  else if (idx < TS.water) paintStone(p, rnd, idx - TS.stone, pal, season);
  else if (idx < TS.sand) paintWater(p, rnd, idx - TS.water, season);
  else if (idx < TS.tilled) paintSand(p, rnd, season);
  else if (idx === TS.tilled) paintTilled(p, rnd, false, false);
  else if (idx === TS.tilledWet) paintTilled(p, rnd, true, false);
  else if (idx === TS.tilledFert) paintTilled(p, rnd, false, true);
  else if (idx === TS.tilledWetFert) paintTilled(p, rnd, true, true);
  else if (idx === TS.rock) paintRock(p, rnd, false, season);
  else if (idx === TS.rockFace) paintRock(p, rnd, true, season);
  else if (idx < TS.wood) paintMGround(p, rnd, season);
  else if (idx === TS.wood) paintWood(p, rnd);
  else if (idx === TS.wallTop) paintWallTop(p);
  else if (idx === TS.wallFace) paintWallFace(p, rnd);
  else if (idx < TS.caveWall) paintCave(p, rnd);
  else if (idx === TS.caveWall) paintCaveWall(p, rnd, false);
  else if (idx === TS.caveWallFace) paintCaveWall(p, rnd, true);
  else if (idx === TS.bridgeH) paintBridge(p, rnd, true);
  else if (idx === TS.bridgeV) paintBridge(p, rnd, false);
  else if (idx < TS.void) paintRuin(p, rnd, season);
  else if (idx === TS.void) p.fill('#0a0608');
  else if (idx === TS.deep) paintWater(p, rnd, 0, season, true);
  else if (idx >= TS.marble && idx < TS.marble + 2) paintMarble(p, rnd, idx - TS.marble);
  return p;
}

export const TILESET_MARGIN = EXT;
export const TILESET_SPACING = EXT * 2;

export function buildTilesets(scene: Phaser.Scene) {
  const rows = Math.ceil(TS.COUNT / COLS);
  for (let season = 0; season < 4; season++) {
    const sheet = new PCanvas(COLS * CELL, rows * CELL);
    for (let i = 0; i < TS.COUNT; i++) {
      const t = paintTile(i, season);
      const ox = (i % COLS) * CELL + EXT;
      const oy = Math.floor(i / COLS) * CELL + EXT;
      sheet.blit(t, ox, oy);
      // extrude edges
      for (let k = 0; k < 16; k++) {
        const top = t.get(k, 0),
          bot = t.get(k, 15),
          lft = t.get(0, k),
          rgt = t.get(15, k);
        if (top) sheet.px(ox + k, oy - 1, top);
        if (bot) sheet.px(ox + k, oy + 16, bot);
        if (lft) sheet.px(ox - 1, oy + k, lft);
        if (rgt) sheet.px(ox + 16, oy + k, rgt);
      }
      const c0 = t.get(0, 0),
        c1 = t.get(15, 0),
        c2 = t.get(0, 15),
        c3 = t.get(15, 15);
      if (c0) sheet.px(ox - 1, oy - 1, c0);
      if (c1) sheet.px(ox + 16, oy - 1, c1);
      if (c2) sheet.px(ox - 1, oy + 16, c2);
      if (c3) sheet.px(ox + 16, oy + 16, c3);
    }
    const key = 'tiles_' + season;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, sheet.toCanvas());
  }
  // invisible collision tileset
  const col = new PCanvas(16, 16);
  col.fill('#ff00ff');
  if (scene.textures.exists('coltiles')) scene.textures.remove('coltiles');
  scene.textures.addCanvas('coltiles', col.toCanvas());
}

/** Small tile preview for the map screen / menus. */
export function tileMixColor(a: string, b: string, t: number) {
  return mix(a, b, t);
}
