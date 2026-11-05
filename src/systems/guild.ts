/** Merchants' Guild of Valoria: daily contracts (deliveries and monster hunts). */
import { S, bus, addStat } from '../core/state';
import { RNG } from '../core/rng';
import { count, removeItem } from './inventory';
import { addGold, addFriendship, checkQuests } from './progress';
import { item } from '../data/items';
import { audio } from './audio';

export interface Contract {
  id: string;
  kind: 'deliver' | 'hunt';
  item?: string;
  stat?: string;
  what?: string;
  qty: number;
  reward: number;
  accepted: boolean;
  base: number;
  done: boolean;
}

export interface GuildState {
  day: number;
  list: Contract[];
}

const DELIVER: [string, number, number, number[]?][] = [
  ['iron_bar', 3, 650],
  ['gold_bar', 1, 750],
  ['cheese', 2, 700],
  ['cloth', 1, 800],
  ['fish_salmon', 2, 550],
  ['crystal', 2, 500],
  ['bread', 3, 520],
  ['potion_hp', 2, 500],
  ['wool', 2, 850],
  ['egg', 6, 450],
  ['milk', 3, 500],
  ['copper_bar', 5, 450],
  ['wood', 80, 400],
  ['stone', 80, 400],
  ['grape', 5, 700, [1, 2]],
  ['pumpkin', 2, 900, [2]],
  ['melon', 2, 750, [1]],
  ['turnip', 10, 450, [0]],
  ['corn', 6, 450, [1, 2]],
  ['cabbage', 3, 650, [3]],
];

const HUNT: [string, number, string, number][] = [
  ['kill', 12, 'monstros', 700],
  ['kill:skeleton', 4, 'esqueletos', 900],
  ['kill:slime_purple', 5, 'slimes arcanos', 900],
  ['kill:bat', 6, 'morcegos', 650],
  ['kill:slime_green', 8, 'slimes verdes', 500],
];

export const RANKS: [number, string][] = [
  [0, 'Aprendiz'],
  [5, 'Mercador'],
  [15, 'Mercador-Chefe'],
  [30, 'Mestre da Guilda'],
];

export function guildRank(): string {
  const n = S().stats.guild_contract || 0;
  let r = RANKS[0][1];
  for (const [min, name] of RANKS) if (n >= min) r = name;
  return r;
}

export function guild(): GuildState {
  const st = S();
  let g = (st as any).guild as GuildState | undefined;
  if (!g || g.day !== st.time.total) {
    const rng = new RNG(st.seed + st.time.total * 313);
    const keep = g ? g.list.filter((c) => c.kind === 'hunt' && c.accepted && !c.done) : [];
    const pool = DELIVER.filter((d) => !d[3] || d[3].includes(st.time.season));
    const list: Contract[] = [...keep];
    const used = new Set<string>();
    while (list.filter((c) => c.kind === 'deliver').length < 2) {
      const d = rng.pick(pool);
      if (used.has(d[0])) continue;
      used.add(d[0]);
      list.push({ id: 'd' + d[0], kind: 'deliver', item: d[0], qty: d[1], reward: d[2], accepted: true, base: 0, done: false });
    }
    if (!keep.length) {
      const h = rng.pick(HUNT);
      list.push({ id: 'h' + h[0], kind: 'hunt', stat: h[0], what: h[2], qty: h[1], reward: h[3], accepted: false, base: 0, done: false });
    }
    g = { day: st.time.total, list };
    (st as any).guild = g;
  }
  return g;
}

export function contractText(c: Contract): string {
  if (c.kind === 'deliver') return `Entregue ${c.qty}× ${item(c.item!).name}`;
  return `Derrote ${c.qty} ${c.what} na Mina Sussurrante ou na floresta`;
}

export function contractProgress(c: Contract): [number, number] {
  if (c.kind === 'deliver') return [Math.min(c.qty, count(c.item!)), c.qty];
  if (!c.accepted) return [0, c.qty];
  return [Math.min(c.qty, (S().stats[c.stat!] || 0) - c.base), c.qty];
}

export function acceptContract(c: Contract) {
  c.accepted = true;
  c.base = S().stats[c.stat!] || 0;
  audio.play('quest');
}

export function completeContract(c: Contract): boolean {
  const [a, b] = contractProgress(c);
  if (c.done || a < b || !c.accepted) return false;
  if (c.kind === 'deliver') removeItem(c.item!, c.qty);
  c.done = true;
  addGold(c.reward);
  addFriendship('corvin', 40);
  addStat('guild_contract');
  audio.play('coin');
  bus.emit('toast', `Contrato concluído! +${c.reward} moedas`, 'quest');
  checkQuests();
  return true;
}
