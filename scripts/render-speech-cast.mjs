import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const output = 'artifacts/speech-cast';
const sampleOnly = process.argv.includes('--sample');
await fs.mkdir(output, { recursive: true });
const server = await createServer({ logLevel: 'warn', server: { host: '127.0.0.1', port: 41740, strictPort: true, hmr: false } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1320, height: 760 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  // A minimal same-origin document avoids running three extra lab render loops.
  await page.route('**/speech-cast-capture', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body style="margin:0;background:#111c2b"></body></html>' }));
  await page.goto('http://127.0.0.1:41740/speech-cast-capture', { waitUntil: 'domcontentloaded' });
  const info = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { buildCharacterDesignGroup } = await import('/src/modules/agent/character-commands.js');
    const { createAvatarPreviewRuntime } = await import('/src/modules/avatar/avatar-preview-runtime.js');
    const { createSpeechMouth } = await import('/src/modules/character-studio/speech/speech-mouths.js');
    const { SPEECH_CHARACTERS, attachCharacterMouth, frameSpeechCharacter } = await import('/src/modules/character-studio/speech/speech-characters.js');
    const { rhubarbResultToSpeechTrack } = await import('/src/modules/character-studio/speech/rhubarb-adapter.js');
    const { analyzeSpeechAudio, sampleSpeechFrame } = await import('/src/modules/character-studio/speech/speech-core.js');
    const context = new AudioContext();
    const buffer = await context.decodeAudioData(await (await fetch('/speech-demo/phrase.wav')).arrayBuffer());
    const samples = new Float32Array(buffer.length);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const pcm = buffer.getChannelData(channel);
      for (let i = 0; i < samples.length; i++) samples[i] += pcm[i] * 5 / buffer.numberOfChannels;
    }
    const envelope = analyzeSpeechAudio(samples, buffer.sampleRate, { noiseGate: .025, smoothing: .4 });
    envelope.frames.push({ time: buffer.duration, open: 0, wide: 0, round: 0, viseme: 'rest' });
    const track = rhubarbResultToSpeechTrack(await (await fetch('/speech-demo/phrase.rhubarb.json')).json(), envelope);
    await context.close();
    const cards = [];
    for (const preset of SPEECH_CHARACTERS) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 440;
      const runtime = createAvatarPreviewRuntime(canvas); runtime.renderer.setSize(440, 440, false);
      runtime.scene.background = new THREE.Color('#223044'); runtime.controls.enableDamping = false;
      for (const grid of runtime.scene.children.filter(node => node.type === 'GridHelper')) { runtime.scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
      const group = buildCharacterDesignGroup(preset.recipe); runtime.scene.add(group);
      const mouths = {};
      for (const mode of ['svg', 'cutout', 'jaw']) {
        const mouth = createSpeechMouth({ mode, ...preset.mouth, skin: preset.recipe.skin });
        await mouth.ready; attachCharacterMouth(group, mouth, preset); mouth.object.visible = false; mouths[mode] = mouth;
      }
      frameSpeechCharacter(runtime, group, preset, false);
      cards.push({ preset, group, runtime, canvas, mouths });
    }
    const canvas = document.createElement('canvas'); canvas.width = 1320; canvas.height = 760; document.body.append(canvas);
    const g = canvas.getContext('2d');
    const fps = 24, intro = 1.25, phraseDuration = buffer.duration, chapterDuration = Math.ceil((phraseDuration + .45) * fps) / fps;
    const outro = 3.5, duration = intro + chapterDuration * 3 + outro;
    const titles = ['01  BOCA DIBUJADA / SVG', '02  CAPAS RECORTADAS / 2.5D', '03  MANDÍBULA CON VOLUMEN / 3D'];
    function label(text, x, y, size, color = '#edf2f7', weight = 500) {
      g.font = `${weight} ${size}px Segoe UI, sans-serif`; g.fillStyle = color; g.fillText(text, x, y);
    }
    function draw(time) {
      const chapter = Math.max(0, Math.min(2, Math.floor((time - intro) / chapterDuration)));
      const endCard = time >= intro + chapterDuration * 3;
      const local = time < intro || endCard ? -1 : time - intro - chapter * chapterDuration;
      const mode = ['svg', 'cutout', 'jaw'][chapter];
      const frame = local < 0 || local >= phraseDuration ? { time: 0, open: 0, wide: 0, round: 0, viseme: 'rest' } : sampleSpeechFrame(track, local);
      g.fillStyle = '#111c2b'; g.fillRect(0, 0, 1320, 760);
      label('RETROVISOR  /  LIP SYNC LOCAL', 28, 36, 15, '#efc96d', 700);
      label('Una voz. Tres personajes.', 28, 81, 34, '#edf2f7', 700);
      label(titles[chapter], 825, 72, 18, '#efc96d', 600);
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        for (const [key, mouth] of Object.entries(card.mouths)) { mouth.object.visible = key === mode; if (key === mode) mouth.update(frame); }
        card.runtime.renderer.render(card.runtime.scene, card.runtime.camera);
        g.drawImage(card.canvas, i * 440, 116, 440, 440);
        label(card.preset.label, i * 440 + 25, 589, 22, '#edf2f7', 650);
        label(i === 1 ? 'Estética PSX' : 'Estética N64', i * 440 + 25, 618, 15, '#aebfd2');
        if (i) { g.strokeStyle = '#41516a'; g.beginPath(); g.moveTo(i * 440, 116); g.lineTo(i * 440, 637); g.stroke(); }
      }
      g.fillStyle = '#314156'; g.fillRect(28, 653, 1264, 4);
      g.fillStyle = '#efc96d'; g.fillRect(28, 653, 1264 * Math.max(0, Math.min(1, local / phraseDuration)), 4);
      label('MISMO AUDIO · MISMOS TIEMPOS · DISTINTAS CABEZAS', 28, 693, 15, '#b8cadd', 600);
      label(`Gesto: ${frame.viseme === 'rest' ? 'reposo' : frame.viseme}`, 1115, 693, 17, '#efc96d', 650);
      label('Character Studio → Laboratorio de bocas → Elegir personaje → Cargar audio', 28, 733, 17, '#edf2f7');
      if (endCard) {
        g.fillStyle = 'rgba(12,22,35,.94)'; g.fillRect(0, 102, 1320, 658);
        label('Pruébalo en la aplicación', 86, 208, 38, '#efc96d', 700);
        for (const [index, line] of ['1. Character Studio → Laboratorio de bocas', '2. Elige Mario, Cloud o Explorador', '3. Cargar audio → Calcular gestos del audio', '4. Reproduce y guarda el personaje hablando en GLB'].entries()) label(line, 86, 287 + index * 66, 25);
        label('El JSON guarda los movimientos. El sonido se conserva por separado.', 86, 588, 20, '#b8cadd');
        label('Sincronización aproximada · Bocas en fase de prototipo', 86, 644, 18, '#b8cadd');
      }
      return canvas.toDataURL('image/png').split(',')[1];
    }
    window.__CAST_FILM__ = { draw, track, info: { fps, intro, duration, phraseDuration, chapterDuration, characters: cards.map(card => ({ id: card.preset.id, label: card.preset.label })), cueCount: track.cues.length } };
    return window.__CAST_FILM__.info;
  });
  await fs.writeFile(`${output}/timeline.json`, JSON.stringify(info, null, 2));
  // Sample every renderer before spending time encoding the complete film.
  for (const [index, mode] of ['svg', 'cutout', 'jaw'].entries()) {
    const frame = await page.evaluate(time => window.__CAST_FILM__.draw(time), info.intro + index * info.chapterDuration + 2.25);
    await fs.writeFile(`${output}/sample-${mode}.png`, Buffer.from(frame, 'base64'));
  }
  if (!sampleOnly) {
    const frameCount = Math.ceil(info.duration * info.fps);
    const framesDirectory = output + '/frames';
    await fs.mkdir(framesDirectory, { recursive: true });
    for (let index = 0; index < frameCount; index++) {
      const frame = await page.evaluate(time => window.__CAST_FILM__.draw(time), index / info.fps);
      await fs.writeFile(framesDirectory + '/frame-' + String(index).padStart(4, '0') + '.png', Buffer.from(frame, 'base64'));
      if (index % 96 === 0) console.log('Frames ' + Math.round(index / frameCount * 100) + '%');
    }
    // Assemble the exact PCM timeline separately; encoding never waits on a browser pipe.
    const wave = await fs.readFile('public/speech-demo/phrase.wav');
    let format, pcm;
    for (let offset = 12; offset + 8 <= wave.length;) {
      const size = wave.readUInt32LE(offset + 4), tag = wave.toString('ascii', offset, offset + 4);
      if (tag === 'fmt ') format = wave.subarray(offset + 8, offset + 24);
      if (tag === 'data') pcm = wave.subarray(offset + 8, offset + 8 + size);
      offset += 8 + size + (size & 1);
    }
    if (!format || !pcm || format.readUInt16LE(0) !== 1) throw new Error('The sample voice must be PCM WAV');
    const sampleRate = format.readUInt32LE(4), blockAlign = format.readUInt16LE(12);
    const dataSize = Math.ceil(frameCount / info.fps * sampleRate) * blockAlign;
    const mixed = Buffer.alloc(44 + dataSize);
    mixed.write('RIFF'); mixed.writeUInt32LE(mixed.length - 8, 4); mixed.write('WAVEfmt ', 8); mixed.writeUInt32LE(16, 16); format.copy(mixed, 20);
    mixed.write('data', 36); mixed.writeUInt32LE(dataSize, 40);
    for (let index = 0; index < 3; index++) pcm.copy(mixed, 44 + Math.round((info.intro + index * info.chapterDuration) * sampleRate) * blockAlign);
    await fs.writeFile(output + '/voice-track.wav', mixed);
    console.log('Encoding MP4');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(info.fps), '-i', framesDirectory + '/frame-%04d.png', '-i', output + '/voice-track.wav', '-frames:v', String(frameCount), '-c:v', 'libx264', '-threads', '2', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-t', String(frameCount / info.fps), '-movflags', '+faststart', output + '/lip-sync-personajes.mp4'], { windowsHide: true, timeout: 120000 });
    const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,nb_read_frames,avg_frame_rate', '-of', 'json', `${output}/lip-sync-personajes.mp4`], { encoding: 'utf8' }));
    if (errors.length) throw new Error(errors.join('\n'));
    await fs.writeFile(`${output}/video-verification.json`, JSON.stringify({ ...info, frameCount, probe, errors }, null, 2));
    await fs.mkdir('public/speech-demo/cast', { recursive: true });
    await fs.copyFile(`${output}/lip-sync-personajes.mp4`, 'public/speech-demo/cast/lip-sync-personajes.mp4');
    await fs.copyFile(`${output}/sample-svg.png`, 'public/speech-demo/cast/poster.png');
    console.log(JSON.stringify({ video: `${output}/lip-sync-personajes.mp4`, frameCount, duration: frameCount / info.fps, characters: info.characters }));
  }
} finally {
  await browser?.close(); await server.close();
}
