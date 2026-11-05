/** Tiny pixel-canvas toolkit used to procedurally paint all game art. */
import Phaser from 'phaser';

const cache = new Map<string, [number, number, number]>();

export function rgb(c: string): [number, number, number] {
  let v = cache.get(c);
  if (!v) {
    const h = c.replace('#', '');
    v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    cache.set(c, v);
  }
  return v;
}

function hx(n: number) {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}

export function toHex(r: number, g: number, b: number) {
  return '#' + hx(r) + hx(g) + hx(b);
}

export function mix(a: string, b: string, t: number): string {
  const A = rgb(a);
  const B = rgb(b);
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

/** amt < 0 darkens (towards a cool shadow), amt > 0 lightens (towards warm light). */
export function shade(c: string, amt: number): string {
  if (amt < 0) return mix(c, '#1a1020', -amt);
  return mix(c, '#fff6dc', amt);
}

export function hexNum(c: string): number {
  const [r, g, b] = rgb(c);
  return (r << 16) | (g << 8) | b;
}

export class PCanvas {
  readonly data: Uint8ClampedArray;
  constructor(public w: number, public h: number) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  inb(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  px(x: number, y: number, c: string, a = 255) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.inb(x, y)) return;
    const i = (y * this.w + x) * 4;
    const [r, g, b] = rgb(c);
    const d = this.data;
    if (a >= 255 || d[i + 3] === 0) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = a;
      return;
    }
    const t = a / 255;
    d[i] = d[i] + (r - d[i]) * t;
    d[i + 1] = d[i + 1] + (g - d[i + 1]) * t;
    d[i + 2] = d[i + 2] + (b - d[i + 2]) * t;
    d[i + 3] = Math.min(255, d[i + 3] + a * (1 - d[i + 3] / 255));
  }

  alpha(x: number, y: number) {
    if (!this.inb(x, y)) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }

  get(x: number, y: number): string | null {
    if (!this.inb(x, y)) return null;
    const i = (y * this.w + x) * 4;
    if (this.data[i + 3] === 0) return null;
    return toHex(this.data[i], this.data[i + 1], this.data[i + 2]);
  }

  clear(x: number, y: number) {
    if (!this.inb(x, y)) return;
    this.data[(y * this.w + x) * 4 + 3] = 0;
  }

  rect(x: number, y: number, w: number, h: number, c: string, a = 255) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c, a);
  }

  fill(c: string) {
    this.rect(0, 0, this.w, this.h, c);
  }

  hline(x: number, y: number, w: number, c: string) {
    for (let i = 0; i < w; i++) this.px(x + i, y, c);
  }

  vline(x: number, y: number, h: number, c: string) {
    for (let j = 0; j < h; j++) this.px(x, y + j, c);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: string, a = 255) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, c, a);
      }
  }

  disc(cx: number, cy: number, r: number, c: string, a = 255) {
    this.ellipse(cx, cy, r, r, c, a);
  }

  /** Shaded ball (canopies, fruit). light from top-left. */
  ball(cx: number, cy: number, r: number, cols: string[], rnd?: () => number) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > r) continue;
        const lx = (dx + r * 0.45) / r;
        const ly = (dy + r * 0.45) / r;
        let l = Math.sqrt(lx * lx + ly * ly) / 1.4; // 0 = lit
        if (rnd) l += (rnd() - 0.5) * 0.25;
        const idx = Math.max(0, Math.min(cols.length - 1, Math.floor(l * cols.length)));
        this.px(x, y, cols[idx]);
      }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Adds a 1px outline around opaque pixels. */
  outline(c: string, diag = false) {
    const add: number[] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) > 0) continue;
        let n = this.alpha(x - 1, y) > 0 || this.alpha(x + 1, y) > 0 || this.alpha(x, y - 1) > 0 || this.alpha(x, y + 1) > 0;
        if (!n && diag) n = this.alpha(x - 1, y - 1) > 0 || this.alpha(x + 1, y - 1) > 0 || this.alpha(x - 1, y + 1) > 0 || this.alpha(x + 1, y + 1) > 0;
        if (n) add.push(x, y);
      }
    for (let i = 0; i < add.length; i += 2) this.px(add[i], add[i + 1], c);
  }

  speckle(x: number, y: number, w: number, h: number, c: string, density: number, rnd: () => number, onlyOpaque = true) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        if (rnd() >= density) continue;
        if (onlyOpaque && this.alpha(x + i, y + j) === 0) continue;
        this.px(x + i, y + j, c);
      }
  }

  blit(src: PCanvas, dx: number, dy: number, flip = false) {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const sx = flip ? src.w - 1 - x : x;
        const i = (y * src.w + sx) * 4;
        const a = src.data[i + 3];
        if (!a) continue;
        this.px(dx + x, dy + y, toHex(src.data[i], src.data[i + 1], src.data[i + 2]), a);
      }
  }

  /** Recolour every opaque pixel, keeping alpha (used for white flash frames). */
  tinted(c: string): PCanvas {
    const out = new PCanvas(this.w, this.h);
    const [r, g, b] = rgb(c);
    for (let i = 0; i < this.data.length; i += 4) {
      if (!this.data[i + 3]) continue;
      out.data[i] = r;
      out.data[i + 1] = g;
      out.data[i + 2] = b;
      out.data[i + 3] = this.data[i + 3];
    }
    return out;
  }

  toCanvas(scale = 1): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = this.w;
    cv.height = this.h;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(this.w, this.h);
    img.data.set(this.data);
    ctx.putImageData(img, 0, 0);
    if (scale === 1) return cv;
    const big = document.createElement('canvas');
    big.width = this.w * scale;
    big.height = this.h * scale;
    const bctx = big.getContext('2d')!;
    bctx.imageSmoothingEnabled = false;
    bctx.drawImage(cv, 0, 0, big.width, big.height);
    return big;
  }
}

/** Registers a single-frame texture. */
export function addTex(scene: Phaser.Scene, key: string, pc: PCanvas) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, pc.toCanvas());
}

/** Registers a horizontal strip of equal-size frames as numbered frames 0..n-1. */
export function addSheet(scene: Phaser.Scene, key: string, frames: PCanvas[]) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const fw = frames[0].w;
  const fh = frames[0].h;
  const sheet = new PCanvas(fw * frames.length, fh);
  frames.forEach((f, i) => sheet.blit(f, i * fw, 0));
  const tex = scene.textures.addCanvas(key, sheet.toCanvas());
  if (!tex) return;
  frames.forEach((_, i) => tex.add(i, 0, i * fw, 0, fw, fh));
}

/** Icon data-URL cache for the DOM interface. */
export const ICON_URLS: Record<string, string> = {};
