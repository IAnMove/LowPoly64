import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
const file = 'artifacts/mario64-speech-lab/mario64-speech-kit.zip';
const zip = await JSZip.loadAsync(await fs.readFile(file), { checkCRC32: true });
const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
for (const entry of manifest.files) {
  const data = await zip.file(entry.file).async('nodebuffer');
  assert.equal(data.length, entry.bytes, entry.file);
  assert.equal(createHash('sha256').update(data).digest('hex'), entry.sha256, entry.file);
}
const mario = JSON.parse(await zip.file('mario.recipe.json').async('string'));
assert.equal(mario.body.profile, 'plumber');
const cloud = await zip.file('cloud.recipe.json').async('nodebuffer');
assert.equal(createHash('sha256').update(cloud).digest('hex').toUpperCase(), '5D44920515A9C228A582C6666C2FF2A431123813A32DBCEF7EA38B7DAF611588');
const clips = {};
for (const name of ['mario.glb', 'mario-speaking-svg.glb', 'mario-speaking-cutout.glb', 'mario-speaking-jaw.glb', 'mario-phonetic-svg.glb', 'mario-phonetic-cutout.glb', 'mario-phonetic-jaw.glb']) {
  const bytes = await zip.file(name).async('nodebuffer');
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
  clips[name] = gltf.animations.map(clip => clip.name);
  assert.equal(clips[name].length, name === 'mario.glb' ? 13 : 14);
  if (name !== 'mario.glb') assert.ok(clips[name].includes('speech'));
}
const phonetic = JSON.parse(await zip.file('audio/phrase.rhubarb.json').async('string'));
assert.equal(phonetic.source, 'rhubarb');
assert.ok(phonetic.cues.length > 0);
const phoneticTrack = JSON.parse(await zip.file('phonetic.track.json').async('string'));
assert.ok(phoneticTrack.frames.length > 0);
assert.ok(phoneticTrack.frames.some(frame => frame.open > .1));
assert.equal(phoneticTrack.frames.at(-1).open, 0);
const report = { zip: file, crc: true, hashes: manifest.files.length, cloudPreserved: true, clips };
await fs.writeFile('artifacts/mario64-speech-lab/kit-verification.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ crc: true, verifiedFiles: manifest.files.length, cloudPreserved: true, animationCounts: Object.fromEntries(Object.entries(clips).map(([name, value]) => [name, value.length])) }));
