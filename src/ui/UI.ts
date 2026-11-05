/** DOM user interface (pt-BR): HUD, book menu, dialogue, shops, chests, board, pause. */
import { G, S, bus, ItemStack, SKILL_LABEL, SkillId, SKILL_XP, skillLevel, addStat, HOTBAR } from '../core/state';
import { ITEMS, item, EquipSlot } from '../data/items';
import { el, esc, iconImg, button, attachTip, itemTipHtml, hideTip, slotEl, fmtGold } from './dom';
import { PCanvas } from '../art/pixel';
import { previewCanvas, portraitCanvas, CharSpec } from '../art/characters';
import { fmtClock, fmtDate, SEASONS } from '../core/time';
import { maxHp, maxSt, defense, attackBonus, speedMul, luck, lvl, totalLevel, activeQuest, objProgress, hearts, dailyText, PTS_PER_HEART, projectById, canFund, fundProject, addGold } from '../systems/progress';
import { addTo, count, hasMats, consumeMats, hasRoom, addItem, matName, removeItem, replaceItem } from '../systems/inventory';
import { RECIPES, RECIPE_CATS, Recipe, Station, STATION_LABEL, SHOPS, BUILDINGS, ShopEntry } from '../data/recipes';
import { QUESTS, PROJECTS } from '../data/quests';
import { NPCS, NPC_BY_ID, NPCDef } from '../data/npcs';
import { audio } from '../systems/audio';
import { saveGame, saveSettings } from '../systems/save';
import { WEATHER_LABEL } from '../systems/day';
import type { LocDef } from '../world/worldgen';
import { MAP_COLORS } from '../world/terrain';
import { ZONE_NAME } from '../world/worldgen';
import { OBJ } from '../data/objects';
import { ANIMALS, HOUSE_LABEL, HEART_PTS } from '../data/animals';
import { guild, guildRank, contractText, contractProgress, acceptContract, completeContract } from '../systems/guild';
import { newId } from '../core/state';
import type { WObj, AnimalState } from '../core/state';

const GROUP_ICON: Record<string, string> = { any_fish: 'fish_carp', any_egg: 'egg', any_milk: 'milk' };

export interface GameCtx {
  nearStations(): Set<Station>;
  startBuild(kind: string): void;
  quitToMenu(): void;
  mapInfo(): { def: LocDef; px: number; py: number; here: string; npcs: { x: number; y: number; name: string }[]; title?: string; scale?: number; labels?: [string, number, number][] };
  sleep(): void;
  enterCave(floor: number): void;
  texSource(key: string): CanvasImageSource | null;
  locId(): string;
  dropItem(id: string, qty: number): void;
}

type Tab = 'inv' | 'char' | 'craft' | 'journal' | 'map' | 'build';
const TABS: [Tab, string, string][] = [
  ['inv', 'Inventário', 'I'],
  ['char', 'Personagem', 'P'],
  ['craft', 'Criação', 'C'],
  ['journal', 'Diário', 'J'],
  ['map', 'Mapa', 'M'],
  ['build', 'Construção', 'B'],
];

interface Modal {
  el: HTMLElement;
  kind: string;
  onClose?: () => void;
}

function heartURL(state: 0 | 1 | 2): string {
  const p = new PCanvas(10, 9);
  const shape = ['.##...##.', '#########', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....'];
  shape.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c !== '#') return;
      let col = '#e8404a';
      if (state === 0 || (state === 1 && x > 4)) col = '#5a3a3a';
      if (y === 1 && x < 3 && col !== '#5a3a3a') col = '#ff9aa0';
      p.px(x, y + 1, col);
    }),
  );
  p.outline('#2a1010');
  return p.toCanvas(2).toDataURL();
}

function weatherURL(w: string, night: boolean): string {
  const p = new PCanvas(13, 13);
  const sun = () => {
    p.disc(6.5, 6.5, 3.5, '#f8d040');
    for (const [x, y] of [
      [6, 0],
      [6, 12],
      [0, 6],
      [12, 6],
      [2, 2],
      [10, 2],
      [2, 10],
      [10, 10],
    ])
      p.px(x, y, '#f8b020');
  };
  const moon = () => {
    p.disc(6.5, 6.5, 4.5, '#f0ecd0');
    for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) if ((x + 0.5 - 8.8) ** 2 + (y + 0.5 - 5) ** 2 < 13) p.clear(x, y);
  };
  const cloud = (c = '#e8eef4') => {
    p.ellipse(5, 8, 4, 3, c);
    p.ellipse(8.5, 7, 3.5, 3.2, c);
    p.rect(2, 8, 10, 3, c);
  };
  if (w === 'sun') night ? moon() : sun();
  else if (w === 'rain') {
    cloud('#b8c4d0');
    for (const x of [3, 6, 9]) p.vline(x, 11, 2, '#4a90e0');
  } else if (w === 'storm') {
    cloud('#7a8494');
    p.line(7, 9, 5, 12, '#f8e040');
  } else {
    cloud('#f4f8fc');
    for (const x of [3, 7, 10]) p.px(x, 12, '#ffffff');
  }
  p.outline('#2a1a14');
  return p.toCanvas(2).toDataURL();
}

export class UI {
  ctx!: GameCtx;
  root!: HTMLElement;
  private hud!: HTMLElement;
  private hearts!: HTMLElement;
  private stBar!: HTMLElement;
  private stLabel!: HTMLElement;
  private waterRow!: HTMLElement;
  private waterBar!: HTMLElement;
  private dateEl!: HTMLElement;
  private timeEl!: HTMLElement;
  private wxEl!: HTMLImageElement;
  private goldEl!: HTMLElement;
  private questEl!: HTMLElement;
  private hotbarEl!: HTMLElement;
  private heldName!: HTMLElement;
  private promptEl!: HTMLElement;
  private toastsEl!: HTMLElement;
  private bannerEl!: HTMLElement;
  private heldEl!: HTMLElement;
  private fadeEl!: HTMLElement;
  private modals: Modal[] = [];
  held: ItemStack | null = null;
  private heartImgs: string[] = [];
  private tab: Tab = 'inv';
  private craftCat = 'Básico';
  private dlg: { el: HTMLElement; pages: string[]; i: number; typing: number | null; full: boolean; choices?: { label: string; fn: () => void; cls?: string }[]; onClose?: () => void; npc?: NPCDef } | null = null;
  private lastToast: { id: string; qty: number; el: HTMLElement; t: number } | null = null;
  private refreshTab: (() => void) | null = null;

  init() {
    this.root = document.getElementById('ui')!;
    this.heartImgs = [heartURL(0), heartURL(1), heartURL(2)];
    this.hud = el('div', '', '');
    this.hud.id = 'hud';
    this.root.appendChild(this.hud);

    const vit = el('div', 'hud-vitals panel-wood');
    this.hearts = el('div', 'hearts');
    vit.appendChild(this.hearts);
    const bar = el('div', 'bar');
    this.stBar = el('i');
    bar.appendChild(this.stBar);
    vit.appendChild(bar);
    this.stLabel = el('div', 'bar-label');
    vit.appendChild(this.stLabel);
    this.waterRow = el('div', '');
    const wbar = el('div', 'bar water');
    this.waterBar = el('i');
    wbar.appendChild(this.waterBar);
    this.waterRow.appendChild(wbar);
    this.waterRow.appendChild(el('div', 'bar-label', '<span>Água do regador</span>'));
    vit.appendChild(this.waterRow);
    this.hud.appendChild(vit);

    const clock = el('div', 'hud-clock panel-wood');
    this.dateEl = el('div', 'date');
    const row = el('div', 'row');
    this.wxEl = el('img', 'wx');
    this.timeEl = el('div', 'time');
    row.append(this.wxEl, this.timeEl);
    clock.append(this.dateEl, row);
    this.hud.appendChild(clock);

    this.goldEl = el('div', 'hud-gold panel-wood');
    this.hud.appendChild(this.goldEl);

    this.questEl = el('div', 'hud-quest panel-parch interactive');
    this.questEl.addEventListener('click', () => this.openMenu('journal'));
    this.hud.appendChild(this.questEl);

    const hw = el('div', 'hotbar-wrap');
    this.heldName = el('div', 'held-name');
    this.hotbarEl = el('div', 'hotbar panel-wood');
    hw.append(this.heldName, this.hotbarEl);
    this.hud.appendChild(hw);

    this.promptEl = el('div', 'prompt panel-parch');
    this.hud.appendChild(this.promptEl);
    this.toastsEl = el('div', 'toasts');
    this.hud.appendChild(this.toastsEl);
    this.bannerEl = el('div', 'banner');
    this.hud.appendChild(this.bannerEl);
    this.hud.appendChild(el('div', 'hud-help', '<kbd>Esc</kbd> Menu &nbsp; <kbd>I</kbd> Inventário &nbsp; <kbd>C</kbd> Criação &nbsp; <kbd>J</kbd> Diário'));

    this.heldEl = el('div', '');
    this.heldEl.id = 'held';
    document.body.appendChild(this.heldEl);
    window.addEventListener('mousemove', (e) => {
      this.heldEl.style.left = e.clientX + 'px';
      this.heldEl.style.top = e.clientY + 'px';
    });
    this.fadeEl = document.getElementById('fade')!;

    bus.on('inv', () => {
      this.renderHotbar();
      this.refreshTab?.();
      this.renderQuest();
    });
    bus.on('vitals', () => this.renderVitals());
    bus.on('gold', () => this.renderGold());
    bus.on('quest', () => this.renderQuest());
    bus.on('stats', () => this.renderQuest());
    bus.on('xp', () => this.renderVitals());
    bus.on('toast', (t: string, kind?: string) => this.toast(t, kind));
    bus.on('pickup', (id: string, qty: number) => this.pickupToast(id, qty));
  }

  showHUD(on: boolean) {
    this.hud.classList.toggle('on', on);
    if (on) this.refreshHUD();
  }

  refreshHUD() {
    this.renderVitals();
    this.renderGold();
    this.renderQuest();
    this.renderHotbar();
    this.renderClock();
  }

  // ------------------------------------------------------------ HUD parts
  renderVitals() {
    if (!G.state) return;
    const p = S().player;
    const mh = maxHp();
    const n = Math.ceil(mh / 10);
    const cur = Math.max(0, p.hp);
    let h = '';
    for (let i = 0; i < n; i++) {
      const v = cur - i * 10;
      const s = v >= 10 ? 2 : v >= 5 ? 1 : 0;
      h += `<img class="heart" src="${this.heartImgs[s]}">`;
    }
    this.hearts.innerHTML = h;
    const ms = maxSt();
    this.stBar.style.width = Math.max(0, (p.st / ms) * 100) + '%';
    this.stLabel.innerHTML = `<span>Energia</span><span>${Math.floor(p.st)}/${ms}</span>`;
    const sel = S().inv[S().sel];
    const can = sel && ITEMS[sel.id].tool?.type === 'can';
    this.waterRow.style.display = can ? 'block' : 'none';
    if (can) this.waterBar.style.width = (p.water / ITEMS[sel!.id].tool!.power) * 100 + '%';
  }

  renderGold() {
    if (!G.state) return;
    this.goldEl.innerHTML = `<span class="coin"></span>${fmtGold(S().player.gold)}`;
  }

  renderClock() {
    if (!G.state) return;
    const t = S().time;
    this.dateEl.textContent = fmtDate(t.day, t.season) + (t.year > 1 ? ` — Ano ${t.year}` : '');
    this.timeEl.textContent = fmtClock(t.min);
    const night = t.min >= 19 * 60 || t.min < 6 * 60;
    const k = S().weather + (night ? 'n' : 'd');
    if (this.wxEl.dataset.k !== k) {
      this.wxEl.dataset.k = k;
      this.wxEl.src = weatherURL(S().weather, night);
      this.wxEl.title = WEATHER_LABEL[S().weather];
    }
  }

  renderQuest() {
    if (!G.state) return;
    const q = activeQuest();
    if (!q) {
      this.questEl.innerHTML = S().flags.chapter2_done
        ? `<div class="qh">Missão Atual</div><div class="qt">A Coroa foi restaurada!</div><div class="obj">Cavaleiro(a) de Eldoria — explore, cultive e ajude a guilda livremente.</div>`
        : `<div class="qh">Missão Atual</div><div class="obj">Aguardando novos acontecimentos...</div>`;
      return;
    }
    let h = `<div class="qh">Missão Atual</div><div class="qt">${esc(q.title)}</div>`;
    for (const o of q.objectives) {
      const [a, b] = objProgress(o);
      h += `<div class="obj ${a >= b && o.type !== 'deliver' && o.type !== 'talk' ? 'ok' : ''}">• ${esc(o.label)}${b > 1 ? `<b>${a}/${b}</b>` : ''}</div>`;
    }
    const d = S().daily;
    if (d && d.accepted && !d.done) h += `<div class="qh" style="margin-top:6px">Pedido do Dia</div><div class="obj">• ${esc(item(d.item).name)} para ${esc(NPC_BY_ID[d.npc].name)}<b>${Math.min(count(d.item), d.qty)}/${d.qty}</b></div>`;
    this.questEl.innerHTML = h;
  }

  renderHotbar() {
    if (!G.state) return;
    const st = S();
    this.hotbarEl.innerHTML = '';
    for (let i = 0; i < HOTBAR; i++) {
      const s = st.inv[i];
      const d = slotEl(s, 'slot' + (i === st.sel ? ' sel' : ''));
      d.appendChild(el('span', 'key', String((i + 1) % 10)));
      d.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        st.sel = i;
        audio.play('click');
        this.renderHotbar();
        bus.emit('select');
      });
      attachTip(d, () => (st.inv[i] ? itemTipHtml(st.inv[i]!) : null));
      this.hotbarEl.appendChild(d);
    }
    const sel = st.inv[st.sel];
    this.heldName.textContent = sel ? item(sel.id).name : '';
    this.renderVitals();
  }

  prompt(html: string | null) {
    if (!html) {
      this.promptEl.style.display = 'none';
      return;
    }
    if (this.promptEl.innerHTML !== html) this.promptEl.innerHTML = html;
    this.promptEl.style.display = 'block';
  }

  toast(text: string, kind = '') {
    const t = el('div', 'toast panel-parch ' + kind);
    t.textContent = text;
    this.pushToast(t);
  }

  private pushToast(t: HTMLElement, ms = 3500) {
    this.toastsEl.prepend(t);
    while (this.toastsEl.children.length > 6) this.toastsEl.lastChild!.remove();
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 400);
    }, ms);
  }

  pickupToast(id: string, qty: number) {
    const now = performance.now();
    if (this.lastToast && this.lastToast.id === id && now - this.lastToast.t < 2500 && this.lastToast.el.isConnected) {
      this.lastToast.qty += qty;
      this.lastToast.t = now;
      this.lastToast.el.querySelector('span')!.textContent = `+${this.lastToast.qty} ${item(id).name}`;
      return;
    }
    const t = el('div', 'toast panel-parch');
    t.appendChild(iconImg(id));
    t.appendChild(el('span', '', `+${qty} ${esc(item(id).name)}`));
    this.lastToast = { id, qty, el: t, t: now };
    this.pushToast(t, 2600);
  }

  banner(title: string, sub = '') {
    this.bannerEl.innerHTML = `${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}`;
    this.bannerEl.classList.add('show');
    clearTimeout((this.bannerEl as any)._t);
    (this.bannerEl as any)._t = setTimeout(() => this.bannerEl.classList.remove('show'), 2600);
  }

  fade(big: string, sub: string, mid: () => void, hold = 1400) {
    this.fadeEl.innerHTML = `<div class="big">${esc(big)}</div><div class="sub">${sub}</div>`;
    this.fadeEl.classList.add('on');
    setTimeout(() => {
      mid();
      setTimeout(() => this.fadeEl.classList.remove('on'), hold);
    }, 650);
  }

  // ------------------------------------------------------------ modal plumbing
  isModal() {
    return this.modals.length > 0 || !!this.dlg;
  }

  private pushModal(content: HTMLElement, kind: string, onClose?: () => void, dim = true) {
    const layer = el('div', 'modal-layer' + (dim ? '' : ' clear'));
    layer.appendChild(content);
    layer.addEventListener('mousedown', (e) => {
      if (e.target === layer) this.closeTop();
    });
    layer.addEventListener('contextmenu', (e) => e.preventDefault());
    this.root.appendChild(layer);
    this.modals.push({ el: layer, kind, onClose });
    audio.play('open');
    return layer;
  }

  closeTop(): boolean {
    if (this.dlg) {
      this.closeDialogue();
      return true;
    }
    const m = this.modals.pop();
    if (!m) return false;
    m.el.remove();
    hideTip();
    this.returnHeld();
    this.refreshTab = null;
    m.onClose?.();
    audio.play('close');
    return true;
  }

  closeAll() {
    while (this.closeTop());
  }

  topKind() {
    return this.modals[this.modals.length - 1]?.kind;
  }

  private returnHeld() {
    if (!this.held) return;
    const left = addTo(S().inv, this.held.id, this.held.qty);
    if (left > 0) this.ctx.dropItem(this.held.id, left);
    this.held = null;
    this.renderHeld();
    bus.emit('inv');
  }

  private renderHeld() {
    this.heldEl.innerHTML = '';
    if (!this.held) return;
    this.heldEl.appendChild(iconImg(this.held.id));
    if (this.held.qty > 1) this.heldEl.appendChild(el('span', 'qty', String(this.held.qty)));
  }

  private panel(title: string, cls = ''): { wrap: HTMLElement; body: HTMLElement } {
    const wrap = el('div', 'panel-wrap panel-parch ' + cls);
    const x = el('button', 'close-x', '✕');
    x.addEventListener('click', () => this.closeTop());
    wrap.appendChild(x);
    if (title) wrap.appendChild(el('h2', 'ptitle', esc(title)));
    const body = el('div', '');
    wrap.appendChild(body);
    return { wrap, body };
  }

  // ------------------------------------------------------------ slot interaction
  private slotClick(arr: (ItemStack | null)[], i: number, e: MouseEvent, quick?: (ItemStack | null)[], rerender?: () => void) {
    e.preventDefault();
    e.stopPropagation();
    const right = e.button === 2;
    const cur = arr[i];
    if (e.shiftKey && cur && quick) {
      const left = addTo(quick, cur.id, cur.qty);
      arr[i] = left > 0 ? { id: cur.id, qty: left } : null;
      audio.play('pickup');
    } else if (right) {
      if (!this.held && cur) {
        const half = Math.ceil(cur.qty / 2);
        this.held = { id: cur.id, qty: half };
        cur.qty -= half;
        if (cur.qty <= 0) arr[i] = null;
      } else if (this.held && (!cur || cur.id === this.held.id)) {
        if (!cur) arr[i] = { id: this.held.id, qty: 1 };
        else if (cur.qty < item(cur.id).stack) cur.qty++;
        else return;
        this.held.qty--;
        if (this.held.qty <= 0) this.held = null;
      }
      audio.play('click');
    } else {
      if (!this.held) {
        if (cur) {
          this.held = cur;
          arr[i] = null;
        }
      } else if (!cur) {
        arr[i] = this.held;
        this.held = null;
      } else if (cur.id === this.held.id) {
        const max = item(cur.id).stack;
        const n = Math.min(max - cur.qty, this.held.qty);
        cur.qty += n;
        this.held.qty -= n;
        if (this.held.qty <= 0) this.held = null;
      } else {
        arr[i] = this.held;
        this.held = cur;
      }
      audio.play('click');
    }
    this.renderHeld();
    bus.emit('inv');
    rerender?.();
  }

  private grid(arr: (ItemStack | null)[], from: number, to: number, opts: { quick?: (ItemStack | null)[]; cols?: number; hotbarMark?: boolean; rerender?: () => void; sell?: (i: number, all: boolean) => void } = {}) {
    const g = el('div', 'grid' + ((opts.cols || 9) === 10 ? ' ten' : ''));
    for (let i = from; i < to; i++) {
      const s = arr[i];
      const d = slotEl(s, 'slot' + (opts.hotbarMark && i === S().sel ? ' sel' : ''));
      if (opts.hotbarMark && i < HOTBAR) d.appendChild(el('span', 'key', String((i + 1) % 10)));
      if (opts.sell) {
        d.addEventListener('mousedown', (e) => {
          e.preventDefault();
          if (arr[i]) opts.sell!(i, e.shiftKey || e.button === 2);
        });
      } else d.addEventListener('mousedown', (e) => this.slotClick(arr, i, e, opts.quick, opts.rerender));
      d.addEventListener('contextmenu', (e) => e.preventDefault());
      attachTip(d, () => {
        const it = arr[i];
        if (!it) return null;
        let extra = '';
        if (opts.sell) extra = it && item(it.id).price > 0 ? `<div class="hint">Clique: vender 1 • Shift/Dir.: vender tudo</div>` : `<div class="hint">Não pode ser vendido.</div>`;
        else extra = `<div class="hint">Clique: pegar • Dir.: dividir${opts.quick ? ' • Shift: mover' : ''}</div>`;
        return itemTipHtml(it, extra);
      });
      g.appendChild(d);
    }
    return g;
  }

  // ------------------------------------------------------------ book menu
  currentTab() {
    return this.tab;
  }

  openMenu(tab: Tab) {
    if (this.dlg) return;
    if (this.topKind() === 'book') {
      this.tab = tab;
      this.renderBook();
      return;
    }
    if (this.modals.length) return;
    this.tab = tab;
    const wrap = el('div', 'panel-wrap panel-parch book');
    this.pushModal(wrap, 'book');
    this.renderBook();
  }

  private renderBook() {
    const m = this.modals.find((x) => x.kind === 'book');
    if (!m) return;
    const wrap = m.el.firstChild as HTMLElement;
    wrap.innerHTML = '';
    wrap.style.marginTop = '40px';
    const tabs = el('div', 'tabs');
    for (const [id, label, k] of TABS) {
      const t = el('button', 'tab' + (id === this.tab ? ' on' : ''), `${label}<kbd>${k}</kbd>`);
      t.addEventListener('click', () => {
        audio.play('click');
        this.tab = id;
        this.renderBook();
      });
      tabs.appendChild(t);
    }
    wrap.appendChild(tabs);
    const x = el('button', 'close-x', '✕');
    x.addEventListener('click', () => this.closeTop());
    wrap.appendChild(x);
    const body = el('div', 'book-body');
    wrap.appendChild(body);
    const render = () => {
      body.innerHTML = '';
      hideTip();
      ({ inv: () => this.tabInv(body), char: () => this.tabChar(body), craft: () => this.tabCraft(body), journal: () => this.tabJournal(body), map: () => this.tabMap(body), build: () => this.tabBuild(body) })[this.tab]();
    };
    this.refreshTab = render;
    render();
  }

  private tabInv(body: HTMLElement) {
    const st = S();
    body.appendChild(el('h2', 'ptitle', 'Inventário'));
    const lay = el('div', 'inv-layout');
    const left = el('div', '');
    left.appendChild(el('div', 'section-label', 'Barra de Ferramentas'));
    const rer = () => this.refreshTab?.();
    left.appendChild(this.grid(st.inv, 0, 10, { cols: 10, hotbarMark: true, rerender: rer }));
    left.appendChild(el('div', 'section-label', 'Mochila'));
    const bp = el('div', 'grid ten');
    left.appendChild(this.grid(st.inv, 10, 36, { cols: 10, rerender: rer, quick: undefined }));
    void bp;
    const trashRow = el('div', '');
    trashRow.style.cssText = 'display:flex;gap:10px;align-items:center;margin-top:10px';
    const trash = el('div', 'slot trash');
    trash.title = 'Lixeira';
    trash.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      if (!this.held) return;
      const d = item(this.held.id);
      if (d.cat === 'tool' || d.cat === 'artifact') {
        this.toast('Este item é importante demais para ser descartado.', 'warn');
        audio.play('error');
        return;
      }
      this.held = null;
      this.renderHeld();
      audio.play('break');
    });
    const sortBtn = button(
      'Organizar',
      () => {
        const bag = st.inv.slice(10).filter(Boolean) as ItemStack[];
        bag.sort((a, b) => ITEMS[a.id].cat.localeCompare(ITEMS[b.id].cat) || a.id.localeCompare(b.id));
        const merged: (ItemStack | null)[] = new Array(26).fill(null);
        for (const s of bag) addTo(merged, s.id, s.qty);
        for (let i = 0; i < 26; i++) st.inv[10 + i] = merged[i];
        bus.emit('inv');
      },
      'btn small',
    );
    trashRow.append(trash, el('span', 'hint', 'Lixeira — solte um item aqui para descartá-lo.'), sortBtn);
    left.appendChild(trashRow);
    left.appendChild(el('div', 'hint', 'Clique para pegar/soltar itens. Botão direito divide a pilha. Use a roda do mouse ou 1–0 para escolher o item ativo.'));
    lay.appendChild(left);
    const right = el('div', '');
    right.appendChild(el('div', 'section-label', 'Equipamento'));
    right.appendChild(this.equipGrid(rer));
    right.appendChild(el('div', 'section-label', 'Atributos'));
    right.appendChild(this.statsBlock());
    lay.appendChild(right);
    body.appendChild(lay);
  }

  private equipGrid(rer: () => void) {
    const st = S();
    const g = el('div', 'equip-grid');
    const slots: [EquipSlot, string][] = [
      ['head', 'Cabeça'],
      ['body', 'Corpo'],
      ['feet', 'Pés'],
      ['acc', 'Acessório'],
    ];
    for (const [slot, label] of slots) {
      const id = st.equip[slot];
      const d = slotEl(id ? { id, qty: 1 } : null, 'slot' + (id ? '' : ' equip-empty'));
      d.dataset.label = label;
      d.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        if (this.held) {
          const def = ITEMS[this.held.id];
          if (def.equip?.slot !== slot) {
            this.toast(`Este item não pode ser equipado em: ${label}.`, 'warn');
            audio.play('error');
            return;
          }
          const prev = st.equip[slot];
          st.equip[slot] = this.held.id;
          this.held = prev ? { id: prev, qty: 1 } : null;
          audio.play('craft');
        } else if (id) {
          this.held = { id, qty: 1 };
          st.equip[slot] = null;
        }
        st.player.hp = Math.min(st.player.hp, maxHp());
        this.renderHeld();
        bus.emit('vitals');
        rer();
      });
      attachTip(d, () => (st.equip[slot] ? itemTipHtml({ id: st.equip[slot]!, qty: 1 }) : `<div class="tip-name">${label}</div><div class="tip-desc">Arraste um equipamento para cá.</div>`));
      g.appendChild(d);
    }
    return g;
  }

  private statsBlock() {
    const st = S();
    const sword = (['sword_i', 'sword_c', 'sword'] as const).find((s) => count(s) > 0);
    const atk = (sword ? item(sword).tool!.power : 2) + attackBonus();
    const d = el('div', 'stats');
    const rows: [string, string][] = [
      ['Vida', `${Math.floor(st.player.hp)} / ${maxHp()}`],
      ['Energia', `${Math.floor(st.player.st)} / ${maxSt()}`],
      ['Ataque', String(atk)],
      ['Defesa', String(defense())],
      ['Velocidade', Math.round(speedMul() * 100) + '%'],
      ['Sorte', String(luck())],
    ];
    for (const [k, v] of rows) d.append(el('span', '', k), el('b', '', v));
    return d;
  }

  private tabChar(body: HTMLElement) {
    const st = S();
    body.appendChild(el('h2', 'ptitle', 'Personagem'));
    const box = el('div', 'char-box');
    const pf = el('div', 'portrait-frame');
    pf.appendChild(previewCanvas(this.playerSpec(), 0, 0, 6));
    const left = el('div', '');
    left.appendChild(pf);
    left.appendChild(el('div', 'section-label', 'Equipamento'));
    left.appendChild(this.equipGrid(() => this.refreshTab?.()));
    box.appendChild(left);
    const mid = el('div', '');
    mid.style.flex = '1';
    mid.appendChild(el('div', 'title', `<span style="font-size:1.6em;color:var(--wood-dark)">${esc(st.player.name)}</span>`));
    mid.appendChild(el('div', 'hint', `Nível de Aventureiro ${1 + totalLevel()} • ${st.time.total} dias em Eldoria • ${fmtGold(st.stats.goldEarned || 0)} moedas ganhas`));
    mid.appendChild(el('div', 'section-label', 'Atributos'));
    mid.appendChild(this.statsBlock());
    mid.appendChild(el('div', 'section-label', 'Habilidades'));
    for (const s of Object.keys(SKILL_LABEL) as SkillId[]) {
      const xp = st.skills[s] || 0;
      const l = skillLevel(xp);
      const next = SKILL_XP[l + 1];
      const prev = SKILL_XP[l];
      const pct = next ? ((xp - prev) / (next - prev)) * 100 : 100;
      const row = el('div', 'skill', `<span>${SKILL_LABEL[s]}</span><div class="bar"><i style="width:${pct}%"></i></div><b>Nv ${l}</b>`);
      row.title = next ? `${xp} / ${next} XP` : 'Nível máximo';
      mid.appendChild(row);
    }
    box.appendChild(mid);
    const right = el('div', '');
    right.style.minWidth = '230px';
    right.appendChild(el('div', 'section-label', 'Relacionamentos'));
    for (const n of NPCS.filter((x) => !x.minor)) {
      const r = st.npcs[n.id];
      const hcount = hearts(n.id);
      let hs = '';
      for (let i = 0; i < 10; i++) hs += i < hcount ? '♥' : '<span class="off">♥</span>';
      const row = el('div', 'friend');
      const pc = portraitCanvas(n.spec, 2);
      pc.style.cssText = 'width:32px;height:36px;image-rendering:pixelated';
      row.appendChild(pc);
      row.appendChild(el('div', '', `<div><b>${esc(n.name)}</b> <span class="hint">${r.met ? esc(n.title) : '???'}</span></div><div class="hearts-s">${hs}</div>`));
      row.title = n.personality;
      right.appendChild(row);
    }
    box.appendChild(right);
    body.appendChild(box);
  }

  playerSpec(): CharSpec {
    const l = S().player.look;
    return { skin: l.skin, hair: l.hair, hairStyle: l.hairStyle, shirt: l.shirt, pants: l.pants, outfit: 'tunic', cape: '#8a2a2a' };
  }

  private recipeUnlocked(r: Recipe): boolean {
    if (!r.unlock) return true;
    if (r.unlock.flag && !S().flags[r.unlock.flag]) return false;
    if (r.unlock.skill && lvl(r.unlock.skill[0]) < r.unlock.skill[1]) return false;
    return true;
  }

  private tabCraft(body: HTMLElement) {
    body.appendChild(el('h2', 'ptitle', 'Criação'));
    const near = this.ctx.nearStations();
    const names = [...near].filter((s) => s !== 'hand').map((s) => STATION_LABEL[s]);
    body.appendChild(el('div', 'stations-near', names.length ? `Estações próximas: <b>${names.join(', ')}</b>` : 'Nenhuma estação de trabalho por perto — apenas receitas básicas disponíveis. Aproxime-se de uma bancada, fornalha, bigorna, fogueira ou mesa de alquimia.'));
    const lay = el('div', 'craft-layout');
    const cats = el('div', 'cat-list');
    for (const c of RECIPE_CATS) {
      const b = el('button', c === this.craftCat ? 'on' : '', c);
      b.addEventListener('click', () => {
        audio.play('click');
        this.craftCat = c;
        this.refreshTab?.();
      });
      cats.appendChild(b);
    }
    lay.appendChild(cats);
    const list = el('div', 'recipe-list');
    for (const r of RECIPES.filter((x) => x.cat === this.craftCat)) {
      const unlocked = this.recipeUnlocked(r);
      const stationOk = near.has(r.station);
      const matsOk = hasMats(r.mats);
      const row = el('div', 'recipe' + (unlocked ? '' : ' locked'));
      const ic = slotEl({ id: r.out, qty: r.qty });
      attachTip(ic, () => itemTipHtml({ id: r.out, qty: 1 }));
      row.appendChild(ic);
      const mid = el('div', '');
      mid.appendChild(el('div', 'rname', esc(item(r.out).name) + (r.qty > 1 ? ` ×${r.qty}` : '')));
      const mats = el('div', 'mats');
      for (const m of r.mats) {
        const have = count(m.id);
        const me = el('span', 'mat ' + (have >= m.qty ? 'ok' : 'miss'));
        me.appendChild(iconImg(GROUP_ICON[m.id] || m.id));
        me.appendChild(el('span', '', `${esc(matName(m.id))} ${Math.min(have, 999)}/${m.qty}`));
        mats.appendChild(me);
      }
      mid.appendChild(mats);
      mid.appendChild(el('div', 'station-tag' + (stationOk ? '' : ' miss'), unlocked ? `Requer: ${STATION_LABEL[r.station]}` : `🔒 Bloqueado — ${esc(r.unlock!.label)}`));
      row.appendChild(mid);
      const b = button('Criar', () => this.craft(r), 'btn small');
      b.disabled = !unlocked || !stationOk || !matsOk;
      row.appendChild(b);
      list.appendChild(row);
    }
    lay.appendChild(list);
    body.appendChild(lay);
  }

  private craft(r: Recipe) {
    if (!hasMats(r.mats) || !this.ctx.nearStations().has(r.station)) return;
    if (!hasRoom(r.out, r.qty)) {
      this.toast('Sem espaço no inventário.', 'warn');
      audio.play('error');
      return;
    }
    consumeMats(r.mats);
    addItem(r.out, r.qty);
    addStat('craft');
    addStat('craft:' + r.out);
    audio.play('craft');
    this.refreshTab?.();
  }

  private tabJournal(body: HTMLElement) {
    const st = S();
    body.appendChild(el('h2', 'ptitle', 'Diário de Missões'));
    const j = el('div', 'journal');
    const left = el('div', '');
    left.appendChild(el('div', 'section-label', 'História Principal'));
    const q = activeQuest();
    if (q) {
      const c = el('div', 'quest-card');
      c.innerHTML = `<div class="chapter">${esc(q.chapter)}</div><div class="qtitle">${esc(q.title)}</div><p>${esc(q.desc)}</p>`;
      for (const o of q.objectives) {
        const [a, b] = objProgress(o);
        const ok = a >= b && o.type !== 'deliver' && o.type !== 'talk';
        c.appendChild(el('div', 'obj' + (ok ? ' ok' : ''), `${ok ? '✔' : '◇'} ${esc(o.label)} ${b > 1 ? `(${a}/${b})` : ''}`));
      }
      const rw: string[] = [];
      if (q.reward.gold) rw.push(`${q.reward.gold} moedas`);
      for (const m of q.reward.items || []) rw.push(`${m.qty}× ${item(m.id).name}`);
      if (rw.length) c.appendChild(el('div', 'hint', 'Recompensa: ' + esc(rw.join(', '))));
      left.appendChild(c);
    } else if (st.flags.chapter2_done) {
      left.appendChild(el('div', 'quest-card', `<div class="chapter">Fim da História Principal</div><div class="qtitle">A Coroa Restaurada</div><p>Você reuniu os fragmentos da Coroa de Eldoria e foi nomeado(a) Cavaleiro(a) do reino pela Rainha Isolde.</p><p class="hint">Continue cultivando, criando animais, cumprindo contratos da guilda e explorando a Mina Sussurrante.</p>`));
    }
    left.appendChild(el('div', 'section-label', 'Pedido do Dia'));
    const d = st.daily;
    if (d) {
      const n = NPC_BY_ID[d.npc];
      const status = d.done ? '<b style="color:#2f7a2a">Concluído!</b>' : d.accepted ? `Entregue a ${esc(n.name)}: ${Math.min(count(d.item), d.qty)}/${d.qty}` : 'Disponível no Quadro de Avisos da praça.';
      left.appendChild(el('div', 'quest-card', `<div class="qtitle">${esc(n.name)} precisa de ${d.qty}× ${esc(item(d.item).name)}</div><p>"${esc(dailyText())}"</p><div>${status}</div><div class="hint">Recompensa: ${d.reward} moedas + amizade</div>`));
    }
    j.appendChild(left);
    const right = el('div', '');
    right.appendChild(el('div', 'section-label', 'Projetos da Vila'));
    for (const p of PROJECTS) {
      const done = !!st.projects[p.id];
      const mats = p.mats.map((m) => `${m.qty}× ${item(m.id).name}`).join(', ') + (p.gold ? `, ${p.gold} moedas` : '');
      right.appendChild(el('div', 'quest-card', `<div class="qtitle">${done ? '✔ ' : ''}${esc(p.name)}</div><p>${esc(p.desc)}</p><div class="hint">${done ? 'Concluído.' : 'Custo: ' + esc(mats) + '<br>' + esc(p.where)}</div>`));
    }
    right.appendChild(el('div', 'section-label', 'Rancho'));
    if (!st.animals.length) right.appendChild(el('div', 'hint', 'Você ainda não tem animais. Construa um Galinheiro ou Celeiro (tecla B) e visite Marta no Rancho Prado Verde, ao sul da fazenda.'));
    for (const a of st.animals) {
      const ad = ANIMALS[a.kind];
      const h = Math.floor(a.pts / HEART_PTS);
      right.appendChild(el('div', 'friend', `<b>${esc(a.name)}</b> <span class="hint">${esc(ad.name)}</span> <span class="hearts-s">${'♥'.repeat(h)}<span class="off">${'♥'.repeat(5 - h)}</span></span>${a.petted ? '' : ' <span class="hint">— sem carinho hoje</span>'}`));
    }
    right.appendChild(el('div', 'section-label', 'Missões Concluídas'));
    const dl = el('div', 'done-list');
    for (const id of st.questsDone) dl.appendChild(el('div', '', esc(QUESTS.find((x) => x.id === id)?.title || id)));
    if (!st.questsDone.length) dl.innerHTML = '<span class="hint">Nenhuma ainda.</span>';
    right.appendChild(dl);
    j.appendChild(right);
    body.appendChild(j);
  }

  private tabMap(body: HTMLElement) {
    const info = this.ctx.mapInfo();
    body.appendChild(el('h2', 'ptitle', esc(info.title || 'Mapa do Reino de Eldoria')));
    const def = info.def;
    const sc = info.scale || 4;
    const cv = el('canvas', 'map-canvas');
    cv.width = def.w * sc;
    cv.height = def.h * sc;
    const g = cv.getContext('2d')!;
    for (let y = 0; y < def.h; y++)
      for (let x = 0; x < def.w; x++) {
        g.fillStyle = MAP_COLORS[def.terrain[y * def.w + x]] || '#6aa84f';
        g.fillRect(x * sc, y * sc, sc, sc);
      }
    // parchment tint
    g.fillStyle = 'rgba(230,200,140,0.22)';
    g.fillRect(0, 0, cv.width, cv.height);
    for (const o of def.statics) {
      const k = OBJ[o.kind];
      if (k.w < 2 && !k.door) continue;
      g.fillStyle = o.kind.startsWith('house') || o.kind === 'hut_elara' ? '#8a3a2a' : '#5a4a3a';
      g.fillRect(o.x * sc, (o.y - 1) * sc, k.w * sc, (k.h + 1) * sc);
    }
    g.font = `bold ${sc * 4}px MedievalSharp, serif`;
    g.textAlign = 'center';
    const labels: [string, number, number][] = info.labels || [
      ['Sua Fazenda', 26, 40],
      ['Greenvale', 82, 39],
      ['Montanhas Sussurrantes', 80, 15],
      ['Floresta de Eldoria', 132, 32],
      ['Lago Prateado', 72, 96],
      ['Ruínas Esquecidas', 132, 95],
      [S().flags.road_open ? 'Estrada Real → Valoria' : 'Estrada Real', 104, 5],
      ['Mina', 70, 2.5],
      ['Rancho', 33, 91],
    ];
    for (const [t, x, y] of labels) {
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(40,24,10,0.85)';
      g.strokeText(t, x * sc, y * sc);
      g.fillStyle = '#ffe9b0';
      g.fillText(t, x * sc, y * sc);
    }
    for (const n of info.npcs) {
      g.fillStyle = '#3a6ab0';
      g.beginPath();
      g.arc(n.x * sc, n.y * sc, sc * 1.3, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#e8303a';
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(info.px * sc, info.py * sc, sc * 2, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    const w = el('div', 'map-wrap');
    w.appendChild(cv);
    body.appendChild(w);
    body.appendChild(el('div', 'map-legend', `<span style="color:#e8303a">●</span> Você (${esc(info.here)}) &nbsp; <span style="color:#3a6ab0">●</span> Moradores`));
  }

  private tabBuild(body: HTMLElement) {
    body.appendChild(el('h2', 'ptitle', 'Construção'));
    const onFarm = this.ctx.locId() === 'world';
    body.appendChild(el('div', 'hint', 'Construções só podem ser erguidas na sua fazenda. Depois de escolher, clique no terreno para posicionar (Esc cancela).'));
    const list = el('div', 'build-list');
    list.style.marginTop = '10px';
    for (const b of BUILDINGS) {
      const card = el('div', 'build-card');
      const src = this.ctx.texSource(OBJ[b.kind].tex as string);
      if (src) {
        const c = el('canvas');
        const w = (src as HTMLCanvasElement).width,
          h = (src as HTMLCanvasElement).height;
        c.width = w;
        c.height = h;
        c.getContext('2d')!.drawImage(src, 0, 0);
        c.style.width = w * 1.5 + 'px';
        c.style.height = h * 1.5 + 'px';
        card.appendChild(c);
      }
      card.appendChild(el('div', 'rname title', `<b style="font-size:1.2em">${esc(b.name)}</b>`));
      card.appendChild(el('div', '', esc(b.desc)));
      const mats = el('div', 'mats');
      for (const m of b.mats) {
        const have = count(m.id);
        const me = el('span', 'mat ' + (have >= m.qty ? 'ok' : 'miss'));
        me.appendChild(iconImg(m.id));
        me.appendChild(el('span', '', `${Math.min(have, 9999)}/${m.qty}`));
        mats.appendChild(me);
      }
      const gold = el('span', 'mat ' + (S().player.gold >= b.gold ? 'ok' : 'miss'), `<span class="coin"></span> ${fmtGold(b.gold)}`);
      mats.appendChild(gold);
      card.appendChild(mats);
      const ok = onFarm && hasMats(b.mats) && S().player.gold >= b.gold;
      const btn = button(
        'Construir',
        () => {
          this.closeAll();
          this.ctx.startBuild(b.kind);
        },
        'btn small',
      );
      btn.disabled = !ok;
      card.appendChild(btn);
      list.appendChild(card);
    }
    body.appendChild(list);
  }

  // ------------------------------------------------------------ dialogue
  dialogue(opts: { npc?: NPCDef; name: string; title?: string; pages: string[]; choices?: { label: string; fn: () => void; cls?: string }[]; onClose?: () => void; spec?: CharSpec }) {
    this.closeDialogue(true);
    const box = el('div', 'dialogue panel-parch');
    const pf = el('div', 'pframe portrait-frame');
    const spec = opts.npc?.spec || opts.spec;
    if (spec) pf.appendChild(portraitCanvas(spec, 6));
    else pf.style.display = 'none';
    box.appendChild(pf);
    const bodyEl = el('div', 'dbody');
    let hs = '';
    if (opts.npc) {
      const h = hearts(opts.npc.id);
      for (let i = 0; i < 10; i++) hs += i < h ? '♥' : '♡';
    }
    bodyEl.appendChild(el('div', 'dname', `${esc(opts.name)}${opts.title ? `<small>${esc(opts.title)}</small>` : ''}${hs ? `<span class="hearts-s">${hs}</span>` : ''}`));
    bodyEl.appendChild(el('div', 'dtext'));
    bodyEl.appendChild(el('div', 'choices'));
    bodyEl.appendChild(el('div', 'more', '▼'));
    box.appendChild(bodyEl);
    box.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      e.stopPropagation();
      this.dialogueAdvance();
    });
    this.root.appendChild(box);
    this.dlg = { el: box, pages: opts.pages, i: 0, typing: null, full: false, choices: opts.choices, onClose: opts.onClose, npc: opts.npc };
    this.showPage();
  }

  private showPage() {
    const d = this.dlg!;
    const text = d.pages[d.i].replace(/\{nome\}/g, S()?.player.name || 'viajante');
    const t = d.el.querySelector('.dtext') as HTMLElement;
    const ch = d.el.querySelector('.choices') as HTMLElement;
    const more = d.el.querySelector('.more') as HTMLElement;
    ch.innerHTML = '';
    more.style.display = 'none';
    t.textContent = '';
    d.full = false;
    let n = 0;
    if (d.typing) clearInterval(d.typing);
    d.typing = window.setInterval(() => {
      n += 2;
      t.textContent = text.slice(0, n);
      if (n % 6 === 0) audio.play('talk');
      if (n >= text.length) this.finishPage();
    }, 22);
    (d as any).text = text;
  }

  private finishPage() {
    const d = this.dlg;
    if (!d) return;
    if (d.typing) clearInterval(d.typing);
    d.typing = null;
    d.full = true;
    (d.el.querySelector('.dtext') as HTMLElement).textContent = (d as any).text;
    const last = d.i >= d.pages.length - 1;
    const ch = d.el.querySelector('.choices') as HTMLElement;
    const more = d.el.querySelector('.more') as HTMLElement;
    if (last && d.choices && d.choices.length) {
      for (const c of d.choices)
        ch.appendChild(
          button(
            c.label,
            () => {
              const fn = c.fn;
              this.closeDialogue(true);
              fn();
            },
            'btn small ' + (c.cls || ''),
          ),
        );
    } else more.style.display = 'block';
  }

  dialogueActive() {
    return !!this.dlg;
  }

  dialogueAdvance() {
    const d = this.dlg;
    if (!d) return;
    if (!d.full) {
      this.finishPage();
      return;
    }
    if (d.i < d.pages.length - 1) {
      d.i++;
      this.showPage();
      return;
    }
    if (d.choices && d.choices.length) return;
    this.closeDialogue();
  }

  lastDialogueClose = 0;

  closeDialogue(silent = false) {
    const d = this.dlg;
    if (!d) return;
    this.lastDialogueClose = performance.now();
    if (d.typing) clearInterval(d.typing);
    d.el.remove();
    this.dlg = null;
    if (!silent) d.onClose?.();
    else if (d.onClose && !d.choices) d.onClose();
  }

  // ------------------------------------------------------------ shops / selling
  shop(shopId: string | null, title = 'Caixa de Vendas') {
    const def = shopId ? SHOPS[shopId] : null;
    const { wrap, body } = this.panel(def ? def.name : title, 'shop');
    const st = S();
    const render = () => {
      body.innerHTML = '';
      hideTip();
      const gold = el('div', 'shop-gold', `<span class="coin"></span>${fmtGold(st.player.gold)}`);
      body.appendChild(gold);
      const lay = el('div', 'shop-layout');
      if (def) {
        const left = el('div', '');
        left.appendChild(el('div', 'section-label', 'Comprar'));
        const list = el('div', 'shop-list');
        const entries = def.entries.filter((e) => this.entryVisible(e));
        for (const e of entries) list.appendChild(this.shopRow(e, render));
        if (!entries.length) list.appendChild(el('div', 'hint', 'Nada à venda nesta estação.'));
        left.appendChild(list);
        left.appendChild(el('div', 'hint', 'Clique para comprar 1 • Shift+clique compra 5'));
        lay.appendChild(left);
      }
      const right = el('div', '');
      right.appendChild(el('div', 'section-label', 'Vender seus itens'));
      right.appendChild(
        this.grid(st.inv, 0, 36, {
          cols: def ? 9 : 10,
          sell: (i, all) => {
            const s = st.inv[i]!;
            const d = item(s.id);
            if (d.price <= 0 || d.cat === 'tool') {
              this.toast('Este item não pode ser vendido.', 'warn');
              audio.play('error');
              return;
            }
            const n = all ? s.qty : 1;
            s.qty -= n;
            if (s.qty <= 0) st.inv[i] = null;
            addGold(Math.round(d.price * (def?.sellMul || 1)) * n);
            addStat('sold', n);
            audio.play('coin');
            bus.emit('inv');
            render();
          },
        }),
      );
      lay.appendChild(right);
      if (!def) lay.style.gridTemplateColumns = '1fr';
      body.appendChild(lay);
    };
    this.refreshTab = render;
    render();
    this.pushModal(wrap, 'shop');
  }

  private entryVisible(e: ShopEntry) {
    const st = S();
    if (e.animal) return true;
    if (e.seasons && !e.seasons.includes(st.time.season)) return false;
    if (e.project && !st.projects[e.project]) return false;
    if (e.once && (count(e.id) > 0 || st.flags['bought_' + e.id])) return false;
    if (e.upgrade && count(e.upgrade.from) === 0) return false;
    return true;
  }

  private shopRow(e: ShopEntry, render: () => void) {
    const st = S();
    if (e.animal) return this.animalRow(e, render);
    const d = item(e.id);
    const row = el('div', 'shop-row');
    row.appendChild(iconImg(e.id));
    let sub = esc(d.desc);
    if (e.upgrade) sub = `Melhoria de ${esc(item(e.upgrade.from).name)} • ` + e.upgrade.mats.map((m) => `${m.qty}× ${esc(item(m.id).name)} (${count(m.id)})`).join(', ');
    row.appendChild(el('div', '', `<div><b>${esc(d.name)}</b></div><div class="sub">${sub}</div>`));
    row.appendChild(el('div', 'price', `<span class="coin"></span>${fmtGold(e.price)}`));
    const can = st.player.gold >= e.price && (!e.upgrade || hasMats(e.upgrade.mats));
    if (!can) row.classList.add('cant');
    attachTip(row, () => itemTipHtml({ id: e.id, qty: 1 }));
    row.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      const n = ev.shiftKey && !e.upgrade && !e.once && d.stack > 1 ? 5 : 1;
      if (st.player.gold < e.price * n) {
        this.toast('Moedas insuficientes.', 'warn');
        audio.play('error');
        return;
      }
      if (e.upgrade) {
        if (!hasMats(e.upgrade.mats)) {
          this.toast('Faltam materiais para esta melhoria.', 'warn');
          audio.play('error');
          return;
        }
        consumeMats(e.upgrade.mats);
        st.player.gold -= e.price;
        replaceItem(e.upgrade.from, e.id);
        this.toast(`${d.name} pronto!`, 'level');
        audio.play('craft');
      } else {
        if (!hasRoom(e.id, n)) {
          this.toast('Sem espaço no inventário.', 'warn');
          audio.play('error');
          return;
        }
        st.player.gold -= e.price * n;
        addItem(e.id, n);
        if (e.once) st.flags['bought_' + e.id] = true;
        audio.play('coin');
      }
      bus.emit('gold');
      render();
    });
    return row;
  }

  private freeHome(kind: string): WObj | null {
    const st = S();
    const ad = ANIMALS[kind];
    for (const o of Object.values(st.locs.world.objects)) {
      const k = OBJ[o.kind];
      if (k?.animals !== ad.house) continue;
      if (st.animals.filter((a) => a.home === o.id).length < (k.cap || 6)) return o;
    }
    return null;
  }

  private animalRow(e: ShopEntry, render: () => void) {
    const st = S();
    const ad = ANIMALS[e.animal!];
    const row = el('div', 'shop-row');
    row.appendChild(iconImg(ad.product));
    const home = this.freeHome(ad.id);
    const needs = home ? `Vai morar no seu ${HOUSE_LABEL[ad.house]}` : `Requer um ${HOUSE_LABEL[ad.house]} com espaço livre`;
    const tool = ad.tool === 'pail' ? ' • precisa do Balde' : ad.tool === 'shears' ? ' • precisa da Tesoura' : '';
    row.appendChild(el('div', '', `<div><b>${esc(ad.name)}</b></div><div class="sub">Produz ${esc(item(ad.product).name)}${ad.every > 1 ? ` a cada ${ad.every} dias` : ' todo dia'}${tool}<br>${needs}</div>`));
    row.appendChild(el('div', 'price', `<span class="coin"></span>${fmtGold(e.price)}`));
    if (!home || st.player.gold < e.price) row.classList.add('cant');
    row.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      const h = this.freeHome(ad.id);
      if (!h) {
        this.toast(`Construa um ${HOUSE_LABEL[ad.house]} (ou libere espaço) primeiro.`, 'warn');
        audio.play('error');
        return;
      }
      if (st.player.gold < e.price) {
        this.toast('Moedas insuficientes.', 'warn');
        audio.play('error');
        return;
      }
      const taken = new Set(st.animals.map((a) => a.name));
      const suggestion = ad.names.find((n) => !taken.has(n)) || ad.name;
      this.namePrompt(`Sua nova ${ad.name}`, 'Dê um nome ao seu novo animal:', suggestion, (name) => {
        if (st.player.gold < e.price || !this.freeHome(ad.id)) return;
        st.player.gold -= e.price;
        const a: AnimalState = { id: newId('a'), kind: ad.id, name, home: h.id, pts: 0, petted: false, product: null, days: 0, age: 0, v: Math.floor(Math.random() * ad.variants) };
        st.animals.push(a);
        addStat('animal_bought');
        audio.play(ad.sound);
        this.toast(`${name} chegou ao seu ${HOUSE_LABEL[ad.house]}!`, 'heart');
        bus.emit('gold');
        bus.emit('animalAdded', a);
        render();
      });
    });
    return row;
  }

  namePrompt(title: string, label: string, def: string, onOk: (name: string) => void) {
    const { wrap, body } = this.panel(title, 'confirm');
    body.appendChild(el('p', '', esc(label)));
    const input = el('input', 'name-input') as HTMLInputElement;
    input.maxLength = 14;
    input.value = def;
    const ok = () => {
      const n = input.value.trim() || def;
      this.closeTop();
      onOk(n);
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') ok();
      if (e.key === 'Escape') this.closeTop();
    });
    body.appendChild(input);
    const row = el('div', 'row');
    row.append(button('Confirmar', ok, 'btn gold'), button('Cancelar', () => this.closeTop()));
    body.appendChild(row);
    this.pushModal(wrap, 'confirm');
    setTimeout(() => {
      input.focus();
      input.select();
    }, 30);
  }

  animalHouse(o: WObj) {
    const st = S();
    const k = OBJ[o.kind];
    o.data = o.data || {};
    const { wrap, body } = this.panel(k.name, 'board');
    const render = () => {
      body.innerHTML = '';
      hideTip();
      const list = st.animals.filter((a) => a.home === o.id);
      const hay = o.data!.hay || 0;
      const top = el('div', '');
      top.style.cssText = 'display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:10px';
      top.appendChild(el('div', '', `<b>${list.length}/${k.cap || 6}</b> animais`));
      const tr = el('div', 'mat ' + (hay > 0 ? 'ok' : 'miss'));
      tr.appendChild(iconImg('hay'));
      tr.appendChild(el('span', '', `Comedouro: <b>${hay}/60</b> feno`));
      top.appendChild(tr);
      const have = count('hay');
      const b = button(`Colocar feno (você tem ${have})`, () => {
        const n = Math.min(count('hay'), 60 - (o.data!.hay || 0));
        if (n <= 0) return;
        removeItem('hay', n);
        o.data!.hay = (o.data!.hay || 0) + n;
        audio.play('harvest');
        render();
      }, 'btn small');
      b.disabled = have === 0 || hay >= 60;
      top.appendChild(b);
      body.appendChild(top);
      body.appendChild(el('div', 'hint', 'Em dias de sol (fora do inverno) os animais saem para pastar e se alimentam sozinhos. Na chuva, na neve ou no inverno, cada animal come 1 feno do comedouro por dia. Faça carinho diariamente para que fiquem felizes e produzam itens de qualidade.'));
      const grid = el('div', 'build-list');
      grid.style.marginTop = '12px';
      if (!list.length) grid.appendChild(el('div', 'hint', 'Nenhum animal ainda. Compre animais com a Marta, no Rancho Prado Verde, ao sul da fazenda.'));
      for (const a of list) {
        const ad = ANIMALS[a.kind];
        const h = Math.floor(a.pts / HEART_PTS);
        const card = el('div', 'build-card');
        const src = this.ctx.texSource(ad.tex + '_' + Math.min(a.v, ad.variants - 1));
        if (src) {
          const c = el('canvas');
          c.width = ad.w;
          c.height = ad.h;
          c.getContext('2d')!.drawImage(src, 0, 0, ad.w, ad.h, 0, 0, ad.w, ad.h);
          c.style.width = ad.w * 3 + 'px';
          c.style.height = ad.h * 3 + 'px';
          card.appendChild(c);
        }
        const status = a.product ? `<span style="color:#2f7a2a"><b>${esc(item(a.product).name)} pronto!</b></span>` : ad.tool ? 'Produzindo...' : 'Põe ovos perto do galinheiro';
        card.appendChild(el('div', '', `<b style="font-size:1.15em">${esc(a.name)}</b> <span class="hint">${esc(ad.name)}, ${a.age} dia(s)</span><div class="hearts-s" style="color:#c8402e">${'♥'.repeat(h)}<span class="off" style="color:rgba(120,80,40,.3)">${'♥'.repeat(5 - h)}</span></div><div>${a.petted ? '✔ Recebeu carinho hoje' : '✗ Ainda sem carinho hoje'}</div><div>${status}</div>`));
        grid.appendChild(card);
      }
      body.appendChild(grid);
    };
    this.refreshTab = render;
    render();
    this.pushModal(wrap, 'animals');
  }

  // ------------------------------------------------------------ guild
  guildBoard() {
    const { wrap, body } = this.panel('Guilda dos Mercadores de Valoria', 'board');
    const render = () => {
      body.innerHTML = '';
      hideTip();
      const g = guild();
      const n = S().stats.guild_contract || 0;
      body.appendChild(el('div', 'hint', `Sua posição na guilda: <b>${guildRank()}</b> • ${n} contrato(s) concluído(s). Novos contratos chegam todos os dias.`));
      const cols = el('div', 'board-cols');
      cols.style.marginTop = '10px';
      cols.style.gridTemplateColumns = 'repeat(3, 1fr)';
      for (const c of g.list) {
        const [a, b] = contractProgress(c);
        const note = el('div', 'note', `<h4>${c.kind === 'deliver' ? 'Entrega' : 'Caçada'}</h4><p>${esc(contractText(c))}</p><p><b>Progresso:</b> ${a}/${b}<br><b>Recompensa:</b> ${fmtGold(c.reward)} moedas</p>`);
        if (c.kind === 'deliver') note.insertBefore(iconImg(c.item!), note.firstChild);
        if (c.done) note.appendChild(el('div', '', '<b style="color:#2f7a2a">✔ Concluído</b>'));
        else if (!c.accepted)
          note.appendChild(
            button(
              'Aceitar',
              () => {
                acceptContract(c);
                render();
              },
              'btn small gold',
            ),
          );
        else {
          const btn = button(
            c.kind === 'deliver' ? 'Entregar' : 'Receber recompensa',
            () => {
              if (completeContract(c)) render();
            },
            'btn small gold',
          );
          btn.disabled = a < b;
          note.appendChild(btn);
        }
        cols.appendChild(note);
      }
      body.appendChild(cols);
    };
    this.refreshTab = render;
    render();
    this.pushModal(wrap, 'guild');
  }

  // ------------------------------------------------------------ chest
  chest(id: string, size: number, title: string) {
    const st = S();
    if (!st.chests[id]) st.chests[id] = new Array(size).fill(null);
    const arr = st.chests[id];
    const { wrap, body } = this.panel(title, '');
    const render = () => {
      body.innerHTML = '';
      hideTip();
      body.appendChild(el('div', 'section-label', title));
      body.appendChild(this.grid(arr, 0, arr.length, { quick: st.inv, cols: 9, rerender: render }));
      body.appendChild(el('div', 'section-label', 'Seu Inventário'));
      body.appendChild(this.grid(st.inv, 0, 36, { quick: arr, cols: 9, rerender: render }));
      const row = el('div', '');
      row.style.cssText = 'display:flex;gap:8px;margin-top:10px';
      row.appendChild(
        button(
          'Guardar tudo da mochila',
          () => {
            for (let i = 10; i < 36; i++) {
              const s = st.inv[i];
              if (!s) continue;
              const left = addTo(arr, s.id, s.qty);
              st.inv[i] = left ? { id: s.id, qty: left } : null;
            }
            bus.emit('inv');
            render();
          },
          'btn small',
        ),
      );
      row.appendChild(el('div', 'hint', 'Shift+clique move itens entre o baú e o inventário.'));
      body.appendChild(row);
    };
    this.refreshTab = render;
    render();
    this.pushModal(wrap, 'chest');
  }

  // ------------------------------------------------------------ notice board
  board() {
    const st = S();
    const { wrap, body } = this.panel('Quadro de Avisos de Greenvale', 'board');
    const render = () => {
      body.innerHTML = '';
      const cols = el('div', 'board-cols');
      const left = el('div', '');
      left.appendChild(el('div', 'section-label', 'Pedido do Dia'));
      const d = st.daily;
      if (d) {
        const n = NPC_BY_ID[d.npc];
        const note = el('div', 'note', `<h4>${esc(n.name)} precisa de ajuda!</h4><p>"${esc(dailyText())}"</p><p><b>Traga:</b> ${d.qty}× ${esc(item(d.item).name)} (você tem ${count(d.item)})<br><b>Recompensa:</b> ${d.reward} moedas</p>`);
        if (d.done) note.appendChild(el('div', '', '<b style="color:#2f7a2a">✔ Pedido concluído. Volte amanhã!</b>'));
        else if (d.accepted) note.appendChild(el('div', 'hint', `Pedido aceito. Entregue a ${esc(n.name)} conversando com ele(a).`));
        else
          note.appendChild(
            button(
              'Aceitar pedido',
              () => {
                d.accepted = true;
                audio.play('quest');
                bus.emit('quest');
                render();
              },
              'btn small gold',
            ),
          );
        left.appendChild(note);
      }
      left.appendChild(el('div', 'note', st.flags.road_open ? `<h4>Aviso da Guarda Real</h4><p>A Estrada Real está aberta! Viajantes podem seguir pelo portão das montanhas até Valoria, a Capital.</p>` : `<h4>Aviso da Guarda Real</h4><p>A Estrada Real permanece fechada por ordem da Coroa. Viajantes devem se apresentar à Capitã Brenna no portão das montanhas.</p>`));
      cols.appendChild(left);
      const right = el('div', '');
      right.appendChild(el('div', 'section-label', 'Projetos da Vila'));
      for (const p of PROJECTS) {
        const done = !!st.projects[p.id];
        const note = el('div', 'note', `<h4>${done ? '✔ ' : ''}${esc(p.name)}</h4><p>${esc(p.desc)}</p>`);
        if (!done) {
          const mats = el('div', 'mats');
          for (const m of p.mats) {
            const have = count(m.id);
            const me = el('span', 'mat ' + (have >= m.qty ? 'ok' : 'miss'));
            me.appendChild(iconImg(m.id));
            me.appendChild(el('span', '', `${esc(item(m.id).name)} ${Math.min(have, 999)}/${m.qty}`));
            mats.appendChild(me);
          }
          if (p.gold) mats.appendChild(el('span', 'mat ' + (st.player.gold >= p.gold ? 'ok' : 'miss'), `<span class="coin"></span> ${fmtGold(p.gold)}`));
          note.appendChild(mats);
          if (p.id === 'bridge') note.appendChild(el('div', 'hint', esc(p.where)));
          else {
            const b = button(
              'Contribuir',
              () => {
                if (fundProject(p.id)) {
                  this.toast(`Projeto concluído: ${p.name}!`, 'quest');
                  render();
                }
              },
              'btn small gold',
            );
            b.disabled = !canFund(p);
            note.appendChild(b);
          }
        } else note.appendChild(el('div', 'hint', 'Obrigado pela contribuição!'));
        right.appendChild(note);
      }
      cols.appendChild(right);
      body.appendChild(cols);
    };
    render();
    this.pushModal(wrap, 'board');
  }

  // ------------------------------------------------------------ generic
  confirm(title: string, html: string, yes: string, onYes: () => void, no = 'Cancelar', yesEnabled = true) {
    const { wrap, body } = this.panel(title, 'confirm');
    body.appendChild(el('div', '', html));
    const row = el('div', 'row');
    const y = button(
      yes,
      () => {
        this.closeTop();
        onYes();
      },
      'btn gold',
    );
    y.disabled = !yesEnabled;
    row.append(y, button(no, () => this.closeTop()));
    body.appendChild(row);
    this.pushModal(wrap, 'confirm');
  }

  projectConfirm(id: string) {
    const p = projectById(id);
    const st = S();
    const mats = p.mats.map((m) => `<span class="mat ${count(m.id) >= m.qty ? 'ok' : 'miss'}">${esc(item(m.id).name)}: ${count(m.id)}/${m.qty}</span>`).join(' &nbsp; ');
    this.confirm(p.name, `<p>${esc(p.desc)}</p><p>${mats}</p>${p.gold ? `<p>${fmtGold(p.gold)} moedas (você tem ${fmtGold(st.player.gold)})</p>` : ''}`, 'Construir', () => {
      if (fundProject(id)) this.toast(`${p.name} concluído!`, 'quest');
    }, 'Agora não', canFund(p));
  }

  caveFloors(max: number, onPick: (f: number) => void) {
    const { wrap, body } = this.panel('Mina Sussurrante', 'confirm');
    body.appendChild(el('p', '', 'Os elevadores de corda dos antigos mineiros levam aos andares já explorados. Para qual andar deseja descer?'));
    const row = el('div', 'row');
    for (const f of [1, 5, 10].filter((x) => x <= max))
      row.appendChild(
        button(
          `Andar ${f}`,
          () => {
            this.closeTop();
            onPick(f);
          },
          'btn gold',
        ),
      );
    body.appendChild(row);
    this.pushModal(wrap, 'confirm');
  }

  pause() {
    const { wrap, body } = this.panel('Pausa', 'pause');
    const st = S();
    body.appendChild(el('div', 'hint', `${esc(st.player.name)} — ${fmtDate(st.time.day, st.time.season)}, Ano ${st.time.year}`));
    body.appendChild(button('Continuar', () => this.closeTop(), 'btn gold'));
    body.appendChild(
      button('Salvar Jogo', () => {
        if (saveGame()) this.toast('Jogo salvo!', 'quest');
        else this.toast('Não foi possível salvar.', 'warn');
      }),
    );
    body.appendChild(button('Configurações', () => this.settings()));
    body.appendChild(button('Controles', () => this.controls()));
    body.appendChild(
      button(
        'Sair para o Menu Principal',
        () =>
          this.confirm('Sair para o Menu', '<p>O progresso desde o último salvamento será perdido. O jogo é salvo automaticamente ao dormir.</p>', 'Salvar e sair', () => {
            saveGame();
            this.closeAll();
            this.ctx.quitToMenu();
          }, 'Cancelar'),
        'btn danger',
      ),
    );
    this.pushModal(wrap, 'pause');
  }

  settings() {
    const { wrap, body } = this.panel('Configurações', 'pause');
    const s = audio.settings;
    const mk = (label: string, k: 'music' | 'sfx' | 'ambient') => {
      const row = el('div', 'vol');
      const v = el('b', '', Math.round(s[k] * 100) + '');
      const r = el('input') as HTMLInputElement;
      r.type = 'range';
      r.min = '0';
      r.max = '100';
      r.value = String(Math.round(s[k] * 100));
      r.addEventListener('input', () => {
        s[k] = parseInt(r.value, 10) / 100;
        v.textContent = r.value;
        audio.applyVolumes(s);
        saveSettings(s);
      });
      row.append(el('span', '', label), r, v);
      body.appendChild(row);
    };
    mk('Música', 'music');
    mk('Efeitos', 'sfx');
    mk('Ambiente', 'ambient');
    body.appendChild(button('Voltar', () => this.closeTop()));
    this.pushModal(wrap, 'settings');
  }

  controls() {
    const { wrap, body } = this.panel('Controles', 'confirm');
    const rows: [string, string][] = [
      ['W A S D / Setas', 'Mover'],
      ['Shift', 'Correr'],
      ['Clique esq. / Espaço', 'Usar ferramenta ou item'],
      ['Clique dir. / E', 'Interagir, conversar, colher, comer'],
      ['1–0 / Roda do mouse', 'Escolher item da barra'],
      ['I / Tab', 'Inventário'],
      ['C', 'Criação'],
      ['J', 'Diário de missões'],
      ['M', 'Mapa'],
      ['P', 'Personagem'],
      ['B', 'Construção'],
      ['Esc', 'Pausa / fechar janelas'],
    ];
    const t = el('div', 'controls-table');
    for (const [k, v] of rows) t.append(el('kbd', '', k), el('span', '', v));
    body.appendChild(t);
    body.appendChild(el('div', 'row', ''));
    (body.lastChild as HTMLElement).appendChild(button('Voltar', () => this.closeTop()));
    this.pushModal(wrap, 'controls');
  }

  reset() {
    this.closeAll();
    this.closeDialogue(true);
    this.held = null;
    this.renderHeld();
    this.showHUD(false);
    this.prompt(null);
    this.toastsEl.innerHTML = '';
  }
}

export const ui = new UI();
void SEASONS;
void removeItem;
