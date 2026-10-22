// Tras `vite build`: genera dist/es/ y dist/en/ (mismo editor, idioma fijado por la URL)
// para que cada idioma tenga su propia URL indexable con canonical y hreflang.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SITE = (process.env.SITE_URL || 'https://retrovisor.iaen.es').replace(/\/$/, '');
const base = readFileSync('dist/index.html', 'utf8');
const meta = {
  en: { title: 'LowPoly64 - N64 Retro Editor', desc: 'Free in-browser low-poly 3D editor with an N64/PSX retro look: model, rig, animate and export GLB.' },
  es: { title: 'LowPoly64 - Editor retro N64', desc: 'Editor 3D low-poly gratuito en el navegador con estética retro N64/PSX: modela, riggea, anima y exporta GLB.' },
};

for (const lang of ['es', 'en']) {
  let html = base
    .replace('<html lang="en">', `<html lang="${lang}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${meta[lang].title}</title>\n    <meta name="description" content="${meta[lang].desc}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${SITE}/${lang}/">`)
    .replaceAll('href="./help.html"', 'href="/help.html"');
  mkdirSync(`dist/${lang}`, { recursive: true });
  writeFileSync(`dist/${lang}/index.html`, html);
}
console.log('i18n-pages: dist/es/index.html y dist/en/index.html');
