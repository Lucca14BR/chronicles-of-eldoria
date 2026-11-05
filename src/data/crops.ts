/** Crop definitions. Seasons: 0 Primavera, 1 Verão, 2 Outono, 3 Inverno. */

export type CropStyle = 'root' | 'grain' | 'vine' | 'tall' | 'ground' | 'bush' | 'leafy';

export interface CropDef {
  id: string;
  name: string;
  seasons: number[];
  days: number; // days to mature
  regrow?: number; // days to regrow after harvest
  produce: string; // item id
  yield: [number, number];
  xp: number;
  style: CropStyle;
  color: string; // produce color
  leaf: string;
}

export const CROPS: Record<string, CropDef> = {
  turnip: { id: 'turnip', name: 'Nabo', seasons: [0], days: 4, produce: 'turnip', yield: [1, 1], xp: 8, style: 'root', color: '#efe6f2', leaf: '#5cae3c' },
  wheat: { id: 'wheat', name: 'Trigo', seasons: [0, 1, 2], days: 4, produce: 'wheat', yield: [1, 2], xp: 6, style: 'grain', color: '#e8c35a', leaf: '#8fb548' },
  potato: { id: 'potato', name: 'Batata', seasons: [0], days: 6, produce: 'potato', yield: [1, 3], xp: 14, style: 'leafy', color: '#c9955a', leaf: '#4f9e3a' },
  strawberry: { id: 'strawberry', name: 'Morango', seasons: [0], days: 8, regrow: 4, produce: 'strawberry', yield: [1, 2], xp: 18, style: 'bush', color: '#e0353d', leaf: '#3f9a3a' },
  tomato: { id: 'tomato', name: 'Tomate', seasons: [1], days: 8, regrow: 4, produce: 'tomato', yield: [1, 2], xp: 12, style: 'vine', color: '#e0402e', leaf: '#3e8f35' },
  corn: { id: 'corn', name: 'Milho', seasons: [1, 2], days: 10, regrow: 4, produce: 'corn', yield: [1, 1], xp: 12, style: 'tall', color: '#f2cf3a', leaf: '#5fa538' },
  melon: { id: 'melon', name: 'Melão', seasons: [1], days: 10, produce: 'melon', yield: [1, 1], xp: 30, style: 'ground', color: '#8ccf5a', leaf: '#3f8f2e' },
  pumpkin: { id: 'pumpkin', name: 'Abóbora', seasons: [2], days: 10, produce: 'pumpkin', yield: [1, 1], xp: 34, style: 'ground', color: '#e8862a', leaf: '#4b8a2e' },
  eggplant: { id: 'eggplant', name: 'Berinjela', seasons: [2], days: 5, regrow: 5, produce: 'eggplant', yield: [1, 1], xp: 10, style: 'vine', color: '#6a3a8f', leaf: '#3e8a3a' },
  grape: { id: 'grape', name: 'Uva Real', seasons: [1, 2], days: 10, regrow: 3, produce: 'grape', yield: [1, 2], xp: 20, style: 'vine', color: '#7a3a9a', leaf: '#4a8a3a' },
  sunflower: { id: 'sunflower', name: 'Girassol', seasons: [1, 2], days: 8, produce: 'sunflower', yield: [1, 1], xp: 18, style: 'tall', color: '#f8c820', leaf: '#5a9a38' },
  cabbage: { id: 'cabbage', name: 'Couve-Gelo', seasons: [3], days: 7, produce: 'cabbage', yield: [1, 1], xp: 20, style: 'leafy', color: '#a9d8c8', leaf: '#5fae8a' },
};

/** Growth stage 0..4 for a crop given accumulated growth days. */
export function cropStage(def: CropDef, growth: number): number {
  if (growth >= def.days) return 4;
  const f = growth / def.days;
  if (f <= 0) return 0;
  if (f < 0.34) return 1;
  if (f < 0.67) return 2;
  return 3;
}
