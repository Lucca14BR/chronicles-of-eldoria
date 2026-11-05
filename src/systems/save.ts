/** localStorage save slots. */
import { G, GameState, Look, SAVE_VERSION, emptyLoc, bus } from '../core/state';
import { emptyInv } from './inventory';
import { NPCS } from '../data/npcs';
import { buildWorld, initialWorldObjects, sanitizeWorldObjects } from '../world/worldgen';
import { DAY_START } from '../core/time';

const PREFIX = 'eldoria_save_';
export const SLOTS = 3;

export interface SlotInfo {
  slot: number;
  name: string;
  day: number;
  season: number;
  year: number;
  gold: number;
  savedAt: number;
  look: Look;
}

export function newGame(slot: number, name: string, look: Look): GameState {
  const seed = Math.floor(Math.random() * 1e9);
  const inv = emptyInv();
  ['hoe', 'can', 'axe', 'pick', 'sword'].forEach((id, i) => (inv[i] = { id, qty: 1 }));
  inv[5] = { id: 'seed_wheat', qty: 5 };
  inv[6] = { id: 'bread', qty: 3 };
  const npcs: GameState['npcs'] = {};
  for (const n of NPCS) npcs[n.id] = { pts: 0, talked: false, gifted: false, met: false };
  const st: GameState = {
    version: SAVE_VERSION,
    slot,
    seed,
    savedAt: Date.now(),
    player: { name, look, loc: 'world', x: 22, y: 32, facing: 'down', hp: 100, st: 100, gold: 500, water: 30 },
    skills: { farming: 0, foraging: 0, mining: 0, combat: 0, fishing: 0 },
    inv,
    sel: 0,
    equip: { head: null, body: null, feet: null, acc: null },
    time: { day: 1, season: 0, year: 1, min: DAY_START, total: 1 },
    weather: 'sun',
    tomorrow: 'sun',
    luckBuff: 0,
    locs: { world: emptyLoc(), house: emptyLoc(), cave: emptyLoc() },
    npcs,
    quest: { id: 'q_arrival', base: {} },
    questsDone: [],
    daily: null,
    projects: {},
    stats: { floor: 0 },
    flags: {},
    chests: {},
    mailbox: [],
    animals: [],
  };
  G.state = st;
  const def = buildWorld(st.flags, st.projects);
  for (const o of initialWorldObjects(seed, def)) st.locs.world.objects[o.id] = o;
  return st;
}

export function saveGame(): boolean {
  const st = G.state;
  if (!st) return false;
  st.savedAt = Date.now();
  try {
    localStorage.setItem(PREFIX + st.slot, JSON.stringify(st));
    localStorage.setItem('eldoria_last_slot', String(st.slot));
    bus.emit('saved');
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export function loadGame(slot: number): GameState | null {
  try {
    const raw = localStorage.getItem(PREFIX + slot);
    if (!raw) return null;
    const st = JSON.parse(raw) as GameState;
    if (!st || st.version !== SAVE_VERSION) return null;
    st.slot = slot;
    // forward-compat defaults
    st.locs.cave = emptyLoc();
    for (const n of NPCS) if (!st.npcs[n.id]) st.npcs[n.id] = { pts: 0, talked: false, gifted: false, met: false };
    st.stats = st.stats || {};
    st.flags = st.flags || {};
    st.projects = st.projects || {};
    st.chests = st.chests || {};
    st.animals = st.animals || [];
    sanitizeWorldObjects(st.locs.world.objects, buildWorld(st.flags, st.projects));
    // the mines are re-generated on every visit
    if (st.player.loc === 'cave') {
      st.player.loc = 'world';
      st.player.x = 70;
      st.player.y = 6;
    }
    G.state = st;
    localStorage.setItem('eldoria_last_slot', String(slot));
    return st;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export function slotInfo(slot: number): SlotInfo | null {
  try {
    const raw = localStorage.getItem(PREFIX + slot);
    if (!raw) return null;
    const st = JSON.parse(raw) as GameState;
    return { slot, name: st.player.name, day: st.time.day, season: st.time.season, year: st.time.year, gold: st.player.gold, savedAt: st.savedAt, look: st.player.look };
  } catch {
    return null;
  }
}

export function deleteSlot(slot: number) {
  localStorage.removeItem(PREFIX + slot);
}

export function lastSlot(): number | null {
  const v = localStorage.getItem('eldoria_last_slot');
  if (v === null) return null;
  const n = parseInt(v, 10);
  return slotInfo(n) ? n : null;
}

// ---------------- settings
export interface Settings {
  music: number;
  sfx: number;
  ambient: number;
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('eldoria_settings');
    if (raw) return { music: 0.5, sfx: 0.7, ambient: 0.6, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { music: 0.5, sfx: 0.7, ambient: 0.6 };
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem('eldoria_settings', JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
