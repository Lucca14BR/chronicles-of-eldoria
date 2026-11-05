/** Item definitions. All names in Brazilian Portuguese. */

export type ItemCat =
  | 'tool'
  | 'seed'
  | 'crop'
  | 'resource'
  | 'food'
  | 'potion'
  | 'placeable'
  | 'equip'
  | 'fish'
  | 'artifact'
  | 'forage';

export type ToolType = 'hoe' | 'can' | 'axe' | 'pick' | 'sword' | 'rod' | 'pail' | 'shears';
export type EquipSlot = 'head' | 'body' | 'feet' | 'acc';

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  cat: ItemCat;
  price: number; // sell price
  stack: number;
  tool?: { type: ToolType; tier: number; power: number };
  seed?: string; // crop id
  food?: { st: number; hp: number };
  place?: string; // object kind placed in the world
  equip?: { slot: EquipSlot; def?: number; atk?: number; spd?: number; luck?: number; hp?: number };
  fert?: boolean;
}

const I: ItemDef[] = [
  // ---- Tools
  { id: 'hoe', name: 'Enxada', desc: 'Prepara o solo para o plantio.', cat: 'tool', price: 0, stack: 1, tool: { type: 'hoe', tier: 0, power: 1 } },
  { id: 'can', name: 'Regador', desc: 'Rega as plantações. Encha-o na água.', cat: 'tool', price: 0, stack: 1, tool: { type: 'can', tier: 0, power: 30 } },
  { id: 'can_c', name: 'Regador de Cobre', desc: 'Guarda o dobro de água.', cat: 'tool', price: 0, stack: 1, tool: { type: 'can', tier: 1, power: 70 } },
  { id: 'axe', name: 'Machado', desc: 'Corta árvores e galhos.', cat: 'tool', price: 0, stack: 1, tool: { type: 'axe', tier: 0, power: 1 } },
  { id: 'axe_c', name: 'Machado de Cobre', desc: 'Corta árvores com mais força.', cat: 'tool', price: 0, stack: 1, tool: { type: 'axe', tier: 1, power: 2 } },
  { id: 'axe_i', name: 'Machado de Ferro', desc: 'Derruba árvores em poucos golpes.', cat: 'tool', price: 0, stack: 1, tool: { type: 'axe', tier: 2, power: 3 } },
  { id: 'pick', name: 'Picareta', desc: 'Quebra pedras e minérios.', cat: 'tool', price: 0, stack: 1, tool: { type: 'pick', tier: 0, power: 1 } },
  { id: 'pick_c', name: 'Picareta de Cobre', desc: 'Quebra rochas duras e minério de ferro.', cat: 'tool', price: 0, stack: 1, tool: { type: 'pick', tier: 1, power: 2 } },
  { id: 'pick_i', name: 'Picareta de Ferro', desc: 'Quebra até minério de ouro.', cat: 'tool', price: 0, stack: 1, tool: { type: 'pick', tier: 2, power: 3 } },
  { id: 'sword', name: 'Espada Enferrujada', desc: 'Velha, mas ainda corta. Também limpa o mato.', cat: 'tool', price: 0, stack: 1, tool: { type: 'sword', tier: 0, power: 5 } },
  { id: 'sword_c', name: 'Espada de Cobre', desc: 'Lâmina afiada forjada por Aldric.', cat: 'tool', price: 0, stack: 1, tool: { type: 'sword', tier: 1, power: 9 } },
  { id: 'sword_i', name: 'Espada de Ferro', desc: 'Uma espada digna de um cavaleiro.', cat: 'tool', price: 0, stack: 1, tool: { type: 'sword', tier: 2, power: 15 } },
  { id: 'axe_g', name: 'Machado de Ouro', desc: 'O machado mais afiado do reino.', cat: 'tool', price: 0, stack: 1, tool: { type: 'axe', tier: 3, power: 5 } },
  { id: 'pick_g', name: 'Picareta de Ouro', desc: 'Atravessa rochas como manteiga.', cat: 'tool', price: 0, stack: 1, tool: { type: 'pick', tier: 3, power: 5 } },
  { id: 'sword_r', name: 'Lâmina Real', desc: 'Forjada nas oficinas do castelo de Valoria.', cat: 'tool', price: 0, stack: 1, tool: { type: 'sword', tier: 3, power: 24 } },
  { id: 'rod', name: 'Vara de Pesca', desc: 'Lance na água e espere a fisgada!', cat: 'tool', price: 0, stack: 1, tool: { type: 'rod', tier: 0, power: 1 } },

  // ---- Resources
  { id: 'wood', name: 'Madeira', desc: 'Material básico de construção.', cat: 'resource', price: 2, stack: 999 },
  { id: 'stone', name: 'Pedra', desc: 'Material resistente para construção.', cat: 'resource', price: 2, stack: 999 },
  { id: 'fiber', name: 'Fibra', desc: 'Fibras vegetais resistentes.', cat: 'resource', price: 1, stack: 999 },
  { id: 'coal', name: 'Carvão', desc: 'Combustível para a fornalha.', cat: 'resource', price: 15, stack: 999 },
  { id: 'copper_ore', name: 'Minério de Cobre', desc: 'Pode ser fundido em barras.', cat: 'resource', price: 5, stack: 999 },
  { id: 'iron_ore', name: 'Minério de Ferro', desc: 'Pode ser fundido em barras.', cat: 'resource', price: 10, stack: 999 },
  { id: 'gold_ore', name: 'Minério de Ouro', desc: 'Brilhante e valioso.', cat: 'resource', price: 25, stack: 999 },
  { id: 'copper_bar', name: 'Barra de Cobre', desc: 'Usada em ferramentas e máquinas.', cat: 'resource', price: 60, stack: 999 },
  { id: 'iron_bar', name: 'Barra de Ferro', desc: 'Metal forte e confiável.', cat: 'resource', price: 120, stack: 999 },
  { id: 'gold_bar', name: 'Barra de Ouro', desc: 'Digna de um rei.', cat: 'resource', price: 250, stack: 999 },
  { id: 'crystal', name: 'Cristal Arcano', desc: 'Pulsa com uma luz mágica.', cat: 'resource', price: 50, stack: 999 },
  { id: 'gel', name: 'Gosma', desc: 'Restos pegajosos de um slime.', cat: 'resource', price: 5, stack: 999 },
  { id: 'bone', name: 'Osso Antigo', desc: 'Restos de um esqueleto das minas.', cat: 'resource', price: 12, stack: 999 },
  { id: 'flour', name: 'Farinha', desc: 'Trigo moído no moinho.', cat: 'resource', price: 50, stack: 999 },

  // ---- Forage
  { id: 'berry', name: 'Amora Silvestre', desc: 'Doce e suculenta. Restaura energia.', cat: 'forage', price: 10, stack: 999, food: { st: 12, hp: 4 } },
  { id: 'herb', name: 'Erva Medicinal', desc: 'Usada em poções.', cat: 'forage', price: 12, stack: 999 },
  { id: 'mushroom', name: 'Cogumelo do Bosque', desc: 'Comestível e saboroso.', cat: 'forage', price: 20, stack: 999, food: { st: 20, hp: 6 } },
  { id: 'flower', name: 'Flor do Campo', desc: 'Um presente simples e bonito.', cat: 'forage', price: 15, stack: 999 },
  { id: 'acorn', name: 'Bolota', desc: 'Semente de carvalho. Planta-se como árvore.', cat: 'forage', price: 5, stack: 999, place: 'sapling_p' },

  // ---- Seeds
  { id: 'seed_turnip', name: 'Sementes de Nabo', desc: 'Primavera. Cresce em 4 dias.', cat: 'seed', price: 10, stack: 999, seed: 'turnip' },
  { id: 'seed_wheat', name: 'Sementes de Trigo', desc: 'Primavera a Outono. Cresce em 4 dias.', cat: 'seed', price: 5, stack: 999, seed: 'wheat' },
  { id: 'seed_potato', name: 'Sementes de Batata', desc: 'Primavera. Cresce em 6 dias.', cat: 'seed', price: 25, stack: 999, seed: 'potato' },
  { id: 'seed_strawberry', name: 'Sementes de Morango', desc: 'Primavera. 8 dias, produz novamente.', cat: 'seed', price: 50, stack: 999, seed: 'strawberry' },
  { id: 'seed_tomato', name: 'Sementes de Tomate', desc: 'Verão. 8 dias, produz novamente.', cat: 'seed', price: 25, stack: 999, seed: 'tomato' },
  { id: 'seed_corn', name: 'Sementes de Milho', desc: 'Verão e Outono. 10 dias, produz novamente.', cat: 'seed', price: 35, stack: 999, seed: 'corn' },
  { id: 'seed_melon', name: 'Sementes de Melão', desc: 'Verão. Cresce em 10 dias.', cat: 'seed', price: 40, stack: 999, seed: 'melon' },
  { id: 'seed_pumpkin', name: 'Sementes de Abóbora', desc: 'Outono. Cresce em 10 dias.', cat: 'seed', price: 50, stack: 999, seed: 'pumpkin' },
  { id: 'seed_eggplant', name: 'Sementes de Berinjela', desc: 'Outono. 5 dias, produz novamente.', cat: 'seed', price: 10, stack: 999, seed: 'eggplant' },
  { id: 'seed_grape', name: 'Mudas de Uva', desc: 'Verão e Outono. 10 dias, produz novamente.', cat: 'seed', price: 40, stack: 999, seed: 'grape' },
  { id: 'seed_sunflower', name: 'Sementes de Girassol', desc: 'Verão e Outono. Cresce em 8 dias.', cat: 'seed', price: 30, stack: 999, seed: 'sunflower' },
  { id: 'seed_cabbage', name: 'Sementes de Couve-Gelo', desc: 'Inverno. Cresce em 7 dias.', cat: 'seed', price: 30, stack: 999, seed: 'cabbage' },

  // ---- Crops
  { id: 'turnip', name: 'Nabo', desc: 'Raiz crocante da primavera.', cat: 'crop', price: 35, stack: 999, food: { st: 10, hp: 2 } },
  { id: 'wheat', name: 'Trigo', desc: 'Pode ser moído em farinha.', cat: 'crop', price: 25, stack: 999 },
  { id: 'potato', name: 'Batata', desc: 'Versátil e nutritiva.', cat: 'crop', price: 80, stack: 999, food: { st: 15, hp: 4 } },
  { id: 'strawberry', name: 'Morango', desc: 'Vermelho e doce.', cat: 'crop', price: 120, stack: 999, food: { st: 20, hp: 6 } },
  { id: 'tomato', name: 'Tomate', desc: 'Suculento e vermelho.', cat: 'crop', price: 60, stack: 999, food: { st: 12, hp: 4 } },
  { id: 'corn', name: 'Milho', desc: 'Espigas douradas.', cat: 'crop', price: 50, stack: 999, food: { st: 12, hp: 4 } },
  { id: 'melon', name: 'Melão', desc: 'Refrescante no verão.', cat: 'crop', price: 250, stack: 999, food: { st: 40, hp: 10 } },
  { id: 'pumpkin', name: 'Abóbora', desc: 'Grande e alaranjada.', cat: 'crop', price: 320, stack: 999 },
  { id: 'eggplant', name: 'Berinjela', desc: 'Roxa e brilhante.', cat: 'crop', price: 60, stack: 999, food: { st: 12, hp: 4 } },
  { id: 'grape', name: 'Uva Real', desc: 'Cachos doces, adorados na Capital.', cat: 'crop', price: 110, stack: 999, food: { st: 15, hp: 5 } },
  { id: 'sunflower', name: 'Girassol', desc: 'Uma flor que segue o sol.', cat: 'crop', price: 130, stack: 999 },
  { id: 'cabbage', name: 'Couve-Gelo', desc: 'Resiste ao frio do inverno.', cat: 'crop', price: 150, stack: 999, food: { st: 25, hp: 6 } },

  // ---- Fish
  { id: 'fish_trout', name: 'Truta do Rio', desc: 'Comum nos rios de Greenvale.', cat: 'fish', price: 45, stack: 999 },
  { id: 'fish_carp', name: 'Carpa', desc: 'Peixe paciente dos lagos.', cat: 'fish', price: 30, stack: 999 },
  { id: 'fish_perch', name: 'Perca Dourada', desc: 'Brilha sob o sol.', cat: 'fish', price: 70, stack: 999 },
  { id: 'fish_salmon', name: 'Salmão Prateado', desc: 'O orgulho do Lago Prateado.', cat: 'fish', price: 120, stack: 999 },
  { id: 'fish_moon', name: 'Peixe-Lua', desc: 'Raro. Só aparece à noite.', cat: 'fish', price: 300, stack: 999 },

  // ---- Food & potions
  { id: 'bread', name: 'Pão Rústico', desc: 'Restaura bastante energia.', cat: 'food', price: 60, stack: 99, food: { st: 50, hp: 10 } },
  { id: 'grilled_fish', name: 'Peixe Assado', desc: 'Simples e delicioso.', cat: 'food', price: 80, stack: 99, food: { st: 45, hp: 20 } },
  { id: 'stew', name: 'Ensopado do Campo', desc: 'Aquece a alma.', cat: 'food', price: 180, stack: 99, food: { st: 80, hp: 30 } },
  { id: 'berry_pie', name: 'Torta de Amora', desc: 'A receita secreta de Greenvale.', cat: 'food', price: 200, stack: 99, food: { st: 90, hp: 25 } },
  { id: 'potion_hp', name: 'Poção de Vida', desc: 'Restaura 60 de vida.', cat: 'potion', price: 100, stack: 99, food: { st: 0, hp: 60 } },
  { id: 'potion_st', name: 'Poção de Vigor', desc: 'Restaura 80 de energia.', cat: 'potion', price: 100, stack: 99, food: { st: 80, hp: 0 } },
  { id: 'potion_luck', name: 'Elixir da Sorte', desc: 'Aumenta a sorte até o fim do dia.', cat: 'potion', price: 200, stack: 99, food: { st: 10, hp: 0 } },
  { id: 'fertilizer', name: 'Adubo de Qualidade', desc: 'Use no solo arado. Chance de colheita dupla.', cat: 'resource', price: 10, stack: 999, fert: true },

  // ---- Placeables
  { id: 'workbench', name: 'Bancada de Trabalho', desc: 'Permite criar itens avançados.', cat: 'placeable', price: 20, stack: 99, place: 'workbench' },
  { id: 'chest', name: 'Baú de Madeira', desc: 'Guarda 27 itens.', cat: 'placeable', price: 20, stack: 99, place: 'chest' },
  { id: 'furnace', name: 'Fornalha', desc: 'Funde minérios em barras.', cat: 'placeable', price: 30, stack: 99, place: 'furnace' },
  { id: 'anvil', name: 'Bigorna', desc: 'Forja equipamentos de metal.', cat: 'placeable', price: 100, stack: 99, place: 'anvil' },
  { id: 'campfire', name: 'Fogueira', desc: 'Cozinhe refeições. Ilumina a noite.', cat: 'placeable', price: 10, stack: 99, place: 'campfire' },
  { id: 'alchemy', name: 'Mesa de Alquimia', desc: 'Prepare poções mágicas.', cat: 'placeable', price: 150, stack: 99, place: 'alchemy' },
  { id: 'fence', name: 'Cerca de Madeira', desc: 'Delimite sua propriedade.', cat: 'placeable', price: 1, stack: 999, place: 'fence' },
  { id: 'path_stone', name: 'Caminho de Pedra', desc: 'Pavimenta o chão.', cat: 'placeable', price: 1, stack: 999, place: 'path_stone' },
  { id: 'torch', name: 'Tocha', desc: 'Ilumina os arredores à noite.', cat: 'placeable', price: 3, stack: 99, place: 'torch' },
  { id: 'lamp', name: 'Poste de Lanterna', desc: 'Uma luz quente e elegante.', cat: 'placeable', price: 30, stack: 99, place: 'lamp' },
  { id: 'scarecrow', name: 'Espantalho', desc: 'Decoração clássica de fazenda.', cat: 'placeable', price: 20, stack: 99, place: 'scarecrow' },
  { id: 'sprinkler', name: 'Irrigador', desc: 'Rega 4 canteiros vizinhos toda manhã.', cat: 'placeable', price: 50, stack: 99, place: 'sprinkler' },
  { id: 'sprinkler2', name: 'Irrigador de Qualidade', desc: 'Rega 8 canteiros vizinhos toda manhã.', cat: 'placeable', price: 150, stack: 99, place: 'sprinkler2' },
  { id: 'table', name: 'Mesa de Carvalho', desc: 'Mobília rústica.', cat: 'placeable', price: 20, stack: 99, place: 'table' },
  { id: 'chair', name: 'Cadeira', desc: 'Mobília rústica.', cat: 'placeable', price: 10, stack: 99, place: 'chair' },
  { id: 'bookshelf', name: 'Estante', desc: 'Cheia de livros antigos.', cat: 'placeable', price: 40, stack: 99, place: 'bookshelf' },
  { id: 'plant_pot', name: 'Vaso de Planta', desc: 'Um toque verde.', cat: 'placeable', price: 15, stack: 99, place: 'plant_pot' },
  { id: 'rug', name: 'Tapete Real', desc: 'Tapete vermelho com bordas douradas.', cat: 'placeable', price: 30, stack: 99, place: 'rug' },
  { id: 'banner', name: 'Estandarte de Eldoria', desc: 'Mostra seu orgulho pelo reino.', cat: 'placeable', price: 25, stack: 99, place: 'banner' },
  { id: 'flower_bed', name: 'Canteiro de Flores', desc: 'Flores coloridas o ano todo.', cat: 'placeable', price: 15, stack: 99, place: 'flower_bed' },
  { id: 'barrel', name: 'Barril', desc: 'Decoração rústica.', cat: 'placeable', price: 10, stack: 99, place: 'barrel_p' },

  // ---- Equipment
  { id: 'eq_helm', name: 'Elmo de Cobre', desc: 'Defesa +2', cat: 'equip', price: 150, stack: 1, equip: { slot: 'head', def: 2 } },
  { id: 'eq_mail', name: 'Cota de Malha', desc: 'Defesa +5, Vida +20', cat: 'equip', price: 400, stack: 1, equip: { slot: 'body', def: 5, hp: 20 } },
  { id: 'eq_tunic', name: 'Gibão de Couro', desc: 'Defesa +2', cat: 'equip', price: 100, stack: 1, equip: { slot: 'body', def: 2 } },
  { id: 'eq_boots', name: 'Botas de Viajante', desc: 'Velocidade +12%', cat: 'equip', price: 120, stack: 1, equip: { slot: 'feet', spd: 0.12 } },
  { id: 'eq_ring', name: 'Anel de Cristal', desc: 'Sorte +2, Vida +20', cat: 'equip', price: 500, stack: 1, equip: { slot: 'acc', luck: 2, hp: 20 } },
  { id: 'eq_plate', name: 'Armadura Real', desc: 'Defesa +8, Vida +30', cat: 'equip', price: 1500, stack: 1, equip: { slot: 'body', def: 8, hp: 30 } },
  { id: 'eq_royal_helm', name: 'Elmo Real', desc: 'Defesa +4', cat: 'equip', price: 900, stack: 1, equip: { slot: 'head', def: 4 } },
  { id: 'eq_knight_boots', name: 'Botas de Cavaleiro', desc: 'Velocidade +18%, Defesa +1', cat: 'equip', price: 800, stack: 1, equip: { slot: 'feet', spd: 0.18, def: 1 } },
  { id: 'eq_royal_cape', name: 'Manto de Cavaleiro', desc: 'Defesa +3, Sorte +3, Vida +30. Concedido pela Rainha.', cat: 'equip', price: 0, stack: 1, equip: { slot: 'acc', def: 3, luck: 3, hp: 30 } },
  { id: 'eq_amulet', name: 'Amuleto do Guerreiro', desc: 'Ataque +4', cat: 'equip', price: 450, stack: 1, equip: { slot: 'acc', atk: 4 } },

  // ---- Ranch
  { id: 'pail', name: 'Balde de Ordenha', desc: 'Use em vacas e cabras para tirar leite.', cat: 'tool', price: 0, stack: 1, tool: { type: 'pail', tier: 0, power: 1 } },
  { id: 'shears', name: 'Tesoura de Tosquia', desc: 'Use em ovelhas para tosquiar a lã.', cat: 'tool', price: 0, stack: 1, tool: { type: 'shears', tier: 0, power: 1 } },
  { id: 'hay', name: 'Feno', desc: 'Alimento dos animais. Coloque no comedouro do galinheiro ou celeiro.', cat: 'resource', price: 12, stack: 999 },
  { id: 'egg', name: 'Ovo', desc: 'Fresquinho, direto do galinheiro.', cat: 'forage', price: 50, stack: 999 },
  { id: 'egg_large', name: 'Ovo Grande', desc: 'Um ovo enorme de uma galinha muito feliz.', cat: 'forage', price: 95, stack: 999 },
  { id: 'milk', name: 'Leite', desc: 'Leite fresco de vaca.', cat: 'forage', price: 125, stack: 999, food: { st: 15, hp: 5 } },
  { id: 'milk_large', name: 'Leite Cremoso', desc: 'Leite espesso de uma vaca muito feliz.', cat: 'forage', price: 190, stack: 999, food: { st: 25, hp: 8 } },
  { id: 'goat_milk', name: 'Leite de Cabra', desc: 'Nutritivo e de sabor marcante.', cat: 'forage', price: 225, stack: 999, food: { st: 25, hp: 8 } },
  { id: 'wool', name: 'Lã', desc: 'Lã macia de ovelha. Pode virar tecido.', cat: 'resource', price: 340, stack: 999 },
  { id: 'cheese', name: 'Queijo Artesanal', desc: 'O orgulho dos ranchos de Eldoria.', cat: 'food', price: 230, stack: 99, food: { st: 40, hp: 12 } },
  { id: 'omelet', name: 'Omelete', desc: 'Café da manhã de fazendeiro.', cat: 'food', price: 140, stack: 99, food: { st: 45, hp: 12 } },
  { id: 'cloth', name: 'Tecido de Lã', desc: 'Tecido fino, muito valorizado na Capital.', cat: 'resource', price: 470, stack: 999 },

  // ---- Artifacts
  { id: 'fragment_mine', name: 'Fragmento do Coração da Montanha', desc: 'Um pedaço da coroa, quente como brasa. Pulsa com luz azul.', cat: 'artifact', price: 0, stack: 1 },
  { id: 'fragment_forest', name: 'Fragmento das Lágrimas da Floresta', desc: 'Um pedaço da coroa envolto em musgo eterno.', cat: 'artifact', price: 0, stack: 1 },
  { id: 'royal_seal', name: 'Selo Real', desc: 'Prova de que você é Cavaleiro(a) de Eldoria.', cat: 'artifact', price: 0, stack: 1 },
  { id: 'fragment', name: 'Fragmento Antigo', desc: 'Um pedaço de uma coroa esquecida. Brilha com runas.', cat: 'artifact', price: 0, stack: 1 },
  { id: 'old_coin', name: 'Moeda Antiga', desc: 'Cunhada há séculos.', cat: 'artifact', price: 80, stack: 99 },
  { id: 'relic_shard', name: 'Caco de Cerâmica', desc: 'Resquício de uma civilização perdida.', cat: 'artifact', price: 40, stack: 99 },
];

export const ITEMS: Record<string, ItemDef> = {};
for (const it of I) ITEMS[it.id] = it;

export function item(id: string): ItemDef {
  const d = ITEMS[id];
  if (!d) throw new Error('Item desconhecido: ' + id);
  return d;
}

export const CAT_LABEL: Record<ItemCat, string> = {
  tool: 'Ferramenta',
  seed: 'Semente',
  crop: 'Colheita',
  resource: 'Recurso',
  food: 'Comida',
  potion: 'Poção',
  placeable: 'Posicionável',
  equip: 'Equipamento',
  fish: 'Peixe',
  artifact: 'Artefato',
  forage: 'Coleta',
};
