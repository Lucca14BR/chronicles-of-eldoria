/** Title screen, save slots and character creation (DOM). */
import { el, esc, button } from './dom';
import { slotInfo, SLOTS, deleteSlot, lastSlot, saveSettings } from '../systems/save';
import { previewCanvas, CharSpec } from '../art/characters';
import { SEASONS } from '../core/time';
import type { Look } from '../core/state';
import { audio } from '../systems/audio';

export interface MenuCallbacks {
  newGame(slot: number, name: string, look: Look): void;
  load(slot: number): void;
}

const SKINS = ['#f6d2b0', '#f0c8a0', '#e0b090', '#c88a60', '#a86a48', '#7a4a30'];
const HAIRS = ['#2a1a14', '#5a3a20', '#8a5a2a', '#c8602a', '#e0c070', '#e8e4dc', '#3a4a8a', '#8a3a6a'];
const SHIRTS = ['#3a7ab0', '#b84a3a', '#4f8a3a', '#8a5aa8', '#d8a040', '#5a5a6a', '#e8e0d0', '#2a6a6a'];
const PANTS = ['#6e5a40', '#3a3a42', '#4a3a6a', '#5a3a22', '#3a5a3a', '#7a6a5a'];
const STYLES = ['Curto', 'Longo', 'Rabo de Cavalo', 'Volumoso'];

export class MainMenu {
  private root: HTMLElement;
  private anim: number | null = null;

  constructor(private cb: MenuCallbacks) {
    this.root = document.getElementById('menu')!;
  }

  private clear() {
    if (this.anim) clearInterval(this.anim);
    this.anim = null;
    this.root.innerHTML = '';
  }

  hide() {
    this.clear();
    this.root.style.display = 'none';
  }

  title() {
    this.clear();
    this.root.style.display = 'flex';
    const logo = el('div', 'logo', `<div class="l1">Chronicles<br>of Eldoria</div><div class="l2">CONSTRUA • EXPLORE • VIVA SUA LENDA</div>`);
    this.root.appendChild(logo);
    const b = el('div', 'menu-buttons');
    const last = lastSlot();
    if (last !== null) b.appendChild(button('Continuar', () => this.go(() => this.cb.load(last)), 'btn gold'));
    b.appendChild(button('Novo Jogo', () => this.slots('new'), last === null ? 'btn gold' : 'btn'));
    b.appendChild(button('Carregar Jogo', () => this.slots('load')));
    b.appendChild(button('Configurações', () => this.settings()));
    b.appendChild(button('Como Jogar', () => this.help()));
    this.root.appendChild(b);
    this.root.appendChild(el('div', 'menu-foot', 'Chronicles of Eldoria — um RPG original de fazenda e aventura medieval • Arte, música e sons gerados proceduralmente'));
  }

  private go(fn: () => void) {
    audio.init();
    fn();
  }

  private panel(title: string, cls = '') {
    this.clear();
    this.root.style.display = 'flex';
    const p = el('div', 'panel-wrap panel-parch ' + cls);
    p.appendChild(el('h2', 'ptitle', esc(title)));
    this.root.appendChild(p);
    return p;
  }

  slots(mode: 'new' | 'load') {
    const p = this.panel(mode === 'new' ? 'Escolha um Espaço' : 'Carregar Jogo');
    const row = el('div', 'slots');
    for (let s = 0; s < SLOTS; s++) {
      const info = slotInfo(s);
      const card = el('div', 'slot-card panel-parch');
      if (info) {
        const spec: CharSpec = { ...info.look, outfit: 'tunic', cape: '#8a2a2a' };
        card.appendChild(previewCanvas(spec, 0, 0, 4));
        card.appendChild(el('div', 'sname', esc(info.name)));
        card.appendChild(el('div', 'sinfo', `Dia ${info.day} de ${SEASONS[info.season]}, Ano ${info.year}<br><span class="coin"></span> ${info.gold.toLocaleString('pt-BR')} moedas<br>${new Date(info.savedAt).toLocaleString('pt-BR')}`));
        const r = el('div', 'row');
        if (mode === 'load') r.appendChild(button('Jogar', () => this.go(() => this.cb.load(s)), 'btn small gold'));
        else
          r.appendChild(
            button('Sobrescrever', () => this.confirm(`Apagar o progresso de ${info.name} e começar um novo jogo neste espaço?`, () => this.creator(s)), 'btn small'),
          );
        r.appendChild(button('Excluir', () => this.confirm(`Excluir permanentemente o jogo de ${info.name}?`, () => {
          deleteSlot(s);
          this.slots(mode);
        }), 'btn small danger'));
        card.appendChild(r);
      } else {
        card.appendChild(el('div', 'sname', `Espaço ${s + 1}`));
        card.appendChild(el('div', 'sinfo', 'Vazio'));
        if (mode === 'new') card.appendChild(button('Começar aqui', () => this.creator(s), 'btn small gold'));
      }
      row.appendChild(card);
    }
    p.appendChild(row);
    const back = el('div', '');
    back.style.cssText = 'display:flex;justify-content:center;margin-top:16px';
    back.appendChild(button('Voltar', () => this.title()));
    p.appendChild(back);
  }

  private confirm(text: string, yes: () => void) {
    const p = this.panel('Confirmar', 'confirm');
    p.appendChild(el('p', '', esc(text)));
    const r = el('div', 'row');
    r.append(button('Sim', yes, 'btn gold'), button('Não', () => this.title()));
    p.appendChild(r);
  }

  creator(slot: number) {
    const p = this.panel('Criação de Personagem', 'creator');
    const look: Look = { skin: SKINS[1], hair: HAIRS[1], hairStyle: 0, shirt: SHIRTS[0], pants: PANTS[0] };
    let name = '';
    const lay = el('div', 'creator-layout');
    const prev = el('div', 'preview-box');
    const stage = el('div', 'stage');
    prev.appendChild(stage);
    prev.appendChild(el('div', 'hint', 'Seu viajante em Eldoria'));
    lay.appendChild(prev);
    let dir = 0;
    let frame = 0;
    const draw = () => {
      stage.innerHTML = '';
      const spec: CharSpec = { ...look, outfit: 'tunic', cape: '#8a2a2a' };
      const d = [0, 2, 1, 2][dir] as 0 | 1 | 2;
      const f = [1, 0, 2, 0][frame % 4];
      stage.appendChild(previewCanvas(spec, d, f, 8, dir === 3));
    };
    this.anim = window.setInterval(() => {
      frame++;
      if (frame % 8 === 0) dir = (dir + 1) % 4;
      draw();
    }, 180);
    const opts = el('div', '');
    const nameRow = el('div', 'opt-row');
    nameRow.appendChild(el('label', '', 'Nome'));
    const input = el('input', 'name-input') as HTMLInputElement;
    input.maxLength = 14;
    input.placeholder = 'Digite seu nome...';
    input.addEventListener('input', () => (name = input.value.trim()));
    input.addEventListener('keydown', (e) => e.stopPropagation());
    nameRow.appendChild(input);
    opts.appendChild(nameRow);
    const swatchRow = (label: string, colors: string[], k: 'skin' | 'hair' | 'shirt' | 'pants') => {
      const r = el('div', 'opt-row');
      r.appendChild(el('label', '', label));
      const s = el('div', 'swatches');
      for (const c of colors) {
        const sw = el('div', 'swatch' + (look[k] === c ? ' on' : ''));
        sw.style.background = c;
        sw.addEventListener('click', () => {
          look[k] = c;
          audio.play('click');
          s.querySelectorAll('.swatch').forEach((x) => x.classList.remove('on'));
          sw.classList.add('on');
          draw();
        });
        s.appendChild(sw);
      }
      r.appendChild(s);
      opts.appendChild(r);
    };
    swatchRow('Tom de Pele', SKINS, 'skin');
    const sr = el('div', 'opt-row');
    sr.appendChild(el('label', '', 'Penteado'));
    const sty = el('div', 'styles');
    STYLES.forEach((n, i) => {
      const b = button(n, () => {
        look.hairStyle = i;
        sty.querySelectorAll('button').forEach((x, j) => x.classList.toggle('gold', j === i));
        draw();
      }, 'btn small' + (i === 0 ? ' gold' : ''));
      sty.appendChild(b);
    });
    sr.appendChild(sty);
    opts.appendChild(sr);
    swatchRow('Cor do Cabelo', HAIRS, 'hair');
    swatchRow('Cor da Túnica', SHIRTS, 'shirt');
    swatchRow('Cor da Calça', PANTS, 'pants');
    lay.appendChild(opts);
    p.appendChild(lay);
    const row = el('div', '');
    row.style.cssText = 'display:flex;justify-content:space-between;margin-top:14px';
    row.appendChild(button('Voltar', () => this.slots('new')));
    row.appendChild(
      button(
        'Começar Aventura',
        () => {
          const n = name || 'Viajante';
          this.go(() => this.cb.newGame(slot, n, { ...look }));
        },
        'btn gold',
      ),
    );
    p.appendChild(row);
    draw();
    setTimeout(() => input.focus(), 50);
  }

  settings() {
    const p = this.panel('Configurações', 'pause');
    audio.init();
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
      p.appendChild(row);
    };
    mk('Música', 'music');
    mk('Efeitos', 'sfx');
    mk('Ambiente', 'ambient');
    p.appendChild(button('Voltar', () => this.title()));
  }

  help() {
    const p = this.panel('Como Jogar', 'confirm');
    p.style.width = 'min(640px, 94vw)';
    p.style.textAlign = 'left';
    p.appendChild(
      el(
        'div',
        '',
        `<p>Você herdou uma fazenda abandonada em <b>Greenvale</b>, no reino de Eldoria. Limpe o terreno, plante, colha e venda sua produção. Faça amizade com os moradores, crie ferramentas e móveis, reconstrua a vila e explore florestas, minas e ruínas antigas.</p>
        <div class="controls-table">
          <kbd>WASD / Setas</kbd><span>Mover (Shift para correr)</span>
          <kbd>Clique esq. / Espaço</kbd><span>Usar a ferramenta ou item selecionado</span>
          <kbd>Clique dir. / E</kbd><span>Interagir: conversar, colher, abrir, comer</span>
          <kbd>1–0 / Roda</kbd><span>Escolher item da barra</span>
          <kbd>I · C · J · M · P · B</kbd><span>Inventário · Criação · Diário · Mapa · Personagem · Construção</span>
          <kbd>Esc</kbd><span>Pausa, salvar e configurações</span>
        </div>
        <p class="hint">Dica: regue suas plantas todos os dias. Durma na cama da sua casa para passar o dia — o jogo é salvo automaticamente.</p>`,
      ),
    );
    const r = el('div', 'row');
    r.appendChild(button('Voltar', () => this.title()));
    p.appendChild(r);
  }
}
