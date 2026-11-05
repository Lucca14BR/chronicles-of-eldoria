/** Art for Valoria, the Royal Capital: castle, cathedral, guild, armory, tavern, throne. */
import Phaser from 'phaser';
import { PCanvas, shade, addTex } from './pixel';
import { drawBuilding } from './objects';
import { mulberry32 } from '../core/rng';

type P = PCanvas;
const OUT = '#24160f';
const STONE = '#9d9a8a';
const STONE_D = '#6d6a5c';
const STONE_L = '#c8c4b4';

function stoneBlock(p: P, x0: number, y0: number, w: number, h: number, seed: number, base = STONE) {
  const rnd = mulberry32(seed);
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const row = Math.floor((y - y0) / 6);
      const off = row % 2 ? 5 : 0;
      let c = base;
      if ((y - y0) % 6 === 0 || (x - x0 + off) % 10 === 0) c = shade(base, -0.28);
      else if (rnd() < 0.08) c = shade(base, rnd() < 0.5 ? 0.12 : -0.1);
      p.px(x, y, c);
    }
}

function crenels(p: P, x0: number, y: number, w: number, base = STONE) {
  for (let x = x0; x < x0 + w; x += 6) {
    p.rect(x, y - 4, 4, 4, base);
    p.hline(x, y - 4, 4, STONE_L);
  }
}

function coneRoof(p: P, cx: number, baseY: number, half: number, height: number, col: string) {
  for (let y = 0; y < height; y++) {
    const hw = Math.max(1, Math.round(((y + 1) / height) * half));
    for (let x = cx - hw; x < cx + hw; x++) {
      let c = y % 3 === 0 ? shade(col, -0.25) : col;
      if (x < cx - hw + 2) c = shade(col, 0.15);
      if (x >= cx + hw - 2) c = shade(col, -0.3);
      p.px(x, baseY - height + y, c);
    }
  }
  p.vline(cx, baseY - height - 6, 6, '#6a5a4a');
  p.rect(cx + 1, baseY - height - 6, 5, 3, '#c8302a');
  p.px(cx + 1, baseY - height - 4, '#e0c050');
}

function tower(p: P, x: number, w: number, top: number, bottom: number, seed: number, roof = '#3a5a9a') {
  stoneBlock(p, x, top, w, bottom - top, seed);
  p.vline(x, top, bottom - top, STONE_L);
  p.vline(x + w - 1, top, bottom - top, STONE_D);
  coneRoof(p, x + Math.floor(w / 2), top, Math.floor(w / 2) + 3, Math.floor(w * 1.1), roof);
  for (let y = top + 10; y < bottom - 12; y += 16) {
    p.rect(x + Math.floor(w / 2) - 2, y, 4, 7, '#1a1418');
    p.rect(x + Math.floor(w / 2) - 1, y + 1, 2, 5, '#f0c060');
  }
}

function castle(): P {
  const p = new PCanvas(192, 144);
  // back keep
  tower(p, 76, 40, 30, 120, 3, '#2e4e8e');
  // curtain wall
  stoneBlock(p, 16, 64, 160, 76, 9);
  crenels(p, 16, 64, 160);
  p.hline(16, 64, 160, STONE_L);
  // corner towers
  tower(p, 0, 30, 40, 140, 5);
  tower(p, 162, 30, 40, 140, 6);
  tower(p, 48, 22, 52, 130, 7, '#7a2a3a');
  tower(p, 122, 22, 52, 130, 8, '#7a2a3a');
  // banners on wall
  for (const bx of [28, 150]) {
    p.rect(bx, 74, 10, 22, '#3a5a9a');
    p.px(bx, 96, '#3a5a9a');
    p.px(bx + 9, 96, '#3a5a9a');
    p.rect(bx + 3, 80, 4, 4, '#e0c050');
  }
  for (const bx of [80, 106]) {
    p.rect(bx, 70, 8, 18, '#8a1a2a');
    p.rect(bx + 2, 75, 4, 4, '#e0c050');
  }
  // great gate
  p.ellipse(96, 112, 16, 16, '#3a2a20');
  p.rect(80, 112, 32, 28, '#3a2a20');
  p.ellipse(96, 113, 13, 13, '#6a4426');
  p.rect(83, 113, 26, 27, '#6a4426');
  for (let x = 85; x < 109; x += 4) p.vline(x, 104, 36, '#4a2e18');
  p.hline(83, 122, 26, '#3a2414');
  p.rect(92, 124, 3, 3, '#e0c050');
  p.rect(97, 124, 3, 3, '#e0c050');
  // arch stones
  for (let a = 0; a <= 10; a++) {
    const ang = Math.PI + (a / 10) * Math.PI;
    p.rect(96 + Math.cos(ang) * 17 - 1, 112 + Math.sin(ang) * 17 - 1, 3, 3, STONE_L);
  }
  // windows on wall
  for (const wx of [24, 40, 140, 156]) {
    p.rect(wx, 104, 6, 10, '#1a1418');
    p.rect(wx + 1, 105, 4, 8, '#f0c060');
  }
  // steps
  p.rect(76, 140, 40, 4, STONE_L);
  p.outline(OUT);
  return p;
}

function cathedral(): P {
  const p = new PCanvas(96, 120);
  stoneBlock(p, 8, 48, 80, 68, 11, '#b0ab9a');
  // spire
  stoneBlock(p, 36, 18, 24, 34, 12, '#b0ab9a');
  coneRoof(p, 48, 18, 14, 22, '#5a6a7a');
  // roof
  for (let y = 36; y < 50; y++) {
    const hw = 44 - Math.floor((50 - y) * 1.4);
    p.hline(48 - hw, y, hw * 2, y % 3 === 0 ? '#4a5a6a' : '#5a6a7a');
  }
  // rose window
  p.disc(48, 66, 11, '#4a3a5a');
  p.disc(48, 66, 9, '#3a5aa8');
  for (let a = 0; a < 8; a++) {
    p.line(48, 66, 48 + Math.cos((a * Math.PI) / 4) * 9, 66 + Math.sin((a * Math.PI) / 4) * 9, '#e0c050');
  }
  p.disc(48, 66, 3, '#d8303a');
  for (const [a, b] of [
    [44, 63],
    [52, 63],
    [44, 69],
    [52, 69],
  ])
    p.px(a, b, '#f8d860');
  // tall windows
  for (const wx of [16, 74]) {
    p.rect(wx, 60, 6, 26, '#3a2a3a');
    p.rect(wx + 1, 61, 4, 24, '#6a8ac8');
    p.hline(wx + 1, 72, 4, '#3a2a3a');
  }
  // door
  p.ellipse(48, 96, 9, 9, '#3a2a20');
  p.rect(39, 96, 18, 20, '#3a2a20');
  p.rect(41, 96, 14, 20, '#6a4426');
  p.vline(48, 92, 24, '#3a2414');
  p.rect(6, 114, 84, 6, STONE_D);
  p.outline(OUT);
  return p;
}

function throne(): P {
  const p = new PCanvas(32, 44);
  const gold = '#e0b040';
  p.rect(4, 2, 24, 34, gold);
  p.rect(7, 5, 18, 28, '#8a1a2a');
  p.rect(9, 7, 14, 24, '#a82a3a');
  for (const x of [4, 15, 27]) {
    p.px(x, 1, gold);
    p.px(x, 0, '#f8d860');
  }
  p.disc(16, 4, 2, '#3a7af0');
  p.rect(2, 26, 28, 6, gold);
  p.rect(4, 28, 24, 3, '#a82a3a');
  p.rect(2, 32, 4, 10, '#b88a2a');
  p.rect(26, 32, 4, 10, '#b88a2a');
  p.rect(0, 40, 32, 4, '#8a6a2a');
  p.vline(5, 3, 30, '#f8d860');
  p.outline(OUT);
  return p;
}

function altar(): P {
  const p = new PCanvas(32, 34);
  p.rect(4, 22, 24, 10, '#6a5a7a');
  p.rect(2, 30, 28, 4, '#4a3a5a');
  p.hline(4, 22, 24, '#9a8aaa');
  p.rect(10, 14, 12, 8, '#7a6a8a');
  // crystal
  for (let y = 0; y < 12; y++) {
    const hw = y < 6 ? Math.ceil(y * 0.7) + 1 : Math.ceil((12 - y) * 0.7);
    p.hline(16 - hw, 2 + y, hw * 2, y < 6 ? '#8ae0f8' : '#3a7af0');
  }
  p.px(14, 5, '#ffffff');
  p.outline(OUT);
  return p;
}

function citySign(): P {
  const p = new PCanvas(32, 28);
  p.rect(5, 10, 3, 18, '#6e4626');
  p.rect(24, 10, 3, 18, '#6e4626');
  p.rect(1, 2, 30, 12, '#3a5a9a');
  p.rect(1, 2, 30, 2, '#e0c050');
  p.rect(1, 12, 30, 2, '#e0c050');
  p.rect(13, 5, 6, 5, '#e0c050');
  p.px(14, 4, '#e0c050');
  p.px(17, 4, '#e0c050');
  p.outline(OUT);
  return p;
}

function hangingBanner(): P {
  const p = new PCanvas(16, 40);
  p.rect(7, 0, 2, 40, '#5a5a62');
  p.hline(2, 4, 12, '#5a5a62');
  p.rect(3, 5, 10, 22, '#8a1a2a');
  for (let i = 0; i < 5; i++) {
    p.px(3 + i, 27 + Math.floor(i / 2), '#8a1a2a');
    p.px(12 - i, 27 + Math.floor(i / 2), '#8a1a2a');
  }
  p.rect(5, 10, 6, 6, '#e0c050');
  p.rect(7, 12, 2, 2, '#8a1a2a');
  p.outline(OUT);
  return p;
}

export function buildCapitalArt(scene: Phaser.Scene) {
  addTex(scene, 'castle', castle());
  addTex(scene, 'cathedral', cathedral());
  addTex(scene, 'throne', throne());
  addTex(scene, 'crystal_altar', altar());
  addTex(scene, 'city_sign', citySign());
  addTex(scene, 'city_banner', hangingBanner());
  addTex(scene, 'guild_hall', drawBuilding({ w: 96, h: 88, roof: '#2e5a4a', doorX: 48, windows: [12, 74], chimney: true, roofH: 44, wall: '#e8dcc0', beam: '#4a2e18', sign: '#e0c050' }));
  addTex(scene, 'armory', drawBuilding({ w: 96, h: 80, roof: '#4a4a5a', doorX: 48, windows: [14, 72], stoneWall: true, roofH: 38, sign: '#c8cdd6' }));
  addTex(scene, 'tavern', drawBuilding({ w: 96, h: 80, roof: '#8a4a2a', thatch: false, doorX: 48, windows: [12, 74], chimney: true, roofH: 38, wall: '#d8c098', beam: '#5e3e22', sign: '#c86a2a' }));
  addTex(scene, 'city_house_a', drawBuilding({ w: 80, h: 80, roof: '#6a3a6a', doorX: 40, windows: [12, 58], chimney: true, roofH: 40, wall: '#f0e4cc' }));
  addTex(scene, 'city_house_b', drawBuilding({ w: 80, h: 80, roof: '#3a5a7a', doorX: 40, windows: [12, 58], roofH: 40, stoneWall: true }));
}
