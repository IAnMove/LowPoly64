import fs from 'node:fs/promises';
const directory = 'public/speech-demo';
function readWave(bytes) {
  let format, data;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const tag = bytes.toString('ascii', offset, offset + 4), size = bytes.readUInt32LE(offset + 4);
    if (tag === 'fmt ') format = bytes.subarray(offset + 8, offset + 8 + size);
    if (tag === 'data') data = bytes.subarray(offset + 8, offset + 8 + size);
    offset += 8 + size + (size & 1);
  }
  if (!format || !data || format.readUInt16LE(0) !== 1 || format.readUInt16LE(14) !== 16) throw new Error('Expected PCM16 WAV');
  return { format, data, rate: format.readUInt32LE(4), channels: format.readUInt16LE(2), bytesPerSecond: format.readUInt32LE(8) };
}
const frames = [], cues = []; let reference, elapsed = 0;
for (const viseme of ['A', 'E', 'I', 'O', 'U', 'M', 'F']) {
  const wave = readWave(await fs.readFile(`${directory}/${viseme}.wav`));
  reference ||= wave;
  if (wave.bytesPerSecond !== reference.bytesPerSecond) throw new Error('Audio formats differ');
  // Trim SAPI silence so each visible cue follows the actual utterance.
  let first = 0, last = wave.data.length / 2 - 1;
  while (first < last && Math.abs(wave.data.readInt16LE(first * 2)) < 200) first++;
  while (last > first && Math.abs(wave.data.readInt16LE(last * 2)) < 200) last--;
  first = Math.max(0, first - Math.round(wave.rate * .025));
  last = Math.min(wave.data.length / 2 - 1, last + Math.round(wave.rate * .06));
  const gap = Buffer.alloc(Math.round(wave.rate * .40) * wave.channels * 2), segment = wave.data.subarray(first * 2, (last + 1) * 2);
  frames.push(gap, segment); elapsed += gap.length / wave.bytesPerSecond;
  cues.push({ start: elapsed, end: elapsed + segment.length / wave.bytesPerSecond, viseme });
  elapsed += segment.length / wave.bytesPerSecond;
}
frames.push(Buffer.alloc(Math.round(reference.rate * .6) * reference.channels * 2));
const data = Buffer.concat(frames), fmt = reference.format;
const header = Buffer.alloc(20 + fmt.length + 8);
header.write('RIFF'); header.writeUInt32LE(header.length + data.length - 8, 4); header.write('WAVEfmt ', 8); header.writeUInt32LE(fmt.length, 16); fmt.copy(header, 20);
header.write('data', 20 + fmt.length); header.writeUInt32LE(data.length, 24 + fmt.length);
await fs.writeFile(`${directory}/vowels.wav`, Buffer.concat([header, data]));
await fs.writeFile(`${directory}/vowels.cues.json`, JSON.stringify({ version: 1, cues }, null, 2));
await fs.writeFile(`${directory}/README.md`, '# Audio de demostración\n\nVoz sintética Microsoft Helena Desktop (español de España), generada localmente con Windows SAPI. No pretende imitar la voz de ningún personaje.\n\nphrase.wav: frase para análisis de intensidad. vowels.wav: sonidos separados, con tiempos explícitos en vowels.cues.json. M/F son aproximaciones de la voz sintética; los controles manuales permiten comprobar esas formas.\n');
console.log(JSON.stringify({ duration: data.length / reference.bytesPerSecond, cues }));
