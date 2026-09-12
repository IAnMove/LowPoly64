import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
const server = await createServer({ logLevel: 'warn', server: { host: '127.0.0.1', port: 41740, strictPort: true, hmr: false } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--mute-audio', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://127.0.0.1:41740/speech-lab.html?comparison=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__SPEECH_LAB__?.ready, null, { timeout: 60000 });
  for (const kind of ['phrase', 'phonetic', 'vowels']) {
    const result = await page.evaluate(async demo => {
      const lab = window.__SPEECH_LAB__, audioDemo = demo === 'phonetic' ? 'phrase' : demo;
      await lab.loadDemo(audioDemo);
      if (demo !== 'vowels' && !(await lab.setDriver(demo === 'phonetic' ? 'phonetic' : 'intensity'))) throw new Error('Requested speech driver is unavailable');
      lab.setView(demo === 'vowels' ? 'mouth' : 'face');
      const canvas = document.createElement('canvas'); canvas.width = 1320; canvas.height = 550; const graphics = canvas.getContext('2d');
      const audioContext = new AudioContext(); await audioContext.resume();
      const buffer = await audioContext.decodeAudioData(await (await fetch(`/speech-demo/${audioDemo}.wav`)).arrayBuffer());
      const source = audioContext.createBufferSource(); source.buffer = buffer;
      const destination = audioContext.createMediaStreamDestination(); source.connect(destination); // File recording only; no speaker connection.
      const stream = new MediaStream([...canvas.captureStream(25).getVideoTracks(), ...destination.stream.getAudioTracks()]);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2000000 }); const chunks = [];
      const stopped = new Promise(resolve => { recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); }; recorder.onstop = resolve; });
      const started = audioContext.currentTime; recorder.start(); source.start();
      await new Promise(resolve => {
        function frame() {
          const time = audioContext.currentTime - started; lab.setTime(time);
          graphics.fillStyle = '#111c2b'; graphics.fillRect(0, 0, canvas.width, canvas.height);
          graphics.fillStyle = '#efc96d'; graphics.font = '600 23px Segoe UI'; graphics.fillText(demo === 'phonetic' ? 'RETROVISOR  /  LA MISMA FRASE · GESTOS AUTOMÁTICOS' : 'RETROVISOR  /  MARIO N64 · TRES BOCAS', 24, 34);
          for (let i = 0; i < lab.cards.length; i++) {
            const card = lab.cards[i]; card.runtime.renderer.render(card.runtime.scene, card.runtime.camera);
            graphics.drawImage(card.canvas, i * 440, 55, 440, 440);
            graphics.fillStyle = '#e9edf1'; graphics.font = '600 17px Segoe UI'; graphics.fillText(['01  DIBUJO / SVG', '02  CAPAS RECORTADAS', '03  MANDÍBULA 3D'][i], i * 440 + 24, 526);
          }
          if (time >= buffer.duration + .35) resolve(); else requestAnimationFrame(frame);
        }
        frame();
      });
      recorder.stop(); await stopped; stream.getTracks().forEach(track => track.stop()); await audioContext.close();
      const bytes = new Uint8Array(await new Blob(chunks, { type: mimeType }).arrayBuffer()); let binary = '';
      for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
      return { base64: btoa(binary), duration: buffer.duration, bytes: bytes.length };
    }, kind);
    const raw = `artifacts/mario64-speech-lab/speech-${kind}.raw.webm`, final = `artifacts/mario64-speech-lab/speech-${kind}.webm`;
    await fs.writeFile(raw, Buffer.from(result.base64, 'base64'));
    // Add duration and seek indexes without recompressing the capture.
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-c', 'copy', final]);
    await fs.unlink(raw);
    console.log(JSON.stringify({ demo: kind, duration: result.duration, bytes: result.bytes }));
  }
} finally { await browser?.close(); await server.close(); }
