/** Deterministic location generation: world (Greenvale & biomes), player house, mines. */
import { T, SOLID_TERRAIN } from './terrain';
import { RNG, fbm, hash2 } from '../core/rng';
import type { Facing, WObj } from '../core/state';
import { OBJ } from '../data/objects';

export interface Warp {
  x: number;
  y: number;
  w: number;
  h: number;
  to: string;
  tx: number;
  ty: number;
  facing: Facing;
}

export interface LocDef {
  id: string;
  name: string;
  w: number;
  h: number;
  terrain: Uint8Array;
  statics: WObj[];
  warps: Warp[];
  dark: number; // base darkness (0 outdoor)
  outdoor: boolean;
  music: 'day' | 'cave' | 'home';
  spawn: { x: number; y: number };
}

export const WORLD_W = 150;
export const WORLD_H = 110;

export const POS = {
  houseDoorOut: { x: 22, y: 31 },
  caveOut: { x: 70, y: 6 },
  farm: { x0: 4, y0: 24, x1: 49, y1: 76 },
  plaza: { x0: 70, y0: 42, x1: 94, y1: 58 },
};

export const westRiverX = (y: number) => 56 + 2 * Math.sin(y / 7);
export const eastRiverX = (y: number) => 110 + 2 * Math.sin(y / 9);
const onRiver = (x: number, cx: number) => Math.abs(x + 0.5 - cx) <= 1.5;

export type Zone = 'farm' | 'village' | 'forest' | 'mountain' | 'lake' | 'ruins' | 'house' | 'cave' | 'ranch';

/** Marta's ranch: kept clear of natural resources. */
export const RANCH = { x0: 19, y0: 77, x1: 43, y1: 97 };
export const PADDOCK = { x0: 28, y0: 86, x1: 40, y1: 95 };
const inRect = (r: { x0: number; y0: number; x1: number; y1: number }, x: number, y: number) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
export const ZONE_NAME: Record<Zone, string> = {
  farm: 'Sua Fazenda',
  village: 'Greenvale',
  forest: 'Floresta de Eldoria',
  mountain: 'Montanhas Sussurrantes',
  lake: 'Lago Prateado',
  ruins: 'Ruínas Esquecidas',
  house: 'Sua Casa',
  cave: 'Mina Sussurrante',
  ranch: 'Rancho Prado Verde',
};

export function zoneAt(x: number, y: number): Zone {
  if (y < 22) return 'mountain';
  if (x >= 113) return x >= 124 && y >= 66 ? 'ruins' : 'forest';
  if (x <= POS.farm.x1 && y >= POS.farm.y0 && y <= POS.farm.y1) return 'farm';
  if (x < 46 && y >= 77) return 'ranch';
  if (y >= 77) return 'lake';
  return 'village';
}

function lakeD(x: number, y: number) {
  const dx = (x + 0.5 - 72) / 26;
  const dy = (y + 0.5 - 95) / 11;
  return Math.sqrt(dx * dx + dy * dy);
}

export function ruinsD(x: number, y: number) {
  const dx = (x + 0.5 - 136) / 10;
  const dy = (y + 0.5 - 82) / 9;
  return Math.sqrt(dx * dx + dy * dy);
}

let worldCache: { key: string; def: LocDef } | null = null;

export function buildWorld(flags: Record<string, any>, projects: Record<string, boolean>): LocDef {
  const ck = JSON.stringify([!!flags.bridge_built, !!projects.lamps, !!projects.market]);
  if (worldCache && worldCache.key === ck) return worldCache.def;
  const W = WORLD_W,
    H = WORLD_H;
  const t = new Uint8Array(W * H);
  const set = (x: number, y: number, v: number) => {
    if (x >= 0 && y >= 0 && x < W && y < H) t[y * W + x] = v;
  };
  const get = (x: number, y: number) => (x >= 0 && y >= 0 && x < W && y < H ? t[y * W + x] : -1);

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v: number = T.GRASS;
      if (hash2(x, y, 91) < 0.035) v = T.FLOWERS;
      if (x >= 113) v = T.FGRASS;
      // mountains
      if (y < 22) {
        const edgeL = 46 + Math.floor(fbm(0, y * 0.3, 5) * 4);
        const edgeR = 111 - Math.floor(fbm(9, y * 0.3, 6) * 3);
        const top = 3 + Math.floor(fbm(x * 0.25, 0, 7) * 2);
        if (y >= 19 || x < edgeL || x > edgeR || y < top) v = T.ROCK;
        else v = T.MGROUND;
        if (y >= 19 && x >= 79 && x <= 85) v = T.MGROUND;
      }
      // lake
      const ld = lakeD(x, y);
      if (ld < 1) v = ld < 0.55 ? T.DEEP : T.WATER;
      else if (ld < 1.16 && y > 80) v = T.SAND;
      // ruins floor
      if (ruinsD(x, y) < 1 && fbm(x * 0.4, y * 0.4, 33) > 0.38) v = T.RUIN;
      t[y * W + x] = v;
    }
  // spring pond (west river source)
  for (let y = 3; y < 10; y++)
    for (let x = 52; x < 61; x++) {
      const dx = (x + 0.5 - 56.5) / 3.6,
        dy = (y + 0.5 - 6.5) / 2.4;
      if (dx * dx + dy * dy <= 1) set(x, y, T.WATER);
    }
  // rivers
  for (let y = 6; y < H; y++) {
    const cx = westRiverX(y);
    for (let x = Math.floor(cx) - 3; x <= Math.ceil(cx) + 3; x++) if (onRiver(x, cx) && lakeD(x, y) >= 0.9) set(x, y, T.WATER);
    if (lakeD(Math.floor(cx), y) < 1) break;
  }
  for (let y = 19; y < H; y++) {
    const cx = eastRiverX(y);
    for (let x = Math.floor(cx) - 3; x <= Math.ceil(cx) + 3; x++) if (onRiver(x, cx)) set(x, y, T.WATER);
  }

  const path = (x0: number, y0: number, x1: number, y1: number, v: number = T.DIRT) => {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
        const cur = get(x, y);
        if (cur === T.WATER || cur === T.DEEP) continue;
        set(x, y, v);
      }
  };
  const bridgeRows = (y0: number, y1: number, xFrom: number, xTo: number, v: number) => {
    for (let y = y0; y <= y1; y++) for (let x = xFrom; x <= xTo; x++) if (get(x, y) === T.WATER) set(x, y, v);
  };

  // plaza
  const pz = POS.plaza;
  for (let y = pz.y0; y <= pz.y1; y++)
    for (let x = pz.x0; x <= pz.x1; x++) {
      const corner = (x === pz.x0 || x === pz.x1) && (y === pz.y0 || y === pz.y1);
      if (!corner) set(x, y, T.STONE);
    }
  // main road farm -> plaza
  path(21, 31, 23, 51);
  path(21, 49, 69, 51);
  bridgeRows(49, 51, 50, 62, T.BRIDGE_H);
  // east road -> forest
  path(95, 49, 127, 51);
  if (flags.bridge_built) bridgeRows(49, 51, 104, 116, T.BRIDGE_H);
  path(128, 42, 130, 72);
  path(121, 51, 127, 51);
  // north path & valley
  path(81, 18, 83, 41);
  path(70, 9, 83, 11);
  path(69, 5, 71, 11);
  path(83, 9, 103, 11);
  // south to lake + dock
  path(81, 59, 83, 82);
  for (let y = 83; y <= 89; y++) for (let x = 81; x <= 83; x++) set(x, y, T.BRIDGE_V);
  // house paths
  path(64, 39, 66, 48);
  path(88, 39, 88, 41);
  path(101, 45, 101, 48);
  path(67, 62, 67, 63);
  path(67, 63, 80, 63);
  path(128, 42, 130, 43);
  // ranch road
  path(21, 51, 23, 85);
  path(21, 83, 41, 84);
  path(27, 82, 27, 82);
  path(33, 85, 34, 85);

  // ---------------- static objects
  const statics: WObj[] = [];
  let sid = 0;
  const add = (kind: string, x: number, y: number, data?: Record<string, any>) => {
    statics.push({ id: 's' + sid++, kind, x, y, data });
  };
  add('house_player', 20, 28);
  add('shipbin', 26, 29);
  add('well', 16, 30);
  add('sign', 47, 47, { text: 'farm' });
  add('house_tomas', 63, 36);
  add('house_livia', 87, 36);
  add('house_aldric', 98, 42);
  add('house_moreira', 64, 59);
  add('forge', 97, 53);
  add('stall', 73, 44);
  add('fountain', 81, 48);
  add('noticeboard', 88, 44);
  add('bench', 76, 53);
  add('bench', 87, 53);
  add('barrel', 77, 44);
  add('crate', 72, 44);
  add('crate', 95, 54);
  add('barrel', 96, 56);
  add('flower_bed', 62, 39);
  add('flower_bed', 68, 39);
  add('flower_bed', 86, 39);
  add('flower_bed', 92, 39);
  for (const [x, y] of [
    [61, 43],
    [95, 40],
    [73, 61],
    [91, 61],
    [60, 55],
    [104, 56],
  ])
    add('deco_cherry', x, y);
  const lit = !!projects.lamps;
  for (const [x, y] of [
    [71, 43],
    [93, 43],
    [71, 57],
    [93, 57],
    [60, 48],
    [106, 52],
    [84, 64],
  ])
    add('lamppost', x, y, { lit, project: true });
  add('lamppost', 69, 39, { lit: true });
  add('lamppost', 85, 39, { lit: true });
  add('sign', 68, 47, { text: 'village' });
  add('sign', 84, 24, { text: 'mountain' });
  add('sign', 84, 77, { text: 'lake' });
  add('sign', 119, 48, { text: 'forest' });
  add('sign', 131, 66, { text: 'ruins' });
  if (!flags.bridge_built) add('bridge_site', 103, 47);
  // ranch
  add('house_ranch', 25, 79);
  add('ranch_barn', 36, 79);
  add('sign', 20, 82, { text: 'ranch' });
  add('hay_bale', 31, 81);
  add('hay_bale', 42, 80);
  add('hay_bale', 42, 81);
  add('trough', 30, 93);
  for (let x = PADDOCK.x0; x <= PADDOCK.x1; x++)
    for (let y = PADDOCK.y0; y <= PADDOCK.y1; y++) {
      const edge = x === PADDOCK.x0 || x === PADDOCK.x1 || y === PADDOCK.y0 || y === PADDOCK.y1;
      if (!edge || (y === PADDOCK.y0 && (x === 33 || x === 34))) continue;
      add('fence_static', x, y);
    }
  // mountains
  add('cave_entrance', 69, 3);
  add('wall_torch', 67, 5);
  add('wall_torch', 73, 5);
  add('gate_royal', 104, 7);
  add('barrel', 102, 8);
  add('crate', 102, 12);
  add('waterfall', Math.round(westRiverX(20) - 1.5), 19);
  add('waterfall', Math.round(eastRiverX(20) - 1.5), 19);
  // lake decor
  for (let y = 78; y < H; y++)
    for (let x = 40; x < 105; x++) {
      const d = lakeD(x, y);
      if (d >= 1 && d < 1.1 && hash2(x, y, 4) < 0.18 && get(x, y) === T.SAND) add('reeds', x, y);
      if (d < 0.95 && d > 0.8 && hash2(x, y, 8) < 0.06 && get(x, y) === T.WATER) add('lily', x, y);
    }
  add('bench', 77, 80);
  add('bench', 86, 80);
  // forest
  add('hut_elara', 127, 39);
  add('alchemy_elara', 132, 42);
  add('barrel', 126, 42);
  add('flower_bed', 125, 41);
  // ruins
  add('statue', 135, 75);
  add('ancient_chest', 136, 86, { open: !!flags.ruins_chest });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const x = Math.round(136 + Math.cos(a) * 8);
    const y = Math.round(82 + Math.sin(a) * 6.5);
    add(i % 3 === 0 ? 'pillar_broken' : 'pillar', x, y);
  }
  add('ruin_wall', 128, 79);
  add('ruin_wall', 143, 84);
  add('ruin_wall', 131, 89);
  add('pillar_broken', 140, 76);

  const def: LocDef = {
    id: 'world',
    name: 'Eldoria',
    w: W,
    h: H,
    terrain: t,
    statics,
    warps: [],
    dark: 0,
    outdoor: true,
    music: 'day',
    spawn: { ...POS.houseDoorOut },
  };
  worldCache = { key: ck, def };
  return def;
}

/** Cells covered by object footprints (plus door approach) to keep clear. */
export function occupancy(def: LocDef, objs: WObj[]): Uint8Array {
  const occ = new Uint8Array(def.w * def.h);
  for (const o of objs) {
    const k = OBJ[o.kind];
    for (let y = o.y; y < o.y + k.h; y++) for (let x = o.x; x < o.x + k.w; x++) if (x >= 0 && y >= 0 && x < def.w && y < def.h) occ[y * def.w + x] = 1;
    if (k.door || k.interact) {
      // keep the front clear
      for (let x = o.x - 1; x <= o.x + k.w; x++) for (let y = o.y + k.h; y <= o.y + k.h + 1; y++) if (x >= 0 && y >= 0 && x < def.w && y < def.h) occ[y * def.w + x] = 1;
    }
  }
  return occ;
}

const OPEN = new Set<number>([T.GRASS, T.FLOWERS, T.FGRASS, T.MGROUND, T.SAND]);

/** Initial resources on a new game. */
export function initialWorldObjects(seed: number, def: LocDef): WObj[] {
  const rng = new RNG(seed);
  const occ = occupancy(def, def.statics);
  const out: WObj[] = [];
  let n = 0;
  const free = (x: number, y: number) => x > 1 && y > 1 && x < def.w - 2 && y < def.h - 2 && !occ[y * def.w + x] && OPEN.has(def.terrain[y * def.w + x]);
  const put = (kind: string, x: number, y: number, data?: Record<string, any>) => {
    const k = OBJ[kind];
    for (let yy = y; yy < y + k.h; yy++) for (let xx = x; xx < x + k.w; xx++) if (!free(xx, yy)) return;
    for (let yy = y; yy < y + k.h; yy++) for (let xx = x; xx < x + k.w; xx++) occ[yy * def.w + xx] = 1;
    out.push({ id: 'w' + n++, kind, x, y, hp: k.hp, data });
  };
  for (let y = 0; y < def.h; y++)
    for (let x = 0; x < def.w; x++) {
      if (!free(x, y) || inRect(RANCH, x, y)) continue;
      const z = zoneAt(x, y);
      const r = rng.next();
      if (z === 'farm') {
        const nearHouse = x >= 14 && x <= 30 && y >= 26 && y <= 35;
        const edge = x < 8 || y > 72 || y < 27;
        if (edge && r < 0.35) put(rng.chance(0.6) ? 'tree_oak' : 'tree_pine', x, y);
        else if (nearHouse) continue;
        else if (r < 0.1) put('weed', x, y, { v: rng.int(0, 1) });
        else if (r < 0.14) put('stone', x, y, { v: rng.int(0, 2) });
        else if (r < 0.165) put('branch', x, y);
        else if (r < 0.18) put(rng.chance(0.5) ? 'tree_oak' : 'tree_pine', x, y);
        else if (r < 0.183) put('boulder', x, y);
      } else if (z === 'forest' || z === 'ruins') {
        const dens = fbm(x * 0.12, y * 0.12, 21);
        const nearPath = Math.abs(x - 129) < 3 && y > 38;
        if (nearPath) continue;
        if (z === 'ruins' && ruinsD(x, y) < 1.1) {
          if (r < 0.05) put('weed', x, y, { v: 1 });
          else if (r < 0.07) put('stone', x, y, { v: 2 });
          continue;
        }
        if (dens > 0.48 && r < 0.42) put(rng.chance(0.55) ? 'tree_pine' : 'tree_oak', x, y);
        else if (r < 0.12) put('tree_oak', x, y);
        else if (r < 0.14) put('bush_berry', x, y, { ripe: true });
        else if (r < 0.16) put('bush', x, y);
        else if (r < 0.175) put('forage_herb', x, y);
        else if (r < 0.185) put('forage_mushroom', x, y);
        else if (r < 0.22) put('weed', x, y, { v: rng.int(0, 1) });
      } else if (z === 'mountain') {
        if (def.terrain[y * def.w + x] !== T.MGROUND) continue;
        if (r < 0.06) put('stone', x, y, { v: rng.int(0, 2) });
        else if (r < 0.08) put('ore_copper', x, y);
        else if (r < 0.086) put('ore_coal', x, y);
        else if (r < 0.094) put('boulder', x, y);
        else if (r < 0.12) put('tree_pine', x, y);
      } else if (z === 'lake') {
        if (r < 0.05 && def.terrain[y * def.w + x] !== T.SAND) put(rng.chance(0.5) ? 'tree_oak' : 'tree_cherry', x, y);
        else if (r < 0.06) put('forage_flower', x, y);
        else if (r < 0.07) put('bush', x, y);
      } else if (z === 'ranch') {
        if (r < 0.05) put(rng.chance(0.5) ? 'tree_oak' : 'tree_cherry', x, y);
        else if (r < 0.06) put('forage_flower', x, y);
      } else if (z === 'village') {
        const inCore = x >= 58 && x <= 106 && y >= 32 && y <= 66;
        if (inCore) {
          if (r < 0.006) put('forage_flower', x, y);
          continue;
        }
        if (r < 0.06) put(rng.chance(0.5) ? 'tree_oak' : 'tree_pine', x, y);
        else if (r < 0.075) put('bush', x, y);
        else if (r < 0.085) put('weed', x, y, { v: 0 });
        else if (r < 0.09) put('stone', x, y, { v: 1 });
        else if (r < 0.094) put('forage_flower', x, y);
      }
    }
  return out;
}

/** Free cell finder for daily respawns. */
export function freeCellsFor(def: LocDef, objs: WObj[], zones: Zone[], rng: RNG, count: number, extraBlocked?: Set<string>): [number, number][] {
  const occ = occupancy(def, def.statics.concat(objs));
  const res: [number, number][] = [];
  let tries = 0;
  while (res.length < count && tries < count * 60) {
    tries++;
    const x = rng.int(2, def.w - 3);
    const y = rng.int(2, def.h - 3);
    if (occ[y * def.w + x]) continue;
    if (!OPEN.has(def.terrain[y * def.w + x])) continue;
    if (!zones.includes(zoneAt(x, y))) continue;
    if (extraBlocked && extraBlocked.has(x + ',' + y)) continue;
    occ[y * def.w + x] = 1;
    res.push([x, y]);
  }
  return res;
}

// ---------------------------------------------------------------- house interior
export function buildHouse(): LocDef {
  const W = 14,
    H = 11;
  const t = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v: number = T.WOOD;
      if (y <= 1 || x === 0 || x === W - 1 || y === H - 1) v = T.WALL;
      if (y === H - 1 && (x === 6 || x === 7)) v = T.WOOD;
      t[y * W + x] = v;
    }
  const statics: WObj[] = [
    { id: 'h0', kind: 'bed', x: 1, y: 2 },
    { id: 'h1', kind: 'fireplace', x: 6, y: 2 },
    { id: 'h2', kind: 'deco_table', x: 9, y: 5 },
  ];
  // deco table/chairs are regular placeables in a fixed spot; we model them as static copies
  statics[2] = { id: 'h2', kind: 'table_static', x: 9, y: 5 };
  statics.push({ id: 'h3', kind: 'chair_static', x: 11, y: 5 });
  statics.push({ id: 'h4', kind: 'shelf_static', x: 11, y: 2 });
  statics.push({ id: 'h5', kind: 'rug_static', x: 5, y: 5 });
  statics.push({ id: 'h6', kind: 'pot_static', x: 1, y: 8 });
  return {
    id: 'house',
    name: 'Sua Casa',
    w: W,
    h: H,
    terrain: t,
    statics,
    warps: [{ x: 6, y: 10, w: 2, h: 1, to: 'world', tx: POS.houseDoorOut.x, ty: POS.houseDoorOut.y, facing: 'down' }],
    dark: 0,
    outdoor: false,
    music: 'home',
    spawn: { x: 6, y: 9 },
  };
}

// ---------------------------------------------------------------- mines
export interface CaveGen {
  def: LocDef;
  objects: WObj[];
  enemies: { kind: string; x: number; y: number }[];
}

export const MINE_FLOORS = 10;

export function buildCave(floor: number, seed: number, flags: Record<string, any>): CaveGen {
  const W = 36,
    H = 28;
  const rng = new RNG(seed * 31 + floor * 7919);
  let g = new Uint8Array(W * H);
  for (let i = 0; i < g.length; i++) g[i] = rng.chance(0.44) ? 1 : 0;
  const at = (gr: Uint8Array, x: number, y: number) => (x < 1 || y < 2 || x >= W - 1 || y >= H - 1 ? 1 : gr[y * W + x]);
  for (let it = 0; it < 5; it++) {
    const n = new Uint8Array(W * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let c = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) c += at(g, x + dx, y + dy);
        n[y * W + x] = c >= 5 || (it < 2 && c <= 1) ? 1 : 0;
        if (x < 1 || y < 2 || x >= W - 1 || y >= H - 1) n[y * W + x] = 1;
      }
    g = n;
  }
  // carve a guaranteed central chamber
  const sx = Math.floor(W / 2),
    sy = 5;
  for (let y = sy - 2; y <= sy + 3; y++) for (let x = sx - 3; x <= sx + 3; x++) g[y * W + x] = 0;
  // keep only the region connected to the start
  const seen = new Uint8Array(W * H);
  const stack = [sy * W + sx];
  seen[sy * W + sx] = 1;
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % W,
      y = Math.floor(i / W);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (seen[j] || g[j]) continue;
      seen[j] = 1;
      stack.push(j);
    }
  }
  const t = new Uint8Array(W * H);
  let floorCells: [number, number][] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (seen[i]) {
        t[i] = T.CAVE;
        floorCells.push([x, y]);
      } else t[i] = T.CAVEWALL;
    }
  const statics: WObj[] = [{ id: 'c_up', kind: 'ladder_up', x: sx, y: sy - 2 }];
  const objects: WObj[] = [];
  const enemies: { kind: string; x: number; y: number }[] = [];
  const used = new Set<string>();
  for (let y = sy - 2; y <= sy + 2; y++) for (let x = sx - 2; x <= sx + 2; x++) used.add(x + ',' + y);
  floorCells = floorCells.filter(([x, y]) => !used.has(x + ',' + y));
  // shuffle
  for (let i = floorCells.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [floorCells[i], floorCells[j]] = [floorCells[j], floorCells[i]];
  }
  let ci = 0;
  const take = () => floorCells[ci++ % floorCells.length];
  // treasure chests
  if ((floor === 5 || floor === MINE_FLOORS) && !flags['mine_chest_' + floor]) {
    const [x, y] = take();
    if (t[y * W + x + 1] === T.CAVE) statics.push({ id: 'c_chest', kind: 'mine_chest', x, y, data: { floor } });
  }
  if (floor === MINE_FLOORS && !flags.frag_mine) {
    for (let i = 0; i < 40; i++) {
      const [x, y] = take();
      if (t[y * W + x + 1] === T.CAVE && t[(y + 1) * W + x] === T.CAVE) {
        statics.push({ id: 'c_altar', kind: 'crystal_altar', x, y });
        break;
      }
    }
  }
  const torches = 5 + Math.floor(rng.next() * 3);
  for (let i = 0; i < torches; i++) {
    const [x, y] = take();
    if (t[(y - 1) * W + x] === T.CAVEWALL) statics.push({ id: 'c_t' + i, kind: 'wall_torch', x, y });
  }
  const rocks = Math.floor(floorCells.length * (0.16 + floor * 0.008));
  const table: [string, number][] =
    floor <= 3
      ? [
          ['stone', 64],
          ['ore_copper', 24],
          ['ore_coal', 9],
          ['ore_crystal', 3],
        ]
      : floor <= 6
        ? [
            ['stone', 52],
            ['ore_copper', 14],
            ['ore_iron', 20],
            ['ore_coal', 9],
            ['ore_crystal', 5],
          ]
        : [
            ['stone', 44],
            ['ore_iron', 22],
            ['ore_gold', 15],
            ['ore_coal', 8],
            ['ore_crystal', 11],
          ];
  const total = table.reduce((a, b) => a + b[1], 0);
  for (let i = 0; i < rocks; i++) {
    const [x, y] = take();
    let r = rng.next() * total;
    let kind = 'stone';
    for (const [k, w] of table) {
      if (r < w) {
        kind = k;
        break;
      }
      r -= w;
    }
    objects.push({ id: 'c' + i, kind, x, y, hp: OBJ[kind].hp, data: kind === 'stone' ? { v: rng.int(0, 2) } : undefined });
  }
  const nEnemies = 3 + Math.floor(floor * 0.8);
  for (let i = 0; i < nEnemies; i++) {
    const [x, y] = take();
    let kind = 'slime_green';
    const r = rng.next();
    if (floor >= 7) kind = r < 0.35 ? 'skeleton' : r < 0.65 ? 'slime_purple' : 'bat';
    else if (floor >= 4) kind = r < 0.5 ? 'slime_blue' : r < 0.8 ? 'bat' : 'slime_green';
    else kind = r < 0.75 ? 'slime_green' : 'bat';
    enemies.push({ kind, x, y });
  }
  const occupied = new Set(objects.map((o) => o.x + ',' + o.y).concat(statics.map((o) => o.x + ',' + o.y)));
  const fin = objects.filter((o, i) => objects.findIndex((p) => p.x === o.x && p.y === o.y) === i);
  void occupied;
  return {
    def: {
      id: 'cave',
      name: 'Mina Sussurrante — Andar ' + floor,
      w: W,
      h: H,
      terrain: t,
      statics,
      warps: [],
      dark: 0.8,
      outdoor: false,
      music: 'cave',
      spawn: { x: sx, y: sy },
    },
    objects: fin,
    enemies: enemies.filter((e) => !fin.some((o) => o.x === e.x && o.y === e.y)),
  };
}

export function isSolidTerrain(v: number) {
  return SOLID_TERRAIN.has(v);
}

const NATURE_BLOCK = new Set<number>([T.DIRT, T.STONE, T.BRIDGE_H, T.BRIDGE_V, T.WATER, T.DEEP, T.ROCK]);

/** Removes natural objects that a newer map layout now covers (paths, buildings, the ranch). */
export function sanitizeWorldObjects(objects: Record<string, WObj>, def: LocDef) {
  const occ = occupancy(def, def.statics);
  let removed = 0;
  for (const [id, o] of Object.entries(objects)) {
    const k = OBJ[o.kind];
    if (!k) {
      delete objects[id];
      continue;
    }
    if (k.item || o.kind.startsWith('b_')) continue;
    let bad = false;
    for (let y = o.y; y < o.y + k.h && !bad; y++)
      for (let x = o.x; x < o.x + k.w && !bad; x++) {
        if (x < 0 || y < 0 || x >= def.w || y >= def.h) bad = true;
        else if (occ[y * def.w + x] || NATURE_BLOCK.has(def.terrain[y * def.w + x]) || inRect(RANCH, x, y)) bad = true;
      }
    if (bad) {
      delete objects[id];
      removed++;
    }
  }
  return removed;
}

// ---------------------------------------------------------------- Valoria, the Royal Capital
export const CAPITAL_ARRIVAL = { x: 35, y: 56 };
export const GATE_OUT = { x: 105, y: 11 };

export function buildCapital(): LocDef {
  const W = 72,
    H = 60;
  const t = new Uint8Array(W * H);
  const set = (x: number, y: number, v: number) => {
    if (x >= 0 && y >= 0 && x < W && y < H) t[y * W + x] = v;
  };
  const fill = (x0: number, y0: number, x1: number, y1: number, v: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, v);
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v: number = hash2(x, y, 77) < 0.04 ? T.FLOWERS : T.GRASS;
      const edge = 2 + Math.floor(fbm(x * 0.3, y * 0.3, 41) * 2);
      if (x < edge || x >= W - edge || y < 4 || y >= H - 2) v = T.ROCK;
      t[y * W + x] = v;
    }
  // streets
  fill(33, 9, 38, H - 1, T.STONE); // royal avenue (opens south)
  fill(4, 29, 67, 32, T.STONE); // cross street
  fill(24, 9, 47, 12, T.STONE); // castle forecourt
  fill(22, 24, 49, 38, T.STONE); // plaza
  fill(29, 26, 42, 36, T.MARBLE);
  fill(10, 13, 12, 52, T.STONE); // west street
  fill(59, 13, 61, 52, T.STONE); // east street
  fill(10, 49, 61, 50, T.STONE); // south street
  fill(3, 13, 12, 14, T.STONE);
  fill(6, 11, 6, 12, T.STONE);
  fill(12, 13, 33, 14, T.STONE);
  fill(38, 13, 61, 14, T.STONE);

  const statics: WObj[] = [];
  let sid = 0;
  const add = (kind: string, x: number, y: number, data?: Record<string, any>) => statics.push({ id: 'cs' + sid++, kind, x, y, data });
  add('castle', 30, 5);
  add('cathedral', 3, 8);
  add('guild_hall', 15, 23);
  add('guild_board', 19, 27);
  add('armory', 52, 23);
  add('tavern', 50, 42);
  add('city_house_a', 22, 42);
  add('city_house_d', 27, 42);
  add('city_house_c', 40, 42);
  add('city_house_b', 45, 42);
  add('city_house_b', 22, 52);
  add('city_house_a', 41, 52);
  add('city_house_b', 3, 24);
  add('city_house_a', 3, 34);
  add('city_house_d', 63, 24);
  add('city_house_c', 63, 34);
  add('fountain', 34, 30);
  add('statue', 28, 30);
  add('statue', 42, 30);
  add('city_stall', 24, 25);
  add('city_stall', 44, 25);
  add('city_stall', 24, 35);
  add('city_stall', 44, 35);
  add('crate', 27, 25);
  add('barrel', 43, 25);
  add('bench', 30, 37);
  add('bench', 40, 37);
  for (const [x, y] of [
    [27, 10],
    [44, 10],
    [22, 23],
    [49, 23],
  ])
    add('city_banner', x, y);
  for (const y of [16, 21, 41, 46, 53]) {
    add('lamppost', 32, y, { lit: true });
    add('lamppost', 39, y, { lit: true });
  }
  for (const [x, y] of [
    [22, 39],
    [49, 39],
    [13, 31],
    [58, 31],
  ])
    add('lamppost', x, y, { lit: true });
  for (const [x, y] of [
    [19, 16],
    [24, 18],
    [47, 18],
    [52, 16],
    [6, 44],
    [66, 46],
    [16, 40],
    [55, 36],
    [20, 46],
    [64, 15],
    [7, 18],
  ])
    add(hash2(x, y, 3) < 0.5 ? 'deco_oak' : 'deco_cherry', x, y);
  for (const [x, y] of [
    [21, 45],
    [32, 45],
    [39, 45],
    [50, 45],
  ])
    add('flower_bed', x, y);
  add('city_sign', 30, 56, { text: 'valoria' });
  return {
    id: 'capital',
    name: 'Valoria',
    w: W,
    h: H,
    terrain: t,
    statics,
    warps: [{ x: 33, y: H - 1, w: 6, h: 1, to: 'world', tx: GATE_OUT.x, ty: GATE_OUT.y, facing: 'down' }],
    dark: 0,
    outdoor: true,
    music: 'day',
    spawn: { ...CAPITAL_ARRIVAL },
  };
}

export function buildThrone(): LocDef {
  const W = 18,
    H = 14;
  const t = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v: number = T.MARBLE;
      if (y <= 1 || x === 0 || x === W - 1 || y === H - 1) v = T.WALL;
      if (y === H - 1 && (x === 8 || x === 9)) v = T.MARBLE;
      t[y * W + x] = v;
    }
  const statics: WObj[] = [];
  let sid = 0;
  const add = (kind: string, x: number, y: number, data?: Record<string, any>) => statics.push({ id: 'tr' + sid++, kind, x, y, data });
  add('throne_seat', 8, 2, { text: 'throne' });
  for (const y of [5, 7, 9]) add('rug_static', 8, y);
  for (const y of [4, 7, 10]) {
    add('pillar', 3, y);
    add('pillar', 14, y);
  }
  add('city_banner', 5, 2);
  add('city_banner', 12, 2);
  add('wall_torch', 2, 2);
  add('wall_torch', 15, 2);
  add('shelf_static', 1, 11);
  add('pot_static', 15, 11);
  add('pot_static', 2, 6);
  add('pot_static', 15, 6);
  return {
    id: 'throne',
    name: 'Sala do Trono',
    w: W,
    h: H,
    terrain: t,
    statics,
    warps: [{ x: 8, y: H - 1, w: 2, h: 1, to: 'capital', tx: 36, ty: 9, facing: 'down' }],
    dark: 0,
    outdoor: false,
    music: 'home',
    spawn: { x: 8, y: 11 },
  };
}
