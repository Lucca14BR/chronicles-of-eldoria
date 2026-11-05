/** Crafting recipes, shops and constructible buildings. */
import type { SkillId } from '../core/state';

export type Station = 'hand' | 'workbench' | 'furnace' | 'anvil' | 'campfire' | 'alchemy';
export const STATION_LABEL: Record<Station, string> = {
  hand: 'Em qualquer lugar',
  workbench: 'Bancada de Trabalho',
  furnace: 'Fornalha',
  anvil: 'Bigorna',
  campfire: 'Fogueira ou Lareira',
  alchemy: 'Mesa de Alquimia',
};

export interface Mat {
  id: string; // item id, or group 'any_fish'
  qty: number;
}

export interface Recipe {
  out: string;
  qty: number;
  mats: Mat[];
  station: Station;
  cat: string;
  unlock?: { skill?: [SkillId, number]; flag?: string; label: string };
}

export const RECIPE_CATS = ['Básico', 'Estações', 'Agricultura', 'Fundição', 'Equipamento', 'Culinária', 'Alquimia', 'Móveis', 'Decoração'];

export const RECIPES: Recipe[] = [
  // Básico
  { out: 'workbench', qty: 1, mats: [{ id: 'wood', qty: 20 }], station: 'hand', cat: 'Básico' },
  { out: 'torch', qty: 2, mats: [{ id: 'wood', qty: 2 }, { id: 'fiber', qty: 1 }], station: 'hand', cat: 'Básico' },
  { out: 'campfire', qty: 1, mats: [{ id: 'wood', qty: 10 }, { id: 'stone', qty: 5 }], station: 'hand', cat: 'Básico' },
  { out: 'fence', qty: 5, mats: [{ id: 'wood', qty: 4 }], station: 'hand', cat: 'Básico' },
  { out: 'path_stone', qty: 4, mats: [{ id: 'stone', qty: 2 }], station: 'hand', cat: 'Básico' },
  { out: 'chest', qty: 1, mats: [{ id: 'wood', qty: 30 }, { id: 'stone', qty: 2 }], station: 'workbench', cat: 'Básico' },
  // Estações
  { out: 'furnace', qty: 1, mats: [{ id: 'stone', qty: 25 }, { id: 'copper_ore', qty: 10 }], station: 'workbench', cat: 'Estações' },
  { out: 'anvil', qty: 1, mats: [{ id: 'iron_bar', qty: 5 }], station: 'workbench', cat: 'Estações' },
  { out: 'alchemy', qty: 1, mats: [{ id: 'wood', qty: 30 }, { id: 'crystal', qty: 2 }, { id: 'herb', qty: 5 }], station: 'workbench', cat: 'Estações', unlock: { flag: 'met_elara', label: 'Conheça Elara, a herbalista' } },
  // Agricultura
  { out: 'fertilizer', qty: 5, mats: [{ id: 'fiber', qty: 10 }, { id: 'gel', qty: 2 }], station: 'workbench', cat: 'Agricultura' },
  { out: 'hay', qty: 2, mats: [{ id: 'fiber', qty: 5 }], station: 'workbench', cat: 'Agricultura' },
  { out: 'cloth', qty: 1, mats: [{ id: 'wool', qty: 1 }], station: 'workbench', cat: 'Agricultura' },
  { out: 'scarecrow', qty: 1, mats: [{ id: 'wood', qty: 15 }, { id: 'fiber', qty: 10 }], station: 'workbench', cat: 'Agricultura' },
  { out: 'sprinkler', qty: 1, mats: [{ id: 'copper_bar', qty: 1 }, { id: 'iron_bar', qty: 1 }], station: 'workbench', cat: 'Agricultura', unlock: { skill: ['farming', 2], label: 'Agricultura nível 2' } },
  { out: 'sprinkler2', qty: 1, mats: [{ id: 'iron_bar', qty: 1 }, { id: 'gold_bar', qty: 1 }, { id: 'crystal', qty: 1 }], station: 'workbench', cat: 'Agricultura', unlock: { skill: ['farming', 5], label: 'Agricultura nível 5' } },
  // Fundição
  { out: 'copper_bar', qty: 1, mats: [{ id: 'copper_ore', qty: 5 }, { id: 'coal', qty: 1 }], station: 'furnace', cat: 'Fundição' },
  { out: 'iron_bar', qty: 1, mats: [{ id: 'iron_ore', qty: 5 }, { id: 'coal', qty: 1 }], station: 'furnace', cat: 'Fundição' },
  { out: 'gold_bar', qty: 1, mats: [{ id: 'gold_ore', qty: 5 }, { id: 'coal', qty: 1 }], station: 'furnace', cat: 'Fundição' },
  { out: 'coal', qty: 1, mats: [{ id: 'wood', qty: 10 }], station: 'furnace', cat: 'Fundição' },
  // Equipamento
  { out: 'eq_tunic', qty: 1, mats: [{ id: 'fiber', qty: 25 }, { id: 'gel', qty: 8 }], station: 'workbench', cat: 'Equipamento' },
  { out: 'eq_boots', qty: 1, mats: [{ id: 'fiber', qty: 15 }, { id: 'gel', qty: 5 }], station: 'workbench', cat: 'Equipamento' },
  { out: 'eq_helm', qty: 1, mats: [{ id: 'copper_bar', qty: 5 }], station: 'anvil', cat: 'Equipamento' },
  { out: 'eq_mail', qty: 1, mats: [{ id: 'iron_bar', qty: 8 }], station: 'anvil', cat: 'Equipamento' },
  { out: 'eq_ring', qty: 1, mats: [{ id: 'crystal', qty: 3 }, { id: 'gold_bar', qty: 1 }], station: 'anvil', cat: 'Equipamento' },
  { out: 'eq_amulet', qty: 1, mats: [{ id: 'gold_bar', qty: 2 }, { id: 'bone', qty: 5 }], station: 'anvil', cat: 'Equipamento' },
  // Culinária
  { out: 'cheese', qty: 1, mats: [{ id: 'any_milk', qty: 1 }], station: 'campfire', cat: 'Culinária' },
  { out: 'omelet', qty: 1, mats: [{ id: 'any_egg', qty: 2 }], station: 'campfire', cat: 'Culinária' },
  { out: 'grilled_fish', qty: 1, mats: [{ id: 'any_fish', qty: 1 }], station: 'campfire', cat: 'Culinária' },
  { out: 'bread', qty: 1, mats: [{ id: 'flour', qty: 2 }], station: 'campfire', cat: 'Culinária' },
  { out: 'stew', qty: 1, mats: [{ id: 'potato', qty: 1 }, { id: 'turnip', qty: 1 }, { id: 'mushroom', qty: 1 }], station: 'campfire', cat: 'Culinária' },
  { out: 'berry_pie', qty: 1, mats: [{ id: 'berry', qty: 4 }, { id: 'flour', qty: 1 }], station: 'campfire', cat: 'Culinária' },
  // Alquimia
  { out: 'potion_hp', qty: 1, mats: [{ id: 'herb', qty: 3 }, { id: 'gel', qty: 1 }], station: 'alchemy', cat: 'Alquimia' },
  { out: 'potion_st', qty: 1, mats: [{ id: 'herb', qty: 2 }, { id: 'mushroom', qty: 2 }], station: 'alchemy', cat: 'Alquimia' },
  { out: 'potion_luck', qty: 1, mats: [{ id: 'crystal', qty: 1 }, { id: 'herb', qty: 2 }, { id: 'flower', qty: 1 }], station: 'alchemy', cat: 'Alquimia' },
  // Móveis
  { out: 'table', qty: 1, mats: [{ id: 'wood', qty: 15 }], station: 'workbench', cat: 'Móveis' },
  { out: 'chair', qty: 1, mats: [{ id: 'wood', qty: 8 }], station: 'workbench', cat: 'Móveis' },
  { out: 'bookshelf', qty: 1, mats: [{ id: 'wood', qty: 25 }], station: 'workbench', cat: 'Móveis' },
  { out: 'barrel', qty: 1, mats: [{ id: 'wood', qty: 12 }], station: 'workbench', cat: 'Móveis' },
  // Decoração
  { out: 'lamp', qty: 1, mats: [{ id: 'wood', qty: 10 }, { id: 'stone', qty: 5 }, { id: 'copper_bar', qty: 1 }], station: 'workbench', cat: 'Decoração' },
  { out: 'plant_pot', qty: 1, mats: [{ id: 'stone', qty: 5 }, { id: 'fiber', qty: 5 }], station: 'workbench', cat: 'Decoração' },
  { out: 'flower_bed', qty: 1, mats: [{ id: 'wood', qty: 5 }, { id: 'flower', qty: 3 }], station: 'workbench', cat: 'Decoração' },
  { out: 'rug', qty: 1, mats: [{ id: 'fiber', qty: 30 }, { id: 'flower', qty: 2 }], station: 'workbench', cat: 'Decoração' },
  { out: 'banner', qty: 1, mats: [{ id: 'fiber', qty: 15 }, { id: 'wood', qty: 5 }], station: 'workbench', cat: 'Decoração' },
];

// ---------------------------------------------------------------- shops
export interface ShopEntry {
  id: string;
  price: number;
  animal?: string;
  seasons?: number[];
  project?: string;
  upgrade?: { from: string; mats: Mat[] };
  once?: boolean;
}

export interface ShopDef {
  name: string;
  npc: string;
  sellMul?: number;
  entries: ShopEntry[];
}

export const SHOPS: Record<string, ShopDef> = {
  livia: {
    name: 'Mercado de Lívia',
    npc: 'livia',
    entries: [
      { id: 'seed_turnip', price: 20, seasons: [0] },
      { id: 'seed_wheat', price: 10, seasons: [0, 1, 2] },
      { id: 'seed_potato', price: 50, seasons: [0] },
      { id: 'seed_strawberry', price: 100, seasons: [0], project: 'market' },
      { id: 'seed_tomato', price: 50, seasons: [1] },
      { id: 'seed_corn', price: 75, seasons: [1, 2] },
      { id: 'seed_melon', price: 80, seasons: [1] },
      { id: 'seed_pumpkin', price: 100, seasons: [2] },
      { id: 'seed_eggplant', price: 20, seasons: [2] },
      { id: 'seed_cabbage', price: 60, seasons: [3] },
      { id: 'fertilizer', price: 25 },
      { id: 'bread', price: 120 },
      { id: 'rod', price: 250, once: true },
      { id: 'flower_bed', price: 80, project: 'market' },
      { id: 'rug', price: 400, project: 'market' },
      { id: 'banner', price: 250, project: 'market' },
    ],
  },
  aldric: {
    name: 'Forja de Aldric',
    npc: 'aldric',
    entries: [
      { id: 'coal', price: 30 },
      { id: 'copper_ore', price: 25 },
      { id: 'iron_ore', price: 60 },
      { id: 'axe_c', price: 500, upgrade: { from: 'axe', mats: [{ id: 'copper_bar', qty: 5 }] } },
      { id: 'pick_c', price: 500, upgrade: { from: 'pick', mats: [{ id: 'copper_bar', qty: 5 }] } },
      { id: 'can_c', price: 400, upgrade: { from: 'can', mats: [{ id: 'copper_bar', qty: 5 }] } },
      { id: 'sword_c', price: 600, upgrade: { from: 'sword', mats: [{ id: 'copper_bar', qty: 6 }] } },
      { id: 'axe_i', price: 1500, upgrade: { from: 'axe_c', mats: [{ id: 'iron_bar', qty: 5 }] } },
      { id: 'pick_i', price: 1500, upgrade: { from: 'pick_c', mats: [{ id: 'iron_bar', qty: 5 }] } },
      { id: 'sword_i', price: 2000, upgrade: { from: 'sword_c', mats: [{ id: 'iron_bar', qty: 6 }] } },
    ],
  },
  marta: {
    name: 'Rancho Prado Verde',
    npc: 'marta',
    entries: [
      { id: 'hay', price: 50 },
      { id: 'pail', price: 400, once: true },
      { id: 'shears', price: 400, once: true },
      { id: 'egg', price: 400, animal: 'chicken' },
      { id: 'milk', price: 1200, animal: 'cow' },
      { id: 'goat_milk', price: 1600, animal: 'goat' },
      { id: 'wool', price: 2000, animal: 'sheep' },
    ],
  },
  royal_market: {
    name: 'Mercado Real de Valoria',
    npc: 'serafina',
    sellMul: 1.25,
    entries: [
      { id: 'seed_grape', price: 80, seasons: [1, 2] },
      { id: 'seed_sunflower', price: 60, seasons: [1, 2] },
      { id: 'seed_strawberry', price: 90, seasons: [0] },
      { id: 'seed_melon', price: 75, seasons: [1] },
      { id: 'seed_pumpkin', price: 90, seasons: [2] },
      { id: 'seed_cabbage', price: 55, seasons: [3] },
      { id: 'potion_luck', price: 450 },
      { id: 'rug', price: 350 },
      { id: 'banner', price: 200 },
      { id: 'bookshelf', price: 300 },
    ],
  },
  armory: {
    name: 'Arsenal Real',
    npc: 'gaspar',
    entries: [
      { id: 'eq_royal_helm', price: 2500 },
      { id: 'eq_plate', price: 4500 },
      { id: 'eq_knight_boots', price: 2200 },
      { id: 'eq_mail', price: 1800 },
      { id: 'sword_r', price: 3000, upgrade: { from: 'sword_i', mats: [{ id: 'gold_bar', qty: 5 }] } },
      { id: 'pick_g', price: 3000, upgrade: { from: 'pick_i', mats: [{ id: 'gold_bar', qty: 5 }] } },
      { id: 'axe_g', price: 3000, upgrade: { from: 'axe_i', mats: [{ id: 'gold_bar', qty: 5 }] } },
      { id: 'gold_bar', price: 600 },
      { id: 'iron_bar', price: 300 },
    ],
  },
  elara: {
    name: 'Ervanário de Elara',
    npc: 'elara',
    entries: [
      { id: 'potion_hp', price: 200 },
      { id: 'potion_st', price: 200 },
      { id: 'herb', price: 40 },
      { id: 'mushroom', price: 60 },
      { id: 'potion_luck', price: 500 },
    ],
  },
};

// ---------------------------------------------------------------- construction
export interface BuildDef {
  kind: string;
  name: string;
  desc: string;
  gold: number;
  mats: Mat[];
}

export const BUILDINGS: BuildDef[] = [
  { kind: 'b_coop', name: 'Galinheiro', desc: 'Abriga até 6 galinhas. Compre-as no Rancho Prado Verde.', gold: 1500, mats: [{ id: 'wood', qty: 80 }, { id: 'stone', qty: 30 }] },
  { kind: 'b_barn', name: 'Celeiro', desc: 'Abriga até 6 vacas, cabras ou ovelhas.', gold: 3000, mats: [{ id: 'wood', qty: 150 }, { id: 'stone', qty: 60 }] },
  { kind: 'b_shed', name: 'Galpão de Armazenamento', desc: 'Um depósito com 36 espaços para guardar seus itens.', gold: 500, mats: [{ id: 'wood', qty: 80 }, { id: 'stone', qty: 30 }] },
  { kind: 'b_windmill', name: 'Moinho', desc: 'Transforma trigo em farinha para pães e tortas.', gold: 1000, mats: [{ id: 'wood', qty: 100 }, { id: 'stone', qty: 40 }, { id: 'copper_bar', qty: 3 }] },
  { kind: 'b_workshop', name: 'Oficina do Artesão', desc: 'Bancada, fornalha, bigorna e cozinha em um só lugar.', gold: 1500, mats: [{ id: 'wood', qty: 120 }, { id: 'stone', qty: 60 }, { id: 'copper_bar', qty: 5 }] },
];
