import Phaser from 'phaser';
import { G, S, TILE, key, bus, WObj, LocationState, emptyLoc, newId, addStat, maxStat, Facing, HOTBAR } from '../core/state';
import { T, SOLID_TERRAIN, WATER_TERRAIN, tileIndexFor, TS } from '../world/terrain';
import { TILESET_MARGIN, TILESET_SPACING } from '../art/tiles';
import { buildWorld, buildHouse, buildCave, LocDef, POS, zoneAt, ZONE_NAME, Zone, MINE_FLOORS } from '../world/worldgen';
import { OBJ, ObjKind, texFor, Drop } from '../data/objects';
import { ITEMS, item } from '../data/items';
import { CROPS, cropStage } from '../data/crops';
import { NPCS, NPC_BY_ID } from '../data/npcs';
import { hash2 } from '../core/rng';
import { Player } from '../entities/Player';
import { NPC, NPCHost } from '../entities/NPC';
import { Enemy, ENEMIES } from '../entities/Enemy';
import { findPath } from '../world/path';
import { Lighting, Light, outdoorAmbient, Ambient } from '../systems/lighting';
import { WeatherFx } from '../systems/weatherfx';
import { audio } from '../systems/audio';
import { ui, GameCtx } from '../ui/UI';
import type { Station } from '../data/recipes';
import { BUILDINGS } from '../data/recipes';
import { addItem, selected, consumeSelected, count, removeItem, hasMats, consumeMats, bestTool } from '../systems/inventory';
import { addXP, lvl, spendStamina, maxHp, maxSt, defense, attackBonus, luck, addFriendship, questTalk, canDeliver, deliver, canDeliverDaily, deliverDaily, checkQuests, hearts, addGold } from '../systems/progress';
import { advanceDay, WEATHER_LABEL } from '../systems/day';
import { saveGame } from '../systems/save';
import { DAY_END, REAL_MS_PER_GAME_MIN, fmtDate, SEASONS } from '../core/time';
import { buildCharSheet } from '../art/characters';
import { Animal } from '../entities/Animal';
import { PADDOCK, buildCapital, buildThrone, CAPITAL_ARRIVAL } from '../world/worldgen';
import { resumeQuests } from '../systems/progress';
import type { AnimalState } from '../core/state';

const FENCES = new Set(['fence', 'fence_static']);

interface DropSpr {
  spr: Phaser.GameObjects.Image;
  id: string;
  qty: number;
  ready: number;
}

interface Fishing {
  state: 'wait' | 'bite';
  t: number;
  bobber: Phaser.GameObjects.Image;
  bang: Phaser.GameObjects.Image | null;
  zone: Zone;
}

const LOCK_PLACE = new Set(['sprinkler', 'sprinkler2', 'scarecrow']);

export class GameScene extends Phaser.Scene implements GameCtx, NPCHost {
  get phaser(): Phaser.Scene {
    return this;
  }
  def!: LocDef;
  ls!: LocationState;
  private lid = 'world';
  private floor = 0;
  private map: Phaser.Tilemaps.Tilemap | null = null;
  private ground!: Phaser.Tilemaps.TilemapLayer;
  private colMap: Phaser.Tilemaps.Tilemap | null = null;
  private col!: Phaser.Tilemaps.TilemapLayer;
  private occ: (WObj | null)[] = [];
  private solidCnt!: Uint8Array;
  private objs = new Map<string, WObj>();
  private sprites = new Map<string, Phaser.GameObjects.Sprite>();
  private cropSpr = new Map<string, Phaser.GameObjects.Sprite>();
  private lightObjs = new Set<string>();
  player!: Player;
  private npcs: NPC[] = [];
  private enemies: Enemy[] = [];
  private animals: Animal[] = [];
  private drops: DropSpr[] = [];
  private lighting!: Lighting;
  private wfx!: WeatherFx;
  private cursorImg!: Phaser.GameObjects.Image;
  private ghost!: Phaser.GameObjects.Image;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private timeAcc = 0;
  private buildMode: string | null = null;
  private fishing: Fishing | null = null;
  private zone: Zone | '' = '';
  private busyTransition = false;
  private lastMouse = 0;
  private promptT = 0;
  private holdT = 0;
  private fadeAlpha: Phaser.GameObjects.Sprite[] = [];
  private caveRocksBroken = 0;
  private caveLadder = false;
  private spawnT = 0;

  constructor() {
    super('Game');
  }

  // ================================================================ lifecycle
  create() {
    const st = S();
    buildCharSheet(this, 'player', ui.playerSpec());
    this.lighting = new Lighting(this);
    this.wfx = new WeatherFx(this);
    this.cursorImg = this.add.image(0, 0, 'cursor').setOrigin(0.0625).setDepth(80000).setAlpha(0.7).setVisible(false);
    this.ghost = this.add.image(0, 0, 'pixel').setOrigin(0.5, 1).setDepth(80001).setAlpha(0.6).setVisible(false);
    this.input.mouse?.disableContextMenu();
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.addCapture('TAB,SPACE,UP,DOWN,LEFT,RIGHT');
    kb.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointer(p));
    this.input.on('pointermove', () => (this.lastMouse = this.time.now));
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (ui.isModal()) return;
      st.sel = (st.sel + (dy > 0 ? 1 : -1) + HOTBAR) % HOTBAR;
      this.onSelectChange();
    });
    this.scale.on('resize', () => this.setupCamera());
    ui.ctx = this;
    ui.showHUD(true);
    bus.on('select', () => this.onSelectChange(), this);
    bus.on('stats', () => checkQuests(), this);
    bus.on('inv', () => checkQuests(), this);
    bus.on('project', (id: string) => this.onProject(id), this);
    bus.on('animalAdded', (a: AnimalState) => this.spawnFarmAnimal(a), this);
    this.events.once('shutdown', () => {
      bus.off('select', undefined, this);
      bus.off('stats', undefined, this);
      bus.off('inv', undefined, this);
      bus.off('project', undefined, this);
      bus.off('animalAdded', undefined, this);
      this.wfx.clear();
      this.lighting.destroy();
    });
    this.loadLocation(st.player.loc, st.player.x, st.player.y, st.player.facing, 1, true);
    checkQuests();
    resumeQuests();
    if (st.time.total === 1 && st.time.min <= 6 * 60 + 5 && !st.flags.intro_shown) {
      st.flags.intro_shown = true;
      this.time.delayedCall(900, () =>
        ui.dialogue({
          name: 'Carta de Boas-Vindas',
          pages: [
            `Querido(a) {nome}, se você está lendo esta carta, é porque chegou à velha fazenda da família em Greenvale.`,
            'A terra está tomada pelo mato, mas ainda é fértil. Com trabalho e paciência, ela pode voltar a florescer.',
            'Procure o ancião Tomás na praça da vila, a leste. Ele vai ajudar você a começar. Boa sorte, e que Eldoria o(a) acolha!',
          ],
        }),
      );
    }
  }

  // ================================================================ camera
  private setupCamera() {
    const cam = this.cameras.main;
    const z = Math.max(2, Math.min(Math.floor(window.innerHeight / 230), Math.floor(window.innerWidth / 300)));
    cam.setZoom(z);
    cam.setRoundPixels(true);
    const mw = this.def.w * TILE,
      mh = this.def.h * TILE;
    const vw = cam.width / z,
      vh = cam.height / z;
    cam.stopFollow();
    if (mw <= vw || mh <= vh) {
      cam.removeBounds();
      if (mw <= vw && mh <= vh) cam.centerOn(mw / 2, mh / 2);
      else {
        cam.setBounds(0, 0, mw, mh);
        cam.startFollow(this.player.sprite, true, 0.2, 0.2);
      }
    } else {
      cam.setBounds(0, 0, mw, mh);
      cam.startFollow(this.player.sprite, true, 0.15, 0.15);
    }
    cam.setBackgroundColor(this.lid === 'cave' ? '#0a0608' : this.lid === 'house' ? '#1a1014' : '#2f6f2a');
  }

  // ================================================================ locations
  private clearLocation() {
    this.cancelFishing();
    for (const d of this.drops) {
      addItem(d.id, d.qty);
      d.spr.destroy();
    }
    this.drops = [];
    this.sprites.forEach((s) => s.destroy());
    this.sprites.clear();
    this.cropSpr.forEach((s) => s.destroy());
    this.cropSpr.clear();
    this.objs.clear();
    this.lightObjs.clear();
    this.npcs.forEach((n) => n.destroy());
    this.npcs = [];
    this.enemies.forEach((e) => e.destroy());
    this.animals.forEach((a) => a.destroy());
    this.animals = [];
    this.enemies = [];
    this.player?.destroy();
    this.map?.destroy();
    this.colMap?.destroy();
    this.map = null;
    this.colMap = null;
    this.physics.world.colliders.destroy();
    this.buildMode = null;
  }

  loadLocation(id: string, tx: number, ty: number, facing: Facing, floor = 1, first = false) {
    const st = S();
    this.clearLocation();
    this.lid = id;
    if (id === 'world') {
      this.def = buildWorld(st.flags, st.projects);
      this.ls = st.locs.world;
    } else if (id === 'house') {
      this.def = buildHouse();
      this.ls = st.locs.house;
    } else if (id === 'capital' || id === 'throne') {
      this.def = id === 'capital' ? buildCapital() : buildThrone();
      st.locs[id] = st.locs[id] || emptyLoc();
      this.ls = st.locs[id];
    } else {
      this.floor = floor;
      const gen = buildCave(floor, st.seed + st.time.total, st.flags);
      this.def = gen.def;
      st.locs.cave = emptyLoc();
      this.ls = st.locs.cave;
      for (const o of gen.objects) this.ls.objects[o.id] = o;
      this.caveRocksBroken = 0;
      this.caveLadder = false;
      maxStat('floor', floor);
      this.time.delayedCall(10, () => gen.enemies.forEach((e) => this.spawnEnemy(e.kind, e.x, e.y)));
    }
    st.player.loc = id;
    if (id === 'cave') {
      tx = this.def.spawn.x;
      ty = this.def.spawn.y;
    }
    const W = this.def.w,
      H = this.def.h;
    this.occ = new Array(W * H).fill(null);
    this.solidCnt = new Uint8Array(W * H);
    // tilemap
    const data: number[][] = [];
    for (let y = 0; y < H; y++) {
      const row: number[] = [];
      for (let x = 0; x < W; x++) row.push(this.tileIdx(x, y));
      data.push(row);
    }
    const season = st.time.season;
    this.map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const ts = this.map.addTilesetImage('tiles_' + season, 'tiles_' + season, TILE, TILE, TILESET_MARGIN, TILESET_SPACING)!;
    this.ground = this.map.createLayer(0, ts, 0, 0)!.setDepth(-20000);
    this.colMap = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: W, height: H });
    const cts = this.colMap.addTilesetImage('col', 'coltiles', TILE, TILE, 0, 0)!;
    this.col = this.colMap.createBlankLayer('col', cts, 0, 0)!.setVisible(false);
    this.col.setCollision(0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (SOLID_TERRAIN.has(this.def.terrain[y * W + x])) this.col.putTileAt(0, x, y);
    this.physics.world.setBounds(0, 0, W * TILE, H * TILE);
    // objects
    for (const o of this.def.statics) this.addObj(o, true);
    for (const o of Object.values(this.ls.objects)) this.addObj(o, false);
    for (const k of Object.keys(this.ls.crops)) this.refreshCrop(k);
    // player
    this.player = new Player(this, tx * TILE + 8, ty * TILE + 14);
    this.player.face(facing);
    this.physics.add.collider(this.player.sprite, this.col);
    // npcs
    {
      const rainy = st.weather === 'rain' || st.weather === 'storm';
      for (const def of NPCS.filter((n) => (n.loc || 'world') === id)) {
        const n = new NPC(this, def);
        n.place(st.time.min, rainy);
        this.npcs.push(n);
        this.physics.add.collider(this.player.sprite, n.sprite);
      }
      if (id === 'world') this.spawnAnimals();
    }
    this.setupCamera();
    this.cameras.main.fadeIn(first ? 600 : 300, 0, 0, 0);
    this.wfx.set(st.weather, this.def.outdoor, season);
    this.updateMusic(true);
    this.zone = '';
    if (id === 'cave') ui.banner('Mina Sussurrante', `Andar ${floor}`);
    else if (id === 'house') ui.banner('Sua Casa', fmtDate(st.time.day, st.time.season));
    else if (id === 'capital') ui.banner('Valoria', 'Capital do Reino de Eldoria');
    else if (id === 'throne') ui.banner('Sala do Trono', 'Castelo de Valoria');
    ui.refreshHUD();
  }

  private tileIdx(x: number, y: number): number {
    const W = this.def.w;
    const k = key(x, y);
    const soil = this.ls.soil[k];
    if (soil) return soil.w ? (soil.fert ? TS.tilledWetFert : TS.tilledWet) : soil.fert ? TS.tilledFert : TS.tilled;
    const getT = (xx: number, yy: number) => {
      if (xx < 0 || yy < 0 || xx >= W || yy >= this.def.h) return -1;
      const f = this.ls.floors[key(xx, yy)];
      return f !== undefined ? f : this.def.terrain[yy * W + xx];
    };
    return tileIndexFor(getT(x, y), x, y, getT, (a, b) => hash2(a, b, 1));
  }

  private refreshTile(x: number, y: number) {
    for (const [dx, dy] of [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const xx = x + dx,
        yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= this.def.w || yy >= this.def.h) continue;
      this.ground.putTileAt(this.tileIdx(xx, yy), xx, yy);
    }
  }

  terrainAt(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.def.w || y >= this.def.h) return T.VOID;
    const f = this.ls.floors[key(x, y)];
    return f !== undefined ? f : this.def.terrain[y * this.def.w + x];
  }

  isSolid(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.def.w || y >= this.def.h) return true;
    return SOLID_TERRAIN.has(this.terrainAt(x, y)) || this.solidCnt[y * this.def.w + x] > 0;
  }

  objAt(x: number, y: number): WObj | null {
    if (x < 0 || y < 0 || x >= this.def.w || y >= this.def.h) return null;
    return this.occ[y * this.def.w + x];
  }

  // ---------------------------------------------------------------- objects
  private addObj(o: WObj, isStatic: boolean) {
    const k = OBJ[o.kind];
    if (!k) return;
    this.objs.set(o.id, o);
    const W = this.def.w;
    for (let y = o.y; y < o.y + k.h; y++)
      for (let x = o.x; x < o.x + k.w; x++) {
        if (x < 0 || y < 0 || x >= W || y >= this.def.h) continue;
        if (!k.flat || !this.occ[y * W + x]) this.occ[y * W + x] = o;
        if (k.solid) {
          this.solidCnt[y * W + x]++;
          this.col.putTileAt(0, x, y);
        }
      }
    this.makeSprite(o);
    if (k.light) this.lightObjs.add(o.id);
    void isStatic;
  }

  private removeObj(o: WObj) {
    const k = OBJ[o.kind];
    const W = this.def.w;
    for (let y = o.y; y < o.y + k.h; y++)
      for (let x = o.x; x < o.x + k.w; x++) {
        if (x < 0 || y < 0 || x >= W || y >= this.def.h) continue;
        if (this.occ[y * W + x] === o) this.occ[y * W + x] = null;
        if (k.solid) {
          this.solidCnt[y * W + x] = Math.max(0, this.solidCnt[y * W + x] - 1);
          if (!this.isSolid(x, y)) this.col.removeTileAt(x, y);
        }
      }
    this.sprites.get(o.id)?.destroy();
    this.sprites.delete(o.id);
    this.objs.delete(o.id);
    this.lightObjs.delete(o.id);
    delete this.ls.objects[o.id];
    if (FENCES.has(o.kind)) this.refreshFences(o.x, o.y);
  }

  private frameFor(o: WObj, k: ObjKind): number | undefined {
    const st = S();
    if (o.kind === 'ancient_chest') return st.flags.ruins_chest ? 1 : 0;
    if (o.kind === 'mine_chest') return st.flags['mine_chest_' + this.floor] ? 1 : 0;
    if (FENCES.has(o.kind)) {
      let m = 0;
      const f = (x: number, y: number) => FENCES.has(this.objAt(x, y)?.kind || '');
      if (f(o.x, o.y - 1)) m |= 1;
      if (f(o.x + 1, o.y)) m |= 2;
      if (f(o.x, o.y + 1)) m |= 4;
      if (f(o.x - 1, o.y)) m |= 8;
      return m;
    }
    return k.frame ? k.frame(o, st.time.season) : undefined;
  }

  private makeSprite(o: WObj) {
    const k = OBJ[o.kind];
    const tex = texFor(o, S().time.season);
    const x = (o.x + k.w / 2) * TILE;
    const baseY = (o.y + k.h) * TILE;
    const fr = this.frameFor(o, k);
    const spr = fr === undefined ? this.add.sprite(x, baseY + (k.oy || 0), tex) : this.add.sprite(x, baseY + (k.oy || 0), tex, fr);
    spr.setOrigin(0.5, 1);
    spr.setDepth(k.flat ? -15000 + baseY : baseY);
    if (k.anim) spr.play({ key: k.anim, startFrame: Math.floor(Math.random() * 2) });
    this.sprites.get(o.id)?.destroy();
    this.sprites.set(o.id, spr);
    if (FENCES.has(o.kind)) this.refreshFences(o.x, o.y, o.id);
  }

  private refreshFences(x: number, y: number, except?: string) {
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = this.objAt(x + dx, y + dy);
      if (n && FENCES.has(n.kind) && n.id !== except) {
        const s = this.sprites.get(n.id);
        s?.setFrame(this.frameFor(n, OBJ.fence)!);
      }
    }
  }

  private refreshSprite(o: WObj) {
    const s = this.sprites.get(o.id);
    if (!s) return;
    const k = OBJ[o.kind];
    s.setTexture(texFor(o, S().time.season));
    const fr = this.frameFor(o, k);
    if (fr !== undefined) s.setFrame(fr);
  }

  private refreshCrop(k: string) {
    const c = this.ls.crops[k];
    const [x, y] = k.split(',').map(Number);
    let spr = this.cropSpr.get(k);
    if (!c) {
      spr?.destroy();
      this.cropSpr.delete(k);
      return;
    }
    const def = CROPS[c.crop];
    const frame = c.dead ? 5 : cropStage(def, c.growth);
    if (!spr) {
      spr = this.add.sprite(x * TILE + 8, y * TILE + 15, 'crop_' + c.crop, frame).setOrigin(0.5, 1);
      spr.setDepth(y * TILE + 12);
      this.cropSpr.set(k, spr);
    } else spr.setFrame(frame);
  }

  // ================================================================ NPCHost
  path(sx: number, sy: number, tx: number, ty: number) {
    return findPath(this.def.w, this.def.h, (x, y) => !this.isSolid(x, y), sx, sy, tx, ty);
  }
  walkable(x: number, y: number) {
    return !this.isSolid(x, y);
  }

  // ================================================================ input
  private onKey(e: KeyboardEvent) {
    if (this.busyTransition) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      if (this.buildMode) {
        this.buildMode = null;
        ui.toast('Construção cancelada.');
        return;
      }
      if (this.fishing) {
        this.cancelFishing();
        return;
      }
      if (!ui.closeTop()) ui.pause();
      return;
    }
    if (ui.dialogueActive()) {
      if (k === 'e' || k === ' ' || k === 'enter' || k === 'f') ui.dialogueAdvance();
      return;
    }
    const map: Record<string, Parameters<typeof ui.openMenu>[0]> = { i: 'inv', tab: 'inv', c: 'craft', j: 'journal', m: 'map', p: 'char', b: 'build' };
    if (map[k]) {
      e.preventDefault();
      const top = ui.topKind();
      if (top === 'book') {
        if (ui.currentTab() === map[k]) ui.closeTop();
        else ui.openMenu(map[k]);
        return;
      }
      if (!ui.isModal()) ui.openMenu(map[k]);
      return;
    }
    if (ui.isModal()) return;
    if (k >= '0' && k <= '9') {
      S().sel = k === '0' ? 9 : parseInt(k, 10) - 1;
      this.onSelectChange();
      return;
    }
    if (k === 'e' || k === 'f') this.interact(false);
    if (k === ' ') this.useSelected(false);
  }

  private onPointer(p: Phaser.Input.Pointer) {
    this.lastMouse = this.time.now;
    if (this.busyTransition) return;
    if (ui.dialogueActive()) {
      ui.dialogueAdvance();
      return;
    }
    if (ui.isModal()) return;
    if (this.buildMode) {
      if (p.rightButtonDown()) {
        this.buildMode = null;
        return;
      }
      this.placeBuilding();
      return;
    }
    if (p.rightButtonDown()) this.interact(true);
    else {
      this.useSelected(true);
      this.holdT = 420;
    }
  }

  private onSelectChange() {
    ui.renderHotbar();
    this.cancelFishing();
  }

  private moveInput() {
    const k = this.keys;
    let x = 0,
      y = 0;
    if (k.A.isDown || k.LEFT.isDown) x -= 1;
    if (k.D.isDown || k.RIGHT.isDown) x += 1;
    if (k.W.isDown || k.UP.isDown) y -= 1;
    if (k.S.isDown || k.DOWN.isDown) y += 1;
    return { x, y, run: k.SHIFT.isDown };
  }

  /** Target tile: hovered tile if adjacent and the mouse is in use, else the facing tile. */
  private target(preferMouse: boolean): [number, number] {
    const [px, py] = this.player.cell();
    if (preferMouse || this.time.now - this.lastMouse < 2500) {
      const ptr = this.input.activePointer;
      const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      const mx = Math.floor(wp.x / TILE),
        my = Math.floor(wp.y / TILE);
      if (Math.abs(mx - px) <= 1 && Math.abs(my - py) <= 1) return [mx, my];
      // NPC/objects slightly further away under the mouse are allowed for interaction
    }
    return this.player.facingCell();
  }

  private faceCell(x: number, y: number) {
    const [px, py] = this.player.cell();
    if (x === px && y === py) return;
    this.player.faceToward(x * TILE + 8, y * TILE + 8);
  }

  // ================================================================ actions
  private toolCost(skill: Parameters<typeof lvl>[0]) {
    return Math.max(1, 3 - Math.floor(lvl(skill) / 4));
  }

  private useSelected(mouse: boolean) {
    if (this.player.busy > 0) return;
    const sel = selected();
    if (this.fishing) {
      this.reelIn();
      return;
    }
    const [tx, ty] = this.target(mouse);
    if (!sel) {
      this.interact(mouse);
      return;
    }
    const d = ITEMS[sel.id];
    if (d.tool) {
      this.faceCell(tx, ty);
      this.useTool(d.tool.type, d.tool.tier, d.tool.power, sel.id, tx, ty);
      return;
    }
    if (d.seed) return this.plant(sel.id, tx, ty);
    if (d.fert) return this.fertilize(tx, ty);
    if (d.place) return this.placeItem(sel.id, d.place, tx, ty);
    if (sel.id === 'path_stone') return this.placeFloor(tx, ty);
    if (d.food) return this.eat(sel.id);
    this.interact(mouse);
  }

  private useTool(type: string, tier: number, power: number, iconId: string, tx: number, ty: number) {
    const st = S();
    const o = this.objAt(tx, ty);
    const k = o ? OBJ[o.kind] : null;
    const terr = this.terrainAt(tx, ty);
    const ck = key(tx, ty);
    switch (type) {
      case 'hoe': {
        if (!spendStamina(this.toolCost('farming'))) return;
        this.player.swing('icon_' + iconId);
        this.time.delayedCall(150, () => {
          if (o && k && k.tool === 'any') return this.hitObject(o, 'any', 1, tier);
          if (this.ls.soil[ck]) return;
          if (!this.canTill(tx, ty)) {
            audio.play('error');
            return;
          }
          this.ls.soil[ck] = { w: st.weather !== 'sun' && st.weather !== 'snow' && this.def.outdoor };
          this.refreshTile(tx, ty);
          audio.play('hoe');
          this.puff(tx, ty, 'dust', 5);
          addStat('till');
        });
        return;
      }
      case 'can': {
        if (WATER_TERRAIN.has(terr) || this.isWaterSource(o)) {
          st.player.water = power;
          this.player.swing('icon_' + iconId, 360);
          audio.play('refill');
          ui.toast('Regador cheio!');
          bus.emit('vitals');
          return;
        }
        if (st.player.water <= 0) {
          ui.toast('O regador está vazio. Encha-o no rio, lago, poço ou fonte.', 'warn');
          audio.play('error');
          return;
        }
        if (!spendStamina(this.toolCost('farming'))) return;
        this.player.swing('icon_' + iconId, 320);
        st.player.water--;
        bus.emit('vitals');
        this.time.delayedCall(140, () => {
          audio.play('water');
          this.puff(tx, ty, 'water_drop', 8);
          const s = this.ls.soil[ck];
          if (s && !s.w) {
            s.w = true;
            this.refreshTile(tx, ty);
            addXP('farming', 1);
            addStat('water');
          }
        });
        return;
      }
      case 'axe':
      case 'pick': {
        const skill = type === 'axe' ? 'foraging' : 'mining';
        if (!spendStamina(this.toolCost(skill))) return;
        this.player.swing('icon_' + iconId);
        this.time.delayedCall(150, () => {
          if (o && k) return this.hitObject(o, type, power, tier);
          if (type === 'pick') {
            if (this.ls.soil[ck] && !this.ls.crops[ck]) {
              delete this.ls.soil[ck];
              this.refreshTile(tx, ty);
              audio.play('hoe');
              return;
            }
            if (this.ls.floors[ck] !== undefined) {
              delete this.ls.floors[ck];
              this.refreshTile(tx, ty);
              this.spawnDrop('path_stone', 1, tx, ty);
              audio.play('mine');
              return;
            }
            if (this.ls.crops[ck]?.dead) return this.clearDeadCrop(ck, tx, ty);
          }
          if (type === 'axe' && this.ls.crops[ck]?.dead) return this.clearDeadCrop(ck, tx, ty);
          audio.play('swing');
        });
        return;
      }
      case 'sword': {
        this.player.swing('icon_' + iconId, 300);
        audio.play('swing');
        this.time.delayedCall(110, () => {
          const off = { down: [0, 10], up: [0, -18], left: [-14, -6], right: [14, -6] }[this.player.facing];
          const hx = this.player.x + off[0],
            hy = this.player.y + off[1];
          let hit = false;
          for (const e of this.enemies) {
            if (e.dead) continue;
            const ex = e.sprite.x,
              ey = e.sprite.y - 6;
            if (Math.hypot(ex - hx, ey - hy) < 22) {
              hit = true;
              const dmg = power + attackBonus() + Math.floor(Math.random() * 3);
              audio.play('hit');
              this.floatText(e.sprite.x, e.sprite.y - 18, String(dmg), '#ffffff');
              if (e.hit(dmg, this.player.x, this.player.y)) this.killEnemy(e);
              else audio.play('slime');
            }
          }
          if (!hit && o && k && k.tool === 'any' && !k.item) this.hitObject(o, 'any', 1, tier);
          else if (!hit && this.ls.crops[ck]?.dead) this.clearDeadCrop(ck, tx, ty);
        });
        return;
      }
      case 'rod':
        this.startFishing();
        return;
      case 'pail':
      case 'shears': {
        this.player.swing('icon_' + iconId, 300);
        const an = this.animalNear(tx, ty);
        if (!an || !an.state) {
          ui.toast(type === 'pail' ? 'Use o balde perto de uma vaca ou cabra sua.' : 'Use a tesoura perto de uma ovelha sua.');
          return;
        }
        if (an.def.tool !== type) {
          ui.toast(type === 'pail' ? 'Não dá para ordenhar ' + an.name + '!' : an.name + ' não tem lã para tosquiar.', 'warn');
          audio.play('error');
          return;
        }
        if (!an.state.product) {
          ui.toast(type === 'pail' ? an.name + ' não tem leite agora. Volte amanhã.' : 'A lã de ' + an.name + ' ainda está crescendo.');
          return;
        }
        if (!spendStamina(2)) return;
        const prod = an.state.product;
        an.state.product = null;
        an.refreshLook();
        addItem(prod, 1);
        audio.play(an.def.sound);
        addXP('farming', 6);
        addStat('animal_product');
        an.showHeart();
        return;
      }
    }
  }

  private isWaterSource(o: WObj | null) {
    return !!o && (o.kind === 'well' || o.kind === 'fountain');
  }

  private canTill(x: number, y: number): boolean {
    if (this.objAt(x, y) || this.ls.floors[key(x, y)] !== undefined) return false;
    const t = this.terrainAt(x, y);
    if (this.lid !== 'world') {
      ui.toast('Não é possível arar aqui.', 'warn');
      return false;
    }
    if (zoneAt(x, y) !== 'farm') {
      ui.toast('Você só pode arar o solo dentro da sua fazenda.', 'warn');
      return false;
    }
    return t === T.GRASS || t === T.FLOWERS || t === T.DIRT;
  }

  private clearDeadCrop(ck: string, x: number, y: number) {
    delete this.ls.crops[ck];
    this.refreshCrop(ck);
    this.spawnDrop('fiber', 1, x, y);
    audio.play('hoe');
  }

  private hitObject(o: WObj, tool: string, power: number, tier: number) {
    const k = OBJ[o.kind];
    if (!k.tool) {
      audio.play('swing');
      return;
    }
    // placed items: pick back up
    if (k.item) {
      if (k.chest && (S().chests[o.id] || []).some(Boolean)) {
        ui.toast('Esvazie o baú antes de recolhê-lo.', 'warn');
        audio.play('error');
        return;
      }
      this.removeObj(o);
      this.spawnDrop(k.item, 1, o.x, o.y);
      audio.play('pickup');
      return;
    }
    if (k.tool !== 'any' && k.tool !== tool) {
      ui.toast(k.tool === 'axe' ? 'Use o machado para isso.' : 'Use a picareta para isso.', 'warn');
      audio.play('error');
      return;
    }
    if ((k.tier || 0) > tier) {
      ui.toast(`Sua ferramenta não é forte o suficiente para ${k.name}. Melhore-a com Aldric.`, 'warn');
      audio.play('error');
      return;
    }
    o.hp = (o.hp ?? k.hp ?? 1) - power;
    const spr = this.sprites.get(o.id);
    if (k.sfx === 'chop') audio.play('chop');
    else if (k.sfx === 'mine') audio.play('mine');
    else audio.play('harvest');
    this.puff(o.x, o.y, k.sfx === 'mine' ? 'chip_stone' : k.sfx === 'chop' ? 'chip_wood' : 'leaf_' + S().time.season, 5);
    if (spr && o.hp > 0) {
      this.tweens.add({ targets: spr, x: spr.x + 1.5, duration: 40, yoyo: true, repeat: 2 });
    }
    if (o.hp > 0) return;
    // destroyed
    this.removeObj(o);
    const isTree = o.kind.startsWith('tree_');
    if (isTree && spr) {
      const dir = this.player.x < (o.x + 0.5) * TILE ? 1 : -1;
      const fall = this.add.sprite(spr.x, spr.y, spr.texture.key).setOrigin(0.5, 1).setDepth(spr.depth);
      this.tweens.add({ targets: fall, angle: 90 * dir, alpha: 0, duration: 700, ease: 'Quad.easeIn', onComplete: () => fall.destroy() });
      audio.play('fall');
    } else if (k.sfx === 'mine') audio.play('break');
    const luckB = luck();
    for (const dr of k.drops || []) this.rollDrop(dr, o.x + (isTree ? (this.player.x < (o.x + 0.5) * TILE ? 1 : -1) : 0), o.y, luckB);
    if (k.xp) addXP(k.xp[0], k.xp[1]);
    if (k.stat) addStat(k.stat);
    if (this.lid === 'cave' && k.tool === 'pick') this.caveRockBroken(o);
  }

  private rollDrop(dr: Drop, x: number, y: number, luckB: number) {
    if (dr.chance !== undefined && Math.random() > dr.chance + luckB * 0.03) return;
    let n = dr.min + Math.floor(Math.random() * (dr.max - dr.min + 1));
    if (luckB > 0 && Math.random() < luckB * 0.05) n++;
    if (n > 0) this.spawnDrop(dr.id, n, x, y);
  }

  private plant(itemId: string, x: number, y: number) {
    const ck = key(x, y);
    const def = CROPS[ITEMS[itemId].seed!];
    if (!this.ls.soil[ck]) {
      ui.toast('Are o solo com a enxada antes de plantar.', 'warn');
      audio.play('error');
      return;
    }
    if (this.ls.crops[ck]) return;
    if (this.lid === 'world' && !def.seasons.includes(S().time.season)) {
      ui.toast(`${def.name} não cresce no(a) ${SEASONS[S().time.season]}.`, 'warn');
      audio.play('error');
      return;
    }
    this.ls.crops[ck] = { crop: def.id, growth: 0, ready: false };
    consumeSelected(1);
    this.refreshCrop(ck);
    audio.play('plant');
    addStat('plant');
  }

  private fertilize(x: number, y: number) {
    const s = this.ls.soil[key(x, y)];
    if (!s || s.fert) {
      ui.toast(s ? 'Este solo já foi adubado.' : 'Use o adubo em solo arado.', 'warn');
      return;
    }
    s.fert = true;
    consumeSelected(1);
    this.refreshTile(x, y);
    audio.play('plant');
  }

  private harvest(ck: string, x: number, y: number) {
    const c = this.ls.crops[ck];
    const def = CROPS[c.crop];
    let n = def.yield[0] + Math.floor(Math.random() * (def.yield[1] - def.yield[0] + 1));
    if (this.ls.soil[ck]?.fert && Math.random() < 0.35) n *= 2;
    if (Math.random() < luck() * 0.04 + lvl('farming') * 0.02) n++;
    this.spawnDrop(def.produce, n, x, y);
    addXP('farming', def.xp);
    addStat('harvest');
    audio.play('harvest');
    this.puff(x, y, 'leaf_1', 4);
    if (def.regrow) {
      c.ready = false;
      c.growth = def.days - def.regrow;
    } else delete this.ls.crops[ck];
    this.refreshCrop(ck);
  }

  private eat(id: string) {
    const d = item(id);
    const p = S().player;
    if (!d.food) return;
    if (p.st >= maxSt() && p.hp >= maxHp() && id !== 'potion_luck') {
      ui.toast('Você não está com fome agora.');
      return;
    }
    p.st = Math.min(maxSt(), p.st + d.food.st);
    p.hp = Math.min(maxHp(), p.hp + d.food.hp);
    if (id === 'potion_luck') {
      S().luckBuff = 3;
      ui.toast('Você se sente com sorte! (Sorte +3 até o fim do dia)', 'level');
    }
    consumeSelected(1);
    audio.play('eat');
    this.floatText(this.player.x, this.player.y - 26, `+${d.food.st || d.food.hp}`, d.food.st ? '#a8f070' : '#ff8080');
    bus.emit('vitals');
  }

  // ---------------------------------------------------------------- placement
  private canPlaceAt(kind: string, x: number, y: number, silent = true): boolean {
    const k = OBJ[kind];
    const fail = (m: string) => {
      if (!silent) {
        ui.toast(m, 'warn');
        audio.play('error');
      }
      return false;
    };
    if (this.lid === 'cave' && kind !== 'torch') return fail('Não é possível construir aqui.');
    if (this.lid === 'capital' || this.lid === 'throne') return fail('Não é possível construir na Capital.');
    if (kind.startsWith('b_') && (this.lid !== 'world' || zoneAt(x, y) !== 'farm' || zoneAt(x + k.w - 1, y + k.h - 1) !== 'farm')) return fail('Construções só podem ser feitas na sua fazenda.');
    if (kind === 'sapling_p' && (this.lid !== 'world' || zoneAt(x, y) === 'village')) return fail('Plante mudas na fazenda ou na natureza.');
    const [px, py] = this.player.cell();
    for (let yy = y; yy < y + k.h; yy++)
      for (let xx = x; xx < x + k.w; xx++) {
        if (xx < 0 || yy < 0 || xx >= this.def.w || yy >= this.def.h) return fail('Fora do mapa.');
        const t = this.terrainAt(xx, yy);
        if (SOLID_TERRAIN.has(t) || t === T.BRIDGE_H || t === T.BRIDGE_V) return fail('Não é possível colocar isso aqui.');
        if (this.objAt(xx, yy)) return fail('Este espaço está ocupado.');
        const ck = key(xx, yy);
        if (this.ls.crops[ck]) return fail('Há uma plantação aqui.');
        if (this.ls.soil[ck] && !LOCK_PLACE.has(kind)) return fail('Não é possível colocar isso em solo arado.');
        if (k.solid && xx === px && yy === py) return fail('Você está no caminho!');
        if (k.solid && this.npcs.some((n) => !n.hidden && n.cell()[0] === xx && n.cell()[1] === yy)) return fail('Alguém está no caminho.');
        for (const w of this.def.warps) if (xx >= w.x && xx < w.x + w.w && yy >= w.y && yy < w.y + w.h) return fail('Não bloqueie a porta.');
      }
    return true;
  }

  private placeItem(itemId: string, kind: string, x: number, y: number) {
    if (!this.canPlaceAt(kind, x, y, false)) return;
    const id = newId('p');
    const k = OBJ[kind];
    const o: WObj = { id, kind, x, y, hp: k.hp, data: kind === 'sapling_p' ? { age: 0 } : undefined };
    this.ls.objects[id] = o;
    this.addObj(o, false);
    if (k.chest) S().chests[id] = new Array(k.chest).fill(null);
    consumeSelected(1);
    addStat('place:' + itemId);
    audio.play('build');
    this.puff(x, y, 'dust', 6);
  }

  private placeFloor(x: number, y: number) {
    const ck = key(x, y);
    const t = this.terrainAt(x, y);
    if (this.lid === 'cave' || SOLID_TERRAIN.has(t) || t === T.STONE || t === T.BRIDGE_H || t === T.BRIDGE_V || this.objAt(x, y) || this.ls.soil[ck]) {
      ui.toast('Não é possível pavimentar aqui.', 'warn');
      audio.play('error');
      return;
    }
    this.ls.floors[ck] = T.STONE;
    this.refreshTile(x, y);
    consumeSelected(1);
    audio.play('mine');
  }

  startBuild(kind: string) {
    if (this.lid !== 'world') {
      ui.toast('Volte para a fazenda para construir.', 'warn');
      return;
    }
    this.buildMode = kind;
    ui.toast('Clique no terreno da fazenda para posicionar. Esc cancela.', 'quest');
  }

  private buildCell(): [number, number] {
    const k = OBJ[this.buildMode!];
    const ptr = this.input.activePointer;
    const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    return [Math.floor(wp.x / TILE - k.w / 2 + 0.5), Math.floor(wp.y / TILE) - k.h + 1];
  }

  private placeBuilding() {
    const kind = this.buildMode!;
    const b = BUILDINGS.find((x) => x.kind === kind)!;
    const [x, y] = this.buildCell();
    if (!this.canPlaceAt(kind, x, y, false)) return;
    if (!hasMats(b.mats) || S().player.gold < b.gold) {
      ui.toast('Materiais ou moedas insuficientes.', 'warn');
      this.buildMode = null;
      return;
    }
    consumeMats(b.mats);
    S().player.gold -= b.gold;
    bus.emit('gold');
    const id = newId('b');
    const o: WObj = { id, kind, x, y };
    this.ls.objects[id] = o;
    this.addObj(o, false);
    if (OBJ[kind].chest) S().chests[id] = new Array(OBJ[kind].chest!).fill(null);
    if (kind === 'b_windmill') this.addSails(o);
    addStat('build:' + kind);
    audio.play('build');
    this.cameras.main.shake(200, 0.003);
    ui.toast(`${b.name} construído(a)!`, 'quest');
    this.buildMode = null;
  }

  private addSails(o: WObj) {
    const base = this.sprites.get(o.id);
    if (!base) return;
    const s = this.add.sprite(base.x, base.y - 74, 'windmill_sails').setDepth(base.depth + 1);
    this.tweens.add({ targets: s, angle: 360, duration: 9000, repeat: -1 });
    base.once('destroy', () => s.destroy());
  }

  // ---------------------------------------------------------------- drops & fx
  spawnDrop(id: string, qty: number, tx: number, ty: number) {
    for (let i = 0; i < Math.min(qty, 6); i++) {
      const n = i === 0 ? qty - Math.min(qty, 6) + 1 : 1;
      const x = tx * TILE + 8,
        y = ty * TILE + 8;
      const spr = this.add.image(x, y, 'icon_' + id).setScale(0.7).setDepth(y + 20);
      const ex = x + (Math.random() - 0.5) * 22,
        ey = y + (Math.random() - 0.3) * 14;
      this.tweens.add({ targets: spr, x: ex, duration: 380, ease: 'Linear' });
      this.tweens.add({ targets: spr, y: ey - 14, duration: 180, ease: 'Quad.easeOut', yoyo: false, onComplete: () => this.tweens.add({ targets: spr, y: ey, duration: 200, ease: 'Bounce.easeOut' }) });
      this.drops.push({ spr, id, qty: n, ready: this.time.now + 450 });
    }
  }

  dropItem(id: string, qty: number) {
    const [x, y] = this.player.cell();
    this.spawnDrop(id, qty, x, y);
  }

  private updateDrops(dt: number) {
    const px = this.player.x,
      py = this.player.y - 6;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      if (this.time.now < d.ready) continue;
      const dx = px - d.spr.x,
        dy = py - d.spr.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 8) {
        const left = addItem(d.id, d.qty);
        if (left === 0) {
          audio.play('pickup');
          d.spr.destroy();
          this.drops.splice(i, 1);
        } else d.qty = left;
      } else if (dist < 44) {
        const sp = (220 * dt) / 1000;
        d.spr.x += (dx / dist) * sp;
        d.spr.y += (dy / dist) * sp;
        d.spr.setDepth(d.spr.y + 20);
      }
    }
  }

  private puff(tx: number, ty: number, tex: string, n: number) {
    const x = tx * TILE + 8,
      y = ty * TILE + 8;
    const e = this.add.particles(x, y, tex, {
      speed: { min: 20, max: 60 },
      angle: { min: 200, max: 340 },
      gravityY: 160,
      lifespan: 420,
      quantity: n,
      emitting: false,
      alpha: { start: 1, end: 0 },
    });
    e.setDepth(y + 30);
    e.explode(n);
    this.time.delayedCall(600, () => e.destroy());
  }

  private floatText(x: number, y: number, txt: string, color: string) {
    const t = this.add.text(x, y, txt, { fontFamily: 'Alegreya, serif', fontSize: '10px', color, stroke: '#2a1408', strokeThickness: 3, resolution: 4 }).setOrigin(0.5).setDepth(95000);
    this.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  // ================================================================ interact
  private npcNear(tx: number, ty: number): NPC | null {
    let best: NPC | null = null;
    let bd = 1e9;
    const ptr = this.input.activePointer;
    const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
    for (const n of this.npcs) {
      if (n.hidden) continue;
      const nx = n.sprite.x,
        ny = n.sprite.y - 6;
      const dPlayer = Math.hypot(nx - this.player.x, ny - (this.player.y - 6));
      if (dPlayer > 36) continue;
      const dTarget = Math.hypot(nx - (tx * TILE + 8), ny - (ty * TILE + 8));
      const dMouse = this.time.now - this.lastMouse < 2500 ? Math.hypot(nx - wp.x, ny - wp.y) : 1e9;
      const d = Math.min(dTarget, dMouse, dPlayer + 6);
      if (d < bd && d < 30) {
        bd = d;
        best = n;
      }
    }
    return best;
  }

  private doorAt(x: number, y: number): { o: WObj; k: ObjKind } | null {
    const o = this.objAt(x, y);
    if (!o) return null;
    const k = OBJ[o.kind];
    if (!k.door) return null;
    if (y === o.y + k.h - 1 && x === o.x + k.door.dx) return { o, k };
    return null;
  }

  private interact(mouse: boolean) {
    if (this.player.busy > 0 || performance.now() - ui.lastDialogueClose < 350) return;
    if (this.fishing) {
      this.reelIn();
      return;
    }
    const [tx, ty] = this.target(mouse);
    const npc = this.npcNear(tx, ty);
    if (npc) return this.talk(npc);
    const an = this.animalNear(tx, ty);
    if (an) return this.petAnimal(an);
    const ck = key(tx, ty);
    const crop = this.ls.crops[ck];
    if (crop?.ready && !crop.dead) {
      this.faceCell(tx, ty);
      return this.harvest(ck, tx, ty);
    }
    const door = this.doorAt(tx, ty);
    if (door) return this.useDoor(door.k);
    const o = this.objAt(tx, ty);
    if (o) {
      const k = OBJ[o.kind];
      if (k.interact) {
        this.faceCell(tx, ty);
        return this.objInteract(o, k);
      }
    }
    const sel = selected();
    if (sel && ITEMS[sel.id].food) this.eat(sel.id);
  }

  private useDoor(k: ObjKind) {
    const d = k.door!;
    if (d.to) {
      audio.play('door');
      this.transition(() => this.loadLocation(d.to!, d.tx!, d.ty!, 'up'));
    } else ui.dialogue({ name: k.name, pages: [d.locked || 'A porta está trancada.'] });
  }

  private transition(fn: () => void) {
    if (this.busyTransition) return;
    this.busyTransition = true;
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      fn();
      this.busyTransition = false;
    });
  }

  private objInteract(o: WObj, k: ObjKind) {
    const st = S();
    switch (k.interact) {
      case 'berry':
        if (o.data?.ripe && st.time.season < 3) {
          o.data.ripe = false;
          o.data.days = 0;
          this.refreshSprite(o);
          this.spawnDrop('berry', 2 + Math.floor(Math.random() * 2) + (Math.random() < luck() * 0.1 ? 1 : 0), o.x, o.y);
          addXP('foraging', 3);
          audio.play('harvest');
        } else ui.toast('Ainda não há amoras maduras neste arbusto.');
        return;
      case 'animals':
        ui.animalHouse(o);
        return;
      case 'egg': {
        const id = o.data?.item || 'egg';
        if (addItem(id, 1) > 0) return;
        this.removeObj(o);
        audio.play('pickup');
        addXP('farming', 3);
        addStat('animal_product');
        return;
      }
      case 'forage':
        this.hitObject(o, 'any', 99, 9);
        return;
      case 'stall': {
        const liv = this.npcs.find((n) => n.def.id === 'livia');
        if (this.shopOpen('livia') && liv && Math.hypot(liv.sprite.x - this.player.x, liv.sprite.y - this.player.y) < 80) ui.shop('livia');
        else ui.dialogue({ name: 'Mercado de Lívia', pages: ['Uma placa diz: "Aberto das 9h às 17h. Volte mais tarde!"'] });
        return;
      }
      case 'well': {
        const can = bestTool('can');
        if (!can) return;
        st.player.water = item(can).tool!.power;
        audio.play('refill');
        ui.toast('Regador cheio!');
        bus.emit('vitals');
        return;
      }
      case 'board':
        ui.board();
        return;
      case 'sign': {
        const texts: Record<string, string> = {
          farm: `Fazenda de ${st.player.name}`,
          village: 'Greenvale — Fundada no Ano 312 do Reino. Boas-vindas, viajante!',
          mountain: '↑ Montanhas Sussurrantes — Mina Sussurrante e Estrada Real.',
          lake: 'Lago Prateado — Ótimo para pescar. Cuidado com o píer escorregadio!',
          forest: 'Floresta de Eldoria — Cuidado com os slimes ao anoitecer.',
          ruins: 'Ruínas Esquecidas — Entrada proibida para crianças. — Guarda Real',
          ranch: 'Rancho Prado Verde — Animais, feno e ferramentas. Fale com a Marta!',
          valoria: 'Valoria — Capital do Reino de Eldoria. Castelo ao norte • Guilda a oeste • Arsenal a leste • Taverna ao sul.',
          throne: st.flags.chapter2_done ? 'O Trono de Eldoria. Acima dele, a Coroa restaurada brilha em seu pedestal.' : 'O Trono de Eldoria. O pedestal da coroa, acima dele, está vazio.',
        };
        ui.dialogue({ name: 'Placa', pages: [texts[o.data?.text] || '...'] });
        return;
      }
      case 'ship':
        ui.shop(null, 'Caixa de Vendas');
        return;
      case 'cave': {
        const maxF = st.stats.floor || 0;
        if (maxF >= 5) ui.caveFloors(maxF, (f) => this.enterCave(f));
        else this.enterCave(1);
        return;
      }
      case 'gate':
        if (st.flags.road_open) {
          ui.confirm('Estrada Real', '<p>Seguir pela Estrada Real até Valoria, a Capital?</p><p class="hint">A viagem pelas montanhas leva cerca de 2 horas.</p>', 'Viajar', () => this.travelToCapital(), 'Ficar');
          return;
        }
        ui.dialogue({
          name: 'Portão da Estrada Real',
          pages: st.flags.chapter1_done
            ? ['O portão ainda está trancado. A Capitã Brenna tem a chave — fale com ela.']
            : ['Um portão de ferro maciço, com o brasão de Eldoria. Está trancado por ordem da Coroa.'],
        });
        return;
      case 'guild':
        ui.guildBoard();
        return;
      case 'altar':
        if (!st.flags.frag_mine) {
          st.flags.frag_mine = true;
          audio.play('treasure');
          addItem('fragment_mine', 1);
          addStat('treasure');
          ui.dialogue({ name: 'Altar de Cristal', pages: ['Um altar de cristal pulsa com luz azul no coração da montanha...', 'Ao tocá-lo, o cristal se abre e revela um Fragmento do Coração da Montanha!'] });
        } else ui.toast('O altar de cristal está vazio, mas ainda brilha suavemente.');
        return;
      case 'bridge':
        ui.projectConfirm('bridge');
        return;
      case 'statue':
        ui.dialogue({ name: 'Estátua Antiga', pages: ['Uma estátua desgastada de um rei segurando uma espada. Na base, letras quase apagadas:', '"Quando a coroa partida for reunida, Eldoria renascerá."'] });
        return;
      case 'ancient':
        if (!st.flags.ruins_chest) {
          st.flags.ruins_chest = true;
          this.refreshSprite(o);
          audio.play('treasure');
          addItem('fragment', 1);
          addItem('old_coin', 3);
          addItem('relic_shard', 2);
          addStat('treasure');
          ui.dialogue({ name: 'Baú Antigo', pages: ['O baú range ao abrir, revelando um brilho dourado...', 'Você encontrou um Fragmento Antigo, 3 Moedas Antigas e 2 Cacos de Cerâmica!'] });
        } else ui.toast('O baú antigo está vazio.');
        return;
      case 'mine_chest': {
        const f = this.floor;
        if (st.flags['mine_chest_' + f]) return ui.toast('O baú está vazio.');
        st.flags['mine_chest_' + f] = true;
        this.refreshSprite(o);
        audio.play('treasure');
        if (f >= MINE_FLOORS) {
          addItem('eq_amulet', 1);
          addItem('gold_bar', 3);
          addItem('crystal', 3);
          addGold(1000);
          ui.dialogue({ name: 'Tesouro das Profundezas', pages: ['No fundo da mina, um tesouro esquecido: o Amuleto do Guerreiro, 3 Barras de Ouro, 3 Cristais e 1.000 moedas!'] });
        } else {
          addItem('eq_boots', 1);
          addItem('iron_bar', 3);
          addGold(300);
          ui.dialogue({ name: 'Baú do Minerador', pages: ['Você encontrou Botas de Viajante, 3 Barras de Ferro e 300 moedas!'] });
        }
        addStat('treasure');
        return;
      }
      case 'bed':
        ui.confirm('Dormir', `<p>Deseja dormir e encerrar o dia?</p><p class="hint">O jogo será salvo automaticamente. Previsão para amanhã: <b>${WEATHER_LABEL[st.tomorrow]}</b>.</p>`, 'Dormir', () => this.endDay(false), 'Ficar acordado');
        return;
      case 'shelf': {
        const books = [
          ['"Crônicas do Reino, Vol. I"', 'Há trezentos anos, o Rei Aldemar uniu as terras de Eldoria sob uma única coroa, forjada com cristais das Montanhas Sussurrantes.'],
          ['"Manual do Bom Fazendeiro"', 'Regue todos os dias. Adube a terra. Plante conforme a estação. E nunca, jamais, plante abóboras na primavera.'],
          ['"Lendas da Floresta"', 'Dizem que os slimes nascem das lágrimas da floresta nas noites sem lua. Elara discorda veementemente.'],
          ['"A Queda da Coroa"', 'Na Guerra das Sombras, a coroa foi partida em fragmentos e escondida pelos quatro cantos do reino.'],
        ];
        const b = books[Math.floor(Math.random() * books.length)];
        ui.dialogue({ name: b[0], pages: [b[1]] });
        return;
      }
      case 'craft':
        ui.openMenu('craft');
        return;
      case 'chest':
        ui.chest(o.id, k.chest || 27, k.name);
        audio.play('chest');
        return;
      case 'mill': {
        const n = count('wheat');
        if (!n) return ui.toast('Traga trigo para moer em farinha.');
        removeItem('wheat', n);
        addItem('flour', n);
        audio.play('craft');
        ui.toast(`Você moeu ${n} trigo em ${n} farinha.`, 'quest');
        return;
      }
      case 'ladder_down':
        audio.play('ladder');
        this.transition(() => this.loadLocation('cave', 0, 0, 'down', this.floor + 1));
        return;
      case 'ladder_up':
        audio.play('ladder');
        this.transition(() => this.loadLocation('world', POS.caveOut.x, POS.caveOut.y, 'down'));
        return;
    }
  }

  private travelToCapital() {
    const st = S();
    st.time.min = Math.min(st.time.min + 120, 25 * 60);
    addStat('trips');
    ui.fade('A Estrada Real', 'A estrada serpenteia pelas Montanhas Sussurrantes... Ao longe, as torres de Valoria surgem entre as nuvens.', () => {
      this.loadLocation('capital', CAPITAL_ARRIVAL.x, CAPITAL_ARRIVAL.y, 'up');
      ui.renderClock();
    }, 1600);
  }

  enterCave(floor: number) {
    audio.play('door');
    this.transition(() => this.loadLocation('cave', 0, 0, 'down', floor));
  }

  private caveRockBroken(o: WObj) {
    if (this.floor >= MINE_FLOORS || this.caveLadder) return;
    this.caveRocksBroken++;
    const remaining = [...this.objs.values()].filter((x) => OBJ[x.kind].tool === 'pick').length;
    const chance = 0.05 + this.caveRocksBroken * 0.012 + luck() * 0.01;
    if (Math.random() < chance || remaining <= 3) {
      this.caveLadder = true;
      const lad: WObj = { id: newId('l'), kind: 'ladder_down', x: o.x, y: o.y };
      this.ls.objects[lad.id] = lad;
      this.addObj(lad, false);
      audio.play('ladder');
      ui.toast('Você encontrou uma escada para o próximo andar!', 'quest');
    }
  }

  private shopOpen(id: string) {
    const def = NPC_BY_ID[id];
    const m = S().time.min;
    const n = this.npcs.find((x) => x.def.id === id);
    return !!def.shopHours && m >= def.shopHours[0] && m < def.shopHours[1] && !!n && !n.hidden;
  }

  // ---------------------------------------------------------------- animals
  private addAnimal(kind: string, x: number, y: number, b: { x0: number; y0: number; x1: number; y1: number }, st: AnimalState | null, v: number) {
    const an = new Animal(this, kind, x, y, b, st, v);
    this.animals.push(an);
    this.physics.add.collider(an.sprite, this.col);
    this.physics.add.collider(this.player.sprite, an.sprite);
    return an;
  }

  private animalsOutside() {
    const st = S();
    return st.weather === 'sun' && st.time.season !== 3 && st.time.min >= 6 * 60 && st.time.min < 18 * 60 + 30;
  }

  private homeDoor(home: WObj): [number, number] {
    const k = OBJ[home.kind];
    return [home.x + Math.floor(k.w / 2), home.y + k.h];
  }

  spawnFarmAnimal(a: AnimalState) {
    const home = this.objs.get(a.home);
    if (!home || this.lid !== 'world' || !this.animalsOutside()) return;
    const k = OBJ[home.kind];
    const b = { x0: home.x - 5, y0: home.y + k.h, x1: home.x + k.w + 4, y1: home.y + k.h + 6 };
    let [dx, dy] = this.homeDoor(home);
    if (this.isSolid(dx, dy)) dy++;
    this.addAnimal(a.kind, dx, dy, b, a, a.v);
  }

  private spawnAnimals() {
    const P = PADDOCK;
    const pen = { x0: P.x0 + 1, y0: P.y0 + 1, x1: P.x1 - 1, y1: P.y1 - 1 };
    const herd: [string, number][] = [
      ['cow', 0],
      ['cow', 1],
      ['sheep', 0],
      ['goat', 0],
      ['chicken', 0],
      ['chicken', 1],
      ['chicken', 0],
    ];
    herd.forEach(([k, v], i) => this.addAnimal(k, pen.x0 + 1 + ((i * 3) % 9), pen.y0 + 2 + (i % 3) * 2, pen, null, v));
    for (const a of S().animals) this.spawnFarmAnimal(a);
  }

  private animalsHome() {
    for (const an of [...this.animals]) {
      if (!an.state) continue;
      const home = this.objs.get(an.state.home);
      const remove = () => {
        an.destroy();
        this.animals = this.animals.filter((x) => x !== an);
      };
      if (!home) {
        remove();
        continue;
      }
      const [x, y] = this.homeDoor(home);
      an.goHome(x, y, () => this.tweens.add({ targets: [an.sprite], alpha: 0, duration: 400, onComplete: remove }));
    }
  }

  private animalNear(tx: number, ty: number): Animal | null {
    let best: Animal | null = null;
    let bd = 1e9;
    for (const an of this.animals) {
      if (an.leaving) continue;
      const ax = an.sprite.x,
        ay = an.sprite.y - an.def.h / 3;
      const dp = Math.hypot(ax - this.player.x, ay - (this.player.y - 6));
      if (dp > 22 + an.def.w / 2) continue;
      const d = Math.min(Math.hypot(ax - (tx * TILE + 8), ay - (ty * TILE + 8)), dp + 4);
      if (d < bd) {
        bd = d;
        best = an;
      }
    }
    return best;
  }

  private petAnimal(an: Animal) {
    audio.play(an.def.sound);
    an.showHeart();
    this.player.faceToward(an.sprite.x, an.sprite.y - 6);
    const s = an.state;
    if (!s) {
      ui.toast(an.def.name + ' do rancho da Marta parece gostar de você.');
      return;
    }
    if (!s.petted) {
      s.petted = true;
      s.pts = Math.min(1000, s.pts + 5);
      addStat('pet');
      ui.toast('Você fez carinho em ' + s.name + '.');
    } else {
      const mood = s.pts >= 800 ? 'te adora!' : s.pts >= 500 ? 'está muito feliz.' : s.pts >= 250 ? 'está contente.' : 'ainda está se acostumando com você.';
      ui.toast(s.name + ' ' + mood);
    }
  }

  // ---------------------------------------------------------------- talking
  private talk(npc: NPC) {
    const st = S();
    const def = npc.def;
    const r = st.npcs[def.id];
    npc.talking = true;
    npc.faceToward(this.player.x, this.player.y);
    this.player.faceToward(npc.sprite.x, npc.sprite.y - 6);
    const pages: string[] = [];
    if (!r.met) {
      pages.push(def.lines.first);
      r.met = true;
      st.flags['met_' + def.id] = true;
    } else pages.push(this.pickLine(def.id));
    const q = questTalk(def.id);
    if (q) pages.push(q);
    if (!r.talked) {
      r.talked = true;
      addFriendship(def.id, 20);
    }
    const choices: { label: string; fn: () => void; cls?: string }[] = [];
    if (def.shop && this.shopOpen(def.id)) choices.push({ label: 'Ver loja', fn: () => ui.shop(def.shop!), cls: 'gold' });
    const del = canDeliver(def.id);
    if (del && del.type === 'deliver')
      choices.push({
        label: `Entregar ${del.n}× ${item(del.item).name}`,
        cls: 'gold',
        fn: () => {
          const msg = deliver(def.id);
          npc.showEmote('heart_fx');
          ui.dialogue({ npc: def, name: def.name, title: def.title, pages: [this.deliverLine(def.id), msg || ''], onClose: () => (npc.talking = false) });
        },
      });
    if (canDeliverDaily(def.id))
      choices.push({
        label: 'Entregar pedido do dia',
        cls: 'gold',
        fn: () => {
          const msg = deliverDaily();
          npc.showEmote('heart_fx');
          ui.dialogue({ npc: def, name: def.name, title: def.title, pages: [msg], onClose: () => (npc.talking = false) });
        },
      });
    const sel = selected();
    if (sel && !r.gifted && ITEMS[sel.id].cat !== 'tool' && sel.id !== 'fragment')
      choices.push({ label: `Presentear: ${item(sel.id).name}`, fn: () => this.gift(npc, sel.id) });
    if (choices.length) choices.push({ label: 'Até logo', fn: () => (npc.talking = false) });
    ui.dialogue({ npc: def, name: def.name, title: def.title, pages, choices: choices.length ? choices : undefined, onClose: () => (npc.talking = false) });
  }

  private deliverLine(id: string) {
    return (
      {
        aldric: 'Hm. Cobre de boa qualidade. Espere aqui... Pronto. Uma lâmina digna de você.',
        brenna: 'Este fragmento... é parte da Coroa de Eldoria! Vou enviá-lo à Capital imediatamente. Você prestou um grande serviço ao reino, {nome}.',
      }[id] || 'Muito obrigado!'
    );
  }

  private pickLine(id: string): string {
    const def = NPC_BY_ID[id];
    const st = S();
    if (id === 'brenna' && st.flags.road_open && Math.random() < 0.6)
      return ['A Estrada Real está aberta! Valoria fica além do portão, seguindo pelas montanhas.', 'Dê lembranças minhas à Rainha Isolde.', 'Desde que a estrada reabriu, os mercadores voltaram a passar por aqui.'][Math.floor(Math.random() * 3)];
    if (id === 'isolde' && st.flags.chapter2_done && Math.random() < 0.6)
      return ['Graças a você, a Coroa de Eldoria brilha novamente, Cavaleiro(a) {nome}.', 'O reino voltou a sorrir. Você será sempre bem-vindo(a) neste castelo.'][Math.floor(Math.random() * 2)];
    const L = def.lines;
    const h = hearts(id);
    const hour = st.time.min / 60;
    const r = Math.random();
    const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
    if (h >= 8 && r < 0.2) return pick(L.best);
    if (h >= 4 && r < 0.3) return pick(L.friend);
    if ((st.weather === 'rain' || st.weather === 'storm') && r < 0.5) return pick(L.rain);
    if (hour < 10 && r < 0.35) return pick(L.morning);
    if (hour >= 18 && r < 0.35) return pick(L.evening);
    if (r < 0.55) return pick(L.season[st.time.season]);
    return pick(L.greet);
  }

  private gift(npc: NPC, itemId: string) {
    const def = npc.def;
    const r = S().npcs[def.id];
    if (r.gifted) return;
    r.gifted = true;
    removeItem(itemId, 1);
    let pts = 20,
      text = def.gift.neutral;
    if (def.loves.includes(itemId)) {
      pts = 80;
      text = def.gift.love;
    } else if (def.likes.includes(itemId)) {
      pts = 45;
      text = def.gift.like;
    } else if (def.dislikes.includes(itemId)) {
      pts = -20;
      text = def.gift.dislike;
    }
    addFriendship(def.id, pts);
    addStat('gift');
    if (pts > 0) {
      npc.showEmote('heart_fx');
      audio.play('gift');
    }
    ui.dialogue({ npc: def, name: def.name, title: def.title, pages: [text], onClose: () => (npc.talking = false) });
  }

  // ---------------------------------------------------------------- fishing
  private startFishing() {
    const [px, py] = this.player.cell();
    const d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[this.player.facing];
    let cell: [number, number] | null = null;
    for (let i = 3; i >= 1; i--) {
      const x = px + d[0] * i,
        y = py + d[1] * i;
      if (WATER_TERRAIN.has(this.terrainAt(x, y)) && !this.objAt(x, y)) {
        cell = [x, y];
        break;
      }
      if (WATER_TERRAIN.has(this.terrainAt(x, y))) cell = [x, y];
    }
    if (!cell) {
      ui.toast('Fique de frente para a água para pescar.', 'warn');
      return;
    }
    if (!spendStamina(this.toolCost('fishing') + 1)) return;
    this.player.swing('icon_rod', 380);
    audio.play('cast');
    const [cx, cy] = cell;
    const bob = this.add.image(this.player.x, this.player.y - 10, 'bobber').setDepth(cy * TILE + 20);
    this.tweens.add({
      targets: bob,
      x: cx * TILE + 8,
      y: cy * TILE + 9,
      duration: 380,
      ease: 'Quad.easeOut',
      onComplete: () => {
        audio.play('splash');
        this.tweens.add({ targets: bob, y: '+=1.5', duration: 600, yoyo: true, repeat: -1 });
      },
    });
    const zone = this.lid === 'world' ? zoneAt(cx, cy) : 'village';
    this.fishing = { state: 'wait', t: (1800 + Math.random() * 4200) * (1 - lvl('fishing') * 0.04), bobber: bob, bang: null, zone };
    ui.toast('Aguarde a fisgada... Clique ou Espaço quando aparecer "!"');
  }

  private updateFishing(dt: number, moved: boolean) {
    const f = this.fishing;
    if (!f) return;
    if (moved) {
      this.cancelFishing();
      return;
    }
    f.t -= dt;
    if (f.state === 'wait' && f.t <= 0) {
      f.state = 'bite';
      f.t = 850 + lvl('fishing') * 70;
      audio.play('bite');
      f.bang = this.add.image(this.player.x, this.player.y - 30, 'exclaim').setDepth(95000);
      this.tweens.add({ targets: f.bobber, y: '+=3', duration: 80, yoyo: true, repeat: 3 });
    } else if (f.state === 'bite' && f.t <= 0) {
      ui.toast('O peixe escapou...');
      this.cancelFishing();
    }
  }

  private reelIn() {
    const f = this.fishing;
    if (!f) return;
    if (f.state === 'bite') {
      const fish = this.rollFish(f.zone);
      const [x, y] = [f.bobber.x, f.bobber.y];
      this.cancelFishing();
      const spr = this.add.image(x, y, 'icon_' + fish).setDepth(95000);
      this.tweens.add({ targets: spr, x: this.player.x, y: this.player.y - 20, duration: 420, ease: 'Quad.easeOut', onComplete: () => spr.destroy() });
      this.tweens.add({ targets: spr, angle: 360, duration: 420 });
      audio.play('splash');
      addItem(fish, 1);
      addXP('fishing', 8 + Math.floor(item(fish).price / 10));
      addStat('fish');
      ui.toast(`Você pescou: ${item(fish).name}!`, 'level');
      if (Math.random() < 0.04 + luck() * 0.01) {
        addItem('old_coin', 1);
        ui.toast('Algo brilhante veio junto no anzol!', 'quest');
      }
    } else {
      ui.toast('Você puxou a linha cedo demais.');
      this.cancelFishing();
    }
  }

  private rollFish(zone: Zone): string {
    const st = S();
    const night = st.time.min >= 20 * 60;
    const L = lvl('fishing') + luck();
    const table: [string, number][] =
      zone === 'lake'
        ? [
            ['fish_carp', 40],
            ['fish_perch', 26],
            ['fish_salmon', 10 + L * 3],
            ['fish_moon', night ? 6 + L : 0],
          ]
        : [
            ['fish_trout', 50],
            ['fish_carp', 28],
            ['fish_perch', 14 + L * 2],
            ['fish_salmon', zone === 'forest' ? 6 + L : 2],
          ];
    const tot = table.reduce((a, b) => a + b[1], 0);
    let r = Math.random() * tot;
    for (const [id, w] of table) {
      if (r < w) return id;
      r -= w;
    }
    return 'fish_carp';
  }

  private cancelFishing() {
    const f = this.fishing;
    if (!f) return;
    f.bobber.destroy();
    f.bang?.destroy();
    this.fishing = null;
  }

  // ---------------------------------------------------------------- combat
  private spawnEnemy(kind: string, x: number, y: number) {
    const e = new Enemy(this, kind, x * TILE + 8, y * TILE + 14);
    this.enemies.push(e);
    if (!ENEMIES[kind].fly) this.physics.add.collider(e.sprite, this.col);
    this.physics.add.overlap(this.player.sprite, e.sprite, () => this.enemyTouch(e));
  }

  private enemyTouch(e: Enemy) {
    if (e.dead || this.player.invuln > 0 || ui.isModal()) return;
    const p = S().player;
    const dmg = Math.max(1, e.def.dmg - defense());
    p.hp -= dmg;
    this.player.invuln = 1000;
    audio.play('hurt');
    this.cameras.main.shake(120, 0.004);
    this.floatText(this.player.x, this.player.y - 24, '-' + dmg, '#ff6060');
    const dx = this.player.x - e.sprite.x,
      dy = this.player.y - e.sprite.y;
    const d = Math.hypot(dx, dy) || 1;
    (this.player as any).knock = { vx: (dx / d) * 200, vy: (dy / d) * 200, t: 140 };
    bus.emit('vitals');
    if (p.hp <= 0) {
      p.hp = 0;
      this.time.delayedCall(300, () => this.endDay(true, 'Você foi derrotado e acordou em casa, dolorido...'));
    }
  }

  private killEnemy(e: Enemy) {
    audio.play('die');
    for (const dr of e.def.drops) this.rollDrop(dr, Math.floor(e.sprite.x / TILE), Math.floor((e.sprite.y - 4) / TILE), luck());
    addXP('combat', e.def.xp);
    addStat('kill');
    addStat('kill:' + e.kind);
    this.enemies = this.enemies.filter((x) => x !== e);
  }

  private worldSpawns(dt: number) {
    if (this.lid !== 'world' || !S().flags.bridge_built) return;
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    this.spawnT = 12000;
    const night = S().time.min >= 19 * 60 || S().time.min < 6 * 60;
    const want = night ? 6 : 2;
    const alive = this.enemies.filter((e) => !e.dead).length;
    if (alive >= want) return;
    for (let i = 0; i < 30; i++) {
      const x = 114 + Math.floor(Math.random() * 34);
      const y = 24 + Math.floor(Math.random() * 80);
      const z = zoneAt(x, y);
      if ((z !== 'forest' && z !== 'ruins') || this.isSolid(x, y)) continue;
      const [px, py] = this.player.cell();
      if (Math.abs(px - x) + Math.abs(py - y) < 12) continue;
      this.spawnEnemy(night && Math.random() < 0.3 ? 'slime_blue' : 'slime_green', x, y);
      break;
    }
  }

  // ================================================================ day cycle
  endDay(passedOut: boolean, msg?: string) {
    if (this.busyTransition) return;
    this.busyTransition = true;
    ui.closeAll();
    this.cancelFishing();
    for (const d of this.drops) {
      addItem(d.id, d.qty);
      d.spr.destroy();
    }
    this.drops = [];
    const rep = advanceDay(passedOut);
    const st = S();
    const ok = saveGame();
    audio.play('sleep');
    let sub = '';
    if (passedOut) sub += `${msg || 'Você desmaiou de exaustão às 2h da madrugada.'}${rep.lostGold ? ` Alguém o(a) levou para casa... e cobrou ${rep.lostGold} moedas.` : ''}<br>`;
    if (rep.seasonChanged) sub += `<b>Começa a estação: ${SEASONS[st.time.season]}!</b> Plantações fora de época murcharam.<br>`;
    sub += `Clima: ${WEATHER_LABEL[st.weather]} • Amanhã: ${WEATHER_LABEL[st.tomorrow]}<br>${ok ? 'Jogo salvo.' : 'Falha ao salvar.'}`;
    ui.fade(fmtDate(st.time.day, st.time.season), sub, () => {
      this.busyTransition = false;
      this.loadLocation('house', st.player.x, st.player.y, 'down');
      this.timeAcc = 0;
    }, 2200);
  }

  private onProject(id: string) {
    if (this.lid !== 'world') return;
    const st = S();
    const [px, py] = this.player.cell();
    const f = this.player.facing;
    this.loadLocation('world', px, py, f);
    if (id === 'bridge') ui.banner('A Ponte Leste foi reconstruída!', 'A Floresta de Eldoria aguarda');
    if (id === 'lamps') ui.banner('Greenvale brilha novamente', 'As lanternas da praça foram restauradas');
    if (id === 'market') ui.banner('Mercado ampliado!', 'Novos itens na loja de Lívia');
    void st;
  }

  private updateMusic(force = false) {
    const st = S();
    const night = st.time.min >= 19 * 60 || st.time.min < 6 * 60;
    const rain = st.weather === 'rain' ? 0.7 : st.weather === 'storm' ? 1 : 0;
    if (this.lid === 'cave') {
      audio.setMusic('cave');
      audio.setAmbient('cave', 0);
    } else if (this.lid === 'house') {
      audio.setMusic('home');
      audio.setAmbient('home', rain);
    } else if (this.lid === 'throne') {
      audio.setMusic('royal');
      audio.setAmbient('home', 0);
    } else if (this.lid === 'capital') {
      audio.setMusic(night ? 'night' : 'capital');
      audio.setAmbient(night ? 'night' : 'day', rain);
    } else {
      audio.setMusic(night ? 'night' : 'day');
      audio.setAmbient(night ? 'night' : 'day', rain);
    }
    this.wfx.setFireflies(this.lid === 'world' && night && st.time.season === 1 && st.weather === 'sun');
    void force;
  }

  private tickTime(dt: number) {
    const st = S();
    this.timeAcc += dt;
    while (this.timeAcc >= REAL_MS_PER_GAME_MIN) {
      this.timeAcc -= REAL_MS_PER_GAME_MIN;
      st.time.min++;
      const rainy = st.weather === 'rain' || st.weather === 'storm';
      for (const n of this.npcs) n.onMinute(st.time.min, rainy);
      if (st.time.min % 10 === 0) {
        ui.renderClock();
        if (st.time.min % 60 === 0) this.updateMusic();
      }
      if (st.time.min >= DAY_END) {
        this.endDay(true);
        return;
      }
      if (st.time.min === 18 * 60 + 30) this.animalsHome();
      if (st.time.min === 24 * 60) ui.toast('Já é meia-noite. É melhor ir dormir...', 'warn');
    }
  }

  // ================================================================ GameCtx
  nearStations(): Set<Station> {
    const set = new Set<Station>(['hand']);
    const [px, py] = this.player.cell();
    for (const o of this.objs.values()) {
      const k = OBJ[o.kind];
      if (!k.station) continue;
      const dx = Math.max(o.x - px, 0, px - (o.x + k.w - 1));
      const dy = Math.max(o.y - py, 0, py - (o.y + k.h - 1));
      if (dx <= 3 && dy <= 3) k.station.forEach((s) => set.add(s as Station));
    }
    return set;
  }

  quitToMenu() {
    this.clearLocation();
    ui.reset();
    audio.setAmbient('none', 0);
    this.scene.start('Menu');
  }

  mapInfo() {
    const st = S();
    if (this.lid === 'capital' || this.lid === 'throne') {
      const def = buildCapital();
      const inThrone = this.lid === 'throne';
      const npcs = !inThrone ? this.npcs.filter((n) => !n.hidden && !n.def.minor).map((n) => ({ x: n.sprite.x / TILE, y: n.sprite.y / TILE, name: n.def.name })) : [];
      return {
        def,
        px: inThrone ? 36 : this.player.x / TILE,
        py: inThrone ? 8 : this.player.y / TILE,
        here: inThrone ? 'Sala do Trono' : 'Valoria',
        npcs,
        title: 'Mapa de Valoria',
        scale: 6,
        labels: [
          ['Castelo', 36, 3.5],
          ['Praça Real', 36, 25],
          ['Guilda', 18, 21.5],
          ['Arsenal', 55, 21.5],
          ['Catedral', 10, 7],
          ['Taverna', 53, 40.5],
          ['Portão Sul', 36, 58],
        ] as [string, number, number][],
      };
    }
    const def = buildWorld(st.flags, st.projects);
    let px = this.player.x / TILE,
      py = this.player.y / TILE;
    let here = this.lid === 'world' ? ZONE_NAME[zoneAt(Math.floor(px), Math.floor(py))] : this.lid === 'house' ? 'Sua Casa' : 'Mina Sussurrante';
    if (this.lid === 'house') [px, py] = [POS.houseDoorOut.x, POS.houseDoorOut.y];
    if (this.lid === 'cave') [px, py] = [POS.caveOut.x, POS.caveOut.y];
    const npcs = this.lid === 'world' ? this.npcs.filter((n) => !n.hidden).map((n) => ({ x: n.sprite.x / TILE, y: n.sprite.y / TILE, name: n.def.name })) : [];
    return { def, px, py, here, npcs };
  }

  sleep() {
    this.endDay(false);
  }

  texSource(k: string) {
    if (!this.textures.exists(k)) return null;
    return this.textures.get(k).getSourceImage() as CanvasImageSource;
  }

  locId() {
    return this.lid;
  }

  // ================================================================ update
  update(_t: number, dtRaw: number) {
    const dt = Math.min(dtRaw, 50);
    if (!G.state || !this.player) return;
    const st = S();
    const modal = ui.isModal() || this.busyTransition;
    const input = this.moveInput();
    const knock = (this.player as any).knock as { vx: number; vy: number; t: number } | undefined;
    if (knock && knock.t > 0) {
      knock.t -= dt;
      (this.player.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(knock.vx, knock.vy);
    } else
      this.player.update(dt, input, modal || !!this.fishing, () => {
        const [cx, cy] = this.player.cell();
        const t = this.terrainAt(cx, cy);
        const surf = t === T.STONE || t === T.RUIN || t === T.CAVE || t === T.MGROUND ? 'stone' : t === T.WOOD || t === T.BRIDGE_H || t === T.BRIDGE_V ? 'wood' : 'grass';
        audio.play('step', { surface: surf });
        if (st.player.st < maxSt() * 0.15 && Math.random() < 0.05) this.floatText(this.player.x, this.player.y - 24, '...', '#f0e0a0');
      });
    if (!modal) {
      this.tickTime(dt);
      if (this.busyTransition) return;
      // hold-to-repeat tool use
      const ptr = this.input.activePointer;
      if (ptr.leftButtonDown() && !this.buildMode && !this.fishing) {
        this.holdT -= dt;
        if (this.holdT <= 0 && this.player.busy <= 0) {
          const sel = selected();
          if (sel && ITEMS[sel.id].tool && ITEMS[sel.id].tool!.type !== 'rod') {
            this.useSelected(true);
            this.holdT = 380;
          }
        }
      }
      this.worldSpawns(dt);
    }
    for (const n of this.npcs) n.update(modal ? 0 : dt);
    for (const a of this.animals) a.update(dt, modal);
    for (const e of this.enemies) e.update(modal ? 0 : dt, this.player.x, this.player.y);
    if (modal) for (const e of this.enemies) (e.sprite.body as Phaser.Physics.Arcade.Body)?.setVelocity?.(0, 0);
    this.updateDrops(dt);
    this.updateFishing(dt, (input.x !== 0 || input.y !== 0) && !modal);
    this.checkWarps();
    this.updateZone();
    this.updateCursor(modal);
    this.updateOcclusion();
    this.updateLights();
    this.wfx.update(this.time.now);
    this.promptT -= dt;
    if (this.promptT <= 0) {
      this.promptT = 120;
      this.updatePrompt(modal);
    }
  }

  private checkWarps() {
    if (this.busyTransition) return;
    const [cx, cy] = this.player.cell();
    for (const w of this.def.warps) {
      if (cx >= w.x && cx < w.x + w.w && cy >= w.y && cy < w.y + w.h) {
        audio.play('door');
        this.transition(() => this.loadLocation(w.to, w.tx, w.ty, w.facing));
        return;
      }
    }
    // walking into a door
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    if (this.player.facing === 'up' && (body.blocked.up || body.touching.up) && (this.keys.W.isDown || this.keys.UP.isDown)) {
      const [fx, fy] = this.player.facingCell();
      const d = this.doorAt(fx, fy);
      if (d && d.k.door!.to) this.useDoor(d.k);
    }
  }

  private updateZone() {
    if (this.lid !== 'world') return;
    const [cx, cy] = this.player.cell();
    const z = zoneAt(cx, cy);
    if (z !== this.zone) {
      const first = this.zone === '';
      this.zone = z;
      const st = S();
      ui.banner(z === 'farm' ? `Fazenda de ${st.player.name}` : ZONE_NAME[z], first ? `${fmtDate(st.time.day, st.time.season)}` : '');
    }
  }

  private updateCursor(modal: boolean) {
    if (modal) {
      this.cursorImg.setVisible(false);
      this.ghost.setVisible(false);
      return;
    }
    if (this.buildMode) {
      const k = OBJ[this.buildMode];
      const [x, y] = this.buildCell();
      const ok = this.canPlaceAt(this.buildMode, x, y);
      this.ghost.setTexture(k.tex as string).setPosition((x + k.w / 2) * TILE, (y + k.h) * TILE).setTint(ok ? 0x80ff80 : 0xff6060).setVisible(true);
      this.ghost.setDepth(90050);
      this.cursorImg.setVisible(false);
      return;
    }
    const sel = selected();
    const [tx, ty] = this.target(false);
    const d = sel ? ITEMS[sel.id] : null;
    const placeKind = d?.place;
    if (placeKind) {
      const k = OBJ[placeKind];
      const ok = this.canPlaceAt(placeKind, tx, ty);
      const tex = texFor({ id: '', kind: placeKind, x: tx, y: ty }, S().time.season);
      this.ghost.setTexture(tex);
      if (placeKind === 'fence') this.ghost.setFrame(0);
      this.ghost.setPosition((tx + k.w / 2) * TILE, (ty + k.h) * TILE + (k.oy || 0)).setTint(ok ? 0xb0ffb0 : 0xff7070).setVisible(true).setDepth((ty + k.h) * TILE + 1);
    } else this.ghost.setVisible(false);
    const show = !!d && (!!d.tool || !!d.seed || !!d.fert || sel?.id === 'path_stone');
    this.cursorImg.setVisible(show && d?.tool?.type !== 'rod' && d?.tool?.type !== 'sword').setPosition(tx * TILE - 1, ty * TILE - 1);
  }

  private occluded = new Set<Phaser.GameObjects.Sprite>();
  private updateOcclusion() {
    const now = new Set<Phaser.GameObjects.Sprite>();
    const [cx, cy] = this.player.cell();
    for (let y = cy + 1; y <= cy + 3; y++)
      for (let x = cx - 1; x <= cx + 1; x++) {
        const o = this.objAt(x, y);
        if (!o) continue;
        if (!o.kind.startsWith('tree_') && !o.kind.startsWith('deco_') && !o.kind.startsWith('house') && !o.kind.startsWith('b_') && o.kind !== 'forge' && o.kind !== 'hut_elara') continue;
        const s = this.sprites.get(o.id);
        if (!s) continue;
        const b = s.getBounds();
        if (b.contains(this.player.x, this.player.y - 8) && this.player.y < s.y) now.add(s);
      }
    for (const s of this.occluded) if (!now.has(s) && s.active) s.setAlpha(1);
    for (const s of now) s.setAlpha(0.55);
    this.occluded = now;
  }

  private ambient(): Ambient {
    const st = S();
    if (this.lid === 'cave') return { color: 0x05030a, alpha: this.def.dark };
    const overcast = st.weather === 'storm' ? 0.34 : st.weather === 'rain' ? 0.22 : st.weather === 'snow' ? 0.1 : 0;
    const a = outdoorAmbient(st.time.min, overcast);
    if (!this.def.outdoor) return { color: a.alpha > 0.1 ? 0x140a1a : 0x302018, alpha: Math.max(this.lid === 'throne' ? 0.06 : 0.12, a.alpha * (this.lid === 'throne' ? 0.6 : 0.85)) };
    return a;
  }

  private updateLights() {
    const amb = this.ambient();
    const lights: Light[] = [];
    const nightish = amb.alpha > 0.12;
    const view = this.cameras.main.worldView;
    for (const id of this.lightObjs) {
      const o = this.objs.get(id);
      const s = this.sprites.get(id);
      if (!o || !s) continue;
      if (s.x < view.x - 100 || s.x > view.right + 100 || s.y < view.y - 100 || s.y > view.bottom + 140) continue;
      const k = OBJ[o.kind];
      for (const l of k.light!) {
        if (l.night && !nightish) continue;
        if (o.kind === 'lamppost' && !o.data?.lit) continue;
        lights.push({ x: s.x + l.dx, y: s.y - (k.oy || 0) + l.dy, r: l.r, color: l.color ?? 0xffffff, flicker: l.flicker });
      }
    }
    const pr = this.lid === 'cave' ? 104 : nightish ? 30 : 0;
    if (pr) lights.push({ x: this.player.x, y: this.player.y - 8, r: pr, color: this.lid === 'cave' ? 0xffc890 : 0xffffff, flicker: this.lid === 'cave' });
    this.lighting.update(lights, amb);
  }

  private updatePrompt(modal: boolean) {
    if (modal || this.fishing) {
      ui.prompt(this.fishing ? (this.fishing.state === 'bite' ? '<kbd>Clique</kbd> Puxar agora!' : 'Pescando... <kbd>Esc</kbd> cancelar') : null);
      return;
    }
    if (this.buildMode) {
      ui.prompt('<kbd>Clique</kbd> Construir aqui &nbsp; <kbd>Esc</kbd> Cancelar');
      return;
    }
    const [tx, ty] = this.target(false);
    const npc = this.npcNear(tx, ty);
    if (npc) return ui.prompt(`<kbd>E</kbd> Conversar com ${npc.def.name}`);
    const an = this.animalNear(tx, ty);
    if (an) {
      const sel = selected();
      const tool = sel ? ITEMS[sel.id].tool?.type : undefined;
      if (an.state?.product && tool && tool === an.def.tool) return ui.prompt(`<kbd>Clique</kbd> ${tool === 'pail' ? 'Ordenhar' : 'Tosquiar'} ${an.name}`);
      const hint = an.state?.product && an.def.tool ? ` (use ${an.def.tool === 'pail' ? 'o balde' : 'a tesoura'})` : '';
      return ui.prompt(`<kbd>E</kbd> ${an.state && !an.state.petted ? 'Acariciar' : 'Ver'} ${an.name}${hint}`);
    }
    const c = this.ls.crops[key(tx, ty)];
    if (c?.ready && !c.dead) return ui.prompt(`<kbd>E</kbd> Colher ${CROPS[c.crop].name}`);
    if (c?.dead) return ui.prompt('Plantação murcha — use uma ferramenta para remover');
    const door = this.doorAt(tx, ty);
    if (door) return ui.prompt(`<kbd>E</kbd> ${door.k.door!.to ? 'Entrar' : 'Porta'} — ${door.k.name}`);
    const o = this.objAt(tx, ty);
    if (o) {
      const k = OBJ[o.kind];
      if (k.interact && k.label) return ui.prompt(`<kbd>E</kbd> ${k.label} — ${k.name}`);
    }
    ui.prompt(null);
  }
}
