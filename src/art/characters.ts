/** Procedural character sprites (16x24, 9 frames: down/up/left x idle,walkA,walkB). */
import Phaser from 'phaser';
import { PCanvas, shade, mix, addSheet } from './pixel';

export interface CharSpec {
  skin: string;
  hair: string;
  hairStyle: number; // 0 curto, 1 longo, 2 rabo-de-cavalo, 3 volumoso
  shirt: string;
  pants: string;
  boots?: string;
  outfit?: 'tunic' | 'dress' | 'armor' | 'robe' | 'apron';
  hat?: 'none' | 'hood' | 'helmet' | 'straw' | 'bandana' | 'crown';
  hatColor?: string;
  beard?: string | null;
  accent?: string;
  cape?: string;
}

const OUT = '#24160f';
type Dir = 0 | 1 | 2; // down, up, left

function drawChar(s: CharSpec, dir: Dir, f: number): PCanvas {
  const p = new PCanvas(16, 24);
  const skin = s.skin;
  const skinD = shade(skin, -0.18);
  const hair = s.hair;
  const hairD = shade(hair, -0.25);
  const hairL = shade(hair, 0.22);
  const shirt = s.shirt;
  const shirtD = shade(shirt, -0.22);
  const shirtL = shade(shirt, 0.15);
  const pants = s.pants;
  const pantsD = shade(pants, -0.2);
  const boots = s.boots || '#4a3022';
  const outfit = s.outfit || 'tunic';
  const hat = s.hat || 'none';
  const hatC = s.hatColor || '#6a4a8a';
  const walk = f === 0 ? 0 : f === 1 ? 1 : -1;
  const bob = f === 0 ? 0 : 0;

  // cape behind (down view hides it mostly)
  if (s.cape && dir !== 0) {
    const c = s.cape;
    if (dir === 1) {
      p.rect(3, 11, 10, 10, c);
      p.vline(3, 11, 10, shade(c, -0.2));
      p.vline(12, 11, 10, shade(c, -0.2));
      p.hline(3, 20, 10, shade(c, -0.3));
    } else {
      p.rect(9, 11, 3, 9 + (walk !== 0 ? 1 : 0), c);
      p.vline(11, 11, 9, shade(c, -0.25));
    }
  }

  // ---- legs
  const legY = 18;
  if (outfit !== 'dress' && outfit !== 'robe') {
    if (dir === 2) {
      const fx = walk === 1 ? 4 : walk === -1 ? 8 : 6;
      const bx = walk === 1 ? 9 : walk === -1 ? 5 : 7;
      p.rect(bx, legY, 3, 3, pantsD);
      p.rect(bx, legY + 3, 3, 2, shade(boots, -0.2));
      p.rect(fx, legY, 3, 3, pants);
      p.rect(fx, legY + 3, 3, 2, boots);
      p.px(fx, legY + 4, shade(boots, -0.3));
    } else {
      const lUp = walk === 1 ? 1 : 0;
      const rUp = walk === -1 ? 1 : 0;
      p.rect(5, legY, 3, 3 - lUp, pants);
      p.rect(5, legY + 3 - lUp, 3, 2, boots);
      p.rect(8, legY, 3, 3 - rUp, pantsD);
      p.rect(8, legY + 3 - rUp, 3, 2, shade(boots, -0.15));
    }
  } else {
    // skirt / robe hem with feet
    const sc = outfit === 'robe' ? shirt : pants;
    if (dir === 2) {
      p.rect(5, 16, 7, 5, sc);
      p.vline(11, 16, 5, shade(sc, -0.2));
      p.hline(5, 20, 7, shade(sc, -0.25));
      p.rect(walk === 1 ? 4 : walk === -1 ? 8 : 6, 21, 3, 2, boots);
    } else {
      p.rect(4, 16, 8, 5, sc);
      p.px(3, 19, sc);
      p.px(12, 19, sc);
      p.px(3, 20, sc);
      p.px(12, 20, sc);
      p.vline(11, 16, 5, shade(sc, -0.2));
      p.vline(12, 19, 2, shade(sc, -0.2));
      p.hline(3, 20, 10, shade(sc, -0.25));
      p.rect(5, 21, 2, 2 - (walk === 1 ? 1 : 0), boots);
      p.rect(9, 21, 2, 2 - (walk === -1 ? 1 : 0), shade(boots, -0.15));
    }
  }

  // ---- torso
  const ty = 11 + bob;
  if (dir === 2) {
    p.rect(5, ty, 6, 7, shirt);
    p.vline(10, ty, 7, shirtD);
    p.vline(5, ty, 7, shirtL);
    if (outfit !== 'dress' && outfit !== 'robe') p.rect(5, ty + 6, 6, 1, pants);
  } else {
    p.rect(4, ty, 8, 7, shirt);
    p.vline(11, ty, 7, shirtD);
    p.vline(4, ty, 7, shirtL);
    if (outfit !== 'dress' && outfit !== 'robe') p.rect(4, ty + 6, 8, 1, pants);
    if (dir === 0) {
      p.px(7, ty, skin);
      p.px(8, ty, skinD);
    }
  }
  // outfit overlays
  if (outfit === 'armor') {
    const m = '#a3abb6',
      mD = '#6e7682',
      mL = '#ccd3dc';
    if (dir === 2) {
      p.rect(5, ty, 6, 6, m);
      p.vline(10, ty, 6, mD);
      p.hline(5, ty, 6, mL);
    } else {
      p.rect(4, ty, 8, 6, m);
      p.vline(11, ty, 6, mD);
      p.hline(4, ty, 8, mL);
      p.hline(4, ty + 3, 8, mD);
      if (s.accent) {
        p.rect(6, ty + 1, 4, 8, s.accent);
        p.vline(9, ty + 1, 8, shade(s.accent, -0.2));
        if (dir === 0) {
          p.px(7, ty + 3, '#e8c84a');
          p.px(8, ty + 3, '#e8c84a');
          p.px(7, ty + 4, '#c8a02a');
          p.px(8, ty + 4, '#c8a02a');
        }
      }
    }
  } else if (outfit === 'apron' && dir !== 1) {
    const a = s.accent || '#d8cfb8';
    if (dir === 0) {
      p.rect(5, ty + 2, 6, 7, a);
      p.vline(10, ty + 2, 7, shade(a, -0.15));
      p.px(5, ty, a);
      p.px(10, ty, a);
      p.px(5, ty + 1, a);
      p.px(10, ty + 1, a);
    } else {
      p.rect(5, ty + 2, 2, 7, a);
    }
  } else if (outfit === 'tunic' || outfit === 'dress') {
    // belt
    const belt = s.accent || '#5a3a22';
    if (dir === 2) p.hline(5, ty + 5, 6, belt);
    else {
      p.hline(4, ty + 5, 8, belt);
      if (dir === 0) p.px(7, ty + 5, '#e0b84a');
    }
  } else if (outfit === 'robe') {
    const tr = s.accent || '#e0c060';
    if (dir === 0) {
      p.vline(7, ty + 1, 10, tr);
      p.hline(4, ty + 4, 8, shade(shirt, -0.3));
    } else if (dir === 2) p.hline(5, ty + 4, 6, shade(shirt, -0.3));
  }

  // ---- arms
  const armSleeve = outfit === 'armor' ? '#a3abb6' : shirt;
  if (dir === 2) {
    const ax = walk === 1 ? 5 : walk === -1 ? 9 : 7;
    p.rect(ax, ty + 1, 2, 4, shade(armSleeve, -0.08));
    p.vline(ax + 1, ty + 1, 4, shade(armSleeve, -0.25));
    p.rect(ax, ty + 5, 2, 1, skin);
  } else {
    const la = walk === 1 ? -1 : walk === -1 ? 1 : 0;
    p.rect(3, ty + 1 + la, 1, 4, armSleeve);
    p.px(3, ty + 5 + la, skin);
    p.rect(12, ty + 1 - la, 1, 4, shade(armSleeve, -0.2));
    p.px(12, ty + 5 - la, skinD);
  }

  // ---- head
  const hy = 3 + bob;
  const faceX = dir === 2 ? 4 : 4;
  p.rect(faceX, hy, 8, 8, skin);
  p.clear(faceX, hy);
  p.clear(faceX + 7, hy);
  p.clear(faceX, hy + 7);
  p.clear(faceX + 7, hy + 7);
  if (dir === 0) {
    p.vline(11, hy + 1, 6, skinD);
    p.hline(5, hy + 7, 6, skinD);
    // eyes
    p.px(6, hy + 4, '#ffffff');
    p.px(9, hy + 4, '#ffffff');
    p.px(6, hy + 5, '#2a1a14');
    p.px(9, hy + 5, '#2a1a14');
    p.px(6, hy + 4, '#3a2a22');
    p.px(9, hy + 4, '#3a2a22');
    p.px(5, hy + 6, mix(skin, '#e05050', 0.3));
    p.px(10, hy + 6, mix(skin, '#e05050', 0.3));
    p.px(7, hy + 6, skinD);
    p.px(8, hy + 6, skinD);
  } else if (dir === 2) {
    p.px(5, hy + 4, '#3a2a22');
    p.px(5, hy + 5, '#2a1a14');
    p.px(3, hy + 5, skin);
    p.px(4, hy + 6, mix(skin, '#e05050', 0.3));
    p.vline(11, hy + 1, 6, skinD);
  }

  // beard
  if (s.beard && dir !== 1) {
    const b = s.beard;
    if (dir === 0) {
      p.rect(5, hy + 5, 6, 3, b);
      p.px(4, hy + 5, b);
      p.px(11, hy + 5, b);
      p.hline(6, hy + 8, 4, shade(b, -0.2));
      p.px(7, hy + 6, shade(b, -0.35));
      p.px(8, hy + 6, shade(b, -0.35));
    } else {
      p.rect(4, hy + 5, 5, 3, b);
      p.hline(5, hy + 8, 3, shade(b, -0.2));
    }
  }

  // ---- hair
  const st = s.hairStyle;
  const H = (x: number, y: number, c = hair) => p.px(x, y + bob, c);
  if (hat !== 'hood' && hat !== 'helmet') {
    if (dir === 1) {
      // back of head fully covered
      for (let y = 1; y <= 9; y++) for (let x = 3; x <= 12; x++) {
        if ((y === 1 && (x < 5 || x > 10)) || (y === 2 && (x < 4 || x > 11))) continue;
        H(x, y, y === 1 ? hairL : x >= 11 ? hairD : hair);
      }
      if (st === 1) for (let y = 10; y <= 14; y++) for (let x = 4; x <= 11; x++) H(x, y, x >= 10 ? hairD : hair);
      if (st === 2) {
        for (let y = 10; y <= 15; y++) {
          H(7, y, hair);
          H(8, y, hairD);
        }
        H(7, 9, '#c84a4a');
        H(8, 9, '#c84a4a');
      }
      if (st === 3) {
        for (let x = 2; x <= 13; x++) for (let y = 1; y <= 10; y++) if (!((x === 2 || x === 13) && (y < 3 || y > 8))) H(x, y, x > 11 ? hairD : hair);
      }
    } else if (dir === 0) {
      for (let x = 5; x <= 10; x++) H(x, 1, hairL);
      for (let x = 4; x <= 11; x++) H(x, 2, x < 7 ? hairL : hair);
      for (let x = 3; x <= 12; x++) H(x, 3, hair);
      [3, 4, 5, 8, 10, 11, 12].forEach((x) => H(x, 4, x > 9 ? hairD : hair));
      H(3, 5, hair);
      H(12, 5, hairD);
      if (st === 0) {
        H(3, 6, hairD);
        H(12, 6, hairD);
      }
      if (st === 1) {
        for (let y = 5; y <= 13; y++) {
          H(3, y, hair);
          H(12, y, hairD);
        }
        for (let y = 11; y <= 13; y++) {
          H(4, y, hair);
          H(11, y, hairD);
        }
      }
      if (st === 2) {
        H(3, 6, hairD);
        H(12, 6, hairD);
        H(13, 5, hair);
        H(13, 6, hairD);
      }
      if (st === 3) {
        for (let x = 2; x <= 13; x++) {
          H(x, 2, hairL);
          H(x, 3, hair);
        }
        for (let y = 4; y <= 9; y++) {
          H(2, y, hair);
          H(3, y, hair);
          H(12, y, hairD);
          H(13, y, hairD);
        }
        for (let x = 4; x <= 11; x++) H(x, 1, hairL);
      }
    } else {
      // side (facing left): hair on top and back (right)
      for (let x = 5; x <= 11; x++) H(x, 1, hairL);
      for (let x = 4; x <= 12; x++) H(x, 2, hair);
      for (let x = 4; x <= 12; x++) H(x, 3, x < 6 ? hair : hair);
      H(4, 4, hair);
      for (let y = 4; y <= 8; y++) for (let x = 8; x <= 12; x++) H(x, y, x === 12 ? hairD : hair);
      if (st === 1) for (let y = 9; y <= 13; y++) for (let x = 9; x <= 12; x++) H(x, y, x === 12 ? hairD : hair);
      if (st === 2) for (let y = 4; y <= 10; y++) {
        H(13, y, hairD);
        if (y > 5) H(14, y, hair);
      }
      if (st === 3) {
        for (let y = 1; y <= 10; y++) for (let x = 7; x <= 13; x++) H(x, y, x > 11 ? hairD : hair);
        for (let x = 3; x <= 7; x++) H(x, 1, hairL);
      }
      // ear
      p.px(8, hy + 4, skinD);
    }
  }

  // ---- hats
  if (hat === 'straw') {
    const c = s.hatColor || '#d9b85a';
    if (dir === 2) {
      p.hline(1, 3, 13, c);
      p.hline(1, 4, 13, shade(c, -0.25));
    } else {
      p.hline(1, 3, 14, c);
      p.hline(1, 4, 14, shade(c, -0.25));
    }
    p.rect(4, 0, 8, 3, c);
    p.hline(4, 0, 8, shade(c, 0.2));
    p.hline(4, 2, 8, '#b84a3a');
  } else if (hat === 'helmet') {
    const m = '#a3abb6';
    p.rect(3, 0, 10, 5, m);
    p.hline(4, 0, 8, '#ccd3dc');
    p.hline(3, 4, 10, '#6e7682');
    if (dir === 0) {
      p.vline(7, 5, 2, '#6e7682');
      p.vline(8, 5, 2, '#6e7682');
    }
    if (dir !== 1) {
      p.vline(3, 5, 4, m);
      if (dir === 0) p.vline(12, 5, 4, '#6e7682');
      else p.rect(9, 5, 4, 4, m);
    } else {
      p.rect(3, 5, 10, 5, m);
      p.hline(3, 9, 10, '#6e7682');
    }
    p.px(7, 0, '#c84a3a');
    p.px(8, 0, '#c84a3a');
  } else if (hat === 'hood') {
    const c = hatC;
    const cD = shade(c, -0.25);
    if (dir === 1) {
      p.rect(3, 1, 10, 12, c);
      p.vline(12, 1, 12, cD);
      p.clear(3, 1);
      p.clear(12, 1);
      p.px(7, 13, c);
      p.px(8, 13, cD);
    } else if (dir === 0) {
      p.rect(3, 1, 10, 3, c);
      p.clear(3, 1);
      p.clear(12, 1);
      for (let y = 4; y <= 11; y++) {
        p.px(3, y, c);
        p.px(12, y, cD);
      }
      p.hline(4, 4, 8, cD);
      p.px(4, 5, c);
      p.px(11, 5, cD);
      p.hline(4, 11, 8, c);
    } else {
      p.rect(4, 1, 9, 4, c);
      p.rect(8, 5, 5, 7, c);
      p.vline(12, 2, 10, cD);
      p.px(4, 5, c);
      p.clear(4, 1);
    }
  } else if (hat === 'crown') {
    const g = '#e8c040';
    p.hline(4, 2, 8, g);
    p.hline(4, 3, 8, shade(g, -0.2));
    for (const x of [4, 6, 9, 11]) p.px(x, 1, g);
    p.px(7, 0, g);
    p.px(8, 0, g);
    p.px(7, 1, g);
    p.px(8, 1, g);
    if (dir !== 1) {
      p.px(7, 2, '#d8303a');
      p.px(5, 2, '#3a7af0');
      p.px(10, 2, '#3a7af0');
    }
  } else if (hat === 'bandana') {
    const c = hatC;
    p.hline(3, 3, 10, c);
    p.hline(3, 4, 10, shade(c, -0.2));
    if (dir === 2) {
      p.px(13, 4, c);
      p.px(14, 5, c);
    }
  }

  p.outline(OUT);
  return p;
}

export function buildCharSheet(scene: Phaser.Scene, key: string, spec: CharSpec) {
  const frames: PCanvas[] = [];
  for (const d of [0, 1, 2] as Dir[]) for (let f = 0; f < 3; f++) frames.push(drawChar(spec, d, f));
  addSheet(scene, key, frames);
  makeCharAnims(scene, key);
}

export function makeCharAnims(scene: Phaser.Scene, key: string) {
  const defs: [string, number[]][] = [
    ['down', [1, 0, 2, 0]],
    ['up', [4, 3, 5, 3]],
    ['side', [7, 6, 8, 6]],
  ];
  for (const [name, fr] of defs) {
    const k = key + '_walk_' + name;
    if (scene.anims.exists(k)) scene.anims.remove(k);
    scene.anims.create({ key: k, frames: fr.map((frame) => ({ key, frame })), frameRate: 8, repeat: -1 });
  }
}

/** Portrait canvas (head + shoulders) scaled for the dialogue UI. */
export function portraitCanvas(spec: CharSpec, scale = 5): HTMLCanvasElement {
  const f = drawChar(spec, 0, 0);
  const crop = new PCanvas(16, 18);
  for (let y = 0; y < 18; y++)
    for (let x = 0; x < 16; x++) {
      const c = f.get(x, y);
      if (c) crop.px(x, y, c);
    }
  return crop.toCanvas(scale);
}

/** A full-body preview canvas (for character creation). */
export function previewCanvas(spec: CharSpec, dir: 0 | 1 | 2, frame: number, scale = 6, flip = false): HTMLCanvasElement {
  const f = drawChar(spec, dir, frame);
  if (!flip) return f.toCanvas(scale);
  const g = new PCanvas(16, 24);
  g.blit(f, 0, 0, true);
  return g.toCanvas(scale);
}
