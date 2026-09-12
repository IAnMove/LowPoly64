import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
const output = 'artifacts/mario64-speech-lab', publicOutput = 'public/character-examples/mario64';
await fs.mkdir(publicOutput, { recursive: true });
const names = ['phonetic-verification.json', 'local-analysis-verification.json', 'mario-cap-refinement.png', 'speech-phonetic.webm', 'phonetic.track.json', 'mario-phonetic-svg.glb', 'mario-phonetic-cutout.glb', 'mario-phonetic-jaw.glb', 'mario-refinement.png', 'mario.recipe.json', 'cloud.recipe.json', 'mario.json', 'mario.glb', 'mario-front.png', 'mario-profile.png', 'mario-three-quarter.png', 'mario-portrait.png', 'mario-speaking-svg.glb', 'mario-speaking-cutout.glb', 'mario-speaking-jaw.glb', 'mario-speaking-svg.png', 'mario-speaking-cutout.png', 'mario-speaking-jaw.png', 'mouth-svg.glb', 'mouth-cutout.glb', 'mouth-jaw.glb', 'mouth-comparison.png', 'laboratory.png', 'speech-phrase.webm', 'speech-vowels.webm', 'vowels.track.json', 'mario-editor.png', 'production-verification.json', 'mario-verification.json', 'lab-verification.json', 'mouth-verification.json'];
const zip = new JSZip(), manifest = [];
async function add(file, name) {
  const bytes = await fs.readFile(file); zip.file(name, bytes);
  manifest.push({ file: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
for (const name of names) { await add(path.join(output, name), name); await fs.copyFile(path.join(output, name), path.join(publicOutput, name)); }
for (const name of ['phrase.wav', 'phrase.rhubarb.json', 'vowels.wav', 'vowels.cues.json', 'README.md']) await add(`public/speech-demo/${name}`, `audio/${name}`);
for (const name of await fs.readdir(`${output}/svg-mouths`)) await add(`${output}/svg-mouths/${name}`, `svg-mouths/${name}`);
await add('docs/local-lip-sync.md', 'LIP-SYNC.md');
await add('tools/rhubarb-lip-sync/v1.14.0/manifest.json', 'rhubarb-version.json');
const readme = await fs.readFile('docs/mario64-speech-lab.md', 'utf8');
await fs.writeFile(`${output}/README.md`, readme); zip.file('README.md', readme);
await fs.writeFile(`${output}/manifest.json`, JSON.stringify({ files: manifest }, null, 2)); zip.file('manifest.json', JSON.stringify({ files: manifest }, null, 2));
const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
await fs.writeFile(`${output}/mario64-speech-kit.zip`, bytes); await fs.writeFile(`${publicOutput}/mario64-speech-kit.zip`, bytes);
await fs.writeFile(`${output}/index.html`, '<!doctype html><html lang="es"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/speech-lab.html?comparison=1"><title>Mario y laboratorio de bocas</title><a href="/speech-lab.html?comparison=1">Abrir Mario y el laboratorio de bocas</a></html>');
console.log(JSON.stringify({ files: manifest.length + 2, zipBytes: bytes.length, output }));
