import fs from 'node:fs/promises';
import path from 'node:path';
import { rhubarbResultToSpeechCues } from '../src/modules/character-studio/speech/rhubarb-adapter.js';
import { runRhubarbOnWav } from '../server/speech/rhubarb-service.js';

const positional = process.argv.slice(2).filter(argument => !argument.startsWith('--'));
const inputPath = positional[0];
const outputPath = positional[1] || null;
if (!inputPath || positional.length > 2) {
  console.error('Uso: node scripts/rhubarb-lipsync.mjs entrada.wav [salida.rhubarb.json]');
  process.exit(2);
}

const bytes = await fs.readFile(inputPath);
const { result, wav, engine } = await runRhubarbOnWav(bytes);
const cueSet = rhubarbResultToSpeechCues(result, { recognizer: engine.recognizer });
const output = {
  version: 1,
  source: cueSet.source,
  recognizer: cueSet.recognizer,
  engine,
  sourceFile: path.basename(inputPath),
  duration: cueSet.duration,
  sampleRate: wav.sampleRate,
  cues: cueSet.cues,
};
const serialized = `${JSON.stringify(output, null, 2)}\n`;
if (outputPath) {
  await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await fs.writeFile(outputPath, serialized);
  console.log(JSON.stringify({ output: path.resolve(outputPath), duration: output.duration, cues: output.cues.length, engine }, null, 2));
} else process.stdout.write(serialized);

