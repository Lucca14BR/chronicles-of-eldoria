/** Main story quests, daily request templates and village projects. */
import type { SkillId } from '../core/state';
import type { Mat } from './recipes';

export type Objective =
  | { type: 'talk'; npc: string; label: string }
  | { type: 'stat'; stat: string; n: number; label: string; max?: boolean }
  | { type: 'have'; item: string; n: number; label: string; consume?: boolean }
  | { type: 'deliver'; npc: string; item: string; n: number; label: string }
  | { type: 'flag'; flag: string; label: string };

export interface QuestDef {
  id: string;
  title: string;
  chapter: string;
  giver: string;
  desc: string;
  objectives: Objective[];
  reward: { gold?: number; items?: Mat[]; xp?: [SkillId, number]; pts?: [string, number]; flag?: string };
  done: string; // completion message
  next?: string;
}

export const QUESTS: QuestDef[] = [
  {
    id: 'q_arrival',
    title: 'Um Novo Começo',
    chapter: 'Capítulo I — Raízes',
    giver: 'tomas',
    desc: 'Você chegou a Greenvale para recomeçar a vida na velha fazenda. O ancião da vila, Tomás, costuma ficar pela praça. Vá se apresentar.',
    objectives: [{ type: 'talk', npc: 'tomas', label: 'Converse com Tomás na praça de Greenvale' }],
    reward: { items: [{ id: 'seed_turnip', qty: 15 }] },
    done: 'Tomás lhe deu 15 Sementes de Nabo!',
    next: 'q_roots',
  },
  {
    id: 'q_roots',
    title: 'Raízes na Terra',
    chapter: 'Capítulo I — Raízes',
    giver: 'tomas',
    desc: 'Tomás sugeriu que você limpe um pedaço da fazenda, are o solo com a enxada e plante suas primeiras sementes. Não esqueça de regar!',
    objectives: [{ type: 'stat', stat: 'plant', n: 10, label: 'Plante 10 sementes' }],
    reward: { gold: 100, items: [{ id: 'fertilizer', qty: 5 }], xp: ['farming', 20] },
    done: 'Suas primeiras sementes estão na terra! +100 moedas e 5 Adubos.',
    next: 'q_materials',
  },
  {
    id: 'q_materials',
    title: 'Mãos à Obra',
    chapter: 'Capítulo I — Raízes',
    giver: 'tomas',
    desc: 'A fazenda precisa de reparos. Corte árvores com o machado e quebre pedras com a picareta para juntar materiais.',
    objectives: [
      { type: 'have', item: 'wood', n: 30, label: 'Tenha 30 Madeira' },
      { type: 'have', item: 'stone', n: 15, label: 'Tenha 15 Pedra' },
    ],
    reward: { gold: 150, xp: ['foraging', 25] },
    done: 'Material suficiente para começar a construir! +150 moedas.',
    next: 'q_workbench',
  },
  {
    id: 'q_workbench',
    title: 'Ferramentas do Ofício',
    chapter: 'Capítulo I — Raízes',
    giver: 'tomas',
    desc: 'Abra o menu de Criação (tecla C) e crie uma Bancada de Trabalho. Depois, selecione-a na barra e posicione-a na sua fazenda.',
    objectives: [{ type: 'stat', stat: 'place:workbench', n: 1, label: 'Posicione uma Bancada de Trabalho' }],
    reward: { gold: 100, items: [{ id: 'torch', qty: 5 }] },
    done: 'Sua oficina está pronta! +100 moedas e 5 Tochas.',
    next: 'q_harvest',
  },
  {
    id: 'q_harvest',
    title: 'Primeira Colheita',
    chapter: 'Capítulo I — Raízes',
    giver: 'tomas',
    desc: 'Regue suas plantações todos os dias até que fiquem maduras. Então, colha-as com a tecla E ou o botão direito.',
    objectives: [{ type: 'stat', stat: 'harvest', n: 5, label: 'Colha 5 plantações' }],
    reward: { gold: 200, xp: ['farming', 30] },
    done: 'Uma colheita farta! Venda na Caixa de Vendas ou no mercado de Lívia. +200 moedas.',
    next: 'q_bridge',
  },
  {
    id: 'q_bridge',
    title: 'A Ponte de Greenvale',
    chapter: 'Capítulo II — Além do Rio',
    giver: 'tomas',
    desc: 'A ponte leste de Greenvale desabou há anos, isolando a Floresta de Eldoria. Junte 40 Madeira e 20 Pedra e reconstrua-a no local da Ponte Quebrada, a leste da praça.',
    objectives: [{ type: 'flag', flag: 'bridge_built', label: 'Reconstrua a ponte leste' }],
    reward: { gold: 300, pts: ['tomas', 150], xp: ['foraging', 40] },
    done: 'A ponte está de pé! A Floresta de Eldoria está aberta. +300 moedas.',
    next: 'q_forest',
  },
  {
    id: 'q_forest',
    title: 'Ecos da Floresta',
    chapter: 'Capítulo II — Além do Rio',
    giver: 'tomas',
    desc: 'Tomás contou que uma herbalista chamada Elara vive numa cabana no coração da floresta. Encontre-a.',
    objectives: [{ type: 'talk', npc: 'elara', label: 'Encontre Elara na Floresta de Eldoria' }],
    reward: { items: [{ id: 'herb', qty: 5 }], flag: 'met_elara', xp: ['foraging', 30] },
    done: 'Elara ensinou a receita da Mesa de Alquimia e lhe deu 5 Ervas Medicinais.',
    next: 'q_mines',
  },
  {
    id: 'q_mines',
    title: 'As Minas Sussurrantes',
    chapter: 'Capítulo III — Pedra e Fogo',
    giver: 'aldric',
    desc: 'Aldric precisa de minério e diz que a Mina Sussurrante, nas montanhas ao norte, é rica em metais. Desça até o 5º andar. Leve sua espada e comida!',
    objectives: [{ type: 'stat', stat: 'floor', n: 5, label: 'Alcance o 5º andar da mina', max: true }],
    reward: { gold: 300, xp: ['mining', 50] },
    done: 'Você desbravou as profundezas da mina! +300 moedas.',
    next: 'q_copper',
  },
  {
    id: 'q_copper',
    title: 'Metal para o Ferreiro',
    chapter: 'Capítulo III — Pedra e Fogo',
    giver: 'aldric',
    desc: 'Funda minério de cobre na fornalha (5 minérios + 1 carvão por barra) e leve 3 Barras de Cobre para Aldric.',
    objectives: [{ type: 'deliver', npc: 'aldric', item: 'copper_bar', n: 3, label: 'Entregue 3 Barras de Cobre a Aldric' }],
    reward: { items: [{ id: 'sword_c', qty: 1 }], pts: ['aldric', 150], xp: ['mining', 30] },
    done: 'Aldric forjou uma Espada de Cobre para você!',
    next: 'q_ruins',
  },
  {
    id: 'q_ruins',
    title: 'Segredos das Ruínas',
    chapter: 'Capítulo IV — A Coroa Partida',
    giver: 'elara',
    desc: 'Elara sente uma energia antiga vinda das Ruínas Esquecidas, ao sul da floresta. Procure o Baú Antigo escondido entre os pilares.',
    objectives: [{ type: 'have', item: 'fragment', n: 1, label: 'Encontre o Fragmento Antigo' }],
    reward: { gold: 500, xp: ['foraging', 60] },
    done: 'Um fragmento da lendária Coroa de Eldoria! A Capitã Brenna precisa saber disso.',
    next: 'q_capital',
  },
  {
    id: 'q_capital',
    title: 'Rumo à Capital',
    chapter: 'Capítulo IV — A Coroa Partida',
    giver: 'brenna',
    desc: 'Leve o Fragmento Antigo à Capitã Brenna, no Portão da Estrada Real nas Montanhas Sussurrantes.',
    objectives: [{ type: 'deliver', npc: 'brenna', item: 'fragment', n: 1, label: 'Entregue o Fragmento à Capitã Brenna' }],
    reward: { gold: 1000, items: [{ id: 'eq_ring', qty: 1 }], pts: ['brenna', 200], flag: 'chapter1_done' },
    done: 'Brenna enviou o fragmento à Capital. Fim do Capítulo I da sua lenda!',
    next: 'q_road',
  },
  {
    id: 'q_road',
    title: 'A Estrada Real',
    chapter: 'Capítulo V — Valoria',
    giver: 'brenna',
    desc: 'A Capital respondeu à mensagem de Brenna! Fale com a Capitã no Portão da Estrada Real, nas Montanhas Sussurrantes.',
    objectives: [{ type: 'talk', npc: 'brenna', label: 'Fale com a Capitã Brenna no portão' }],
    reward: { flag: 'road_open', pts: ['brenna', 50] },
    done: 'Brenna destrancou o Portão da Estrada Real. Valoria, a Capital, espera por você!',
    next: 'q_audience',
  },
  {
    id: 'q_audience',
    title: 'Audiência Real',
    chapter: 'Capítulo V — Valoria',
    giver: 'brenna',
    desc: 'Atravesse o portão e siga a Estrada Real até Valoria. A Rainha Isolde quer conhecer quem encontrou o fragmento. Ela recebe visitas na sala do trono do castelo.',
    objectives: [{ type: 'talk', npc: 'isolde', label: 'Fale com a Rainha Isolde no castelo' }],
    reward: { gold: 500 },
    done: 'A Rainha pediu sua ajuda para encontrar os outros pedaços da Coroa de Eldoria.',
    next: 'q_guild',
  },
  {
    id: 'q_guild',
    title: 'A Guilda dos Mercadores',
    chapter: 'Capítulo V — Valoria',
    giver: 'isolde',
    desc: 'Para ganhar a confiança da corte, aliste-se na Guilda dos Mercadores de Valoria. Fale com o Mestre Corvin e conclua 3 contratos do quadro da guilda.',
    objectives: [{ type: 'stat', stat: 'guild_contract', n: 3, label: 'Conclua 3 contratos da guilda' }],
    reward: { gold: 1000, pts: ['corvin', 150], xp: ['foraging', 80] },
    done: 'Corvin elogiou seu trabalho diante da corte. A Rainha agora confia em você.',
    next: 'q_frag_mine',
  },
  {
    id: 'q_frag_mine',
    title: 'O Coração da Montanha',
    chapter: 'Capítulo VI — A Coroa Partida',
    giver: 'isolde',
    desc: 'Segundo os registros reais, um fragmento foi selado num altar de cristal no fundo da Mina Sussurrante — o 10º andar.',
    objectives: [{ type: 'have', item: 'fragment_mine', n: 1, label: 'Encontre o fragmento no 10º andar da mina' }],
    reward: { gold: 800, xp: ['mining', 120] },
    done: 'O Fragmento do Coração da Montanha brilha em suas mãos!',
    next: 'q_frag_forest',
  },
  {
    id: 'q_frag_forest',
    title: 'Lágrimas da Floresta',
    chapter: 'Capítulo VI — A Coroa Partida',
    giver: 'isolde',
    desc: 'O último fragmento foi confiado aos guardiões da floresta. Elara pode despertá-lo, mas precisa de 3 Cristais Arcanos para o ritual.',
    objectives: [{ type: 'deliver', npc: 'elara', item: 'crystal', n: 3, label: 'Entregue 3 Cristais Arcanos a Elara' }],
    reward: { items: [{ id: 'fragment_forest', qty: 1 }], pts: ['elara', 200], xp: ['foraging', 100] },
    done: 'Elara despertou o Fragmento das Lágrimas da Floresta e o entregou a você.',
    next: 'q_crown',
  },
  {
    id: 'q_crown',
    title: 'A Coroa Restaurada',
    chapter: 'Capítulo VI — A Coroa Partida',
    giver: 'isolde',
    desc: 'Leve os dois fragmentos à Rainha Isolde em Valoria. Com o fragmento que Brenna enviou, a Coroa de Eldoria poderá ser restaurada.',
    objectives: [
      { type: 'have', item: 'fragment_mine', n: 1, label: 'Fragmento do Coração da Montanha', consume: true },
      { type: 'have', item: 'fragment_forest', n: 1, label: 'Fragmento das Lágrimas da Floresta', consume: true },
      { type: 'talk', npc: 'isolde', label: 'Entregue os fragmentos à Rainha Isolde' },
    ],
    reward: { gold: 5000, items: [{ id: 'eq_royal_cape', qty: 1 }, { id: 'royal_seal', qty: 1 }], pts: ['isolde', 300], flag: 'chapter2_done' },
    done: 'A Coroa de Eldoria foi restaurada! A Rainha nomeou você Cavaleiro(a) de Eldoria.',
  },
];

export const QUEST_BY_ID: Record<string, QuestDef> = {};
for (const q of QUESTS) QUEST_BY_ID[q.id] = q;

export interface DailyTemplate {
  npc: string;
  item: string;
  qty: number;
  reward: number;
  needs?: string; // flag required
  seasons?: number[];
  text: string;
}

export const DAILY: DailyTemplate[] = [
  { npc: 'tomas', item: 'wood', qty: 20, reward: 120, text: 'Preciso consertar minha cerca. Alguém pode me trazer madeira?' },
  { npc: 'aldric', item: 'stone', qty: 25, reward: 150, text: 'Preciso de pedras para reformar a forja.' },
  { npc: 'aldric', item: 'copper_ore', qty: 8, reward: 220, text: 'Procuro minério de cobre. Pago bem.' },
  { npc: 'aldric', item: 'coal', qty: 5, reward: 200, text: 'O carvão acabou. A forja não pode parar!' },
  { npc: 'livia', item: 'fish_carp', qty: 1, reward: 160, text: 'Quero fazer um ensopado de peixe. Alguém pesca uma carpa para mim?' },
  { npc: 'livia', item: 'berry', qty: 6, reward: 150, needs: 'bridge_built', text: 'Amoras silvestres para geleia! Quem me ajuda?' },
  { npc: 'livia', item: 'wheat', qty: 5, reward: 180, seasons: [0, 1, 2], text: 'O padeiro da Capital encomendou trigo. Preciso de ajuda!' },
  { npc: 'livia', item: 'turnip', qty: 3, reward: 160, seasons: [0], text: 'Nabos frescos estão em falta no mercado!' },
  { npc: 'livia', item: 'tomato', qty: 3, reward: 220, seasons: [1], text: 'Preciso de tomates para o festival de verão.' },
  { npc: 'livia', item: 'pumpkin', qty: 1, reward: 500, seasons: [2], text: 'Uma abóbora gigante para enfeitar a praça!' },
  { npc: 'elara', item: 'herb', qty: 4, reward: 200, needs: 'bridge_built', text: 'Minhas ervas acabaram. Preciso de mais para as poções.' },
  { npc: 'elara', item: 'mushroom', qty: 3, reward: 220, needs: 'bridge_built', text: 'Cogumelos do bosque, por favor. Para um elixir especial.' },
  { npc: 'pipo', item: 'flower', qty: 2, reward: 100, text: 'Quero dar flores pra minha mãe! Mas não acho nenhuma...' },
  { npc: 'tomas', item: 'fiber', qty: 15, reward: 100, text: 'Preciso de fibras para trançar cestos.' },
  { npc: 'brenna', item: 'bread', qty: 1, reward: 250, text: 'A guarda precisa de provisões. Um pão serve.' },
];

export interface ProjectDef {
  id: string;
  name: string;
  desc: string;
  gold: number;
  mats: Mat[];
  where: string;
}

export const PROJECTS: ProjectDef[] = [
  { id: 'bridge', name: 'Reconstruir a Ponte Leste', desc: 'Reconecta Greenvale à Floresta de Eldoria.', gold: 0, mats: [{ id: 'wood', qty: 40 }, { id: 'stone', qty: 20 }], where: 'No local da Ponte Quebrada, a leste da praça.' },
  { id: 'lamps', name: 'Lanternas da Praça', desc: 'Restaura os postes de luz apagados de Greenvale.', gold: 200, mats: [{ id: 'wood', qty: 20 }, { id: 'copper_bar', qty: 3 }, { id: 'coal', qty: 5 }], where: 'No Quadro de Avisos da praça.' },
  { id: 'market', name: 'Ampliação do Mercado', desc: 'Lívia passa a vender sementes de morango e decorações.', gold: 1000, mats: [{ id: 'wood', qty: 60 }, { id: 'stone', qty: 30 }], where: 'No Quadro de Avisos da praça.' },
];
