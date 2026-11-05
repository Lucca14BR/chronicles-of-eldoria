import Phaser from 'phaser';
import { buildTilesets } from '../art/tiles';
import { buildIcons } from '../art/icons';
import { buildObjectArt, makeObjectAnims } from '../art/objects';
import { buildMenuArt } from '../art/menuArt';
import { buildCharSheet } from '../art/characters';
import { NPCS } from '../data/npcs';
import { buildAnimalArt } from '../art/animals';
import { buildCapitalArt } from '../art/capitalArt';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const t0 = performance.now();
    buildTilesets(this);
    buildObjectArt(this);
    makeObjectAnims(this);
    buildAnimalArt(this);
    buildCapitalArt(this);
    buildIcons(this);
    buildMenuArt(this);
    for (const n of NPCS) buildCharSheet(this, 'npc_' + n.id, n.spec);
    console.info(`[Eldoria] arte gerada em ${Math.round(performance.now() - t0)} ms`);
    document.getElementById('loading')?.remove();
    this.scene.start('Menu');
  }
}
