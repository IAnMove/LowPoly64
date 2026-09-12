import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { FORGE_FACE_ART, forgeArtSvg, forgeSpriteId } from '../src/data/avatar/forge-face-art.js';

const dir = 'src/data/avatar/sprites';
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
});
try {
  const page = await browser.newPage();
  for (const art of FORGE_FACE_ART) {
    const [width, height] = { eye: [32, 32], brow: [48, 16], mouth: [48, 24] }[art.kind];
    const bytes = await page.evaluate(async ({ svg, width, height }) => {
      const image = new Image();
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(image, 0, 0, width, height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    }, { svg: forgeArtSvg(art), width, height });
    await fs.writeFile(`${dir}/${forgeSpriteId(art)}.png`, Buffer.from(bytes));
  }
  const manifestPath = `${dir}/sprites-manifest.json`;
  const newIds = new Set(FORGE_FACE_ART.map(forgeSpriteId));
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')).filter(entry => !newIds.has(entry.id));
  manifest.push(...FORGE_FACE_ART.map(art => ({ id: forgeSpriteId(art), kind: art.kind, file: `${forgeSpriteId(art)}.png`, tintSlots: art.tintSlots, ...(art.kind === 'eye' ? { tintMode: 'magentaKey' } : {}) })));
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Rendered ${FORGE_FACE_ART.length} original facial sprites.`);
} finally {
  await browser.close();
}
