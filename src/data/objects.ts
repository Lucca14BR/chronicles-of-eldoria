/** World object kinds (trees, rocks, buildings, furniture...). */
import type { SkillId, WObj } from '../core/state';

export interface Drop {
  id: string;
  min: number;
  max: number;
  chance?: number;
}

export interface LightDef {
  dx: number;
  dy: number;
  r: number;
  color?: number;
  night?: boolean; // only lights up at night
  flicker?: boolean;
  project?: string; // only when village project done
}

export interface ObjKind {
  name: string;
  tex: string | ((season: number, o: WObj) => string);
  frame?: (o: WObj, season: number) => number;
  w: number;
  h: number;
  solid: boolean;
  tool?: 'axe' | 'pick' | 'any';
  hp?: number;
  tier?: number;
  drops?: Drop[];
  xp?: [SkillId, number];
  interact?: string;
  label?: string; // interaction verb
  light?: LightDef[];
  item?: string; // item returned when removed
  flat?: boolean;
  anim?: string;
  door?: { dx: number; to?: string; tx?: number; ty?: number; locked?: string };
  station?: string[];
  oy?: number;
  sfx?: 'chop' | 'mine' | 'pop';
  chest?: number;
  stat?: string;
  animals?: 'coop' | 'barn'; // animal building
  cap?: number;
  depthOff?: number;
}

const SEASONAL = (base: string) => (s: number) => base + '_' + s;

const houseWindows = (a: number, b: number): LightDef[] => [
  { dx: a, dy: -30, r: 34, color: 0xffc060, night: true },
  { dx: b, dy: -30, r: 34, color: 0xffc060, night: true },
];

export const OBJ: Record<string, ObjKind> = {
  // ---------------- nature
  tree_oak: { name: 'Carvalho', tex: SEASONAL('tree_oak'), w: 1, h: 1, solid: true, tool: 'axe', hp: 8, drops: [{ id: 'wood', min: 4, max: 6 }, { id: 'acorn', min: 1, max: 1, chance: 0.35 }], xp: ['foraging', 8], oy: 3, sfx: 'chop', stat: 'chop' },
  tree_pine: { name: 'Pinheiro', tex: SEASONAL('tree_pine'), w: 1, h: 1, solid: true, tool: 'axe', hp: 8, drops: [{ id: 'wood', min: 5, max: 7 }, { id: 'acorn', min: 1, max: 1, chance: 0.2 }], xp: ['foraging', 8], oy: 3, sfx: 'chop', stat: 'chop' },
  tree_cherry: { name: 'Cerejeira', tex: SEASONAL('tree_cherry'), w: 1, h: 1, solid: true, tool: 'axe', hp: 8, drops: [{ id: 'wood', min: 4, max: 6 }], xp: ['foraging', 8], oy: 3, sfx: 'chop', stat: 'chop' },
  deco_cherry: { name: 'Cerejeira da Vila', tex: SEASONAL('tree_cherry'), w: 1, h: 1, solid: true, oy: 3 },
  deco_oak: { name: 'Carvalho Antigo', tex: SEASONAL('tree_oak'), w: 1, h: 1, solid: true, oy: 3 },
  sapling: { name: 'Muda de Árvore', tex: SEASONAL('sapling'), w: 1, h: 1, solid: true, tool: 'any', hp: 1, drops: [{ id: 'acorn', min: 1, max: 1 }], oy: 2, sfx: 'pop', item: undefined },
  bush: { name: 'Arbusto', tex: SEASONAL('bush'), w: 1, h: 1, solid: true, tool: 'axe', hp: 3, drops: [{ id: 'wood', min: 1, max: 2 }, { id: 'fiber', min: 1, max: 2 }], xp: ['foraging', 2], sfx: 'chop' },
  bush_berry: {
    name: 'Arbusto de Amoras',
    tex: (s, o) => (o.data?.ripe && s < 3 ? 'bush_berry' : 'bush_' + s),
    w: 1,
    h: 1,
    solid: true,
    tool: 'axe',
    hp: 3,
    drops: [{ id: 'wood', min: 1, max: 2 }, { id: 'fiber', min: 1, max: 2 }],
    interact: 'berry',
    label: 'Colher amoras',
    xp: ['foraging', 2],
    sfx: 'chop',
  },
  weed: { name: 'Mato', tex: SEASONAL('weed'), frame: (o) => (o.data?.v ?? 0), w: 1, h: 1, solid: false, tool: 'any', hp: 1, drops: [{ id: 'fiber', min: 1, max: 1, chance: 0.7 }], xp: ['foraging', 1], sfx: 'pop', stat: 'weed' },
  stone: { name: 'Pedra', tex: 'stone_small', frame: (o) => (o.data?.v ?? 0), w: 1, h: 1, solid: true, tool: 'pick', hp: 2, drops: [{ id: 'stone', min: 1, max: 2 }], xp: ['mining', 3], sfx: 'mine', stat: 'mine' },
  boulder: { name: 'Rochedo', tex: 'boulder', w: 2, h: 2, solid: true, tool: 'pick', hp: 10, tier: 1, drops: [{ id: 'stone', min: 10, max: 15 }], xp: ['mining', 15], sfx: 'mine', stat: 'mine' },
  ore_copper: { name: 'Veio de Cobre', tex: 'ore_copper', w: 1, h: 1, solid: true, tool: 'pick', hp: 4, drops: [{ id: 'copper_ore', min: 1, max: 3 }, { id: 'stone', min: 0, max: 1 }], xp: ['mining', 6], sfx: 'mine', stat: 'mine' },
  ore_iron: { name: 'Veio de Ferro', tex: 'ore_iron', w: 1, h: 1, solid: true, tool: 'pick', hp: 6, tier: 1, drops: [{ id: 'iron_ore', min: 1, max: 3 }], xp: ['mining', 10], sfx: 'mine', stat: 'mine' },
  ore_gold: { name: 'Veio de Ouro', tex: 'ore_gold', w: 1, h: 1, solid: true, tool: 'pick', hp: 8, tier: 2, drops: [{ id: 'gold_ore', min: 1, max: 3 }], xp: ['mining', 16], sfx: 'mine', stat: 'mine' },
  ore_coal: { name: 'Veio de Carvão', tex: 'ore_coal', w: 1, h: 1, solid: true, tool: 'pick', hp: 4, drops: [{ id: 'coal', min: 1, max: 2 }], xp: ['mining', 6], sfx: 'mine', stat: 'mine' },
  ore_crystal: { name: 'Geodo Cristalino', tex: 'ore_crystal', w: 1, h: 1, solid: true, tool: 'pick', hp: 5, tier: 1, drops: [{ id: 'crystal', min: 1, max: 2 }], xp: ['mining', 14], sfx: 'mine', light: [{ dx: 0, dy: -8, r: 26, color: 0x80e0ff }], stat: 'mine' },
  branch: { name: 'Galho Caído', tex: 'branch', w: 1, h: 1, solid: false, tool: 'any', hp: 1, drops: [{ id: 'wood', min: 1, max: 2 }], xp: ['foraging', 1], sfx: 'chop' },
  forage_herb: { name: 'Erva Medicinal', tex: 'forage_herb', w: 1, h: 1, solid: false, interact: 'forage', label: 'Colher', tool: 'any', hp: 1, drops: [{ id: 'herb', min: 1, max: 1 }], xp: ['foraging', 4], sfx: 'pop' },
  forage_mushroom: { name: 'Cogumelo', tex: 'forage_mushroom', w: 1, h: 1, solid: false, interact: 'forage', label: 'Colher', tool: 'any', hp: 1, drops: [{ id: 'mushroom', min: 1, max: 1 }], xp: ['foraging', 4], sfx: 'pop' },
  forage_flower: { name: 'Flor do Campo', tex: SEASONAL('forage_flower'), w: 1, h: 1, solid: false, interact: 'forage', label: 'Colher', tool: 'any', hp: 1, drops: [{ id: 'flower', min: 1, max: 1 }], xp: ['foraging', 3], sfx: 'pop' },
  reeds: { name: 'Juncos', tex: SEASONAL('reeds'), w: 1, h: 1, solid: false },
  lily: { name: 'Vitória-régia', tex: 'lily', w: 1, h: 1, solid: false, flat: true },
  waterfall: { name: 'Cachoeira', tex: 'waterfall', w: 3, h: 3, solid: false, anim: 'anim_waterfall', flat: true },

  // ---------------- buildings & village (static)
  house_player: { name: 'Sua Casa', tex: 'house_player', w: 5, h: 3, solid: true, door: { dx: 2, to: 'house', tx: 6, ty: 9 }, chest: 0, light: houseWindows(-23, 23) },
  house_tomas: { name: 'Casa de Tomás', tex: 'house_thatch', w: 5, h: 3, solid: true, door: { dx: 2, locked: 'A casa de Tomás. Ele prefere conversar do lado de fora.' }, light: houseWindows(-23, 23) },
  house_livia: { name: 'Casa de Lívia', tex: 'house_blue', w: 5, h: 3, solid: true, door: { dx: 1, locked: 'A casa de Lívia está trancada. Ela atende no mercado da praça.' }, light: houseWindows(13, 27) },
  house_aldric: { name: 'Casa de Aldric', tex: 'house_green', w: 5, h: 3, solid: true, door: { dx: 3, locked: 'Um aviso na porta diz: "Procure-me na forja."' }, light: houseWindows(-25, -11) },
  house_moreira: { name: 'Casa da Família Moreira', tex: 'house_stone', w: 6, h: 3, solid: true, door: { dx: 3, locked: 'A Família Moreira não está recebendo visitas agora.' }, light: houseWindows(-29, 29) },
  hut_elara: { name: 'Cabana de Elara', tex: 'hut', w: 4, h: 2, solid: true, door: { dx: 2, locked: 'A porta está selada com runas. Elara recebe visitas do lado de fora.' }, light: [{ dx: -17, dy: -26, r: 30, color: 0xb0f0a0, night: true }] },
  forge: { name: 'Forja de Aldric', tex: 'forge', w: 5, h: 2, solid: true, station: ['furnace', 'anvil'], light: [{ dx: 21, dy: -18, r: 46, color: 0xff8a30, flicker: true }] },
  stall: { name: 'Mercado de Lívia', tex: 'stall', w: 3, h: 2, solid: true, interact: 'stall', label: 'Mercado' },
  fountain: { name: 'Fonte da Praça', tex: 'fountain', w: 3, h: 2, solid: true, anim: 'anim_fountain', interact: 'well', label: 'Encher regador' },
  well: { name: 'Poço', tex: 'well', w: 2, h: 1, solid: true, interact: 'well', label: 'Encher regador' },
  noticeboard: { name: 'Quadro de Avisos', tex: 'noticeboard', w: 2, h: 1, solid: true, interact: 'board', label: 'Ler avisos' },
  lamppost: { name: 'Poste de Luz', tex: 'lamppost', frame: (o) => (o.data?.lit ? 1 : 0), w: 1, h: 1, solid: true, light: [{ dx: 0, dy: -30, r: 64, color: 0xffc870, night: true }] },
  bench: { name: 'Banco', tex: 'bench', w: 2, h: 1, solid: true },
  barrel: { name: 'Barril', tex: 'barrel', w: 1, h: 1, solid: true },
  crate: { name: 'Caixote', tex: 'crate', w: 1, h: 1, solid: true },
  sign: { name: 'Placa', tex: 'sign', w: 1, h: 1, solid: true, interact: 'sign', label: 'Ler' },
  shipbin: { name: 'Caixa de Vendas', tex: 'shipbin', w: 2, h: 1, solid: true, interact: 'ship', label: 'Vender itens' },
  cave_entrance: { name: 'Mina Sussurrante', tex: 'cave_entrance', w: 3, h: 2, solid: true, interact: 'cave', label: 'Entrar na mina' },
  gate_royal: { name: 'Portão da Estrada Real', tex: 'gate_royal', w: 6, h: 2, solid: true, interact: 'gate', label: 'Examinar' },
  bridge_site: { name: 'Ponte Quebrada', tex: 'bridge_site', w: 2, h: 1, solid: true, interact: 'bridge', label: 'Examinar' },
  statue: { name: 'Estátua Antiga', tex: 'statue', w: 2, h: 1, solid: true, interact: 'statue', label: 'Examinar' },
  pillar: { name: 'Pilar Antigo', tex: 'pillar', w: 1, h: 1, solid: true },
  pillar_broken: { name: 'Pilar Quebrado', tex: 'pillar_broken', w: 1, h: 1, solid: true },
  ruin_wall: { name: 'Muro em Ruínas', tex: 'ruin_wall', w: 2, h: 1, solid: true },
  ancient_chest: { name: 'Baú Antigo', tex: 'ancient_chest', frame: (o) => (o.data?.open ? 1 : 0), w: 2, h: 1, solid: true, interact: 'ancient', label: 'Abrir', light: [{ dx: 0, dy: -10, r: 30, color: 0xc080ff }] },
  mine_chest: { name: 'Baú do Tesouro', tex: 'ancient_chest', frame: (o) => (o.data?.open ? 1 : 0), w: 2, h: 1, solid: true, interact: 'mine_chest', label: 'Abrir', light: [{ dx: 0, dy: -10, r: 30, color: 0xffd080 }] },
  alchemy_elara: { name: 'Mesa de Alquimia de Elara', tex: 'alchemy', w: 2, h: 1, solid: true, station: ['alchemy'], light: [{ dx: 0, dy: -14, r: 26, color: 0xc090ff }] },

  // ---------------- ranch (static)
  house_ranch: { name: 'Casa de Marta', tex: 'house_ranch', w: 5, h: 3, solid: true, door: { dx: 2, locked: 'A casa de Marta. Um cheirinho de pão caseiro vem lá de dentro.' }, light: houseWindows(-23, 23) },
  ranch_barn: { name: 'Celeiro do Rancho', tex: 'barn', w: 5, h: 2, solid: true },
  fence_static: { name: 'Cerca', tex: 'fence', w: 1, h: 1, solid: true, oy: 2 },
  hay_bale: { name: 'Fardo de Feno', tex: 'hay_bale', w: 1, h: 1, solid: true },
  trough: { name: 'Bebedouro', tex: 'trough', w: 2, h: 1, solid: true },
  animal_egg: { name: 'Ovo', tex: (_s, o) => 'icon_' + (o.data?.item || 'egg'), w: 1, h: 1, solid: false, interact: 'egg', label: 'Pegar ovo', oy: -3 },

  // ---------------- capital (static)
  castle: { name: 'Castelo de Valoria', tex: 'castle', w: 12, h: 4, solid: true, door: { dx: 6, to: 'throne', tx: 8, ty: 11 }, light: [{ dx: -69, dy: -32, r: 30, color: 0xffc060, night: true }, { dx: 69, dy: -32, r: 30, color: 0xffc060, night: true }, { dx: 0, dy: -10, r: 48, color: 0xffb050, night: true }] },
  cathedral: { name: 'Catedral da Aurora', tex: 'cathedral', w: 6, h: 3, solid: true, door: { dx: 3, locked: 'A Catedral da Aurora está fechada para uma cerimônia. Um coro suave ecoa lá dentro.' }, light: [{ dx: 0, dy: -54, r: 36, color: 0x8ab0ff, night: true }] },
  guild_hall: { name: 'Guilda dos Mercadores', tex: 'guild_hall', w: 6, h: 3, solid: true, door: { dx: 3, locked: 'Os salões da guilda estão em reforma. O Mestre Corvin atende na entrada, junto ao quadro de contratos.' }, light: houseWindows(-31, 31) },
  armory: { name: 'Arsenal Real', tex: 'armory', w: 6, h: 3, solid: true, door: { dx: 3, locked: 'O depósito do arsenal é restrito à Guarda Real. Gaspar atende do lado de fora.' }, light: houseWindows(-29, 29) },
  tavern: { name: 'Taverna do Javali Dourado', tex: 'tavern', w: 6, h: 3, solid: true, door: { dx: 3, locked: 'A taverna está lotada até a porta! Lúcio costuma tocar aqui fora para quem não conseguiu entrar.' }, light: houseWindows(-31, 31) },
  city_house_a: { name: 'Casa de um Nobre', tex: 'city_house_a', w: 5, h: 3, solid: true, door: { dx: 2, locked: 'A residência de uma família nobre. Ninguém atende.' }, light: houseWindows(-23, 23) },
  city_house_b: { name: 'Casa de Pedra', tex: 'city_house_b', w: 5, h: 3, solid: true, door: { dx: 2, locked: 'Uma placa diz: "Alfaiataria — fechada para almoço".' }, light: houseWindows(-23, 23) },
  city_house_c: { name: 'Casa de Mercador', tex: 'house_green', w: 5, h: 3, solid: true, door: { dx: 3, locked: 'Uma casa de mercador. A porta está trancada.' }, light: houseWindows(-25, -11) },
  city_house_d: { name: 'Casa de Artesão', tex: 'house_blue', w: 5, h: 3, solid: true, door: { dx: 1, locked: 'Ouve-se o som de um tear lá dentro.' }, light: houseWindows(13, 27) },
  throne_seat: { name: 'Trono de Eldoria', tex: 'throne', w: 2, h: 1, solid: true, interact: 'sign', label: 'Examinar' },
  crystal_altar: { name: 'Altar de Cristal', tex: 'crystal_altar', w: 2, h: 1, solid: true, interact: 'altar', label: 'Examinar', light: [{ dx: 0, dy: -24, r: 56, color: 0x60a0ff }] },
  city_sign: { name: 'Placa de Valoria', tex: 'city_sign', w: 2, h: 1, solid: true, interact: 'sign', label: 'Ler' },
  city_stall: { name: 'Banca do Mercado', tex: 'stall', w: 3, h: 2, solid: true },
  city_banner: { name: 'Estandarte Real', tex: 'city_banner', w: 1, h: 1, solid: true },
  guild_board: { name: 'Quadro de Contratos', tex: 'noticeboard', w: 2, h: 1, solid: true, interact: 'guild', label: 'Ver contratos' },

  // ---------------- interior static
  bed: { name: 'Cama', tex: 'bed', w: 2, h: 2, solid: true, interact: 'bed', label: 'Dormir' },
  table_static: { name: 'Mesa', tex: 'table', w: 2, h: 1, solid: true },
  chair_static: { name: 'Cadeira', tex: 'chair', w: 1, h: 1, solid: true },
  shelf_static: { name: 'Estante', tex: 'bookshelf', w: 2, h: 1, solid: true, interact: 'shelf', label: 'Ler livros' },
  rug_static: { name: 'Tapete', tex: 'rug', w: 3, h: 2, solid: false, flat: true },
  pot_static: { name: 'Vaso', tex: 'plant_pot', w: 1, h: 1, solid: true },
  fireplace: { name: 'Lareira', tex: 'fireplace', w: 2, h: 1, solid: true, anim: 'anim_fireplace', light: [{ dx: 0, dy: -8, r: 80, color: 0xff9a40, flicker: true }], station: ['campfire'] },

  // ---------------- cave
  ladder_down: { name: 'Escada para Baixo', tex: 'ladder_down', w: 1, h: 1, solid: false, interact: 'ladder_down', label: 'Descer', flat: true },
  ladder_up: { name: 'Escada para a Superfície', tex: 'ladder_up', w: 1, h: 1, solid: true, interact: 'ladder_up', label: 'Subir à superfície' },
  wall_torch: { name: 'Tocha', tex: 'torch', anim: 'anim_torch', w: 1, h: 1, solid: true, light: [{ dx: 0, dy: -16, r: 60, color: 0xffa040, flicker: true }] },

  // ---------------- placeables
  workbench: { name: 'Bancada de Trabalho', tex: 'workbench', w: 2, h: 1, solid: true, tool: 'any', hp: 1, item: 'workbench', station: ['workbench'], interact: 'craft', label: 'Criar itens' },
  chest: { name: 'Baú de Madeira', tex: 'chest', frame: () => 0, w: 1, h: 1, solid: true, tool: 'any', hp: 1, item: 'chest', interact: 'chest', label: 'Abrir', chest: 27 },
  furnace: { name: 'Fornalha', tex: 'furnace', w: 1, h: 1, solid: true, tool: 'any', hp: 1, item: 'furnace', station: ['furnace'], interact: 'craft', label: 'Fundir' },
  anvil: { name: 'Bigorna', tex: 'anvil', w: 1, h: 1, solid: true, tool: 'any', hp: 1, item: 'anvil', station: ['anvil'], interact: 'craft', label: 'Forjar' },
  campfire: { name: 'Fogueira', tex: 'campfire', anim: 'anim_campfire', w: 1, h: 1, solid: true, tool: 'any', hp: 1, item: 'campfire', station: ['campfire'], interact: 'craft', label: 'Cozinhar', light: [{ dx: 0, dy: -6, r: 70, color: 0xff9a40, flicker: true }] },
  alchemy: { name: 'Mesa de Alquimia', tex: 'alchemy', w: 2, h: 1, solid: true, tool: 'any', hp: 1, item: 'alchemy', station: ['alchemy'], interact: 'craft', label: 'Alquimia', light: [{ dx: 0, dy: -14, r: 26, color: 0xc090ff }] },
  fence: { name: 'Cerca', tex: 'fence', w: 1, h: 1, solid: true, tool: 'any', hp: 1, item: 'fence', oy: 2 },
  torch: { name: 'Tocha', tex: 'torch', anim: 'anim_torch', w: 1, h: 1, solid: true, tool: 'any', hp: 1, item: 'torch', light: [{ dx: 0, dy: -16, r: 56, color: 0xffa040, flicker: true, night: true }] },
  lamp: { name: 'Poste de Lanterna', tex: 'lamppost', frame: () => 1, w: 1, h: 1, solid: true, tool: 'any', hp: 1, item: 'lamp', light: [{ dx: 0, dy: -30, r: 70, color: 0xffc870, night: true }] },
  scarecrow: { name: 'Espantalho', tex: 'scarecrow', w: 1, h: 1, solid: true, tool: 'any', hp: 1, item: 'scarecrow', oy: 2 },
  sprinkler: { name: 'Irrigador', tex: 'sprinkler', w: 1, h: 1, solid: true, tool: 'any', hp: 1, item: 'sprinkler' },
  sprinkler2: { name: 'Irrigador de Qualidade', tex: 'sprinkler2', w: 1, h: 1, solid: true, tool: 'any', hp: 1, item: 'sprinkler2' },
  table: { name: 'Mesa de Carvalho', tex: 'table', w: 2, h: 1, solid: true, tool: 'any', hp: 1, item: 'table' },
  chair: { name: 'Cadeira', tex: 'chair', w: 1, h: 1, solid: true, tool: 'any', hp: 1, item: 'chair' },
  bookshelf: { name: 'Estante', tex: 'bookshelf', w: 2, h: 1, solid: true, tool: 'any', hp: 1, item: 'bookshelf' },
  plant_pot: { name: 'Vaso de Planta', tex: 'plant_pot', w: 1, h: 1, solid: true, tool: 'any', hp: 1, item: 'plant_pot' },
  rug: { name: 'Tapete Real', tex: 'rug', w: 3, h: 2, solid: false, flat: true, tool: 'any', hp: 1, item: 'rug' },
  banner: { name: 'Estandarte', tex: 'banner', w: 1, h: 1, solid: true, tool: 'any', hp: 1, item: 'banner' },
  flower_bed: { name: 'Canteiro de Flores', tex: SEASONAL('flower_bed'), w: 1, h: 1, solid: true, tool: 'any', hp: 1, item: 'flower_bed' },
  barrel_p: { name: 'Barril', tex: 'barrel', w: 1, h: 1, solid: true, tool: 'any', hp: 1, item: 'barrel' },
  sapling_p: { name: 'Muda de Árvore', tex: SEASONAL('sapling'), w: 1, h: 1, solid: true, tool: 'any', hp: 1, drops: [{ id: 'acorn', min: 1, max: 1 }], oy: 2, sfx: 'pop' },

  // ---------------- constructed buildings
  b_coop: { name: 'Galinheiro', tex: 'coop', w: 3, h: 2, solid: true, interact: 'animals', label: 'Ver animais', animals: 'coop', cap: 6, light: [{ dx: -12, dy: -18, r: 24, color: 0xffc060, night: true }] },
  b_barn: { name: 'Celeiro', tex: 'barn', w: 5, h: 2, solid: true, interact: 'animals', label: 'Ver animais', animals: 'barn', cap: 6 },
  b_shed: { name: 'Galpão de Armazenamento', tex: 'shed', w: 4, h: 2, solid: true, interact: 'chest', label: 'Abrir galpão', chest: 36 },
  b_workshop: { name: 'Oficina do Artesão', tex: 'workshop', w: 5, h: 2, solid: true, interact: 'craft', label: 'Usar oficina', station: ['workbench', 'furnace', 'anvil', 'campfire'], light: houseWindows(11, 25) },
  b_windmill: { name: 'Moinho', tex: 'windmill', w: 4, h: 2, solid: true, interact: 'mill', label: 'Moer trigo' },
};

export function kindOf(o: WObj): ObjKind {
  return OBJ[o.kind];
}

export function texFor(o: WObj, season: number): string {
  const k = OBJ[o.kind];
  return typeof k.tex === 'string' ? k.tex : k.tex(season, o);
}
