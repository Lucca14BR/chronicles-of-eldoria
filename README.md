# Chronicles of Eldoria

RPG medieval de fazenda, construção e aventura em pixel art 2D (TypeScript + Phaser 3 + Vite).
Toda a arte, música e efeitos sonoros são gerados proceduralmente em código — nenhum asset externo.

## Rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build de produção em dist/
```

## Controles

| Tecla | Ação |
| --- | --- |
| WASD / Setas | Mover (Shift corre) |
| Clique esq. / Espaço | Usar ferramenta ou item (segure para repetir) |
| Clique dir. / E | Interagir: conversar, colher, abrir, comer |
| 1–0 / roda do mouse | Escolher item da barra |
| I · C · J · M · P · B | Inventário · Criação · Diário · Mapa · Personagem · Construção |
| Esc | Pausa (salvar, configurações, controles) |

## O que existe

- **Mundo** (150×110 tiles): Fazenda, vila de Greenvale, Floresta de Eldoria (liberada ao reconstruir a ponte),
  Montanhas Sussurrantes com a Mina (10 andares gerados), Lago Prateado, Ruínas Esquecidas, interior da casa.
- **Sistemas**: arar/plantar/regar/colher (10 culturas sazonais), coleta (árvores, pedras, minérios, ervas, amoras),
  criação em estações (bancada, fornalha, bigorna, fogueira, alquimia), posicionar móveis/cercas/caminhos,
  construções na fazenda (galpão, moinho, oficina), pesca, combate (slimes, morcegos, esqueletos),
  5 habilidades com níveis, equipamento, 6 NPCs com rotinas, diálogos, presentes e amizade, lojas,
  história principal (11 missões), pedidos diários, projetos da vila, ciclo dia/noite com iluminação,
  4 estações e clima (chuva, tempestade, neve), 3 espaços de salvamento (salva ao dormir ou pelo menu).
- **Rancho**: Marta e o Rancho Prado Verde (ao sul da fazenda) vendem galinhas, vacas, cabras, ovelhas, feno,
  balde e tesoura. Construa Galinheiro/Celeiro (tecla B). Animais pastam em dias de sol; na chuva/inverno
  comem feno do comedouro. Carinho diário aumenta a amizade e a chance de produtos grandes. Ovos aparecem
  perto do galinheiro; leite com o balde; lã a cada 3 dias com a tesoura. Receitas: queijo, omelete, tecido, feno.
- **Valoria, a Capital**: aberta ao concluir o Capítulo I (fale com a Capitã Brenna; o portão da Estrada Real
  leva à cidade). Castelo com sala do trono e a Rainha Isolde, Guilda dos Mercadores com contratos diários
  (entregas e caçadas) e ranques, Arsenal Real (armaduras e ferramentas de ouro), Mercado Real (sementes raras
  de uva e girassol, paga 25% a mais), bardo da taverna e guardas. Capítulos V–VI: reúna os fragmentos da
  Coroa (altar no 10º andar da mina, ritual de Elara) e torne-se Cavaleiro(a) de Eldoria.

## Estrutura

```
src/art/       pixel art procedural (tiles, personagens, objetos, ícones, menu)
src/data/      itens, culturas, objetos, NPCs, receitas/lojas, missões
src/world/     terrenos, geração de mundo/casa/mina, pathfinding
src/systems/   inventário, progresso/missões, simulação diária, áudio, luz, clima, save
src/entities/  jogador, NPC, inimigos
src/scenes/    Boot, Menu, Game
src/ui/        interface DOM (HUD, menus, diálogos, lojas) + estilos
```

## Ainda não implementado

Interiores dos celeiros e das casas da Capital,
casamento/eventos de coração e mais andares/biomas.
