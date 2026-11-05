import { ICON_URLS } from '../art/pixel';
import { ITEMS, CAT_LABEL } from '../data/items';
import type { ItemStack } from '../core/state';
import { audio } from '../systems/audio';

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export function iconImg(id: string, cls = 'ico'): HTMLImageElement {
  const i = el('img', cls);
  i.src = ICON_URLS[id] || '';
  i.draggable = false;
  i.alt = ITEMS[id]?.name || id;
  return i;
}

export function button(label: string, fn: () => void, cls = 'btn'): HTMLButtonElement {
  const b = el('button', cls, label);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (b.disabled) return;
    audio.play('click');
    fn();
  });
  b.addEventListener('mouseenter', () => !b.disabled && audio.play('hover'));
  return b;
}

/** Shared floating tooltip. */
let tip: HTMLDivElement | null = null;
export function showTip(html: string, x: number, y: number) {
  if (!tip) {
    tip = el('div', 'tooltip panel-parch');
    document.getElementById('ui')!.appendChild(tip);
  }
  tip.innerHTML = html;
  tip.style.display = 'block';
  const r = tip.getBoundingClientRect();
  let tx = x + 16,
    ty = y + 16;
  if (tx + r.width > window.innerWidth - 8) tx = x - r.width - 12;
  if (ty + r.height > window.innerHeight - 8) ty = y - r.height - 12;
  tip.style.left = tx + 'px';
  tip.style.top = ty + 'px';
}
export function hideTip() {
  if (tip) tip.style.display = 'none';
}

export function itemTipHtml(s: ItemStack, extra = ''): string {
  const d = ITEMS[s.id];
  let stats = '';
  if (d.food && (d.food.st || d.food.hp)) stats += `<div class="tip-stat">${d.food.st ? `<span class="st">+${d.food.st} Energia</span>` : ''} ${d.food.hp ? `<span class="hp">+${d.food.hp} Vida</span>` : ''}</div>`;
  if (d.tool?.type === 'sword') stats += `<div class="tip-stat">Dano: ${d.tool.power}</div>`;
  const price = d.price > 0 ? `<div class="tip-price"><span class="coin"></span>${d.price}</div>` : '';
  return `<div class="tip-name">${esc(d.name)}</div><div class="tip-cat">${CAT_LABEL[d.cat]}</div><div class="tip-desc">${esc(d.desc)}</div>${stats}${price}${extra}`;
}

export function attachTip(e: HTMLElement, html: () => string | null) {
  e.addEventListener('mousemove', (ev) => {
    const h = html();
    if (h) showTip(h, ev.clientX, ev.clientY);
    else hideTip();
  });
  e.addEventListener('mouseleave', hideTip);
}

export function slotEl(s: ItemStack | null, cls = 'slot'): HTMLDivElement {
  const d = el('div', cls);
  if (s) {
    d.appendChild(iconImg(s.id));
    if (s.qty > 1) d.appendChild(el('span', 'qty', String(s.qty)));
  }
  return d;
}

export function fmtGold(n: number) {
  return n.toLocaleString('pt-BR');
}
