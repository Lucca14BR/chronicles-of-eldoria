/** Serializable game state + shared runtime singletons. */
import Phaser from 'phaser';

export const TILE = 16;
export const SAVE_VERSION = 1;
export const INV_SIZE = 36;
export const HOTBAR = 10;

export type SkillId = 'farming' | 'foraging' | 'mining' | 'combat' | 'fishing';
export const SKILL_LABEL: Record<SkillId, string> = {
  farming: 'Agricultura',
  foraging: 'Coleta',
  mining: 'Mineração',
  combat: 'Combate',
  fishing: 'Pesca',
};
export const SKILL_XP = [0, 100, 380, 770, 1300, 2150, 3300, 4800, 6900, 10000, 15000];

export type Facing = 'down' | 'up' | 'left' | 'right';
export type Weather = 'sun' | 'rain' | 'storm' | 'snow';

export interface Look {
  skin: string;
  hair: string;
  hairStyle: number; // 0..3
  shirt: string;
  pants: string;
}

export interface ItemStack {
  id: string;
  qty: number;
}

export interface WObj {
  id: string;
  kind: string;
  x: number;
  y: number;
  hp?: number;
  data?: Record<string, any>;
}

export interface CropState {
  crop: string;
  growth: number;
  ready: boolean;
  dead?: boolean;
  regrowing?: boolean;
}

export interface SoilState {
  w: boolean; // watered
  fert?: boolean;
}

export interface LocationState {
  objects: Record<string, WObj>;
  soil: Record<string, SoilState>;
  crops: Record<string, CropState>;
  floors: Record<string, number>; // placed floor terrain
}

export interface QuestProgressState {
  id: string;
  base: Record<string, number>; // stat baselines at start
}

export interface AnimalState {
  id: string;
  kind: string; // chicken | cow | goat | sheep
  name: string;
  home: string; // building object id
  pts: number; // friendship 0..1000
  petted: boolean;
  product: string | null; // item ready to collect (milk/wool)
  days: number; // fed days (production counter)
  age: number;
  v: number; // colour variant
}

export interface DailyQuest {
  id: string;
  npc: string;
  item: string;
  qty: number;
  reward: number;
  accepted: boolean;
  done: boolean;
}

export interface GameState {
  version: number;
  slot: number;
  seed: number;
  savedAt: number;
  player: {
    name: string;
    look: Look;
    loc: string;
    x: number;
    y: number;
    facing: Facing;
    hp: number;
    st: number;
    gold: number;
    water: number;
  };
  skills: Record<SkillId, number>; // xp
  inv: (ItemStack | null)[];
  sel: number;
  equip: Record<'head' | 'body' | 'feet' | 'acc', string | null>;
  time: { day: number; season: number; year: number; min: number; total: number };
  weather: Weather;
  tomorrow: Weather;
  luckBuff: number;
  locs: Record<string, LocationState>;
  npcs: Record<string, { pts: number; talked: boolean; gifted: boolean; met: boolean }>;
  quest: QuestProgressState | null; // active main quest
  questsDone: string[];
  daily: DailyQuest | null;
  projects: Record<string, boolean>;
  stats: Record<string, number>;
  flags: Record<string, any>;
  chests: Record<string, (ItemStack | null)[]>;
  mailbox: string[];
  animals: AnimalState[];
}

export const bus = new Phaser.Events.EventEmitter();

/** Global holder for the running game. */
export const G: { state: GameState } = { state: null as unknown as GameState };

export function S(): GameState {
  return G.state;
}

export function emptyLoc(): LocationState {
  return { objects: {}, soil: {}, crops: {}, floors: {} };
}

export function key(x: number, y: number) {
  return x + ',' + y;
}

export function unkey(k: string): [number, number] {
  const i = k.indexOf(',');
  return [parseInt(k.slice(0, i), 10), parseInt(k.slice(i + 1), 10)];
}

export function skillLevel(xp: number): number {
  let l = 0;
  for (let i = 1; i < SKILL_XP.length; i++) if (xp >= SKILL_XP[i]) l = i;
  return l;
}

export function addStat(name: string, n = 1) {
  const s = G.state.stats;
  s[name] = (s[name] || 0) + n;
  bus.emit('stats');
}

export function maxStat(name: string, v: number) {
  const s = G.state.stats;
  if ((s[name] || 0) < v) {
    s[name] = v;
    bus.emit('stats');
  }
}

let uid = 0;
export function newId(prefix = 'o') {
  uid++;
  return prefix + Date.now().toString(36) + uid.toString(36) + Math.floor(Math.random() * 1e4).toString(36);
}
