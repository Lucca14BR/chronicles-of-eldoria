/** 16x16 item icons, registered as Phaser textures ('icon_<id>') and data URLs for the DOM UI. */
import Phaser from 'phaser';
import { PCanvas, shade, addTex, ICON_URLS } from './pixel';
import { ITEMS } from '../data/items';
import { CROPS } from '../data/crops';
import { animalIcon } from './animals';

const O = '#2a1a14';
type P = PCanvas;

const TIER = ['#9aa0a8', '#d2783c', '#dfe4ea', '#f2c23a'];

function log(p: P) {
  p.rect(3, 5, 11, 6, '#8a5a32');
  p.hline(3, 5, 11, '#a8743f');
  p.hline(3, 10, 11, '#5e3c20');
  p.ellipse(3.5, 8, 2.5, 3.5, '#d8b07a');
  p.px(3, 8, '#9a6a3a');
  p.px(3, 7, '#b88a52');
  p.px(8, 7, '#6e4626');
  p.px(11, 9, '#6e4626');
  p.px(13, 4, '#5fa83a');
  p.px(12, 4, '#5fa83a');
}
function rock(p: P, c = '#9a958c') {
  p.ellipse(8, 9, 6, 5, c);
  p.ellipse(7, 8, 4, 3, shade(c, 0.15));
  p.px(6, 6, shade(c, 0.4));
  p.px(7, 6, shade(c, 0.35));
  p.hline(4, 13, 8, shade(c, -0.3));
  p.px(10, 10, shade(c, -0.25));
}
function ore(p: P, c: string) {
  rock(p, '#7a746c');
  p.rect(5, 7, 2, 2, c);
  p.rect(9, 9, 2, 2, c);
  p.px(8, 6, c);
  p.px(5, 7, shade(c, 0.4));
  p.px(9, 9, shade(c, 0.4));
}
function bar(p: P, c: string) {
  for (let y = 0; y < 5; y++) p.hline(3 - (y > 2 ? 1 : 0) + Math.max(0, 2 - y), 6 + y, 10 + (y > 2 ? 2 : 0) - Math.max(0, 2 - y) * 2 + 2, y === 0 ? shade(c, 0.35) : y < 3 ? c : shade(c, -0.25));
  p.hline(5, 7, 4, shade(c, 0.5));
}
function gem(p: P, c: string, c2: string) {
  const pts: [number, number, number][] = [
    [3, 6, 10],
    [4, 5, 8],
    [5, 4, 6],
    [6, 3, 4],
    [7, 2, 2],
    [8, 1, 0],
  ];
  p.hline(5, 4, 6, shade(c, 0.3));
  p.hline(4, 5, 8, c);
  for (let y = 6; y < 13; y++) {
    const w = Math.max(0, 12 - (y - 5) * 2 + 2);
    const x = 8 - Math.floor(w / 2);
    p.hline(x, y, w, y < 9 ? c : c2);
  }
  p.px(6, 5, '#ffffff');
  p.px(5, 6, shade(c, 0.5));
  void pts;
}
function blob(p: P, c: string) {
  p.ellipse(8, 10, 6, 4, c);
  p.ellipse(8, 7, 3, 3, c);
  p.px(6, 7, shade(c, 0.5));
  p.px(7, 6, shade(c, 0.5));
  p.hline(4, 13, 8, shade(c, -0.3));
}
function bone(p: P) {
  p.line(4, 11, 11, 4, '#efe6d2');
  p.line(5, 11, 12, 4, '#efe6d2');
  p.disc(3.5, 11.5, 1.6, '#efe6d2');
  p.disc(5, 13, 1.6, '#efe6d2');
  p.disc(11, 3, 1.6, '#efe6d2');
  p.disc(12.8, 4.6, 1.6, '#efe6d2');
  p.px(8, 8, '#cfc2a8');
}
function sack(p: P, c: string, mark?: string) {
  p.ellipse(8, 10, 5, 5, c);
  p.rect(6, 3, 4, 3, c);
  p.hline(5, 5, 6, '#8a6a44');
  p.px(7, 2, shade(c, -0.1));
  p.px(8, 2, shade(c, -0.1));
  p.vline(12, 8, 5, shade(c, -0.2));
  if (mark) {
    p.rect(6, 9, 4, 3, mark);
    p.px(7, 9, shade(mark, 0.3));
  }
}
function berry(p: P) {
  const c = '#5a3a8a';
  [
    [6, 8],
    [9, 8],
    [7, 11],
    [10, 11],
    [5, 11],
    [8, 13],
  ].forEach(([x, y]) => {
    p.disc(x, y, 1.8, c);
    p.px(x - 1, y - 1, '#9a7ad0');
  });
  p.line(8, 6, 9, 3, '#4a7a2e');
  p.rect(9, 3, 3, 2, '#5fa83a');
}
function herb(p: P) {
  p.vline(8, 5, 9, '#3e7a2e');
  p.ellipse(5, 7, 2.5, 1.5, '#5fae48');
  p.ellipse(11, 6, 2.5, 1.5, '#5fae48');
  p.ellipse(5, 11, 2.5, 1.5, '#4f9a3c');
  p.ellipse(11, 10, 2.5, 1.5, '#4f9a3c');
  p.ellipse(8, 3, 1.5, 2, '#7cc45a');
  p.px(4, 7, '#9be07a');
  p.px(10, 6, '#9be07a');
}
function mushroom(p: P) {
  p.rect(7, 8, 3, 6, '#efe6d2');
  p.vline(9, 8, 6, '#cfc2a8');
  p.ellipse(8.5, 7, 6, 4, '#c8402e');
  p.hline(3, 9, 11, '#8a2a1e');
  p.px(6, 5, '#ffffff');
  p.px(10, 6, '#ffffff');
  p.px(8, 4, '#ffffff');
  p.px(12, 7, '#ffffff');
}
function flower(p: P, c = '#f08fb0') {
  p.vline(8, 8, 7, '#3e7a2e');
  p.ellipse(10, 11, 2, 1, '#5fa83a');
  [
    [8, 3],
    [5, 6],
    [11, 6],
    [6, 9],
    [10, 9],
  ].forEach(([x, y]) => p.disc(x, y, 1.8, c));
  p.disc(8, 6.5, 1.5, '#f8e070');
}
function acorn(p: P) {
  p.ellipse(8, 10, 4, 4.5, '#b07a3a');
  p.ellipse(8, 6, 5, 2.5, '#6e4a26');
  p.vline(8, 2, 3, '#5e3e20');
  p.px(6, 9, '#d8a060');
  p.hline(4, 6, 8, '#8a6234');
}
function packet(p: P, c: string) {
  p.rect(3, 2, 10, 13, '#e6d2a4');
  p.hline(3, 2, 10, '#c8b07a');
  p.vline(12, 2, 13, '#c8b07a');
  p.hline(3, 4, 10, '#b89a62');
  p.disc(8, 9.5, 3, c);
  p.px(7, 8, shade(c, 0.5));
  p.vline(8, 5, 2, '#5fa83a');
  p.px(9, 5, '#5fa83a');
}
function cropIcon(p: P, id: string) {
  const d = CROPS[id];
  const c = d.color;
  switch (id) {
    case 'turnip':
      p.ellipse(8, 10, 4.5, 4, '#f2ecf2');
      p.ellipse(8, 8, 4.5, 2, '#b06ab0');
      p.vline(8, 14, 2, '#d8d0d8');
      p.line(8, 6, 6, 1, '#5cae3c');
      p.line(8, 6, 10, 1, '#5cae3c');
      p.line(8, 6, 8, 1, '#4a8f2e');
      p.px(6, 9, '#ffffff');
      break;
    case 'wheat':
      for (let i = 0; i < 3; i++) {
        p.line(5 + i * 2, 15, 6 + i * 2, 6, '#c8a040');
        for (let k = 0; k < 4; k++) {
          p.px(5 + i * 2, 3 + k * 1.5, c);
          p.px(7 + i * 2, 3.5 + k * 1.5, shade(c, -0.15));
        }
      }
      p.hline(5, 11, 6, '#8a5a2a');
      break;
    case 'potato':
      p.ellipse(8, 9, 6, 4.5, c);
      p.ellipse(7, 8, 4, 2.5, shade(c, 0.15));
      p.px(6, 9, '#8a6034');
      p.px(10, 8, '#8a6034');
      p.px(9, 11, '#8a6034');
      break;
    case 'strawberry':
      p.ellipse(8, 9, 5, 4, c);
      p.ellipse(8, 12, 3, 2.5, c);
      p.hline(5, 5, 6, '#3f9a3a');
      p.px(8, 4, '#3f9a3a');
      [
        [6, 8],
        [9, 9],
        [7, 11],
        [10, 7],
      ].forEach(([x, y]) => p.px(x, y, '#f8e070'));
      break;
    case 'melon':
      p.disc(8, 9, 6, c);
      for (let x = 4; x < 14; x += 3) p.vline(x, 4, 10, '#4f9a32');
      p.px(5, 6, '#c8f0a0');
      p.px(8, 2, '#6a4a2a');
      break;
    case 'pumpkin':
      p.ellipse(8, 10, 6.5, 5, c);
      p.vline(6, 6, 9, shade(c, -0.2));
      p.vline(10, 6, 9, shade(c, -0.2));
      p.rect(7, 3, 2, 3, '#5a7a2a');
      p.px(5, 8, shade(c, 0.4));
      break;
    case 'eggplant':
      p.ellipse(8, 10, 4, 5, c);
      p.ellipse(7, 9, 2, 3, shade(c, 0.25));
      p.rect(6, 3, 4, 2, '#4a8a3a');
      p.vline(8, 1, 2, '#4a8a3a');
      break;
    case 'corn':
      p.ellipse(8, 8, 3, 6, c);
      for (let y = 3; y < 14; y += 2) p.hline(6, y, 4, shade(c, -0.15));
      p.line(5, 14, 4, 6, '#7cb848');
      p.line(11, 14, 12, 6, '#5fa538');
      break;
    case 'grape':
      [
        [6, 6],
        [10, 6],
        [8, 8],
        [5, 9],
        [11, 9],
        [7, 11],
        [9, 11],
        [8, 13],
      ].forEach(([x, y]) => {
        p.disc(x, y, 1.9, c);
        p.px(x - 1, y - 1, '#c89ae0');
      });
      p.line(8, 5, 9, 1, '#6a4a2a');
      p.rect(9, 1, 4, 2, '#5fa83a');
      break;
    case 'sunflower':
      p.vline(8, 9, 7, '#4a8a2e');
      for (let a = 0; a < 8; a++) p.disc(8 + Math.cos((a * Math.PI) / 4) * 4, 7 + Math.sin((a * Math.PI) / 4) * 4, 2, c);
      p.disc(8, 7, 2.6, '#6a3a1a');
      p.px(7, 6, '#8a5a2a');
      break;
    case 'cabbage':
      p.disc(8, 9, 6, c);
      p.ellipse(8, 9, 3.5, 3, shade(c, 0.2));
      p.line(4, 7, 8, 12, shade(c, -0.25));
      p.line(12, 7, 8, 12, shade(c, -0.25));
      break;
    default:
      // tomato
      p.disc(8, 9, 5.5, c);
      p.ellipse(6, 7, 2, 1.5, shade(c, 0.4));
      p.hline(6, 4, 5, '#3e8f35');
      p.px(8, 3, '#3e8f35');
  }
}
function fish(p: P, c: string, c2: string) {
  p.ellipse(8, 8, 5.5, 3, c);
  p.ellipse(8, 9, 5, 1.5, c2);
  p.rect(1, 6, 2, 5, c);
  p.px(0, 5, c);
  p.px(0, 11, c);
  p.px(11, 7, '#ffffff');
  p.px(11, 7, '#1a1a1a');
  p.line(6, 5, 9, 4, shade(c, -0.25));
  p.px(6, 7, shade(c, 0.4));
}
function bread(p: P) {
  p.ellipse(8, 10, 6.5, 4, '#c88a3a');
  p.ellipse(8, 9, 6, 3, '#dfa24e');
  p.line(5, 9, 6, 7, '#a86a2a');
  p.line(8, 9, 9, 7, '#a86a2a');
  p.line(11, 9, 12, 7, '#a86a2a');
}
function bowl(p: P, c: string) {
  p.ellipse(8, 8, 6, 2, c);
  p.rect(2, 8, 12, 2, '#8a5a32');
  p.ellipse(8, 10, 6, 3.5, '#8a5a32');
  p.hline(3, 9, 10, '#a8743f');
  p.px(6, 7, '#e8c040');
  p.px(9, 8, '#e05030');
  p.px(7, 4, '#d8d8e0');
  p.px(9, 3, '#d8d8e0');
}
function pie(p: P) {
  p.ellipse(8, 10, 7, 4, '#d29a52');
  p.ellipse(8, 9, 6, 3, '#6a2a5a');
  for (let x = 3; x < 14; x += 3) p.line(x, 7, x + 2, 11, '#e8b46a');
  p.hline(2, 12, 12, '#a86a2a');
}
function potion(p: P, c: string) {
  p.disc(8, 10, 5, '#c8dce8');
  p.disc(8, 10.5, 4, c);
  p.rect(7, 3, 3, 3, '#c8dce8');
  p.rect(7, 2, 3, 1, '#8a5a32');
  p.px(6, 8, '#ffffff');
  p.px(5, 9, shade(c, 0.5));
}
function hoe(p: P, t: number) {
  p.line(4, 14, 11, 4, '#8a5a32');
  p.line(5, 14, 12, 4, '#6e4626');
  p.rect(9, 2, 5, 3, TIER[t]);
  p.rect(12, 2, 2, 5, TIER[t]);
  p.px(9, 2, shade(TIER[t], 0.4));
}
function can(p: P, t: number) {
  const c = t ? '#d2783c' : '#7f8a96';
  p.rect(4, 6, 8, 7, c);
  p.ellipse(8, 6, 4, 1.5, shade(c, 0.25));
  p.line(12, 8, 15, 5, c);
  p.px(15, 4, shade(c, 0.3));
  p.line(5, 6, 8, 2, shade(c, -0.25));
  p.line(8, 2, 11, 6, shade(c, -0.25));
  p.vline(11, 7, 6, shade(c, -0.25));
  p.hline(4, 12, 8, shade(c, -0.35));
}
function axe(p: P, t: number) {
  p.line(4, 14, 10, 3, '#8a5a32');
  p.line(5, 14, 11, 3, '#6e4626');
  const c = TIER[t];
  p.rect(9, 2, 4, 5, c);
  p.rect(12, 1, 2, 7, c);
  p.vline(13, 1, 7, shade(c, 0.4));
  p.px(9, 6, shade(c, -0.3));
}
function pick(p: P, t: number) {
  p.line(4, 14, 10, 4, '#8a5a32');
  p.line(5, 14, 11, 4, '#6e4626');
  const c = TIER[t];
  p.line(4, 4, 8, 2, c);
  p.line(8, 2, 13, 3, c);
  p.line(13, 3, 14, 7, c);
  p.line(4, 5, 8, 3, shade(c, -0.25));
  p.px(14, 8, shade(c, -0.3));
  p.px(3, 5, shade(c, -0.3));
}
function sword(p: P, t: number) {
  const c = t === 0 ? '#a8987a' : TIER[t];
  p.line(5, 10, 13, 2, c);
  p.line(6, 11, 14, 3, shade(c, -0.25));
  p.line(5, 9, 12, 2, shade(c, 0.4));
  p.line(3, 9, 7, 13, '#c8a040');
  p.line(3, 14, 5, 12, '#6e4626');
  p.px(2, 15, '#c8a040');
  if (t === 0) {
    p.px(9, 6, '#8a5a32');
    p.px(11, 4, '#8a5a32');
  }
}
function rod(p: P) {
  p.line(2, 15, 13, 2, '#a8743f');
  p.line(3, 15, 14, 2, '#6e4626');
  p.line(13, 2, 13, 10, '#e8e8f0');
  p.px(13, 11, '#d83a3a');
  p.px(13, 12, '#f0f0f0');
  p.disc(5, 12, 1.6, '#5a5a62');
}
function bench(p: P) {
  p.rect(1, 6, 14, 3, '#a8743f');
  p.hline(1, 6, 14, '#c89058');
  p.rect(2, 9, 2, 5, '#6e4626');
  p.rect(12, 9, 2, 5, '#6e4626');
  p.rect(5, 3, 3, 3, '#7f8a96');
  p.line(9, 5, 12, 2, '#8a5a32');
}
function chestI(p: P) {
  p.rect(2, 5, 12, 9, '#9a6436');
  p.rect(2, 5, 12, 3, '#b07a46');
  p.hline(2, 8, 12, '#4a2e18');
  p.vline(2, 5, 9, '#c8a040');
  p.vline(13, 5, 9, '#c8a040');
  p.rect(7, 7, 2, 3, '#e0c050');
}
function furnaceI(p: P) {
  p.rect(3, 3, 10, 12, '#8a8378');
  p.hline(3, 3, 10, '#a39c90');
  p.rect(5, 8, 6, 5, '#2a1a14');
  p.rect(6, 10, 4, 3, '#f08a2a');
  p.px(7, 11, '#f8d060');
  p.rect(6, 1, 4, 2, '#6e685e');
}
function anvilI(p: P) {
  p.rect(2, 5, 12, 3, '#5e646e');
  p.hline(2, 5, 12, '#8a929e');
  p.rect(0, 5, 3, 2, '#5e646e');
  p.rect(6, 8, 4, 4, '#4a4f58');
  p.rect(4, 12, 8, 2, '#5e646e');
}
function campfireI(p: P) {
  p.line(3, 14, 13, 10, '#6e4626');
  p.line(3, 10, 13, 14, '#8a5a32');
  p.ellipse(8, 8, 3.5, 5, '#f08a2a');
  p.ellipse(8, 9, 2, 3, '#f8d060');
  p.px(8, 2, '#f8a040');
}
function alchemyI(p: P) {
  p.rect(1, 9, 14, 3, '#6e4a8a');
  p.rect(2, 12, 2, 3, '#4a2e18');
  p.rect(12, 12, 2, 3, '#4a2e18');
  p.disc(5, 6, 2.5, '#8ad0f0');
  p.rect(10, 3, 2, 6, '#c8dce8');
  p.rect(10, 6, 2, 3, '#d05ae0');
}
function fenceI(p: P) {
  p.rect(2, 3, 3, 12, '#a8743f');
  p.rect(11, 3, 3, 12, '#a8743f');
  p.rect(1, 6, 14, 2, '#8a5a32');
  p.rect(1, 10, 14, 2, '#8a5a32');
  p.hline(2, 3, 3, '#c89058');
  p.hline(11, 3, 3, '#c89058');
}
function pathI(p: P) {
  p.rect(1, 4, 6, 4, '#a6a096');
  p.rect(8, 3, 7, 5, '#b0aa9f');
  p.rect(2, 9, 7, 5, '#9b958a');
  p.rect(10, 9, 5, 4, '#a6a096');
}
function torchI(p: P) {
  p.rect(7, 7, 2, 8, '#8a5a32');
  p.rect(6, 6, 4, 2, '#5e3e22');
  p.ellipse(8, 4, 2.5, 3, '#f08a2a');
  p.px(8, 4, '#f8e070');
}
function lampI(p: P) {
  p.rect(7, 5, 2, 10, '#3a3a42');
  p.rect(4, 14, 8, 1, '#3a3a42');
  p.rect(5, 1, 6, 5, '#3a3a42');
  p.rect(6, 2, 4, 3, '#f8d070');
}
function scarecrowI(p: P) {
  p.vline(8, 4, 11, '#8a5a32');
  p.hline(3, 7, 11, '#8a5a32');
  p.rect(5, 6, 7, 5, '#5a7aa8');
  p.disc(8, 3.5, 2.5, '#e8d090');
  p.hline(4, 1, 9, '#c8a040');
}
function sprinklerI(p: P, t: number) {
  const c = t ? '#c8a040' : '#d2783c';
  p.rect(5, 8, 6, 6, c);
  p.rect(7, 4, 2, 4, '#9aa0a8');
  p.px(5, 3, '#8ad0f0');
  p.px(11, 3, '#8ad0f0');
  p.px(3, 5, '#8ad0f0');
  p.px(13, 5, '#8ad0f0');
  p.hline(5, 8, 6, shade(c, 0.3));
}
function tableI(p: P) {
  p.rect(1, 5, 14, 4, '#a8743f');
  p.hline(1, 5, 14, '#c89058');
  p.rect(2, 9, 2, 6, '#6e4626');
  p.rect(12, 9, 2, 6, '#6e4626');
}
function chairI(p: P) {
  p.rect(4, 1, 8, 8, '#8a5a32');
  p.rect(5, 2, 6, 6, '#a8743f');
  p.rect(3, 9, 10, 2, '#a8743f');
  p.rect(4, 11, 2, 4, '#6e4626');
  p.rect(10, 11, 2, 4, '#6e4626');
}
function shelfI(p: P) {
  p.rect(2, 1, 12, 14, '#6e4626');
  for (let y = 2; y < 14; y += 4) {
    p.rect(3, y, 2, 3, '#b84a3a');
    p.rect(5, y, 2, 3, '#3a6ab0');
    p.rect(7, y, 2, 3, '#4a8a3a');
    p.rect(10, y, 2, 3, '#c8a040');
    p.hline(3, y + 3, 10, '#a8743f');
  }
}
function potI(p: P) {
  p.rect(4, 9, 8, 6, '#b8603a');
  p.hline(3, 9, 10, '#d07a4a');
  p.ellipse(8, 6, 4, 3.5, '#4f9a3c');
  p.ellipse(6, 4, 2, 2, '#6fbf4c');
  p.ellipse(10, 5, 2, 2, '#3f8a33');
}
function rugI(p: P) {
  p.rect(1, 3, 14, 10, '#c8a040');
  p.rect(2, 4, 12, 8, '#8b2a2a');
  p.rect(5, 6, 6, 4, '#a83a3a');
  p.px(8, 8, '#e0c050');
}
function bannerI(p: P) {
  p.hline(3, 1, 10, '#6e4626');
  p.rect(4, 2, 8, 11, '#3a5a9a');
  p.px(4, 13, '#3a5a9a');
  p.px(11, 13, '#3a5a9a');
  p.rect(6, 5, 4, 4, '#e0c050');
  p.px(7, 4, '#e0c050');
  p.px(8, 4, '#e0c050');
}
function flowerBedI(p: P) {
  p.rect(1, 9, 14, 5, '#7a5233');
  p.hline(1, 9, 14, '#9a6c42');
  ['#f08fb0', '#f2d24a', '#9fb8f0', '#e8543c'].forEach((c, i) => {
    p.vline(3 + i * 3, 6, 3, '#3e7a2e');
    p.disc(3 + i * 3, 5, 1.5, c);
  });
}
function barrelI(p: P) {
  p.ellipse(8, 8, 5, 6.5, '#9a6436');
  p.hline(3, 4, 10, '#5e646e');
  p.hline(3, 12, 10, '#5e646e');
  p.ellipse(8, 3, 4, 1.5, '#b07a46');
  p.vline(6, 4, 9, '#b07a46');
}
function helm(p: P) {
  p.ellipse(8, 8, 5.5, 5, '#d2783c');
  p.rect(2, 8, 12, 5, '#d2783c');
  p.rect(5, 9, 6, 3, '#2a1a14');
  p.vline(8, 9, 4, '#d2783c');
  p.px(6, 5, '#f0a870');
  p.hline(2, 13, 12, '#9a5628');
}
function mail(p: P, c: string) {
  p.rect(3, 3, 10, 11, c);
  p.rect(1, 3, 3, 5, c);
  p.rect(12, 3, 3, 5, c);
  p.rect(6, 2, 4, 2, '#2a1a14');
  for (let y = 5; y < 14; y += 2) for (let x = 4; x < 12; x += 2) p.px(x, y, shade(c, -0.25));
  p.hline(3, 10, 10, '#5a3a22');
}
function boots(p: P) {
  p.rect(3, 3, 4, 9, '#7a4a2a');
  p.rect(3, 11, 6, 3, '#7a4a2a');
  p.rect(9, 3, 4, 9, '#6a3e22');
  p.rect(9, 11, 6, 3, '#6a3e22');
  p.hline(3, 4, 4, '#a8743f');
  p.hline(9, 4, 4, '#a8743f');
}
function ring(p: P) {
  p.disc(8, 9, 5, '#e0c050');
  for (let y = 6; y <= 12; y++) for (let x = 5; x <= 11; x++) {
    const dx = x + 0.5 - 8,
      dy = y + 0.5 - 9;
    if (dx * dx + dy * dy < 7) p.clear(x, y);
  }
  gemSmall(p, 8, 3, '#7ad7f0');
}
function gemSmall(p: P, x: number, y: number, c: string) {
  p.rect(x - 1, y - 1, 3, 3, c);
  p.px(x - 1, y - 1, '#ffffff');
}
function amulet(p: P) {
  p.line(3, 2, 8, 9, '#c8a040');
  p.line(13, 2, 8, 9, '#c8a040');
  p.disc(8, 11, 3.5, '#c8402e');
  p.disc(8, 11, 2, '#e8604e');
  p.px(7, 10, '#ffd0c0');
}
function fragment(p: P, gemC = '#7ad7f0') {
  p.rect(2, 8, 12, 5, '#e0b040');
  p.line(2, 8, 4, 3, '#e0b040');
  p.line(8, 8, 8, 2, '#e0b040');
  p.line(14, 8, 12, 4, '#e0b040');
  p.rect(7, 2, 2, 6, '#e0b040');
  p.hline(2, 12, 12, '#a87a2a');
  p.disc(8, 10, 1.5, gemC);
  p.px(4, 10, '#d04a4a');
  p.px(12, 10, '#4ad06a');
}
function coin(p: P) {
  p.disc(8, 8, 5.5, '#c8a040');
  p.disc(8, 8, 4, '#e0c050');
  p.rect(7, 5, 2, 6, '#a87a2a');
  p.px(6, 5, '#fff0a0');
}
function shard(p: P) {
  p.line(3, 12, 8, 3, '#c86a3a');
  p.line(8, 3, 13, 10, '#c86a3a');
  p.line(3, 12, 13, 10, '#c86a3a');
  for (let y = 5; y < 12; y++) for (let x = 4; x < 13; x++) if (p.alpha(x, y) === 0 && (x - 3) * 9 > (12 - y) * 5 - 20 && x < 12 && y > 4 + Math.abs(x - 8) * 0.9) p.px(x, y, '#d88a5a');
  p.hline(6, 8, 4, '#3a2a6a');
}

function drawIcon(id: string): PCanvas {
  const p = new PCanvas(16, 16);
  const def = ITEMS[id];
  const t = def.tool;
  if (animalIcon(id, p)) {
    p.outline(O);
    return p;
  }
  if (t) {
    if (t.type === 'hoe') hoe(p, t.tier);
    else if (t.type === 'can') can(p, t.tier);
    else if (t.type === 'axe') axe(p, t.tier);
    else if (t.type === 'pick') pick(p, t.tier);
    else if (t.type === 'sword') sword(p, t.tier);
    else rod(p);
  } else if (def.cat === 'seed') {
    packet(p, CROPS[def.seed!].color);
  } else if (def.cat === 'crop') {
    cropIcon(p, id);
  } else {
    switch (id) {
      case 'wood':
        log(p);
        break;
      case 'stone':
        rock(p);
        break;
      case 'fiber':
        p.line(4, 14, 6, 2, '#6fae48');
        p.line(7, 14, 9, 3, '#5f9e3c');
        p.line(10, 14, 12, 2, '#7cbe52');
        p.line(5, 14, 11, 14, '#4a7a2e');
        p.hline(5, 10, 6, '#c8b070');
        break;
      case 'coal':
        rock(p, '#3a3a42');
        p.px(6, 7, '#7a8aa8');
        break;
      case 'copper_ore':
        ore(p, '#e0884a');
        break;
      case 'iron_ore':
        ore(p, '#e8d8d0');
        break;
      case 'gold_ore':
        ore(p, '#f2c23a');
        break;
      case 'copper_bar':
        bar(p, '#d2783c');
        break;
      case 'iron_bar':
        bar(p, '#c8cdd6');
        break;
      case 'gold_bar':
        bar(p, '#f2c23a');
        break;
      case 'crystal':
        gem(p, '#8ae0f8', '#b67cf0');
        break;
      case 'gel':
        blob(p, '#6ad04a');
        break;
      case 'bone':
        bone(p);
        break;
      case 'flour':
        sack(p, '#efe8d8', '#e8c35a');
        break;
      case 'fertilizer':
        sack(p, '#a8804a', '#5fa83a');
        break;
      case 'berry':
        berry(p);
        break;
      case 'herb':
        herb(p);
        break;
      case 'mushroom':
        mushroom(p);
        break;
      case 'flower':
        flower(p);
        break;
      case 'acorn':
        acorn(p);
        break;
      case 'fish_trout':
        fish(p, '#8aa86a', '#d8c8a0');
        break;
      case 'fish_carp':
        fish(p, '#a8884a', '#e0c890');
        break;
      case 'fish_perch':
        fish(p, '#e0b040', '#f8e8a0');
        break;
      case 'fish_salmon':
        fish(p, '#b8c4d0', '#f0a090');
        break;
      case 'fish_moon':
        fish(p, '#5a5ab8', '#b8c8f8');
        p.px(6, 6, '#ffffff');
        p.px(9, 9, '#ffffff');
        break;
      case 'bread':
        bread(p);
        break;
      case 'grilled_fish':
        p.ellipse(8, 11, 7, 3, '#e8e8e0');
        fish(p, '#a86a3a', '#c88a4a');
        break;
      case 'stew':
        bowl(p, '#b8603a');
        break;
      case 'berry_pie':
        pie(p);
        break;
      case 'potion_hp':
        potion(p, '#e0404a');
        break;
      case 'potion_st':
        potion(p, '#4ac05a');
        break;
      case 'potion_luck':
        potion(p, '#e8c040');
        break;
      case 'workbench':
        bench(p);
        break;
      case 'chest':
        chestI(p);
        break;
      case 'furnace':
        furnaceI(p);
        break;
      case 'anvil':
        anvilI(p);
        break;
      case 'campfire':
        campfireI(p);
        break;
      case 'alchemy':
        alchemyI(p);
        break;
      case 'fence':
        fenceI(p);
        break;
      case 'path_stone':
        pathI(p);
        break;
      case 'torch':
        torchI(p);
        break;
      case 'lamp':
        lampI(p);
        break;
      case 'scarecrow':
        scarecrowI(p);
        break;
      case 'sprinkler':
        sprinklerI(p, 0);
        break;
      case 'sprinkler2':
        sprinklerI(p, 1);
        break;
      case 'table':
        tableI(p);
        break;
      case 'chair':
        chairI(p);
        break;
      case 'bookshelf':
        shelfI(p);
        break;
      case 'plant_pot':
        potI(p);
        break;
      case 'rug':
        rugI(p);
        break;
      case 'banner':
        bannerI(p);
        break;
      case 'flower_bed':
        flowerBedI(p);
        break;
      case 'barrel':
        barrelI(p);
        break;
      case 'eq_helm':
        helm(p);
        break;
      case 'eq_mail':
        mail(p, '#a3abb6');
        break;
      case 'eq_tunic':
        mail(p, '#8a5a32');
        break;
      case 'eq_boots':
        boots(p);
        break;
      case 'eq_ring':
        ring(p);
        break;
      case 'eq_amulet':
        amulet(p);
        break;
      case 'fragment':
        fragment(p);
        break;
      case 'fragment_mine':
        fragment(p, '#3a7af0');
        break;
      case 'fragment_forest':
        fragment(p, '#4ad06a');
        break;
      case 'royal_seal':
        p.disc(8, 8, 6, '#c8302a');
        p.disc(8, 8, 4.5, '#a8201a');
        p.rect(6, 5, 4, 2, '#e0c050');
        p.rect(5, 7, 6, 4, '#e0c050');
        p.px(6, 6, '#e0c050');
        p.px(9, 6, '#e0c050');
        p.rect(7, 8, 2, 2, '#a8201a');
        break;
      case 'eq_plate':
        mail(p, '#d8dde4');
        p.rect(6, 5, 4, 6, '#e0c050');
        break;
      case 'eq_royal_helm':
        helm(p);
        p.rect(2, 8, 12, 1, '#e0c050');
        p.px(8, 2, '#e0c050');
        p.px(8, 1, '#e0c050');
        break;
      case 'eq_knight_boots':
        boots(p);
        p.hline(3, 11, 4, '#c8cdd6');
        p.hline(9, 11, 4, '#c8cdd6');
        break;
      case 'eq_royal_cape':
        p.rect(4, 2, 8, 3, '#e0c050');
        for (let y = 4; y < 15; y++) p.hline(4 - Math.floor((y - 4) / 3), y, 8 + Math.floor((y - 4) / 3) * 2, y % 4 === 0 ? '#7a1a2a' : '#9a2a3a');
        p.px(8, 3, '#7ad7f0');
        break;
      case 'old_coin':
        coin(p);
        break;
      case 'relic_shard':
        shard(p);
        break;
      default:
        rock(p, '#c060c0');
    }
  }
  p.outline(O);
  return p;
}

export function buildIcons(scene: Phaser.Scene) {
  for (const id of Object.keys(ITEMS)) {
    const pc = drawIcon(id);
    addTex(scene, 'icon_' + id, pc);
    ICON_URLS[id] = pc.toCanvas(1).toDataURL();
  }
}
