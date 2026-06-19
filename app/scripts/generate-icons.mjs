// scripts/generate-icons.mjs
// Génère les assets icône Trace (Concept A — La Trace)
// Usage: node scripts/generate-icons.mjs

import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, '..', 'assets', 'images');

// Points du tracé dans le viewBox 76×60
const RAW_PTS = [[4,46],[20,46],[31,16],[44,34],[56,8],[72,8]];
const VW = 76, VH = 60;

function buildSvg({ size, bgColor, strokeColor, paddingRatio = 0.18 }) {
  const pad = size * paddingRatio;
  const drawW = size - pad * 2;
  const drawH = size - pad * 2;

  // Mise à l'échelle en conservant le ratio
  const scale = Math.min(drawW / VW, drawH / VH);
  const scaledW = VW * scale;
  const scaledH = VH * scale;
  const ox = (size - scaledW) / 2;
  const oy = (size - scaledH) / 2;

  const pts = RAW_PTS.map(([x, y]) =>
    `${(ox + x * scale).toFixed(2)},${(oy + y * scale).toFixed(2)}`
  ).join(' ');

  const sw = Math.max(4, size * 0.052).toFixed(2);
  const bg = bgColor ? `<rect width="${size}" height="${size}" fill="${bgColor}"/>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bg}
  <polyline points="${pts}" fill="none" stroke="${strokeColor}" stroke-width="${sw}"
    stroke-linejoin="round" stroke-linecap="round"/>
</svg>`;
}

function render(svg) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'original' } });
  return resvg.render().asPng();
}

function save(filename, buf) {
  const p = join(ASSETS, filename);
  writeFileSync(p, buf);
  console.log(`✓ ${filename}`);
}

// icon.png — fond noir, tracé lime, 1024×1024 (iOS + fallback Android)
save('icon.png', render(buildSvg({ size: 1024, bgColor: '#0D0D0D', strokeColor: '#84CC16', paddingRatio: 0.16 })));

// android-icon-foreground.png — tracé lime sur transparent, safe zone 25% padding
save('android-icon-foreground.png', render(buildSvg({ size: 1024, bgColor: null, strokeColor: '#84CC16', paddingRatio: 0.26 })));

// android-icon-monochrome.png — blanc sur transparent (Android 13+ themed icons)
save('android-icon-monochrome.png', render(buildSvg({ size: 1024, bgColor: null, strokeColor: '#FFFFFF', paddingRatio: 0.26 })));

// splash-icon.png — fond transparent, tracé lime (fond #0D0D0D géré par app.json)
save('splash-icon.png', render(buildSvg({ size: 1024, bgColor: null, strokeColor: '#84CC16', paddingRatio: 0.22 })));

// favicon.png — fond noir, tracé lime, 48×48
save('favicon.png', render(buildSvg({ size: 48, bgColor: '#0D0D0D', strokeColor: '#84CC16', paddingRatio: 0.12 })));

console.log('\nDone — assets/images/ mis à jour.');
