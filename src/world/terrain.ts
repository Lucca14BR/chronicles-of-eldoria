/** Logical terrain types and tileset index mapping (auto-tiling). */

export const T = {
  GRASS: 0,
  DIRT: 1,
  STONE: 2,
  WATER: 3,
  SAND: 4,
  ROCK: 5,
  MGROUND: 6,
  WOOD: 7,
  WALL: 8,
  CAVE: 9,
  CAVEWALL: 10,
  BRIDGE_H: 11,
  BRIDGE_V: 12,
  FGRASS: 13,
  RUIN: 14,
  VOID: 15,
  DEEP: 16,
  FLOWERS: 17,
  MARBLE: 18,
} as const;

export const SOLID_TERRAIN = new Set<number>([T.WATER, T.ROCK, T.WALL, T.CAVEWALL, T.VOID, T.DEEP]);
export const WATER_TERRAIN = new Set<number>([T.WATER, T.DEEP]);

/** Tileset layout (index of first tile of each group). */
export const TS = {
  grass: 0, // 4 variants
  flowers: 4, // 2
  fgrass: 6, // 4
  dirt: 10, // 16 masks
  stone: 26, // 16 masks
  water: 42, // 16 masks
  sand: 58, // 2
  tilled: 60,
  tilledWet: 61,
  rock: 62,
  rockFace: 63,
  mground: 64, // 2
  wood: 66,
  wallTop: 67,
  wallFace: 68,
  cave: 69, // 3
  caveWall: 72,
  caveWallFace: 73,
  bridgeH: 74,
  bridgeV: 75,
  ruin: 76, // 2
  void: 78,
  tilledFert: 79,
  deep: 80,
  tilledWetFert: 81,
  marble: 82, // 2
  COUNT: 84,
};

export const N = 1,
  E = 2,
  S_ = 4,
  W = 8;

const PATHLIKE = new Set<number>([T.DIRT, T.STONE, T.BRIDGE_H, T.BRIDGE_V]);

/**
 * Computes the tileset index for terrain at (x,y).
 * getT returns terrain at coordinates (or -1 out of bounds).
 */
export function tileIndexFor(t: number, x: number, y: number, getT: (x: number, y: number) => number, h: (x: number, y: number) => number): number {
  const mask = (pred: (n: number) => boolean) => {
    let m = 0;
    const n = getT(x, y - 1),
      e = getT(x + 1, y),
      s = getT(x, y + 1),
      w = getT(x - 1, y);
    if (n >= 0 && pred(n)) m |= N;
    if (e >= 0 && pred(e)) m |= E;
    if (s >= 0 && pred(s)) m |= S_;
    if (w >= 0 && pred(w)) m |= W;
    return m;
  };
  const r = h(x, y);
  switch (t) {
    case T.GRASS:
      return TS.grass + Math.floor(r * 4);
    case T.FLOWERS:
      return TS.flowers + (r < 0.5 ? 0 : 1);
    case T.FGRASS:
      return TS.fgrass + Math.floor(r * 4);
    case T.DIRT:
      return TS.dirt + mask((n) => !PATHLIKE.has(n) && n !== T.SAND && n !== T.WATER && n !== T.MGROUND && n !== T.ROCK && n !== T.RUIN);
    case T.STONE:
      return TS.stone + mask((n) => n !== T.STONE && n !== T.BRIDGE_H && n !== T.BRIDGE_V && n !== T.MARBLE);
    case T.MARBLE:
      return TS.marble + ((x + y) % 2);
    case T.WATER:
      return TS.water + mask((n) => n !== T.WATER && n !== T.DEEP && n !== T.BRIDGE_H && n !== T.BRIDGE_V);
    case T.DEEP:
      return TS.deep;
    case T.SAND:
      return TS.sand + (r < 0.5 ? 0 : 1);
    case T.ROCK: {
      const s = getT(x, y + 1);
      return s >= 0 && s !== T.ROCK ? TS.rockFace : TS.rock;
    }
    case T.MGROUND:
      return TS.mground + (r < 0.5 ? 0 : 1);
    case T.WOOD:
      return TS.wood;
    case T.WALL: {
      const s = getT(x, y + 1);
      return s >= 0 && s !== T.WALL ? TS.wallFace : TS.wallTop;
    }
    case T.CAVE:
      return TS.cave + Math.floor(r * 3);
    case T.CAVEWALL: {
      const s = getT(x, y + 1);
      return s >= 0 && s !== T.CAVEWALL && s !== T.VOID ? TS.caveWallFace : TS.caveWall;
    }
    case T.BRIDGE_H:
      return TS.bridgeH;
    case T.BRIDGE_V:
      return TS.bridgeV;
    case T.RUIN:
      return TS.ruin + (r < 0.5 ? 0 : 1);
    case T.VOID:
      return TS.void;
  }
  return TS.grass;
}

/** Colour used to draw terrain on the map screen. */
export const MAP_COLORS: Record<number, string> = {
  [T.GRASS]: '#6aa84f',
  [T.FLOWERS]: '#7db35a',
  [T.FGRASS]: '#3f7a35',
  [T.DIRT]: '#b9925e',
  [T.STONE]: '#a8a196',
  [T.WATER]: '#4b8fcc',
  [T.DEEP]: '#346fae',
  [T.SAND]: '#e0cb8f',
  [T.ROCK]: '#7a746c',
  [T.MGROUND]: '#a0968a',
  [T.WOOD]: '#a0703f',
  [T.WALL]: '#4a3122',
  [T.CAVE]: '#4a3b32',
  [T.CAVEWALL]: '#2a2026',
  [T.BRIDGE_H]: '#8a5c33',
  [T.BRIDGE_V]: '#8a5c33',
  [T.RUIN]: '#8d8a7a',
  [T.VOID]: '#0a0608',
  [T.MARBLE]: '#e0dcd0',
};
