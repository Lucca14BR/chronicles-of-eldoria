/** Skills/XP, derived stats, quests, daily requests, village projects. */
import { G, bus, S, SkillId, SKILL_LABEL, skillLevel, addStat } from '../core/state';
import { ITEMS, item } from '../data/items';
import { QUEST_BY_ID, QuestDef, Objective, DAILY, PROJECTS, ProjectDef } from '../data/quests';
import { addItem, count, removeItem, consumeMats, hasMats } from './inventory';
import { RNG } from '../core/rng';
import { NPC_BY_ID } from '../data/npcs';
import { audio } from './audio';

// ------------------------------------------------------------ skills & stats
export function lvl(s: SkillId) {
  return skillLevel(S().skills[s] || 0);
}

export function addXP(s: SkillId, n: number) {
  const st = S();
  const before = lvl(s);
  st.skills[s] = (st.skills[s] || 0) + n;
  const after = lvl(s);
  if (after > before) {
    audio.play('levelup');
    bus.emit('toast', `${SKILL_LABEL[s]} subiu para o nível ${after}!`, 'level');
    st.player.hp = Math.min(maxHp(), st.player.hp + 10);
    st.player.st = Math.min(maxSt(), st.player.st + 10);
  }
  bus.emit('xp');
}

function equipSum(k: 'def' | 'atk' | 'spd' | 'luck' | 'hp') {
  let v = 0;
  for (const id of Object.values(S().equip)) if (id) v += ITEMS[id].equip?.[k] || 0;
  return v;
}

export const maxHp = () => 100 + lvl('combat') * 5 + equipSum('hp');
export const maxSt = () => 100 + (lvl('farming') + lvl('foraging') + lvl('mining') + lvl('fishing')) * 3;
export const defense = () => equipSum('def');
export const speedMul = () => 1 + equipSum('spd');
export const luck = () => equipSum('luck') + S().luckBuff;
export const attackBonus = () => equipSum('atk') + lvl('combat');
export function totalLevel() {
  return (['farming', 'foraging', 'mining', 'combat', 'fishing'] as SkillId[]).reduce((a, s) => a + lvl(s), 0);
}

export function spendStamina(n: number): boolean {
  const p = S().player;
  if (p.st < n) {
    bus.emit('toast', 'Você está exausto demais. Coma algo ou vá dormir.', 'warn');
    audio.play('error');
    return false;
  }
  p.st = Math.max(0, p.st - n);
  bus.emit('vitals');
  return true;
}

export function addGold(n: number) {
  S().player.gold += n;
  if (n > 0) addStat('goldEarned', n);
  bus.emit('gold');
}

// ------------------------------------------------------------ quests
export function activeQuest(): QuestDef | null {
  const q = S().quest;
  return q ? QUEST_BY_ID[q.id] || null : null;
}

export function startQuest(id: string) {
  const def = QUEST_BY_ID[id];
  if (!def) return;
  const base: Record<string, number> = {};
  for (const o of def.objectives) if (o.type === 'stat' && !o.max) base[o.stat] = S().stats[o.stat] || 0;
  S().quest = { id, base };
  bus.emit('toast', `Nova missão: ${def.title}`, 'quest');
  bus.emit('quest');
}

export function objProgress(o: Objective): [number, number] {
  const st = S();
  switch (o.type) {
    case 'talk':
      return [st.flags['talked_' + o.npc + '_' + st.quest?.id] ? 1 : 0, 1];
    case 'stat': {
      const v = st.stats[o.stat] || 0;
      const b = o.max ? 0 : st.quest?.base[o.stat] || 0;
      return [Math.min(o.n, v - b), o.n];
    }
    case 'have':
      return [Math.min(o.n, count(o.item)), o.n];
    case 'deliver':
      return [Math.min(o.n, count(o.item)), o.n];
    case 'flag':
      return [st.flags[o.flag] ? 1 : 0, 1];
  }
}

function autoDone(def: QuestDef) {
  return def.objectives.every((o) => {
    if (o.type === 'deliver' || o.type === 'talk') return false;
    const [a, b] = objProgress(o);
    return a >= b;
  });
}

export function giveReward(r: QuestDef['reward']) {
  if (r.gold) addGold(r.gold);
  if (r.items) for (const m of r.items) addItem(m.id, m.qty);
  if (r.xp) addXP(r.xp[0], r.xp[1]);
  if (r.pts) addFriendship(r.pts[0], r.pts[1]);
  if (r.flag) S().flags[r.flag] = true;
}

export function completeQuest() {
  const def = activeQuest();
  if (!def) return;
  const st = S();
  st.questsDone.push(def.id);
  st.quest = null;
  giveReward(def.reward);
  audio.play('quest');
  bus.emit('questDone', def);
  bus.emit('toast', `Missão concluída: ${def.title}`, 'quest');
  if (def.next) setTimeout(() => startQuest(def.next!), 1800);
  bus.emit('quest');
}

let checking = false;
export function checkQuests() {
  if (checking || !G.state) return;
  const def = activeQuest();
  if (!def) return;
  checking = true;
  if (autoDone(def)) completeQuest();
  checking = false;
}

/** Called when talking to an NPC. Returns a message if a quest advanced. */
export function questTalk(npc: string): string | null {
  const def = activeQuest();
  if (!def) return null;
  const st = S();
  for (const o of def.objectives) {
    if (o.type === 'talk' && o.npc === npc) {
      const others = def.objectives.filter((x) => x !== o && x.type !== 'talk');
      const ready = others.every((x) => {
        if (x.type === 'deliver') return false;
        const [a, b] = objProgress(x);
        return a >= b;
      });
      if (!ready) return null;
      for (const x of others) if (x.type === 'have' && x.consume) removeItem(x.item, x.n);
      st.flags['talked_' + npc + '_' + def.id] = true;
      completeQuest();
      return def.done;
    }
  }
  return null;
}

export function canDeliver(npc: string): Objective | null {
  const def = activeQuest();
  if (!def) return null;
  for (const o of def.objectives) if (o.type === 'deliver' && o.npc === npc && count(o.item) >= o.n) return o;
  return null;
}

export function deliver(npc: string): string | null {
  const o = canDeliver(npc);
  const def = activeQuest();
  if (!o || !def || o.type !== 'deliver') return null;
  removeItem(o.item, o.n);
  completeQuest();
  return def.done;
}

// ------------------------------------------------------------ friendship
export const PTS_PER_HEART = 250;
export function hearts(npc: string) {
  return Math.min(10, Math.floor((S().npcs[npc]?.pts || 0) / PTS_PER_HEART));
}
export function addFriendship(npc: string, n: number) {
  const r = S().npcs[npc];
  if (!r) return;
  const before = hearts(npc);
  r.pts = Math.max(0, Math.min(PTS_PER_HEART * 10, r.pts + n));
  if (hearts(npc) > before) bus.emit('toast', `Sua amizade com ${NPC_BY_ID[npc].name} cresceu! (${hearts(npc)} ♥)`, 'heart');
  bus.emit('friend');
}

// ------------------------------------------------------------ daily requests
export function rollDaily() {
  const st = S();
  if (st.daily && st.daily.accepted && !st.daily.done) return; // keep accepted request
  const rng = new RNG(st.seed + st.time.total * 101);
  const pool = DAILY.filter((d) => (!d.needs || st.flags[d.needs]) && (!d.seasons || d.seasons.includes(st.time.season)));
  const d = rng.pick(pool);
  st.daily = { id: d.npc + '_' + d.item, npc: d.npc, item: d.item, qty: d.qty, reward: d.reward, accepted: false, done: false };
}

export function dailyText(): string {
  const st = S();
  const d = st.daily;
  if (!d) return '';
  const t = DAILY.find((x) => x.npc === d.npc && x.item === d.item);
  return t ? t.text : '';
}

export function canDeliverDaily(npc: string) {
  const d = S().daily;
  return !!d && d.accepted && !d.done && d.npc === npc && count(d.item) >= d.qty;
}

export function deliverDaily(): string {
  const d = S().daily!;
  removeItem(d.item, d.qty);
  d.done = true;
  addGold(d.reward);
  addFriendship(d.npc, 120);
  addStat('dailies');
  audio.play('coin');
  bus.emit('quest');
  return `Muito obrigado! Aqui estão ${d.reward} moedas pela ajuda. (+${d.qty} ${item(d.item).name} entregues)`;
}

// ------------------------------------------------------------ projects
export function projectById(id: string): ProjectDef {
  return PROJECTS.find((p) => p.id === id)!;
}

export function canFund(p: ProjectDef) {
  return S().player.gold >= p.gold && hasMats(p.mats);
}

export function fundProject(id: string): boolean {
  const p = projectById(id);
  const st = S();
  if (st.projects[id] || !canFund(p)) return false;
  consumeMats(p.mats);
  st.player.gold -= p.gold;
  st.projects[id] = true;
  if (id === 'bridge') st.flags.bridge_built = true;
  addFriendship('tomas', 80);
  addStat('projects');
  bus.emit('gold');
  bus.emit('project', id);
  audio.play('build');
  checkQuests();
  return true;
}

/** Picks the story back up if a save has no active quest but an unfinished chain. */
export function resumeQuests() {
  const st = S();
  if (st.quest) return;
  for (const id of st.questsDone) {
    const n = QUEST_BY_ID[id]?.next;
    if (n && !st.questsDone.includes(n)) {
      startQuest(n);
      return;
    }
  }
}
