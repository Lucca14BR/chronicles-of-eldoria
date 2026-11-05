/** Farm animal definitions. */

export interface AnimalDef {
  id: string;
  name: string;
  house: 'coop' | 'barn';
  price: number;
  tex: string;
  w: number; // sprite size
  h: number;
  body: [number, number]; // physics body size
  speed: number;
  product: string;
  big: string;
  every: number; // produces every N fed days
  tool: 'pail' | 'shears' | null; // null = lays on the ground
  sound: 'cluck' | 'moo' | 'baa';
  variants: number;
  names: string[];
}

export const ANIMALS: Record<string, AnimalDef> = {
  chicken: {
    id: 'chicken',
    name: 'Galinha',
    house: 'coop',
    price: 400,
    tex: 'an_chicken',
    w: 16,
    h: 16,
    body: [8, 5],
    speed: 24,
    product: 'egg',
    big: 'egg_large',
    every: 1,
    tool: null,
    sound: 'cluck',
    variants: 2,
    names: ['Pipoca', 'Penélope', 'Cocó', 'Margarida', 'Farofa', 'Gertrudes', 'Paçoca', 'Bolinha'],
  },
  cow: {
    id: 'cow',
    name: 'Vaca',
    house: 'barn',
    price: 1200,
    tex: 'an_cow',
    w: 32,
    h: 24,
    body: [20, 7],
    speed: 16,
    product: 'milk',
    big: 'milk_large',
    every: 1,
    tool: 'pail',
    sound: 'moo',
    variants: 2,
    names: ['Mimosa', 'Estrela', 'Malhada', 'Bonina', 'Princesa', 'Cacau', 'Nata'],
  },
  goat: {
    id: 'goat',
    name: 'Cabra',
    house: 'barn',
    price: 1600,
    tex: 'an_goat',
    w: 24,
    h: 20,
    body: [14, 6],
    speed: 22,
    product: 'goat_milk',
    big: 'goat_milk',
    every: 2,
    tool: 'pail',
    sound: 'baa',
    variants: 1,
    names: ['Cabrita', 'Barnabé', 'Fumaça', 'Teimosa', 'Zuzu'],
  },
  sheep: {
    id: 'sheep',
    name: 'Ovelha',
    house: 'barn',
    price: 2000,
    tex: 'an_sheep',
    w: 24,
    h: 20,
    body: [14, 6],
    speed: 18,
    product: 'wool',
    big: 'wool',
    every: 3,
    tool: 'shears',
    sound: 'baa',
    variants: 1,
    names: ['Algodão', 'Nuvem', 'Flocos', 'Dolly', 'Lanuda', 'Novelo'],
  },
};

export const HOUSE_LABEL = { coop: 'Galinheiro', barn: 'Celeiro' };
export const HEART_PTS = 200; // 5 hearts max for animals
