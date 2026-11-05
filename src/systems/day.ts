/** Overnight simulation: calendar, weather, crop growth, regrowth, respawns. */
import { S, Weather, unkey, key, WObj, newId } from '../core/state';
import { RNG } from '../core/rng';
import { DAYS_PER_SEASON, DAY_START } from '../core/time';
import { CROPS } from '../data/crops';
import { OBJ } from '../data/objects';
import { buildWorld, freeCellsFor, zoneAt } from '../world/worldgen';
import { maxHp, maxSt, rollDaily } from './progress';
import { ANIMALS } from '../data/animals';
import { SOLID_TERRAIN } from '../world/terrain';

export const WEATHER_LABEL: Record<Weather, string> = { sun: 'Ensolarado', rain: 'Chuva', storm: 'Tempestade', snow: 'Neve' };

export function rollWeather(season: number, rng: RNG): Weather {
  const r = rng.next();
  if (season === 3) return r < 0.4 ? 'snow' : 'sun';
  if (season === 1) return r < 0.08 ? 'storm' : r < 0.2 ? 'rain' : 'sun';
  if (season === 2) return r < 0.3 ? 'rain' : 'sun';
  return r < 0.25 ? 'rain' : 'sun';
}

export interface DayReport {
  passedOut: boolean;
  lostGold: number;
  seasonChanged: boolean;
}

export function advanceDay(passedOut: boolean): DayReport {
  const st = S();
  const rng = new RNG(st.seed + st.time.total * 7717);
  const t = st.time;
  const report: DayReport = { passedOut, lostGold: 0, seasonChanged: false };
  const prevWeather = st.weather;
  const prevSeason = t.season;
  t.day++;
  t.total++;
  if (t.day > DAYS_PER_SEASON) {
    t.day = 1;
    t.season++;
    report.seasonChanged = true;
    if (t.season > 3) {
      t.season = 0;
      t.year++;
    }
  }
  t.min = DAY_START;
  st.weather = st.tomorrow;
  if (t.day === 1 && t.season === 0) st.weather = 'sun';
  st.tomorrow = rollWeather(t.day === DAYS_PER_SEASON ? (t.season + 1) % 4 : t.season, rng);
  const wet = st.weather === 'rain' || st.weather === 'storm';

  for (const [locId, loc] of Object.entries(st.locs)) {
    if (locId === 'cave') continue;
    // crops grow if they were watered yesterday
    for (const [k, c] of Object.entries(loc.crops)) {
      const def = CROPS[c.crop];
      const soil = loc.soil[k];
      if (!def) {
        delete loc.crops[k];
        continue;
      }
      if (c.dead) continue;
      if (!def.seasons.includes(t.season) && locId === 'world') {
        c.dead = true;
        continue;
      }
      if (soil?.w && !c.ready) {
        c.growth++;
        if (c.growth >= def.days) c.ready = true;
      }
    }
    // soil dries, rain waters outdoor soil, empty soil may revert
    for (const [k, s] of Object.entries(loc.soil)) {
      s.w = false;
      if (!loc.crops[k] && rng.chance(0.12) && !s.fert) delete loc.soil[k];
    }
    if (wet && locId === 'world') for (const s of Object.values(loc.soil)) s.w = true;
    // objects: sprinklers, saplings, berry bushes
    for (const o of Object.values(loc.objects)) {
      if (o.kind === 'sprinkler' || o.kind === 'sprinkler2') {
        const r = o.kind === 'sprinkler2' ? 1 : 0;
        const cells = r ? [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => [dx, dy])) : [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dx, dy] of cells) {
          const s = loc.soil[key(o.x + dx, o.y + dy)];
          if (s) s.w = true;
        }
      } else if (o.kind === 'sapling_p') {
        o.data = o.data || {};
        o.data.age = (o.data.age || 0) + 1;
        if (o.data.age >= 7 && t.season !== 3) {
          o.kind = rng.chance(0.5) ? 'tree_oak' : 'tree_pine';
          o.hp = OBJ[o.kind].hp;
          o.data = {};
        }
      } else if (o.kind === 'bush_berry') {
        o.data = o.data || {};
        if (!o.data.ripe) {
          o.data.days = (o.data.days || 0) + 1;
          if (o.data.days >= 3 && t.season < 3) {
            o.data.ripe = true;
            o.data.days = 0;
          }
        }
      }
    }
  }

  // world respawns
  const world = st.locs.world;
  const def = buildWorld(st.flags, st.projects);
  const objs = Object.values(world.objects);
  const countKind = (pred: (o: WObj) => boolean) => objs.filter(pred).length;
  const blocked = new Set<string>([...Object.keys(world.soil), ...Object.keys(world.floors)]);
  // animals: graze on sunny days, otherwise eat hay from their building's trough
  const grazed = prevWeather === 'sun' && prevSeason !== 3;
  const taken = new Set<string>();
  for (const o of Object.values(world.objects)) {
    const k = OBJ[o.kind];
    if (k) for (let y = o.y; y < o.y + k.h; y++) for (let x = o.x; x < o.x + k.w; x++) taken.add(x + ',' + y);
  }
  for (const a of st.animals) {
    const home = world.objects[a.home];
    const ad = ANIMALS[a.kind];
    if (!home || !ad) continue;
    home.data = home.data || {};
    let fed = grazed;
    if (!fed && (home.data.hay || 0) > 0) {
      home.data.hay--;
      fed = true;
    }
    a.pts = Math.max(0, Math.min(1000, a.pts + (a.petted ? 15 : -10) + (fed ? 0 : -30)));
    a.age++;
    a.petted = false;
    if (!fed) continue;
    a.days++;
    if (a.days % ad.every !== 0 || a.age < 1) continue;
    const prod = Math.random() < a.pts / 1400 ? ad.big : ad.product;
    if (ad.tool) {
      a.product = prod;
      continue;
    }
    const hk = OBJ[home.kind];
    let placed = false;
    for (let tries = 0; tries < 40 && !placed; tries++) {
      const x = home.x - 1 + rng.int(0, hk.w + 1);
      const y = home.y + hk.h + rng.int(0, 2);
      const kk = x + ',' + y;
      if (taken.has(kk) || blocked.has(kk) || SOLID_TERRAIN.has(def.terrain[y * def.w + x]) || x === home.x + Math.floor(hk.w / 2)) continue;
      const id = newId('egg');
      world.objects[id] = { id, kind: 'animal_egg', x, y, data: { item: prod } };
      taken.add(kk);
      placed = true;
    }
  }

  const spawn = (kind: string, zones: Parameters<typeof freeCellsFor>[2], n: number, data?: () => Record<string, any>) => {
    for (const [x, y] of freeCellsFor(def, Object.values(world.objects), zones, rng, n, blocked)) {
      const id = newId('r');
      world.objects[id] = { id, kind, x, y, hp: OBJ[kind].hp, data: data ? data() : undefined };
    }
  };
  if (countKind((o) => o.kind.startsWith('forage_')) < 70) {
    spawn('forage_herb', ['forest'], rng.int(2, 4));
    spawn('forage_mushroom', ['forest', 'ruins'], t.season === 2 ? rng.int(3, 5) : rng.int(1, 2));
    if (t.season < 3) spawn('forage_flower', ['village', 'lake', 'forest'], rng.int(1, 3));
  }
  if (countKind((o) => o.kind === 'weed' && zoneAt(o.x, o.y) === 'farm') < 140 && t.season !== 3) spawn('weed', ['farm'], rng.int(2, 5), () => ({ v: rng.int(0, 1) }));
  if (countKind((o) => zoneAt(o.x, o.y) === 'mountain' && OBJ[o.kind].tool === 'pick') < 80) {
    spawn('stone', ['mountain'], rng.int(3, 6), () => ({ v: rng.int(0, 2) }));
    spawn('ore_copper', ['mountain'], rng.int(1, 2));
    if (rng.chance(0.3)) spawn('ore_coal', ['mountain'], 1);
  }
  if (countKind((o) => o.kind.startsWith('tree_') && zoneAt(o.x, o.y) === 'forest') < 700) spawn('sapling_p', ['forest'], rng.int(2, 4), () => ({ age: 3 }));
  if (countKind((o) => o.kind === 'bush_berry') < 50) spawn('bush_berry', ['forest'], 1, () => ({ ripe: false }));

  // people
  for (const n of Object.values(st.npcs)) {
    n.talked = false;
    n.gifted = false;
  }
  rollDaily();
  st.luckBuff = 0;

  // player
  const p = st.player;
  if (passedOut) {
    report.lostGold = Math.min(1000, Math.floor(p.gold * 0.1));
    p.gold -= report.lostGold;
    p.st = Math.floor(maxSt() * 0.6);
    p.hp = Math.max(p.hp, Math.floor(maxHp() * 0.6));
  } else {
    p.st = maxSt();
    p.hp = maxHp();
  }
  p.loc = 'house';
  p.x = 3;
  p.y = 4;
  p.facing = 'down';
  void unkey;
  return report;
}
