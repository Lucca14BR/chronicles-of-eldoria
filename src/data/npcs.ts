/** NPC definitions: look, personality, schedules, gifts and dialogue (pt-BR). */
import type { CharSpec } from '../art/characters';
import type { Facing } from '../core/state';
import { CAPITAL_NPCS } from './capitalNpcs';

export interface SchedEntry {
  t: number; // minutes since 0:00
  x: number;
  y: number;
  face?: Facing;
  hide?: boolean;
  wander?: number; // radius in tiles
}

export interface NPCDef {
  id: string;
  loc?: string; // location id (default 'world')
  minor?: boolean; // background character (no relationship entry)
  name: string;
  title: string;
  personality: string;
  spec: CharSpec;
  schedule: SchedEntry[];
  rain?: SchedEntry[];
  shop?: string;
  shopHours?: [number, number];
  loves: string[];
  likes: string[];
  dislikes: string[];
  lines: {
    first: string;
    greet: string[];
    morning: string[];
    evening: string[];
    rain: string[];
    season: string[][];
    friend: string[];
    best: string[];
  };
  gift: { love: string; like: string; neutral: string; dislike: string };
}

const h = (hh: number, mm = 0) => hh * 60 + mm;

export const NPCS: NPCDef[] = [
  {
    id: 'tomas',
    name: 'Tomás',
    title: 'Ancião de Greenvale',
    personality: 'Sábio, paciente e nostálgico. Foi o maior fazendeiro da região.',
    spec: { skin: '#e0b090', hair: '#e8e4dc', hairStyle: 0, shirt: '#6a8a4a', pants: '#6e5a40', hat: 'straw', beard: '#ecebe4', outfit: 'tunic', accent: '#4a3020' },
    schedule: [
      { t: h(6), x: 65, y: 39, hide: true },
      { t: h(8), x: 78, y: 54, face: 'up' },
      { t: h(12), x: 63, y: 47, wander: 2 },
      { t: h(15), x: 82, y: 80, face: 'down' },
      { t: h(18), x: 79, y: 51, face: 'right' },
      { t: h(21), x: 65, y: 39, hide: true },
    ],
    rain: [
      { t: h(6), x: 65, y: 39, hide: true },
      { t: h(10), x: 66, y: 40, face: 'down' },
      { t: h(13), x: 65, y: 39, hide: true },
    ],
    loves: ['pumpkin', 'stew', 'berry_pie'],
    likes: ['turnip', 'potato', 'wheat', 'bread', 'mushroom', 'corn'],
    dislikes: ['gel', 'bone', 'stone'],
    lines: {
      first: 'Ora, ora... um rosto novo em Greenvale! Você deve ser {nome}, quem herdou a velha fazenda a oeste. Boas-vindas, jovem.',
      greet: [
        'A terra devolve tudo o que você dá a ela, {nome}. Cuide bem dela.',
        'Na minha juventude, Greenvale abastecia toda a Capital com seu trigo.',
        'Dizem que uma coroa antiga foi partida em pedaços e escondida em Eldoria... Bobagem de velho, talvez.',
        'Não se esqueça de regar suas plantas todos os dias. Elas sentem sua falta.',
        'Quando a ponte leste caiu, perdemos contato com a floresta. Que saudade.',
      ],
      morning: ['Bom dia! O orvalho da manhã é o melhor amigo do fazendeiro.', 'Acordou cedo, hein? Assim que se faz.'],
      evening: ['O pôr do sol em Greenvale é um espetáculo, não acha?', 'Hora de descansar esses ossos velhos.'],
      rain: ['Chuva boa! Suas plantações vão agradecer — não precisa regar hoje.', 'Meus joelhos sempre avisam quando vai chover.'],
      season: [
        ['A primavera é tempo de nabos e trigo. Plante o quanto puder!'],
        ['O verão traz melões doces... e muito suor.'],
        ['O outono pinta a floresta de ouro. Abóboras são o orgulho da estação.'],
        ['O inverno é para planejar, consertar ferramentas e contar histórias perto do fogo.'],
      ],
      friend: ['Você me lembra de mim quando jovem, {nome}. Fico feliz que tenha vindo.', 'Sabe, minha esposa adorava torta de amora. Ainda sinto o cheiro dela na cozinha...'],
      best: ['Greenvale renasceu desde que você chegou. Obrigado, de coração.'],
    },
    gift: {
      love: 'Oh! Isso me traz tantas lembranças... Muito obrigado, {nome}!',
      like: 'Que gentileza! Vou aproveitar isso.',
      neutral: 'Obrigado, jovem.',
      dislike: 'Hum... não sei bem o que fazer com isso.',
    },
  },
  {
    id: 'livia',
    name: 'Lívia',
    title: 'Mercadora',
    personality: 'Alegre, falante e ótima negociante. Sabe de todas as novidades da vila.',
    spec: { skin: '#f0c8a0', hair: '#c8602a', hairStyle: 2, shirt: '#d8a040', pants: '#8a3a5a', outfit: 'apron', accent: '#f4ecd8' },
    schedule: [
      { t: h(6), x: 88, y: 40, hide: true },
      { t: h(8, 30), x: 74, y: 46, face: 'down' },
      { t: h(17), x: 85, y: 50, face: 'left' },
      { t: h(20), x: 88, y: 40, hide: true },
    ],
    shop: 'livia',
    shopHours: [h(9), h(17)],
    loves: ['flower', 'strawberry', 'melon'],
    likes: ['berry', 'tomato', 'copper_bar', 'fish_perch', 'bread'],
    dislikes: ['gel', 'coal', 'fiber'],
    lines: {
      first: 'Oi, oi! Você é a pessoa nova da fazenda, né? Eu sou a Lívia! Se precisar de sementes, é comigo mesmo. Preço justo e sorriso grátis!',
      greet: [
        'Já viu as sementes da estação? Chegaram fresquinhas!',
        'Sabia que o Aldric canta enquanto trabalha? Bem baixinho, mas canta!',
        'Se você me trouxer coisas boas, eu compro! Ou use a caixa de vendas na sua fazenda.',
        'Um dia quero abrir uma loja de verdade na Capital. Um dia!',
        'O Pipo vive correndo por aí. Esse menino tem energia de sobra!',
      ],
      morning: ['Bom diaaa! Vamos negociar?', 'Café, sol e clientes. Que manhã perfeita!'],
      evening: ['Ufa, que dia cheio! Hora de contar as moedas.', 'A fonte fica linda com as luzes da noite.'],
      rain: ['Dia de chuva é dia de pouco movimento... Que tal comprar algo para me animar?', 'Adoro o cheiro de terra molhada!'],
      season: [
        ['Na primavera as flores do campo ficam lindas. Eu adoro receber flores!'],
        ['Melões! O verão é a estação dos melões!'],
        ['Outono é a melhor época para vender abóboras. Todo mundo quer!'],
        ['No inverno quase nada cresce... mas a couve-gelo resiste!'],
      ],
      friend: ['Ninguém compra comigo como você, {nome}! Mas não conta pros outros.', 'Às vezes sinto falta do mar. Cresci numa vila de pescadores, sabia?'],
      best: ['Se um dia eu abrir a loja na Capital, você vai ser meu sócio!'],
    },
    gift: {
      love: 'Aaah! Eu AMEI! Como você adivinhou?',
      like: 'Que lindo, obrigada!',
      neutral: 'Ah, obrigada! Vou achar um uso pra isso.',
      dislike: 'Ehh... obrigada, eu acho?',
    },
  },
  {
    id: 'aldric',
    name: 'Aldric',
    title: 'Mestre Ferreiro',
    personality: 'Rabugento, de poucas palavras, mas justo. Respeita trabalho duro.',
    spec: { skin: '#c88a60', hair: '#3a2a20', hairStyle: 0, shirt: '#8a4a2a', pants: '#3a3a42', outfit: 'apron', accent: '#5a3a22', beard: '#3a2a20' },
    schedule: [
      { t: h(6), x: 101, y: 45, hide: true },
      { t: h(7), x: 99, y: 56, face: 'up' },
      { t: h(19), x: 90, y: 50, face: 'down' },
      { t: h(22), x: 101, y: 45, hide: true },
    ],
    shop: 'aldric',
    shopHours: [h(8), h(19)],
    loves: ['gold_bar', 'iron_bar', 'crystal'],
    likes: ['copper_bar', 'coal', 'grilled_fish', 'bread', 'gold_ore'],
    dislikes: ['flower', 'berry', 'fiber'],
    lines: {
      first: 'Hm. Você é o novato. Sou Aldric, o ferreiro. Se quiser ferramentas melhores, traga metal e moedas. Simples assim.',
      greet: [
        'Ferro bem batido não quebra. Gente também não.',
        'Traga barras de cobre e eu deixo suas ferramentas afiadas como nunca.',
        'A mina ao norte é perigosa. Leve uma espada. E comida.',
        'Hmph. Ocupado.',
        'Funda o minério na fornalha: cinco minérios e um carvão por barra.',
      ],
      morning: ['O fogo da forja já está aceso.', 'Cedo. Bom.'],
      evening: ['Dia de trabalho honesto.', 'Meus braços doem. Bom sinal.'],
      rain: ['Chuva não apaga o fogo da forja.', 'Hmph. Molhado.'],
      season: [['Primavera. Todo mundo quer enxada nova.'], ['Calor dos infernos aqui na forja.'], ['O outono é bom para minerar. Menos calor.'], ['No inverno a forja é o lugar mais quente da vila.']],
      friend: ['Você trabalha duro, {nome}. Respeito isso.', 'Meu pai forjava espadas para a guarda real. Um dia eu mostro a você.'],
      best: ['Você é como família agora. Não conte isso pra ninguém.'],
    },
    gift: {
      love: '...Isto é excelente. Obrigado.',
      like: 'Hm. Útil. Obrigado.',
      neutral: 'Hm.',
      dislike: 'O que eu vou fazer com isso?',
    },
  },
  {
    id: 'elara',
    name: 'Elara',
    title: 'Herbalista da Floresta',
    personality: 'Misteriosa e serena. Conversa com as árvores e conhece segredos antigos.',
    spec: { skin: '#e8d0b8', hair: '#d8d0f0', hairStyle: 1, shirt: '#4a6a5a', pants: '#3a4a3a', outfit: 'robe', hat: 'hood', hatColor: '#3a5a4a', accent: '#c8b060' },
    schedule: [
      { t: h(6), x: 129, y: 42, hide: true },
      { t: h(7), x: 128, y: 45, face: 'down' },
      { t: h(10), x: 122, y: 56, wander: 3 },
      { t: h(14), x: 133, y: 44, face: 'up' },
      { t: h(19), x: 129, y: 42, hide: true },
    ],
    shop: 'elara',
    shopHours: [h(7), h(19)],
    loves: ['crystal', 'herb', 'potion_luck'],
    likes: ['mushroom', 'flower', 'berry', 'fish_moon'],
    dislikes: ['coal', 'copper_ore', 'bone'],
    lines: {
      first: 'As árvores me contaram que alguém atravessaria a ponte. Eu sou Elara. Boas-vindas à Floresta de Eldoria, {nome}.',
      greet: [
        'As ruínas ao sul guardam mais do que pedras. Ouça o silêncio delas.',
        'Três ervas e uma gosma de slime fazem uma boa poção de vida.',
        'A floresta dá, mas também cobra. Respeite-a.',
        'Os cristais das minas cantam à noite. Você já ouviu?',
        'Nem toda magia vem de livros. Algumas vêm da terra.',
      ],
      morning: ['O orvalho ainda guarda os sonhos da noite.', 'Bom dia, viajante.'],
      evening: ['Ao entardecer, os espíritos da floresta despertam.', 'Cuidado com os slimes quando a noite cair.'],
      rain: ['A chuva é a floresta respirando.', 'Os cogumelos adoram dias assim.'],
      season: [['A primavera desperta as ervas adormecidas.'], ['No verão, a floresta canta mais alto.'], ['O outono é o suspiro da floresta antes de dormir.'], ['No inverno, a floresta sonha.']],
      friend: ['Você tem um coração gentil, {nome}. As árvores confiam em você.', 'Eu cresci entre estas árvores. Elas são minha família.'],
      best: ['Existe uma antiga profecia sobre um viajante que reuniria a coroa partida... Talvez seja você.'],
    },
    gift: {
      love: 'Que presente precioso... Sinto a energia dele. Obrigada.',
      like: 'A natureza agradece, e eu também.',
      neutral: 'Obrigada, {nome}.',
      dislike: 'Isto... carrega uma energia estranha.',
    },
  },
  {
    id: 'brenna',
    name: 'Capitã Brenna',
    title: 'Guarda Real',
    personality: 'Disciplinada, leal e direta. Guarda a Estrada Real com orgulho.',
    spec: { skin: '#b07850', hair: '#2a1a14', hairStyle: 2, shirt: '#5a6a8a', pants: '#3a3a4a', outfit: 'armor', hat: 'helmet', accent: '#2a4a8a', cape: '#8a2a2a' },
    schedule: [
      { t: h(0), x: 106, y: 10, face: 'down' },
      { t: h(12), x: 84, y: 40, face: 'down' },
      { t: h(14), x: 106, y: 10, face: 'down' },
    ],
    loves: ['eq_ring', 'grilled_fish', 'gold_bar'],
    likes: ['bread', 'stew', 'iron_bar', 'corn'],
    dislikes: ['flower', 'gel'],
    lines: {
      first: 'Alto lá! Ah, você é {nome}, quem assumiu a velha fazenda... Capitã Brenna, da Guarda Real. A Estrada Real está fechada por ordem da Coroa.',
      greet: [
        'A Estrada Real segue fechada até segunda ordem da Capital.',
        'Mantenha os olhos abertos nas minas. Os esqueletos lá embaixo não brincam.',
        'Um guarda nunca dorme no posto. Bem... quase nunca.',
        'A Capital fica a três dias de viagem, além destas montanhas.',
        'Se encontrar algo estranho nas ruínas, traga até mim.',
      ],
      morning: ['Turno da manhã. Tudo em ordem.', 'Bom dia, {nome}.'],
      evening: ['A noite é quando os problemas aparecem.', 'Fim de turno se aproximando.'],
      rain: ['A armadura enferruja com essa chuva...', 'Chuva ou sol, o posto não fica vazio.'],
      season: [['Primavera: época de patrulhas longas.'], ['Verão. Calor dentro desta armadura é um teste de disciplina.'], ['Outono. Os mercadores da Capital costumavam passar por aqui nesta época.'], ['Inverno. A neve fecha as passagens das montanhas.']],
      friend: ['Você é uma boa pessoa, {nome}. Greenvale tem sorte.', 'Entrei para a guarda aos quinze anos. Nunca me arrependi.'],
      best: ['Se um dia a Capital chamar, quero você ao meu lado.'],
    },
    gift: {
      love: 'Isto é... magnífico. Agradeço de coração.',
      like: 'Muito bom. Obrigada.',
      neutral: 'Agradeço.',
      dislike: 'Isso não serve para uma guarda.',
    },
  },
  {
    id: 'pipo',
    name: 'Pipo',
    title: 'Aspirante a Cavaleiro',
    personality: 'Criança curiosa e cheia de energia. Sonha em ser cavaleiro.',
    spec: { skin: '#f0c8a0', hair: '#5a3a20', hairStyle: 3, shirt: '#3a7ab0', pants: '#6a5a3a', outfit: 'tunic', hat: 'bandana', hatColor: '#c84a3a' },
    schedule: [
      { t: h(6), x: 67, y: 63, hide: true },
      { t: h(8), x: 79, y: 45, wander: 3 },
      { t: h(10), x: 86, y: 56, wander: 2 },
      { t: h(12), x: 63, y: 52, wander: 2 },
      { t: h(14), x: 78, y: 79, wander: 3 },
      { t: h(17), x: 80, y: 46, wander: 3 },
      { t: h(19), x: 67, y: 63, hide: true },
    ],
    rain: [{ t: h(0), x: 67, y: 63, hide: true }],
    loves: ['berry', 'berry_pie', 'strawberry'],
    likes: ['flower', 'fish_carp', 'acorn', 'old_coin', 'mushroom'],
    dislikes: ['eggplant', 'cabbage', 'stone'],
    lines: {
      first: 'Uau! Você é aventureiro? Eu sou o Pipo! Um dia vou ser cavaleiro da Guarda Real, igual à Capitã Brenna!',
      greet: [
        'Você já entrou na mina? É verdade que tem monstros lá?',
        'Eu achei um sapo enorme no lago ontem! Ele fugiu...',
        'Quando eu crescer vou ter uma espada de ferro!',
        'Minha mãe diz que eu não posso ir nas ruínas. Mas um dia eu vou!',
        'Amoras são a melhor comida do mundo inteiro!',
      ],
      morning: ['Bom dia! Vamos brincar de cavaleiro?', 'Eu acordei antes do galo hoje!'],
      evening: ['Minha mãe já vai me chamar pra jantar...', 'Olha os vagalumes!'],
      rain: ['Não posso sair na chuva...'],
      season: [['Na primavera tem muitas flores pra colher!'], ['Verão é a melhor época pra nadar no lago!'], ['As folhas do outono fazem barulho quando a gente pula nelas!'], ['Eu fiz um boneco de neve igual ao Aldric!']],
      friend: ['Você é a pessoa adulta mais legal que eu conheço, {nome}!', 'Promete que um dia me leva na mina?'],
      best: ['Quando eu for cavaleiro, vou te proteger pra sempre!'],
    },
    gift: {
      love: 'UAU! É o melhor presente do mundo!!',
      like: 'Que legal! Obrigado!',
      neutral: 'Hum, valeu!',
      dislike: 'Eca! Não gosto disso...',
    },
  },
  {
    id: 'marta',
    name: 'Marta',
    title: 'Rancheira do Prado Verde',
    personality: 'Prática, calorosa e bem-humorada. Conhece cada animal pelo nome.',
    spec: { skin: '#d8a07a', hair: '#8a3a1a', hairStyle: 1, shirt: '#7a9a4a', pants: '#5a4a3a', hat: 'straw', hatColor: '#c8a050', outfit: 'tunic', accent: '#6a3a1a' },
    schedule: [
      { t: h(6), x: 27, y: 82, hide: true },
      { t: h(7), x: 32, y: 85, face: 'down' },
      { t: h(11, 30), x: 24, y: 89, wander: 2 },
      { t: h(13, 30), x: 32, y: 85, face: 'down' },
      { t: h(18), x: 27, y: 82, hide: true },
    ],
    rain: [
      { t: h(6), x: 27, y: 82, hide: true },
      { t: h(8), x: 32, y: 85, face: 'down' },
      { t: h(16), x: 27, y: 82, hide: true },
    ],
    shop: 'marta',
    shopHours: [h(8), h(17)],
    loves: ['milk_large', 'egg_large', 'cheese', 'pumpkin'],
    likes: ['milk', 'egg', 'wheat', 'corn', 'flower', 'bread'],
    dislikes: ['bone', 'gel', 'coal'],
    lines: {
      first: 'Opa! Boas-vindas ao Rancho Prado Verde! Eu sou a Marta. Se um dia quiser criar galinhas, vacas, cabras ou ovelhas, é só me procurar. Primeiro construa um Galinheiro ou um Celeiro na sua fazenda — menu de Construção, tecla B.',
      greet: [
        'Animal feliz dá mais produto. Faça carinho neles todo dia!',
        'Com sol e grama, os bichos pastam sozinhos. Na chuva ou no inverno, precisam de feno no comedouro.',
        'Vacas e cabras se ordenham com o balde. Ovelha, só com a tesoura!',
        'Leite vira queijo, lã vira tecido. É aí que está o dinheiro bom, viu?',
        'A Mimosa lá do cercado já ganhou três concursos na Capital. Ela é metida, confesso.',
      ],
      morning: ['Bom dia! As galinhas já cantaram faz tempo.', 'Primeiro os bichos, depois o café. Regra do rancho!'],
      evening: ['Hora de recolher o rebanho.', 'Os animais sentem quando a noite chega. Sabem voltar sozinhos.'],
      rain: ['Dia de chuva: bicho no celeiro e feno no cocho.', 'Lama até o joelho... a vida no rancho!'],
      season: [
        ['Primavera é tempo de filhotes e grama nova. Os bichos adoram!'],
        ['No verão, deixe os animais pastarem bastante.'],
        ['Outono: hora de estocar feno para o inverno.'],
        ['No inverno não tem pasto. Feno, feno e mais feno!'],
      ],
      friend: ['Você leva jeito com os bichos, {nome}. Dá pra ver.', 'Meu avô fundou este rancho com uma cabra e uma promessa.'],
      best: ['Se um dia eu me aposentar, o Prado Verde fica em boas mãos com você.'],
    },
    gift: {
      love: 'Ah, que maravilha! Isso aqui é coisa de quem entende de rancho!',
      like: 'Que gentil, obrigada!',
      neutral: 'Obrigada, {nome}.',
      dislike: 'Hmm... os bichos talvez gostem. Eu, não muito.',
    },
  },
];

NPCS.push(...CAPITAL_NPCS);

export const NPC_BY_ID: Record<string, NPCDef> = {};
for (const n of NPCS) NPC_BY_ID[n.id] = n;
