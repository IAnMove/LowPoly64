#!/usr/bin/env node

// Build a reviewable HTML contact sheet from the real generated thumbnails.
// The output links to public/template-thumbnails; it does not synthesize or
// embed replacement images.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultManifest = path.join(repoRoot, 'public', 'template-thumbnails', 'manifest.json');
const defaultOutput = path.join(repoRoot, 'artifacts', 'template-thumbnails', 'contact-sheet.html');

function usage(message) {
  if (message) console.error('Error: ' + message + '\n');
  console.error('Usage: node scripts/build-template-contact-sheet.mjs [options]');
  console.error('  --manifest PATH  Manifest (default: public/template-thumbnails/manifest.json)');
  console.error('  --output PATH    HTML output (default: artifacts/template-thumbnails/contact-sheet.html)');
  process.exit(2);
}

function parseArgs(argv) {
  const options = { manifest: defaultManifest, output: defaultOutput };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--manifest') options.manifest = path.resolve(argv[++index] || usage('--manifest needs a path.'));
    else if (arg === '--output') options.output = path.resolve(argv[++index] || usage('--output needs a path.'));
    else if (arg === '--help' || arg === '-h') usage();
    else usage('Unknown option: ' + arg);
  }
  return options;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function relativeUrl(fromFile, targetFile) {
  return path.relative(path.dirname(fromFile), targetFile).replaceAll('\\', '/');
}

function statusText(entry, imageExists) {
  if (entry.status !== 'ok') return entry.error || 'captura fallida';
  if (!imageExists) return 'imagen ausente';
  return (entry.width || 144) + '×' + (entry.height || 112) + ' · ' + (entry.mimeType || 'image/webp');
}

function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) throw new Error('Manifest not found: ' + manifestPath);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(manifest.templates)) throw new Error('Manifest has no templates array.');
  return manifest;
}

function buildSections(manifest, outputPath, imageRoot) {
  const entries = [...manifest.templates].sort((left, right) => {
    const category = String(left.category || '').localeCompare(String(right.category || ''), 'es');
    if (category) return category;
    const name = String(left.name || '').localeCompare(String(right.name || ''), 'es');
    return name || String(left.id || '').localeCompare(String(right.id || ''), 'en');
  });
  const categories = new Map();
  const missing = [];
  for (const entry of entries) {
    const category = String(entry.category || 'Sin categoría');
    if (!categories.has(category)) categories.set(category, []);
    const imagePath = entry.file ? path.resolve(imageRoot, entry.file) : null;
    const imageExists = entry.status === 'ok' && imagePath && fs.existsSync(imagePath);
    if (!imageExists) missing.push(entry);
    const image = imageExists
      ? '<img loading="lazy" width="144" height="112" src="' + escapeHtml(relativeUrl(outputPath, imagePath)) + '" alt="' + escapeHtml(entry.name || entry.id) + '">'
      : '<div class="missing" role="img" aria-label="Imagen ausente">sin imagen</div>';
    const search = escapeHtml((entry.id || '') + ' ' + (entry.name || '') + ' ' + category).toLowerCase();
    const state = imageExists ? 'ok' : 'missing';
    categories.get(category).push(
      '<article class="card ' + state + '" data-search="' + search + '">' +
        '<div class="thumb">' + image + '</div>' +
        '<div class="name" title="' + escapeHtml(entry.id || '') + '">' + escapeHtml(entry.name || entry.id || '(sin nombre)') + '</div>' +
        '<div class="meta"><code>' + escapeHtml(entry.id || '') + '</code><span>' + escapeHtml(statusText(entry, imageExists)) + '</span></div>' +
      '</article>',
    );
  }
  const sections = [...categories.entries()].map(([category, cards]) =>
    '<section class="category" data-category="' + escapeHtml(category) + '">' +
      '<h2>' + escapeHtml(category) + ' <small>(' + cards.length + ')</small></h2>' +
      '<div class="grid">' + cards.join('') + '</div>' +
    '</section>',
  );
  return { entries, sections, missing, categoryCount: categories.size };
}

function makeHtml(manifest, data, manifestPath) {
  const expected = Number(manifest.registryCount) || data.entries.length;
  const captured = Number(manifest.capturedCount) || 0;
  const complete = data.entries.length === expected && data.missing.length === 0;
  const missingList = data.missing.length
    ? '<details class="missing-list" open><summary>' + data.missing.length + ' entrada(s) pendiente(s)</summary><ul>' +
      data.missing.map((entry) => '<li><code>' + escapeHtml(entry.id || '') + '</code> — ' + escapeHtml(entry.error || 'imagen ausente') + '</li>').join('') +
      '</ul></details>'
    : '<p class="complete">Todas las entradas tienen una miniatura disponible.</p>';
  const source = path.relative(repoRoot, manifestPath).replaceAll('\\', '/');
  const title = 'Template thumbnails · ' + captured + '/' + expected;
  return [
    '<!doctype html>',
    '<html lang="es"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>' + escapeHtml(title) + '</title>',
    '<style>',
    ':root{color-scheme:dark;font-family:system-ui,sans-serif;background:#101722;color:#e5edf7}',
    '*{box-sizing:border-box}body{margin:0;padding:28px;background:#101722}',
    'header{position:sticky;top:0;z-index:2;margin:-28px -28px 24px;padding:18px 20px;background:rgba(16,23,34,.96);border-bottom:1px solid #2e3d51;backdrop-filter:blur(8px)}',
    'h1{margin:0 0 8px;font-size:22px}.summary{display:flex;flex-wrap:wrap;gap:8px 18px;color:#aebdd0;font-size:13px}',
    '.summary strong{color:#f2f7ff}.complete{color:#8ce2ae}.incomplete{color:#ffc779}',
    '.controls{display:flex;gap:10px;align-items:center;margin-top:14px}input{min-width:min(420px,100%);padding:9px 11px;border:1px solid #3b4b61;border-radius:7px;background:#182231;color:#f2f7ff}',
    '.missing-list{margin-top:14px;padding:10px 12px;border:1px solid #724e2b;border-radius:7px;color:#ffc779;font-size:12px}.missing-list ul{margin:8px 0 0;padding-left:22px}',
    '.category{margin:28px 0}.category h2{margin:0 0 10px;padding-bottom:7px;border-bottom:1px solid #2e3d51;font-size:16px}.category h2 small{color:#8497ae;font-size:12px}',
    '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}.card{min-width:0;padding:8px;border:1px solid #29384b;border-radius:8px;background:#182231}.card:hover{border-color:#7098c9}.card.missing{border-color:#724e2b}',
    '.thumb{display:grid;place-items:center;min-height:112px;background:#182231;border-radius:5px;overflow:hidden}img{display:block;width:144px;height:112px}.missing{display:grid;place-items:center;width:144px;height:112px;border:1px dashed #724e2b;color:#ffc779;font:11px ui-monospace,monospace}',
    '.name{overflow:hidden;margin-top:7px;color:#f2f7ff;font-size:12px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.meta{display:flex;justify-content:space-between;gap:5px;margin-top:3px;color:#8497ae;font-size:10px}.meta code{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.meta span{flex:0 0 auto}',
    '.hidden{display:none!important}#empty{display:none;color:#aebdd0}footer{margin-top:30px;color:#71839a;font-size:11px}',
    '</style></head><body>',
    '<header><h1>' + escapeHtml(title) + '</h1>',
    '<div class="summary"><span class="' + (complete ? 'complete' : 'incomplete') + '"><strong>' + captured + '</strong> capturadas de <strong>' + expected + '</strong></span>',
    '<span><strong>' + data.entries.length + '</strong> registros en el manifest</span><span><strong>' + (manifest.failedCount || 0) + '</strong> con error</span>',
    '<span><strong>' + data.categoryCount + '</strong> categorías</span></div>',
    missingList,
    '<div class="controls"><label for="filter">Filtrar modelos</label><input id="filter" type="search" placeholder="id, nombre o categoría" autocomplete="off"></div></header>',
    '<main id="catalog">' + data.sections.join('') + '</main><p id="empty">No hay modelos que coincidan con el filtro.</p>',
    '<footer>Fuente: <code>' + escapeHtml(source) + '</code> · las imágenes se cargan desde <code>public/template-thumbnails</code>.</footer>',
    '<script>',
    'const input=document.querySelector("#filter"),cards=[...document.querySelectorAll(".card")],sections=[...document.querySelectorAll(".category")],empty=document.querySelector("#empty");',
    'input.addEventListener("input",()=>{const q=input.value.trim().toLowerCase();let visible=0;for(const card of cards){const show=!q||card.dataset.search.includes(q);card.classList.toggle("hidden",!show);if(show)visible++;}for(const section of sections){section.classList.toggle("hidden",!section.querySelector(".card:not(.hidden)"));}empty.style.display=visible?"none":"block";});',
    '</script></body></html>',
  ].join('\n');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = readManifest(options.manifest);
  const data = buildSections(manifest, options.output, path.dirname(options.manifest));
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, makeHtml(manifest, data, options.manifest));
  const expected = Number(manifest.registryCount) || data.entries.length;
  console.log('[template-contact-sheet] Wrote ' + options.output);
  console.log('[template-contact-sheet] ' + data.entries.length + '/' + expected + ' manifest entries; ' + data.missing.length + ' missing image(s).');
}

main();
