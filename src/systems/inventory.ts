import { G, bus, ItemStack, INV_SIZE } from '../core/state';
import { ITEMS, item } from '../data/items';
import type { Mat } from '../data/recipes';

export function matches(id: string, group: string) {
  if (group === 'any_fish') return ITEMS[id]?.cat === 'fish';
  if (group === 'any_egg') return id === 'egg' || id === 'egg_large';
  if (group === 'any_milk') return id === 'milk' || id === 'milk_large' || id === 'goat_milk';
  return id === group;
}

export function matName(group: string) {
  if (group === 'any_fish') return 'Qualquer Peixe';
  if (group === 'any_egg') return 'Ovo';
  if (group === 'any_milk') return 'Leite';
  return item(group).name;
}

/** Adds items to a container. Returns how many didn't fit. */
export function addTo(inv: (ItemStack | null)[], id: string, qty: number): number {
  const max = item(id).stack;
  for (let i = 0; i < inv.length && qty > 0; i++) {
    const s = inv[i];
    if (s && s.id === id && s.qty < max) {
      const n = Math.min(max - s.qty, qty);
      s.qty += n;
      qty -= n;
    }
  }
  for (let i = 0; i < inv.length && qty > 0; i++) {
    if (!inv[i]) {
      const n = Math.min(max, qty);
      inv[i] = { id, qty: n };
      qty -= n;
    }
  }
  return qty;
}

export function addItem(id: string, qty = 1): number {
  const left = addTo(G.state.inv, id, qty);
  if (left < qty) bus.emit('inv');
  if (left < qty) bus.emit('pickup', id, qty - left);
  if (left > 0) bus.emit('toast', 'Inventário cheio!', 'warn');
  return left;
}

export function count(id: string, inv = G.state.inv): number {
  let n = 0;
  for (const s of inv) if (s && matches(s.id, id)) n += s.qty;
  return n;
}

export function removeItem(id: string, qty = 1, inv = G.state.inv): boolean {
  if (count(id, inv) < qty) return false;
  for (let i = inv.length - 1; i >= 0 && qty > 0; i--) {
    const s = inv[i];
    if (s && matches(s.id, id)) {
      const n = Math.min(s.qty, qty);
      s.qty -= n;
      qty -= n;
      if (s.qty <= 0) inv[i] = null;
    }
  }
  bus.emit('inv');
  return true;
}

export function hasMats(mats: Mat[]): boolean {
  return mats.every((m) => count(m.id) >= m.qty);
}

export function consumeMats(mats: Mat[]) {
  for (const m of mats) removeItem(m.id, m.qty);
}

export function selected(): ItemStack | null {
  return G.state.inv[G.state.sel] || null;
}

export function consumeSelected(n = 1) {
  const s = selected();
  if (!s) return;
  s.qty -= n;
  if (s.qty <= 0) G.state.inv[G.state.sel] = null;
  bus.emit('inv');
}

export function hasRoom(id: string, qty: number): boolean {
  const copy = G.state.inv.map((s) => (s ? { ...s } : null));
  return addTo(copy, id, qty) === 0;
}

/** Best tool of a type in the inventory (by tier). */
export function bestTool(type: string): string | null {
  let best: string | null = null;
  let tier = -1;
  for (const s of G.state.inv) {
    if (!s) continue;
    const t = ITEMS[s.id].tool;
    if (t && t.type === type && t.tier > tier) {
      tier = t.tier;
      best = s.id;
    }
  }
  return best;
}

export function replaceItem(fromId: string, toId: string): boolean {
  const inv = G.state.inv;
  for (let i = 0; i < inv.length; i++) {
    if (inv[i]?.id === fromId) {
      inv[i] = { id: toId, qty: 1 };
      bus.emit('inv');
      return true;
    }
  }
  return false;
}

export function emptyInv(): (ItemStack | null)[] {
  return new Array(INV_SIZE).fill(null);
}
